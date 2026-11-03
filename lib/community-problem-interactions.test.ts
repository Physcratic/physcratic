import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { createProblemInteractionsApi } from './community/problem-interactions-api';
import { createProblemInteractionsRoute,problemInteractionsEnabled } from './community/problem-interactions-route';
import { favoriteWriteSchema,interactionKeysSchema } from './community/problem-interactions';
import { achievementFixtures,achievementRequest as req,achievementParsed as parsed,achievementMigrations } from '../tests/community-achievement-fixtures';
const key='arena:arena-mind-the-gap';
test('flag off never loads auth/database, and keys/body cannot spoof owners',async()=>{
 let loads=0;const route=createProblemInteractionsRoute(()=>false,async()=>{loads++;throw Error('must not load');});
 for(const method of ['GET','PUT'])assert.equal((await route(new Request('https://test/',{method}))).status,503);
 assert.equal(loads,0);assert.equal(problemInteractionsEnabled({}),false);assert.equal(problemInteractionsEnabled({COMMUNITY_PROBLEM_INTERACTIONS_ENABLED:'1'}),false);
 assert.equal(interactionKeysSchema.safeParse([key,key]).success,false);
 for(const bad of ['arena:unknown','archive:ipho-2025-t1','authored:fake','authored:ABCDEF12-1234-4123-8123-123456789012'])assert.equal(interactionKeysSchema.safeParse([bad]).success,false);
 assert.equal(favoriteWriteSchema.safeParse({key,favourite:true,userId:'someone'}).success,false);
});
const url=process.env.AUTHORING_TEST_DATABASE_URL;
test('favourites and exact independent completion snapshots on disposable PostgreSQL',{skip:!url},async t=>{
 const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
 const schema='interactions_'+randomUUID().replaceAll('-',''),role='interactions_role_'+randomUUID().replaceAll('-','');
 const admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${role} NOLOGIN`);
 const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`});let runtime:Pool|undefined;
 try{
  await pool.query('CREATE TABLE "user"(id text PRIMARY KEY,"emailVerified" boolean NOT NULL DEFAULT true)');
  for(const name of achievementMigrations.slice(0,6))await pool.query('BEGIN;'+await readFile(`migrations/${name}.up.sql`,'utf8')+'COMMIT;');
  const migration=await readFile('migrations/0012_community_problem_interactions.up.sql','utf8'),down=await readFile('migrations/0012_community_problem_interactions.down.sql','utf8');
  await pool.query('BEGIN;'+migration+'COMMIT;');await pool.query('BEGIN;'+down+'COMMIT;');await pool.query('BEGIN;'+migration+'COMMIT;');
  await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}; GRANT SELECT ON "user",authored_problem,authored_revision,authored_revision_part,authored_attempt TO ${role}; GRANT UPDATE(state) ON authored_problem TO ${role}; GRANT SELECT,INSERT,DELETE ON community_favorite TO ${role}; GRANT SELECT,INSERT,UPDATE ON community_interaction_limit TO ${role}`);
  runtime=new Pool({connectionString:url,options:`-c search_path=${schema},public -c role=${role}`,max:12});
  const f=achievementFixtures(pool),owner=await f.user(randomUUID(),false),student=await f.user(randomUUID(),false),other=await f.user(randomUUID(),false),unverified=await f.user('unverified',false);
  await pool.query('UPDATE "user" SET "emailVerified"=false WHERE id=$1',[unverified]);
  const api=createProblemInteractionsApi({...f.deps,pool:runtime});
  const get=async(keys=[key],who?:string)=>api(req(who,undefined,'GET','/api?'+new URLSearchParams({keys:keys.join(',')})));
  const put=(who:string|undefined,k=key,favourite=true)=>api(req(who,{key:k,favourite},'PUT'));
  const stats=async(k=key,who?:string)=>(await parsed(await get([k],who))).problems[0];
  await t.test('guest privacy, verified writes, uniqueness, retries, removal and quotas',async()=>{
   assert.deepEqual(await stats(),{key,favourites:0,completed:null,favourite:false,canFavourite:false});
   assert.equal((await put(undefined)).status,401);assert.equal((await put(unverified)).status,403);
   const badOrigin=req(student,{key,favourite:true},'PUT');badOrigin.headers.set('origin','https://evil.test');assert.equal((await api(badOrigin)).status,403);
   const results=await Promise.all(Array.from({length:10},()=>put(student)));assert.ok(results.every(r=>r.status===200));
   assert.equal((await stats()).favourites,1);assert.equal((await stats(key,student)).favourite,true);assert.equal((await stats(key,other)).favourite,false);
   await parsed(await put(other));assert.equal((await stats()).favourites,2);
   await Promise.all([put(student,key,false),put(student,key,false)]);assert.equal((await stats()).favourites,1);
   const response=await get([key],other);assert.match(response.headers.get('cache-control')!,/private.*no-store/);const json=await response.text();assert.ok(!json.includes(other)&&!json.includes(owner));
   const switched=req(student,{key,favourite:true},'PUT');switched.headers.set('x-expected-viewer',other);assert.equal((await api(switched)).status,409);
   await pool.query('UPDATE community_interaction_limit SET requests=30 WHERE user_id=$1',[student]);assert.equal((await put(student)).status,429);
   await pool.query('DELETE FROM community_interaction_limit');
  });
  await t.test('current public revision, all parts, supported engine/reason, current verified user, independent attempts only',async()=>{
   const p=await f.problem(owner,['numeric','expression']),k='authored:'+p.id;
   assert.equal((await stats(k)).completed,0);assert.equal((await put(owner,k)).status,403);
   await parsed(await f.submit(p,student),201);assert.equal((await stats(k)).completed,0);
   await parsed(await f.submit(p,student,1,{kind:'expression',expression:'x+1'}),201);assert.equal((await stats(k)).completed,1);
   await parsed(await f.submit(p,student),201);assert.equal((await stats(k)).completed,1);
   await pool.query('UPDATE "user" SET "emailVerified"=false WHERE id=$1',[student]);assert.equal((await stats(k)).completed,0);await pool.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1',[student]);
   await parsed(await f.submit(p,owner),201);await parsed(await f.submit(p,owner,1,{kind:'expression',expression:'x+1'}),201);assert.equal((await stats(k)).completed,1);
   const manual=await f.problem(owner,['numeric','manual']);assert.equal((await stats('authored:'+manual.id)).completed,null);
   const large=await f.problem(owner,Array.from({length:33},()=> 'numeric' as const));assert.equal((await stats('authored:'+large.id)).completed,null);await parsed(await put(student,'authored:'+large.id));
   const assisted=await f.problem(owner),part=assisted.parts[0].id;
   await parsed(await f.solutions('permission-write',req(owner,{revisionId:assisted.revision.id,version:0,enabled:true,mediaIds:[]},'PUT'),assisted.id,part));
   await parsed(await f.solutions('view',req(student,{revisionId:assisted.revision.id}),assisted.id,part));
   const helped=await parsed(await f.submit(assisted,student),201);assert.equal(helped.attempt.assisted,true);assert.equal((await stats('authored:'+assisted.id)).completed,0);
   await parsed(await f.author('publish',req(owner,{version:p.version}),p.id));p.version++;assert.equal((await stats(k)).completed,0);
   await parsed(await put(student,k));await pool.query("UPDATE authored_problem SET state='draft' WHERE id=$1",[p.id]);assert.equal((await get([k])).status,404);assert.equal((await put(student,k)).status,404);
   const ownWithdrawn=await stats(k,student);assert.equal(ownWithdrawn.favourite,true);assert.equal(ownWithdrawn.favourites,null);assert.equal(ownWithdrawn.completed,null);assert.equal((await get([k],other)).status,404);
   const removed=await parsed(await put(student,k,false));assert.equal(removed.problems[0].favourites,null);assert.equal(removed.problems[0].favourite,false);
   assert.equal((await get(['authored:'+randomUUID()])).status,404);
  });
  await t.test('publication locks recheck concurrent withdrawal',async()=>{
   const p=await f.problem(owner),k='authored:'+p.id,held=await pool.connect();
   try{
    await held.query('BEGIN');await held.query("UPDATE authored_problem SET state='draft' WHERE id=$1",[p.id]);
    const read=get([k]),write=put(other,k);await new Promise(r=>setTimeout(r,100));await held.query('COMMIT');
    assert.equal((await read).status,404);assert.equal((await write).status,404);
   }finally{await held.query('ROLLBACK');held.release();}
  });
  await t.test('bounded validation, no partial batch leakage and populated down refusal',async()=>{
   const mixedProblem=await f.problem(owner);
   const mixed=await parsed(await get([key,'authored:'+mixedProblem.id]));assert.equal(mixed.problems.length,2);assert.equal(mixed.problems[0].completed,null);assert.equal(mixed.problems[1].completed,0);
   assert.equal((await get([key,'authored:'+randomUUID()])).status,404);
   assert.equal((await get([key,key])).status,400);assert.equal((await get(['arena:unknown'])).status,400);
   const bad=req(student,{key,favourite:true,userId:other},'PUT');assert.equal((await api(bad)).status,400);
   await pool.query('BEGIN');await assert.rejects(pool.query(down),/Saved favourites exist/);await pool.query('ROLLBACK');
  });
  await t.test('work/storage budgets return unavailable rather than truncated totals',async()=>{
   const p=await f.problem(owner),k='authored:'+p.id;await parsed(await f.submit(p,student),201);
   await pool.query(`INSERT INTO "user"(id) SELECT 'cap_user_'||n FROM generate_series(1,10001) n`);
   await pool.query(`INSERT INTO authored_attempt SELECT (jsonb_populate_record(NULL::authored_attempt,
    to_jsonb(seed)||jsonb_build_object('id',gen_random_uuid(),'user_id',u.id,'idempotency_key',gen_random_uuid()))).*
    FROM (SELECT * FROM authored_attempt WHERE problem_id=$1 LIMIT 1) seed CROSS JOIN
    (SELECT id FROM "user" WHERE id LIKE 'cap_user_%' ORDER BY id LIMIT 2001) u`,[p.id]);
   assert.equal((await stats(k)).completed,null);
   await pool.query(`INSERT INTO community_favorite(user_id,problem_key) SELECT id,$1 FROM "user" WHERE id LIKE 'cap_user_%'`,[key]);
   assert.equal((await stats()).favourites,null);
   await pool.query(`INSERT INTO community_favorite(user_id,problem_key) SELECT $1,'authored:'||gen_random_uuid()::text FROM generate_series(1,999)`,[other]);
   assert.equal((await put(other,k)).status,409);await parsed(await put(other,key));
   const stale=(await pool.query("SELECT problem_key FROM community_favorite WHERE user_id=$1 AND problem_key LIKE 'authored:%' LIMIT 1",[other])).rows[0].problem_key;
   await parsed(await put(other,stale,false));await parsed(await put(other,k));
  });
 }finally{await runtime?.end();await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE; DROP ROLE ${role}`);await admin.end();}
});
