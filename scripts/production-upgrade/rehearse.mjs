// Synthetic loopback-only rehearsal. Never invoked by operator.mjs.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Client} from 'pg';
import {randomUUID} from 'node:crypto';
import {fixtureDDL,seed} from '../authoring-release-production/package/test-fixture.mjs';
import {materials,hash,canonical,binding,snapshot,fingerprints,execute,preflight,postcommit} from './core.mjs';
export async function rehearse(raw) {
 const url=new URL(raw);
 assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/physcratic_authoring_test');
 assert.ok(['postgres:','postgresql:'].includes(url.protocol));assert.equal(url.search,'');assert.equal(url.hash,'');
 const admin=new Client({connectionString:raw});await admin.connect();
 const name='neondb',pass='synthetic-owner-only';let created=false,c,other;
 const connect=async(user='neondb_owner',password=pass)=>{const x=new Client({host:'127.0.0.1',port:Number(url.port)||5432,user,password,database:name,statement_timeout:15000});await x.connect();return x;};
 const checks=[],temporaryRoles=[];
 try {
  assert.equal((await admin.query("SELECT count(*)::int n FROM pg_database WHERE datname='neondb'")).rows[0].n,0,'REFUSE_EXISTING_DATABASE');
  assert.equal((await admin.query("SELECT count(*)::int n FROM pg_roles WHERE rolname='neondb_owner'")).rows[0].n,0,'REFUSE_EXISTING_ROLE');
  await admin.query("CREATE ROLE neondb_owner LOGIN PASSWORD 'synthetic-owner-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
  await admin.query('CREATE DATABASE neondb OWNER neondb_owner');created=true;
  c=await connect();other=await connect();
  await c.query('SET search_path=public,pg_catalog');
  for(const ddl of fixtureDDL())await c.query(ddl);
  await seed(c);
  const p=await materials(hash(await readFile(new URL('PACKAGE_SHA256SUMS',import.meta.url),'utf8')));
  for(const n of [1,2,3,4,5,6,16])await c.query(p.files[n-1].body);
  await c.query(await readFile(new URL('../../migrations/20261031_auth_rate_limit.sql',import.meta.url),'utf8'));
  await c.query(`CREATE TABLE physcratic_production_migrations(id text PRIMARY KEY,sha256 text NOT NULL CHECK(sha256~'^[a-f0-9]{64}$'),source_commit text NOT NULL,applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),applied_by text NOT NULL DEFAULT current_user,result text NOT NULL CHECK(result='verified'))`);
  for(const n of [1,2,3,4,5,6,16]){const f=p.files[n-1];await c.query("INSERT INTO physcratic_production_migrations(id,sha256,source_commit,result) VALUES($1,$2,$3,'verified')",[f.id,f.sha256,'1'.repeat(40)]);}
  const pid=randomUUID(),rid=randomUUID(),part=randomUUID();
  await c.query("INSERT INTO authored_problem(id,slug,owner_id) VALUES($1,'synthetic-preserved','synthetic-user-0')",[pid]);
  await c.query('BEGIN');
  await c.query("INSERT INTO authored_revision_part(revision_id,part_id,answer_mode) VALUES($1,$2,'numeric')",[rid,part]);
  await c.query("INSERT INTO authored_revision_private_part(revision_id,part_id,answer_mode,data) VALUES($1,$2,'numeric',$3)",[rid,part,JSON.stringify({partId:part,key:{kind:'numeric',value:2}})]);
  await c.query("INSERT INTO authored_revision(id,problem_id,number,content) VALUES($1,$2,1,$3)",[rid,pid,JSON.stringify({sections:[{parts:[{id:part,answerMode:'numeric'}]}]})]);
  await c.query('COMMIT');
  await c.query("UPDATE authored_problem SET state='published',published_revision_id=$1 WHERE id=$2",[rid,pid]);
  await c.query("INSERT INTO contest_problem(\"contestId\",\"problemId\",position,title,topic,statement,version,metadata,definition) VALUES('synthetic-contest','synthetic-problem',0,'Synthetic','mechanics','Retain me','v1','{}','{}')");
  await c.query("INSERT INTO contest_attempt(id,\"userId\",\"contestId\",\"problemId\",\"idempotencyKey\",version,answers,results) VALUES($1,'synthetic-user-0','synthetic-contest','synthetic-problem',$2,'v1','[]','[]')",[randomUUID(),randomUUID()]);
  const before=await snapshot(c),records=await fingerprints(c,before.report.tables.map(t=>t.name));
  const now=Date.now(),candidate='2'.repeat(40);
  const a={target:binding,candidate,baselineSchema:before.schemaHash,baselineRecords:hash(canonical(records)),approvalReference:'synthetic-owner-review',recoveryReference:'synthetic-restorable-point',recoveryErasurePlan:'synthetic-reerase-before-traffic',writerHoldReference:'synthetic-exclusive-hold',disabledFeaturesReference:'synthetic-all-features-disabled',recoveryVerifiedAt:new Date(now).toISOString(),start:new Date(now-1000).toISOString(),end:new Date(now+20*60000).toISOString()};
  await preflight(c,p,a);checks.push('Noncontiguous baseline validates canonical 0001-0006 and 0016 without replay.');
  await assert.rejects(execute(c,p,{...a,baselineSchema:'0'.repeat(64)},candidate),/SCHEMA_DRIFT/);
  await c.query("UPDATE physcratic_production_migrations SET sha256=$1 WHERE id=$2",['0'.repeat(64),p.files[15].id]);
  await assert.rejects(execute(c,p,a,candidate),/CHECKSUM_DRIFT/);
  await c.query("UPDATE physcratic_production_migrations SET sha256=$1 WHERE id=$2",[p.files[15].sha256,p.files[15].id]);
  await c.query('CREATE TABLE public.community_profile(unledgered integer)');
  const orphanSnapshot=await snapshot(c);
  await assert.rejects(execute(c,p,{...a,baselineSchema:orphanSnapshot.schemaHash},candidate),/UNLEDGERED_MIGRATION_OBJECT/);await c.query('DROP TABLE public.community_profile');
  checks.push('Ledger checksum, catalog drift and objects without ledger stop before installation.');
  const defaultRole='upgrade_default_'+randomUUID().replaceAll('-','');
  await admin.query(`CREATE ROLE "${defaultRole}" NOLOGIN`);
  try{
   await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO "${defaultRole}"`);
   const leaked=await snapshot(c);
   await assert.rejects(execute(c,p,{...a,baselineSchema:leaked.schemaHash},candidate),/UNREVIEWED_DEFAULT_PRIVILEGES/);
   await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM "${defaultRole}"`);
  }finally{await admin.query(`DROP ROLE "${defaultRole}"`);}
  checks.push('Creator default ACLs cannot silently give another role access to new private deletion tables.');
  await other.query("BEGIN;SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0))");
  await assert.rejects(execute(c,p,a,candidate),/COMPETING_MIGRATION/);await other.query('ROLLBACK');checks.push('Common advisory lock prevents competing releases.');
  // DDL event-trigger fault is local diagnostic injection, never a modified migration.
  const localAdmin=new Client({connectionString:raw.replace('/physcratic_authoring_test','/neondb')});await localAdmin.connect();
  await localAdmin.query(`CREATE FUNCTION upgrade_fault() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN IF current_query() LIKE '%CREATE TABLE community_profile_media (%' THEN RAISE EXCEPTION 'synthetic-upgrade-failure'; END IF; END $$;CREATE EVENT TRIGGER upgrade_fault ON ddl_command_start EXECUTE FUNCTION upgrade_fault()`);
  const faultSnapshot=await snapshot(c);const faultApproval={...a,baselineSchema:faultSnapshot.schemaHash};
  await assert.rejects(execute(c,p,faultApproval,candidate),/synthetic-upgrade-failure/);
  await localAdmin.query('DROP EVENT TRIGGER upgrade_fault;DROP FUNCTION upgrade_fault()');await localAdmin.end();
  assert.equal((await snapshot(c)).schemaHash,before.schemaHash);assert.deepEqual(await fingerprints(c,Object.keys(records)),records);checks.push('Mid-upgrade failure rolls back earlier DDL and ledger together, preserving all baseline records.');
  const result=await execute(c,p,a,candidate);
  assert.equal(result.installed.length,11);await other.end();other=await connect();assert.equal((await postcommit(other,p,result)).state,'independently-verified');assert.deepEqual(await fingerprints(c,Object.keys(records)),records);
  assert.deepEqual((await c.query('SELECT id FROM physcratic_production_migrations ORDER BY id')).rows.map(x=>x.id),p.files.map(x=>x.id));
  await assert.rejects(execute(c,p,a,candidate),/LEDGER_SET_MISMATCH/);checks.push('All eleven missing migrations commit atomically, preserve authoring/contest/auth records, and re-execution refuses replay.');
  const role='upgrade_runtime_'+randomUUID().replaceAll('-','');
  await admin.query(`CREATE ROLE "${role}" LOGIN PASSWORD 'synthetic-runtime-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);
  temporaryRoles.push(role);
  try {
   const del=role+'_deletion',op=role+'_operator';
   await admin.query(`CREATE ROLE "${del}" NOLOGIN;CREATE ROLE "${op}" NOLOGIN`);temporaryRoles.push(del,op);
   const grants=await readFile(new URL('role-grants.sql',import.meta.url),'utf8');
   await c.query(grants.replaceAll(':"runtime_role"','"'+role+'"').replaceAll(':"deletion_role"','"'+del+'"').replaceAll(':"operator_role"','"'+op+'"'));
   const runtime=await connect(role,'synthetic-runtime-only');
   try{await runtime.query('SELECT count(*) FROM authored_problem');await runtime.query('SELECT count(*) FROM contest_attempt');await runtime.query("INSERT INTO practice_check_rate(user_id,window_start,requests,submissions) VALUES('synthetic-user-0',clock_timestamp(),1,0)");await assert.rejects(runtime.query('DELETE FROM practice_check_attempt'),/permission denied/);await assert.rejects(runtime.query("SELECT account_deletion_execute('x','x','x','x')"),/permission denied/);await assert.rejects(runtime.query('CREATE TABLE public.forbidden(x int)'),/permission denied/);}finally{await runtime.end();}
   const {Pool}=await import('pg');
   const web=new Pool({host:'127.0.0.1',port:Number(url.port)||5432,user:role,password:'synthetic-runtime-only',database:name,max:2});
   try {
    const {hashPassword}=await import('better-auth/crypto');
    await c.query("UPDATE account SET password=$1 WHERE \"userId\"='synthetic-user-0'",[await hashPassword('synthetic-sign-in-password')]);
    const {betterAuth}=await import('better-auth');
    const {createAuthOptions}=await import('../../lib/auth-config.ts');
    const auth=betterAuth(createAuthOptions({pool:web,overrides:{baseURL:'http://localhost:3000',secret:'synthetic-b6b1-auth-secret-at-least-32-characters',logger:{disabled:true}}}));
    const response=await auth.handler(new Request('http://localhost:3000/api/auth/sign-in/email',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({email:'synthetic-0@example.invalid',password:'synthetic-sign-in-password'})}));
    assert.equal(response.status,200,await response.clone().text());
    const {createProblemAuthoringApi}=await import('../../lib/problem-authoring-api.ts');
    const author=createProblemAuthoringApi({pool:web,user:async()=>({id:'synthetic-user-0',emailVerified:true}),origin:()=>true});
    const part=randomUUID(),doc={content:{title:'Synthetic Motion',topicTags:[],methodTags:[],estimatedDifficulty:'1200',context:[{id:randomUUID(),kind:'text',spans:[{kind:'text',text:'Find the displacement.'}]}],sections:[{id:randomUUID(),title:'Motion',blocks:[],parts:[{id:part,label:'A',answerMode:'numeric',blocks:[]}]}],attachments:[],provenance:{kind:'original',source:'',rightsDeclaration:'Synthetic owned content.'}},privateParts:[{partId:part,key:{kind:'numeric',value:2,units:'',absTol:0.01,relTol:0},hints:[],solution:[]}]};
    const req=body=>new Request('http://localhost:3000/api',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify(body)});
    const made=await author('create',req(doc));assert.equal(made.status,201,await made.clone().text());const item=await made.json();
    const published=await author('publish',req({version:1}),item.problemId);assert.equal(published.status,200,await published.clone().text());
    await web.query('INSERT INTO contest_registration("userId","contestId") VALUES($1,$2) ON CONFLICT DO NOTHING',['synthetic-user-1','synthetic-contest']);
    const {createPracticeCheckApi}=await import('../../lib/practice-check-api.ts');
    const {practiceCheckCatalog}=await import('../../lib/practice-check-catalog.ts');
    const checker=createPracticeCheckApi({pool:web,user:async()=>({id:'synthetic-user-0',emailVerified:true}),origin:()=>true});
    const selection=practiceCheckCatalog().find(x=>x.metadata.problemId==='incline').metadata;
    const intent={problemId:'incline',version:selection.version,idempotencyKey:randomUUID(),answers:[{partId:'answer',latex:'4.9'}]};
    const checkRequest=()=>new Request('http://localhost:3000/api/practice-checks',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json','X-Practice-Account':'synthetic-user-0'},body:JSON.stringify(intent)});
    const saved=await checker('submit',checkRequest());assert.equal(saved.status,201,await saved.clone().text());
    const replay=await checker('submit',checkRequest());assert.equal(replay.status,200,await replay.clone().text());
    assert.equal((await web.query('SELECT count(*)::int n FROM practice_check_attempt')).rows[0].n,1);
    checks.push('The same reviewed grants support real Better Auth sign-in, production authoring create/publish existing contest registration and real server-owned practice save/replay.');
   }finally{await web.end();}
   const rights=await c.query("SELECT has_function_privilege($1,'account_deletion_execute(text,text,text,text)','EXECUTE') AS del,has_table_privilege($1,'account_deletion_receipt_store','DELETE') AS direct,has_function_privilege($2,'account_deletion_execute(text,text,text,text)','EXECUTE') AS operator_delete",[del,op]);assert.deepEqual(rights.rows[0],{del:true,direct:false,operator_delete:false});

   checks.push('Restricted runtime reads existing authoring/contests and uses ledger rate writes, but cannot DELETE immutable attempts, execute deletion or CREATE. Service/operator grants remain distinct without table DML.');
  } finally {/* Roles are removed after the owned test database below. */}
  return {status:'PASS',postgresql:'18.7',productionConnections:0,checks,baseline:before.rows.map(r=>({id:r.id,sha256:r.sha256})),installed:result.installed};
 }finally{if(c)await c.end().catch(()=>{});if(other)await other.end().catch(()=>{});if(created){await admin.query('DROP DATABASE neondb WITH (FORCE)');await admin.query('DROP ROLE neondb_owner');for(const role of temporaryRoles)await admin.query('DROP ROLE '+JSON.stringify(role));}await admin.end();}
}
