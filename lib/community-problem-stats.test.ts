import assert from 'node:assert/strict';
import test from 'node:test';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {createProblemStatsApi} from './community/problem-stats-api';
import {createProblemStatsRoute,communityProblemStatsEnabled} from './community/problem-stats-route';
import {achievementFixtures,achievementMigrations,achievementRequest as rawRequest,achievementParsed as parsed} from '../tests/community-achievement-fixtures';
const req=(...args:Parameters<typeof rawRequest>)=>{const r=rawRequest(...args);if(args[0])r.headers.set('X-Community-Account',args[0]);return r;};
const staticKey='arena:arena-mind-the-gap';
test('default-off statistics gate cannot import missing schema/session bindings',async()=>{
 assert.equal(communityProblemStatsEnabled({}),false);let loaded=false;const route=createProblemStatsRoute(()=>false,async()=>{loaded=true;throw Error();});assert.equal((await route(new Request('https://test'))).status,503);assert.equal(loaded,false);
});
const url=process.env.AUTHORING_TEST_DATABASE_URL;
test('0012 favourites, exact solve eligibility, isolation and concurrency on disposable PostgreSQL',{skip:!url},async()=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');const schema='stats_'+randomUUID().replaceAll('-',''),role=schema+'_runtime';const admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema};CREATE ROLE ${role} NOLOGIN`);const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`});let runtime:Pool|undefined;
 try{
 await pool.query('CREATE TABLE "user"(id text PRIMARY KEY,"emailVerified" boolean NOT NULL DEFAULT true)');
 for(const migration of achievementMigrations.filter(v=>!v.startsWith('0007')))await pool.query('BEGIN;'+await readFile(`migrations/${migration}.up.sql`,'utf8')+'COMMIT;');
 const up=await readFile('migrations/0012_community_problem_stats.up.sql','utf8'),down=await readFile('migrations/0012_community_problem_stats.down.sql','utf8');
 for(const sql of [up,down,up])await pool.query('BEGIN;'+sql+'COMMIT;');
 const f=achievementFixtures(pool),owner=await f.user(undefined,false),student=await f.user(undefined,false),other=await f.user(undefined,false),unverified=await f.user('unverified',false);await pool.query('UPDATE "user" SET "emailVerified"=false WHERE id=$1',[unverified]);
 const p=await f.problem(owner,['numeric','numeric']),key='authored:'+p.id;
 await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role};GRANT SELECT ON "user",authored_problem,authored_revision,authored_revision_part,authored_attempt,community_problem_total TO ${role};GRANT UPDATE ON authored_problem TO ${role};GRANT SELECT,INSERT,DELETE ON community_favourite TO ${role};GRANT SELECT,INSERT,UPDATE ON community_favourite_limit TO ${role}`);
 runtime=new Pool({connectionString:url,options:`-c search_path=${schema},public -c role=${role}`});const api=createProblemStatsApi({...f.deps,pool:runtime});
 const write=(who:string|undefined,k=key,favourite=true,extra={})=>api(req(who,{key:k,favourite,...extra},'PUT','/api'));
 const read=async(who?:string,keys=[key,staticKey])=>parsed(await api(req(who,undefined,'GET','/api?'+new URLSearchParams({keys:JSON.stringify(keys)}))));
 const shadow=await runtime.connect();
 await shadow.query('CREATE TEMP TABLE community_problem_total(problem_key text PRIMARY KEY,favourites bigint CHECK(false))');
 await shadow.query('INSERT INTO community_favourite(user_id,problem_key) VALUES($1,$2)',[owner,staticKey]);
 assert.equal(Number((await pool.query(`SELECT favourites FROM ${schema}.community_problem_total WHERE problem_key=$1`,[staticKey])).rows[0].favourites),1);
 await shadow.query('DELETE FROM community_favourite WHERE user_id=$1 AND problem_key=$2',[owner,staticKey]);
 await shadow.query('DROP TABLE pg_temp.community_problem_total');shadow.release();
 assert.equal((await write(undefined)).status,401);assert.equal((await write(unverified)).status,403);assert.equal((await write(student,key,true,{userId:owner})).status,400);
 const wrongOrigin=req(student,{key,favourite:true},'PUT');wrongOrigin.headers.set('origin','https://evil.test');assert.equal((await api(wrongOrigin)).status,403);
 for(const k of ['authored:not-a-uuid','arena:fake',owner])assert.equal((await write(student,k)).status,400);
 assert.equal((await write(student,'authored:'+randomUUID())).status,404);
 await Promise.all(Array.from({length:15},()=>write(student)));let state=await read(student);assert.equal(state.problems[0].favourites,1);assert.equal(state.problems[0].favourite,true);assert.equal(state.problems[0].solves,0);assert.equal(state.problems[1].solves,null);
 await write(other);state=await read();assert.equal(state.problems[0].favourites,2);assert.equal(state.problems[0].favourite,false);assert.ok(!JSON.stringify(state).includes(student));
 await Promise.all(Array.from({length:10},()=>write(student,key,false)));assert.equal((await read(student)).problems[0].favourites,1);
 await write(student);assert.equal((await read(student)).problems[0].favourite,true);assert.equal((await read(owner)).problems[0].favourite,false);
 await assert.rejects(runtime.query('UPDATE community_problem_total SET favourites=100'));await assert.rejects(runtime.query('TRUNCATE community_favourite'));
 await parsed(await f.submit(p,student,0),201);assert.equal((await read()).problems[0].solves,0);
 await parsed(await f.submit(p,student,1),201);await parsed(await f.submit(p,student,1),201);assert.equal((await read()).problems[0].solves,1);
 await parsed(await f.submit(p,owner,0),201);await parsed(await f.submit(p,owner,1),201);assert.equal((await read()).problems[0].solves,1);
 // Any reveal assists all later parts, even after permission revocation.
 await parsed(await f.solutions('permission-write',req(owner,{revisionId:p.revision.id,version:0,enabled:true,mediaIds:[]},'PUT'),p.id,p.parts[0].id));
 await parsed(await f.solutions('view',req(other,{revisionId:p.revision.id}),p.id,p.parts[0].id));
 await parsed(await f.submit(p,other,0),201);await parsed(await f.submit(p,other,1),201);assert.equal((await read()).problems[0].solves,1);
 await pool.query('UPDATE "user" SET "emailVerified"=false WHERE id=$1',[student]);assert.equal((await read()).problems[0].solves,0);await pool.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1',[student]);
 const manual=await f.problem(owner,['numeric','manual']);await parsed(await f.submit(manual,student,0),201);assert.equal((await read(undefined,['authored:'+manual.id])).problems[0].solves,0);
 // An in-flight unpublish waits for a favourite transaction's publication lock.
 const lock=await pool.connect();await lock.query('BEGIN');await lock.query('SELECT id FROM authored_problem WHERE id=$1 FOR UPDATE',[p.id]);let ended=false;const racing=write(other).then(r=>{ended=true;return r;});await new Promise(r=>setTimeout(r,60));assert.equal(ended,false);await lock.query("UPDATE authored_problem SET state='draft' WHERE id=$1",[p.id]);await lock.query('COMMIT');lock.release();assert.equal((await racing).status,404);assert.ok(!(await read()).problems.some((v:{key:string})=>v.key===key));
 await pool.query("UPDATE authored_problem SET state='published' WHERE id=$1",[p.id]);assert.equal((await read(student)).problems[0].favourites,2);
 // Changing the current revision invalidates old complete solves; returning it restores evidence.
 const oldRevision=p.revision;
 const published=await parsed(await f.author('publish',req(owner,{version:p.version}),p.id));p.revision=published.revision;
 assert.equal((await read()).problems[0].solves,0);
 await parsed(await f.submit(p,student,0),201);assert.equal((await read()).problems[0].solves,0);
 await parsed(await f.submit(p,student,1),201);assert.equal((await read()).problems[0].solves,1);
 assert.notEqual(p.revision.id,oldRevision.id);
 // Repeated successful evidence beyond the fixed budget reports unavailable, never a partial number.
 await pool.query(`INSERT INTO authored_attempt(id,user_id,problem_id,revision_id,part_id,idempotency_key,answer,status,reason,engine_version,attempt_number)
 SELECT gen_random_uuid(),$1,$2,$3,$4,gen_random_uuid(),' {"kind":"numeric","value":2,"units":"1"}'::jsonb,'correct','within-tolerance','numeric-v1',n FROM generate_series(100,20100) n`,[owner,p.id,p.revision.id,p.parts[0].id]);
 assert.equal((await read()).problems[0].solves,null);
 await assert.rejects(pool.query('BEGIN;'+down+'COMMIT;'));await pool.query('ROLLBACK');
 await pool.query('DELETE FROM community_favourite_limit WHERE user_id=$1',[student]);for(let i=0;i<60;i++)assert.equal((await write(student,staticKey)).status,200);assert.equal((await write(student,staticKey)).status,429);
 }finally{await runtime?.end();await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE;DROP ROLE ${role}`);await admin.end();}
});

test('stale displayed account rejects stats reads and writes before database access',async()=>{
 let calls=0;
 const pool={query:async()=>{calls++;throw Error('must not charge quota');},connect:async()=>{calls++;throw Error('must not read stats');}};
 for(const user of [{id:'B',emailVerified:true},null]){
  const api=createProblemStatsApi({pool:pool as unknown as Pool,user:async()=>user,origin:()=>true});
  for(const method of ['GET','PUT']){
   const response=await api(new Request('https://test/api/community/problem-stats',{method,headers:{'X-Community-Account':'A'}}));
   assert.equal(response.status,409);assert.equal(response.headers.get('Vary'),'Cookie, X-Community-Account');
   assert.ok(!JSON.stringify(await response.json()).includes('B'));
  }
 }
 assert.equal(calls,0);
});
