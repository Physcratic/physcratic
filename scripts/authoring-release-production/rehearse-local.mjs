// Invoke only inside test-local.sh's newly created, task-labelled PG18.6 container.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {local,install,seed} from './package/test-fixture.mjs';
import {materials,hash,snapshot,readonly,executeTransaction,postcommit,canonical} from './core.mjs';
const digest=hash(await readFile(new URL('PACKAGE_SHA256SUMS',import.meta.url)));
const p=await materials(digest),admin=await local('physcratic_authoring_test','postgres');
const checks=[];let c,other,created=false;
try{
  assert.equal((await admin.query("SELECT count(*)::int n FROM pg_database WHERE datname='neondb'")).rows[0].n,0,'REFUSE_EXISTING_DATABASE');
  assert.equal((await admin.query("SELECT count(*)::int n FROM pg_roles WHERE rolname='neondb_owner'")).rows[0].n,0,'REFUSE_EXISTING_ROLE');
  await admin.query("CREATE ROLE neondb_owner LOGIN PASSWORD 'synthetic-owner-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
  await admin.query("CREATE DATABASE neondb OWNER neondb_owner TEMPLATE template0 LOCALE_PROVIDER=builtin BUILTIN_LOCALE='C.UTF-8' LC_COLLATE='C.UTF-8' LC_CTYPE='C.UTF-8' ENCODING='UTF8'");created=true;
  c=await local();await install(c);await seed(c);
  await c.query('BEGIN READ ONLY');const s=await snapshot(c,p);await c.query('COMMIT');
  for(const key of ['encoding','provider','locale','ctype','collation_version'])assert.equal(s.report.database[key],p.baseline.catalog.database[key]);
  // Explicit local-only descriptive datcollate alias adaptation. Remote package
  // and checksum stay untouched. Effective builtin locale and full schema match.
  p.sql=p.sql.replace(JSON.stringify(p.baseline.catalog.database),JSON.stringify(s.report.database));
  p.baseline.catalog.database=s.report.database;p.recovery.legacy_record_digest=s.record_digest;
  const before=await readonly(c,p);checks.push('Full representative sixteen-table baseline and synthetic retained records pass read-only classification.');
  const wrong={...p,recovery:{...p.recovery,legacy_record_digest:'0'.repeat(64)}};
  await assert.rejects(executeTransaction(c,wrong,Date.now()+60000),/RECOVERY_POINT_NO_LONGER/);
  assert.equal((await readonly(c,p)).record_digest,before.record_digest);checks.push('Stale recovery coverage blocks DDL and preserves every retained record.');
  const broken={...p,sql:p.sql.replace('-- BEGIN CANONICAL migrations/0004_authored_attempts.up.sql','SELECT 1/0;\n-- BEGIN CANONICAL migrations/0004_authored_attempts.up.sql')};
  await assert.rejects(executeTransaction(c,broken,Date.now()+60000),/division by zero/);
  assert.equal((await readonly(c,p)).record_digest,before.record_digest);checks.push('Failure before 0004 atomically rolls back 0001-0003 and ledger creation.');
  const slow={...p,sql:p.sql.replace('-- BEGIN CANONICAL migrations/0004_authored_attempts.up.sql','SELECT pg_sleep(0.1);\n-- BEGIN CANONICAL migrations/0004_authored_attempts.up.sql')};
  await assert.rejects(executeTransaction(c,slow,Date.now()+50),/EXECUTION_WINDOW_EXPIRED/);
  assert.equal((await readonly(c,p)).record_digest,before.record_digest);checks.push('Expired window rolls back instead of committing migrated objects or ledger.');
  other=await local();await other.query('BEGIN; LOCK TABLE public."user" IN ACCESS EXCLUSIVE MODE');
  await assert.rejects(executeTransaction(c,p,Date.now()+60000),/lock timeout/);await other.query('ROLLBACK');
  assert.equal((await readonly(c,p)).record_digest,before.record_digest);checks.push('Noncooperating table lock triggers bounded lock-timeout rollback before DDL.');
  const lockedBefore=await executeTransaction(c,p,Date.now()+60000);
  await c.end();c=null;const verification=await postcommit(other,p,lockedBefore);
  assert.equal(verification.status,'PASS');checks.push('Exact six migrations, common advisory lock, atomic ledger and new-connection postcommit preserve all sixteen tables and synthetic records.');
  await assert.rejects(executeTransaction(other,p,Date.now()+60000),/LEDGER_PRESENT_STOP_NO_REPLAY/);
  assert.deepEqual(await postcommit(other,p,lockedBefore),verification);checks.push('Replay rejected; successful schema, ledger and record fingerprints remain unchanged.');
  const result={status:'PASS',postgresql:'18.6',remote_operations:false,checks,package_sha256:digest,
    approved_sql_sha256:hash(await readFile(new URL('package/PRODUCTION_MIGRATION_DRAFT.sql',import.meta.url))),
    local_only_variant_sha256:hash(p.sql),locale_limitation:'Only descriptive datcollate alias differs (local C versus Neon C.UTF-8); effective builtin locale/version and all sixteen table definitions match. Local in-memory adaptation only.',verification};
  assert.equal(canonical(before.fingerprints),canonical(lockedBefore.fingerprints));
  await writeFile(new URL('../../work/final-alpha-execution/production-runner-local-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}finally{
  if(c)await c.end().catch(()=>{});if(other)await other.end().catch(()=>{});
  // Only this test's previously absent database in its owned disposable container.
  if(created){await admin.query('DROP DATABASE neondb');await admin.query('DROP ROLE neondb_owner');}
  await admin.end();
}
