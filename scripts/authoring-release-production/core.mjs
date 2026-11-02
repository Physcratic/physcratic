// Production-only Windows/Node transport. No environment alias or connector fallback.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {canonical,hash,migrations,verifyPackage} from '../authoring-release/core.mjs';

export const directory=new URL('./',import.meta.url);
export const root=new URL('../../',import.meta.url);
export const sourceCommit='2c35d61a5fcf6680a4054380a4bfcff1b71bc9e6';
export const sqlDigest='afc68f3435b46e319329aa456d3e2249537aa5ac39b66a575c704bc53de4f5da';
export const stagingDigest='a1e09cc5a6053367bbee7ce6cf15871461afd0bdac3dac8dd8e3668baf682d5e';
export const hostname='ep-snowy-heart-b7c1220y.c-13.us-east-1.aws.neon.tech';
export const commonLock="hashtextextended('physcratic:authoring:migrations:v1',0)";
export {canonical,hash};
export function target(raw){
  const u=new URL(raw);
  assert.ok(['postgres:','postgresql:'].includes(u.protocol));
  assert.equal(u.hostname,hostname);assert.equal(u.pathname,'/neondb');
  assert.ok(!u.port||u.port==='5432');assert.equal(decodeURIComponent(u.username),'neondb_owner');
  assert.ok(u.password);assert.ok(['require','verify-full'].includes(u.searchParams.get('sslmode')));
  for(const key of u.searchParams.keys())assert.ok(['sslmode','channel_binding'].includes(key));
  return{host:hostname,port:5432,database:'neondb',user:'neondb_owner',password:decodeURIComponent(u.password),
    ssl:{rejectUnauthorized:true},enableChannelBinding:true,options:'-c search_path=pg_catalog,public',
    connectionTimeoutMillis:10000,query_timeout:130000,statement_timeout:120000,
    application_name:'physcratic-reviewed-production-migration'};
}
export function verifyTLS(c){
  assert.equal(c.connection.stream.encrypted,true);assert.equal(c.connection.stream.authorized,true);
  assert.match(c.connection.stream.getProtocol(),/^TLSv1\.[23]$/);
}
export function windowOpen(start,end,now=Date.now()){
  const a=Date.parse(start),b=Date.parse(end);
  assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&b>a&&b-a<=1800000&&now>=a&&now<b,'WINDOW_NOT_OPEN');
  return b;
}
export function checkout(candidate){
  assert.match(candidate,/^[0-9a-f]{40}$/);
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  assert.equal(git('rev-parse','HEAD'),candidate,'WRONG_CHECKOUT');
  assert.equal(git('status','--porcelain','--untracked-files=no'),'','TRACKED_TREE_DIRTY');
  assert.ok(git('ls-files','scripts/authoring-release-production/operator.mjs'),'UNCOMMITTED_RUNNER');
}
export async function materials(expectedDigest){
  const manifest=await readFile(new URL('PACKAGE_SHA256SUMS',directory),'utf8');
  assert.equal(hash(manifest),expectedDigest,'PACKAGE_DIGEST_MISMATCH');
  for(const line of manifest.trim().split('\n')){
    const [sha,path]=line.split(/\s+/);
    assert.match(path,/^[A-Za-z0-9_.\/-]+$/);assert.ok(!path.includes('..'));
    assert.equal(hash(await readFile(new URL(path,directory))),sha,'PACKAGE_FILE_MISMATCH');
  }
  assert.equal(await verifyPackage(),stagingDigest,'STAGING_PACKAGE_CHANGED');
  const files=await migrations();
  const read=path=>readFile(new URL('package/'+path,directory),'utf8');
  const sql=await read('PRODUCTION_MIGRATION_DRAFT.sql');assert.equal(hash(sql),sqlDigest);
  for(const f of files)assert.ok(sql.includes(`-- BEGIN CANONICAL ${f.path} sha256=${f.sha256}\n${f.sql}`),'CANONICAL_BYTES_CHANGED');
  return{sql,files,catalog:await read('catalog-readonly.sql'),fingerprints:await read('legacy-fingerprint-readonly.sql'),
    post:await read('PRODUCTION_POSTCOMMIT_READONLY.sql'),baseline:JSON.parse(await read('baselines/production-preauthoring.json')),
    recovery:JSON.parse(await read('recovery-point.json')),digest:expectedDigest};
}
const ident=name=>'"'+name.replaceAll('"','""')+'"';
export async function snapshot(c,p){
  await c.query('SET LOCAL search_path=pg_catalog,public');
  const report=(await c.query(p.catalog)).rows[0].report;
  const identity=report.identity;
  assert.equal(identity.database,'neondb');assert.equal(identity.current_user,'neondb_owner');
  assert.equal(identity.session_user,'neondb_owner');assert.equal(identity.server_version_num,180006);
  assert.equal(identity.replication_role,'origin');
  const fingerprints=(await c.query(p.fingerprints)).rows[0].fingerprints;
  const ledgers=(await c.query("SELECT to_regclass('public.physcratic_production_migrations')::text AS production,to_regclass('public.physcratic_integration_migrations')::text AS integration")).rows[0];
  const catalog=p.catalog.trim().replace(/;$/,'');
  const structure=(await c.query(`SELECT encode(sha256(convert_to((report-'identity'-'database')::text,'UTF8')),'hex') AS sha FROM(${catalog})s`)).rows[0].sha;
  return{report,fingerprints,record_digest:hash(canonical(fingerprints)),ledgers,structure};
}
export function baseline(s,p){
  assert.deepEqual(s.ledgers,{production:null,integration:null},'LEDGER_PRESENT_STOP_NO_REPLAY');
  assert.equal(s.structure,p.baseline.structural_schema_sha256,'SCHEMA_DRIFT');
  assert.deepEqual(s.report.database,p.baseline.catalog.database,'DATABASE_LOCALE_DRIFT');
  assert.equal(s.record_digest,p.recovery.legacy_record_digest,'RECOVERY_POINT_NO_LONGER_COVERS_CURRENT_RECORDS');
}
export async function readonly(c,p){
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try{await c.query("SET LOCAL lock_timeout='5s'");const s=await snapshot(c,p);assert.equal(s.report.identity.read_only,'on');baseline(s,p);await c.query('COMMIT');return s;}
  catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}
}
// Match the approved outer transaction exactly. PostgreSQL parses every interior
// statement itself; no lexer, statement reordering or generated migration SQL.
export function interior(sql){
  const begin=sql.indexOf('\nBEGIN;\n');assert.ok(begin>=0);
  assert.match(sql.slice(0,begin),/^--[^\n]*$/);
  assert.match(sql,/\nCOMMIT;\s*$/);
  const body=sql.slice(begin+'\nBEGIN;\n'.length,sql.lastIndexOf('\nCOMMIT;'));
  assert.equal(sql.slice(begin+'\nBEGIN;\n'.length,sql.lastIndexOf('\nCOMMIT;')),body);
  return body;
}
export async function executeTransaction(c,p,end){
  const live=()=>assert.ok(Date.now()<end,'EXECUTION_WINDOW_EXPIRED');
  live();await c.query('BEGIN');
  try{
    await c.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='120s'; SET LOCAL idle_in_transaction_session_timeout='120s'");
    await c.query(`SELECT pg_advisory_xact_lock(${commonLock})`);
    // The reviewed SQL repeats these same locks. Acquire them first to compare
    // recovery coverage and retained rows while arbitrary table writers are blocked.
    await c.query('LOCK TABLE '+p.baseline.catalog.tables.map(t=>'public.'+ident(t.name)).join(',')+' IN SHARE ROW EXCLUSIVE MODE');
    const before=await snapshot(c,p);baseline(before,p);live();
    await c.query("SELECT set_config('physcratic.production_approval',$1,true)",[sourceCommit+':reviewed-production-window-and-recovery']);
    await c.query(interior(p.sql));live();
    await c.query('COMMIT');return before;
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}
}
export async function postcommit(c,p,before){
  // This is the exact published READ ONLY verification, on a new TLS connection.
  const results=await c.query(p.post);
  const rows=results.flatMap(r=>r.rows||[]);
  const version=rows.find(r=>r.actual_v6_sha256);
  assert.ok(version);assert.equal(version.actual_v6_sha256,version.expected_v6_sha256);
  assert.deepEqual(rows.filter(r=>r.id),p.files.map(f=>({id:f.id,sha256:f.sha256,source_commit:sourceCommit,applied_by:'neondb_owner',result:'verified'})));
  assert.deepEqual(rows.find(r=>r.legacy_fingerprints)?.legacy_fingerprints,before.fingerprints,'LEGACY_RECORDS_CHANGED');
  assert.equal(String(rows.find(r=>'unvalidated'in r)?.unvalidated),'0');
  assert.equal(String(rows.find(r=>'disabled_internal'in r)?.disabled_internal),'0');
  const after=rows.find(r=>r.report)?.report;
  assert.ok(after);assert.deepEqual(after.tables.filter(t=>p.baseline.catalog.tables.some(b=>b.name===t.name)),p.baseline.catalog.tables,'LEGACY_SCHEMA_CHANGED');
  assert.deepEqual(after.database,p.baseline.catalog.database);
  return{status:'PASS',ledger_entries:6,canonical_version:6,legacy_tables_preserved:16,legacy_record_digest:before.record_digest};
}
