// One reviewed upgrade, not a migration framework. Importing never connects.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {commonLock, target as historicalTarget, verifyTLS, windowOpen, checkout, hash, canonical} from '../authoring-release-production/core.mjs';
export {verifyTLS, windowOpen, checkout, hash, canonical};
export function target(raw){const u=new URL(raw);for(const k of u.searchParams.keys())assert.equal(u.searchParams.getAll(k).length,1,'DUPLICATE_URL_OVERRIDE');return historicalTarget(raw);}
export const root = new URL('../../', import.meta.url);
export const installedNumbers = [1,2,3,4,5,6,16];
export const missingNumbers = [7,8,9,10,11,12,13,14,15,17,18];
export const binding = Object.freeze({project:'divine-mode-82940461',branch:'br-quiet-dawn-b7m2zrt3',endpoint:'ep-snowy-heart-b7c1220y',database:'neondb',role:'neondb_owner',version:180006});
export const ident = x => '"'+x.replaceAll('"','""')+'"';
export async function materials(expected) {
 const lines = await readFile(new URL('PACKAGE_SHA256SUMS',import.meta.url),'utf8');
 assert.equal(hash(lines),expected,'PACKAGE_DIGEST_MISMATCH');
 for(const line of lines.trim().split('\n')) {
  const [sha,path]=line.split(/\s+/);
  assert.match(path,/^[a-zA-Z0-9_./-]+$/); assert.ok(!path.includes('..'));
  assert.equal(hash(await readFile(new URL(path,root))),sha,'PACKAGE_FILE_MISMATCH');
 }
 const manifest=JSON.parse(await readFile(new URL('migrations.json',import.meta.url),'utf8'));
 assert.equal(manifest.length,18);
 const files=[];
 for(const [i,f] of manifest.entries()) {
  assert.match(f.id,new RegExp('^'+String(i+1).padStart(4,'0')+'_[a-z0-9_]+$'));
  assert.equal(f.path,`migrations/${f.id}.up.sql`);
  const sql=await readFile(new URL(f.path,root),'utf8');
  assert.equal(hash(sql),f.sha256,'CANONICAL_MIGRATION_DRIFT');
  files.push({...f,sql,body:interior(sql,f.wrapped)});
 }
 return {files};
}
export function interior(sql,wrapped) {
 if(!wrapped)return sql;
 assert.ok(sql.startsWith('BEGIN;\n') && /\nCOMMIT;\s*$/.test(sql),'WRAPPER_DRIFT');
 return sql.slice('BEGIN;\n'.length,sql.lastIndexOf('\nCOMMIT;'));
}
export function approval(a,candidate,now=Date.now()) {
 assert.deepEqual(a.target,binding,'APPROVAL_TARGET_MISMATCH');
 assert.equal(a.candidate,candidate,'APPROVAL_CANDIDATE_MISMATCH');
 for(const k of ['baselineSchema','baselineRecords'])assert.match(a[k],/^[a-f0-9]{64}$/);
 for(const k of ['approvalReference','recoveryReference','recoveryErasurePlan','writerHoldReference','disabledFeaturesReference'])assert.ok(typeof a[k]==='string'&&a[k].trim().length>=8,'APPROVAL_INCOMPLETE');
 for(const k of ['start','end','recoveryVerifiedAt'])assert.match(a[k],/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/,'EXPLICIT_UTC_REQUIRED');
 assert.ok(Date.parse(a.recoveryVerifiedAt)<=now && now-Date.parse(a.recoveryVerifiedAt)<=30*60*1000,'RECOVERY_ATTESTATION_STALE');
 return windowOpen(a.start,a.end,now);
}
export function ledger(rows,files) {
 const baseline=files.filter((_,i)=>installedNumbers.includes(i+1));
 assert.deepEqual(rows.map(r=>r.id),baseline.map(f=>f.id),'LEDGER_SET_MISMATCH_NO_REPLAY');
 for(const [i,r] of rows.entries()) {
  assert.equal(r.sha256,baseline[i].sha256,'INSTALLED_CHECKSUM_DRIFT');
  assert.equal(r.result,'verified','UNVERIFIED_LEDGER');
  assert.match(r.source_commit,/^[a-f0-9]{40}$/);
  assert.ok(r.applied_by && r.applied_at,'LEDGER_PROVENANCE_MISSING');
 }
}
const catalogSQL=await readFile(new URL('../authoring-release-production/package/catalog-readonly.sql',import.meta.url),'utf8');
export async function snapshot(c) {
 await c.query('SET search_path=pg_catalog,public');
 const report=(await c.query(catalogSQL)).rows[0].report;
 assert.equal(report.identity.database,binding.database,'DATABASE_IDENTITY');
 assert.equal(report.identity.current_user,binding.role,'ROLE_IDENTITY');
 assert.equal(report.identity.session_user,binding.role,'SESSION_ROLE_IDENTITY');
 assert.equal(report.identity.server_version_num,binding.version,'PG_VERSION');
 assert.equal(report.identity.replication_role,'origin');
 assert.ok(report.tables.some(t=>t.name==='physcratic_production_migrations'),'LEDGER_MISSING');
 const rows=(await c.query('SELECT id,sha256,source_commit,applied_at,applied_by,result FROM public.physcratic_production_migrations ORDER BY id')).rows;
 const security=(await c.query(`SELECT jsonb_build_object(
 'schema',(SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',nspowner::regrole::text,'acl',nspacl::text) ORDER BY nspname) FROM pg_namespace WHERE nspname='public'),
 'relations',(SELECT jsonb_agg(jsonb_build_object('name',relname,'acl',relacl::text,'owner',relowner::regrole::text) ORDER BY relname) FROM pg_class WHERE relnamespace='public'::regnamespace),
 'functions',(SELECT jsonb_agg(jsonb_build_object('name',oid::regprocedure::text,'owner',proowner::regrole::text,'acl',proacl::text,'config',proconfig) ORDER BY oid::regprocedure::text) FROM pg_proc WHERE pronamespace='public'::regnamespace),
 'events',(SELECT jsonb_agg(jsonb_build_object('name',evtname,'owner',evtowner::regrole::text,'enabled',evtenabled,'routine',evtfoid::regprocedure::text,'tags',evttags) ORDER BY evtname) FROM pg_event_trigger),
 'extensions',(SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion,'schema',extnamespace::regnamespace::text) ORDER BY extname) FROM pg_extension)
 ) AS metadata`)).rows[0].metadata;
 const schemaHash=hash(canonical({catalog:{...report,identity:undefined},security}));
 return {report,rows,schemaHash};
}
export async function fingerprints(c,tables) {
 const result={};
 for(const t of tables) {
  if(t==='physcratic_production_migrations')continue;
  const where=t==='user'?" WHERE id<>'__physcratic_deleted_principal_v1__'":'';
  result[t]=(await c.query(`SELECT count(*)::text AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(r)::text,E'\\n' ORDER BY to_jsonb(r)::text),''),'UTF8')),'hex') AS sha256 FROM public.${ident(t)} r${where}`)).rows[0];
 }
 return result;
}
export async function preflight(c,p,a) {
 const s=await snapshot(c); ledger(s.rows,p.files);
 assert.ok(s.report.tables.every(t=>!t.rls&&!t.force_rls),'ROW_VISIBILITY_NOT_PROVEN');
 const introduced=missingNumbers.flatMap(n=>[...p.files[n-1].sql.matchAll(/^\s*CREATE\s+(?:UNIQUE\s+)?(?:TABLE|FUNCTION|VIEW|INDEX|TRIGGER)\s+([a-z_][a-z0-9_]*)/gmi)].map(m=>m[1]));
 const orphan=(await c.query(`SELECT EXISTS(
 SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY($1::text[])
 UNION ALL SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=ANY($1::text[])
 UNION ALL SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgname=ANY($1::text[])
 ) AS present`,[introduced])).rows[0].present;
 assert.equal(orphan,false,'UNLEDGERED_MIGRATION_OBJECT');
 assert.equal((await c.query("SELECT EXISTS(SELECT 1 FROM public.\"user\" WHERE id='__physcratic_deleted_principal_v1__') AS present")).rows[0].present,false,'UNLEDGERED_DELETION_PRINCIPAL');
 assert.equal(s.schemaHash,a.baselineSchema,'SCHEMA_DRIFT_OR_UNLEDGERED_OBJECTS');
 // Every introduced object is part of the signed baseline digest. No drift repair.
 const tables=s.report.tables.map(t=>t.name);
 const records=await fingerprints(c,tables);
 assert.equal(hash(canonical(records)),a.baselineRecords,'RECOVERY_RECORDS_CHANGED');
 const publicCreate=(await c.query("SELECT count(*)::int AS n FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='CREATE'")).rows[0].n;
 assert.equal(publicCreate,0,'UNTRUSTED_SCHEMA_CREATE');
 return {...s,tables,records};
}
export async function execute(c,p,a,candidate) {
 const live=()=>approval(a,candidate);
 live();
 for(const f of p.files){assert.equal(hash(f.sql),f.sha256,'CANONICAL_MIGRATION_DRIFT');assert.equal(f.body,interior(f.sql,f.wrapped),'EXECUTION_BODY_DRIFT');}
 await c.query('BEGIN');
 try {
  await c.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='120s'; SET LOCAL idle_in_transaction_session_timeout='120s'");
  const locked=(await c.query(`SELECT pg_try_advisory_xact_lock(${commonLock}) AS ok`)).rows[0].ok;
  assert.equal(locked,true,'COMPETING_MIGRATION');
  const initial=await snapshot(c);
  await c.query('LOCK TABLE '+initial.report.tables.map(t=>'public.'+ident(t.name)).join(',')+' IN SHARE ROW EXCLUSIVE MODE');
  const before=await preflight(c,p,a); live();
  await c.query('SET LOCAL search_path=public,pg_catalog');
  for(const n of missingNumbers) {
   live(); const f=p.files[n-1];
   await c.query(f.body);
   await c.query("INSERT INTO public.physcratic_production_migrations(id,sha256,source_commit,applied_by,result) VALUES($1,$2,$3,current_user,'verified')",[f.id,f.sha256,candidate]);
  }
  // This is a verification before COMMIT, not an automatic down migration.
  assert.deepEqual(await fingerprints(c,before.tables),before.records,'EXISTING_RECORDS_CHANGED');
  const after=await snapshot(c);
  assert.deepEqual(after.rows.map(r=>r.id),p.files.map(f=>f.id),'FINAL_LEDGER_SET');
  for(const [i,r]of after.rows.entries())assert.equal(r.sha256,p.files[i].sha256,'FINAL_LEDGER_CHECKSUM');
  const oldRows=after.rows.filter(r=>before.rows.some(b=>b.id===r.id));
  assert.deepEqual(oldRows,before.rows,'INSTALLED_LEDGER_CHANGED');
  live(); await c.query('COMMIT');
  return {state:'commit-acknowledged',schema:after.schemaHash,installed:missingNumbers.map(n=>p.files[n-1].id),baselinePreserved:true,baselineTables:before.tables,baselineRecords:hash(canonical(before.records))};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}
}
export async function postcommit(c,p,result){
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
  const after=await snapshot(c);assert.equal(after.schemaHash,result.schema,'POSTCOMMIT_SCHEMA_CHANGED');
  assert.deepEqual(after.rows.map(r=>({id:r.id,sha256:r.sha256,result:r.result})),p.files.map(f=>({id:f.id,sha256:f.sha256,result:'verified'})),'POSTCOMMIT_LEDGER_CHANGED');
  assert.equal(hash(canonical(await fingerprints(c,result.baselineTables))),result.baselineRecords,'POSTCOMMIT_RECORDS_CHANGED');
  await c.query('COMMIT');return {state:'independently-verified',schema:after.schemaHash};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}
}
