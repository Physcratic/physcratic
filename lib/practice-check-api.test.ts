import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { createPracticeCheckApi } from './practice-check-api';
import { practiceCheckCatalog } from './practice-check-catalog';
import { gradeArchiveAnswers } from './archive-grading';
import { getArchiveDefinition } from './archive-grading/catalog';
import { handleArchiveGrade } from './archive-grading-request';
import { practiceCheckRequestSchema } from './practice-check-contracts';
import { isAllowedSubmissionOrigin } from './submission-security';
const url=process.env.AUTHORING_TEST_DATABASE_URL;

test('practice-check transport rejects forged grades and unsafe Unicode',()=>{
  const base={problemId:'incline',version:'a'.repeat(64),answers:[{partId:'answer',latex:'4.9'}],idempotencyKey:randomUUID()};
  assert.equal(practiceCheckRequestSchema.safeParse(base).success,true);
  for(const patch of [{correct:true},{userId:'victim'},{results:[]},{answers:[]},{answers:[{partId:'answer',latex:'\u0000'}]},{answers:[{partId:'answer',latex:'\ud800'}]},{answers:[{partId:'answer',latex:'x'.repeat(1025)}]}])assert.equal(practiceCheckRequestSchema.safeParse({...base,...patch}).success,false);
});

test('server-owned practice/Arena ledger on disposable PostgreSQL',{skip:!url&&'Use scripts/test-problem-authoring.sh'},async t=>{
  const target=new URL(url!);assert.equal(target.hostname,'127.0.0.1');assert.equal(target.pathname,'/physcratic_authoring_test');
  const schema='practice_check_'+randomUUID().replaceAll('-','');
  const admin=new Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema}`);
  const pool=new Pool({connectionString:url,options:`-c search_path=${schema},public`,max:12,statement_timeout:5000,connectionTimeoutMillis:3000});
  const sessions=new Map<string,{id:string;emailVerified:boolean}>();
  let catalog=practiceCheckCatalog(),gradeCalls=0;
  const deps={pool,user:async(r:Request)=>sessions.get(r.headers.get('x-user')??''),origin:(r:Request)=>isAllowedSubmissionOrigin(r,['https://physcratic.test']),catalog:()=>catalog,grade:(input:Parameters<typeof gradeArchiveAnswers>[0])=>{gradeCalls++;return gradeArchiveAnswers(input);}};
  const api=createPracticeCheckApi(deps);
  const numeric=practiceCheckCatalog().find(e=>e.metadata.problemId==='incline')!;
  const arena=practiceCheckCatalog().find(e=>e.metadata.problemId==='arena-mind-the-gap')!;
  const up=await readFile('migrations/0017_practice_checks.up.sql','utf8'),down=await readFile('migrations/0017_practice_checks.down.sql','utf8');
  async function actor(verified=true){const id=randomUUID();sessions.set(id,{id,emailVerified:verified});await pool.query('INSERT INTO "user" VALUES($1)',[id]);return id;}
  function request(user?:string,body?:unknown,options:{origin?:string;query?:string;type?:string;account?:string}={}){return new Request('https://physcratic.test/api'+(options.query??''),{method:body===undefined?'GET':'POST',headers:{origin:options.origin??'https://physcratic.test','content-type':options.type??'application/json',...(user?{'x-user':user,'x-practice-account':options.account??user}:{})},body:body===undefined?undefined:JSON.stringify(body)});}
  function input(latex='4.9'){return {problemId:'incline',version:numeric.metadata.version,answers:[{partId:'answer',latex}],idempotencyKey:randomUUID()};}
  async function json(response:Response,status=200){assert.equal(response.status,status,await response.clone().text());assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'Cookie, X-Practice-Account');return response.json();}
  async function progress(user:string){return json(await api('progress',request(user)));}
  const submit=(user:string,body:unknown)=>api('submit',request(user,body));
  async function seed(user:string,n:number){
    const {idempotencyKey:unused,...gradeInput}=input();void unused;const grade=gradeArchiveAnswers(gradeInput);const records=Array.from({length:n},()=>({id:randomUUID(),key:randomUUID()}));
    await pool.query(`INSERT INTO practice_check_attempt(id,user_id,kind,problem_id,version,idempotency_key,answers,results,created_at)
      SELECT r.id::uuid,$1,'practice','incline',$2,r.key::uuid,$3::jsonb,$4::jsonb,$6::timestamptz
      FROM jsonb_to_recordset($5::jsonb) AS r(id text,key text)`,[user,numeric.metadata.version,JSON.stringify(input().answers),JSON.stringify(grade.results),JSON.stringify(records),new Date().toISOString()]);
    return records;
  }
  try{
    await pool.query('CREATE TABLE "user"(id text PRIMARY KEY); CREATE TABLE legacy_marker(id integer PRIMARY KEY); INSERT INTO legacy_marker VALUES(17)');
    await pool.query('BEGIN;'+up+'COMMIT;');
    await t.test('additive empty down/up preserves existing data and duplicate installation fails',async()=>{
      await pool.query('BEGIN;'+down+'COMMIT;');await pool.query('BEGIN;'+up+'COMMIT;');
      assert.deepEqual((await pool.query('SELECT * FROM legacy_marker')).rows,[{id:17}]);
      await assert.rejects(pool.query('BEGIN;'+up+'COMMIT;'),/already exists/);await pool.query('ROLLBACK');
    });
    await t.test('guest checker remains independent, while private writes require verified session and origin',async()=>{
      const guest=await handleArchiveGrade(request(undefined,{problemId:'incline',version:numeric.metadata.version,answers:input().answers}),['https://physcratic.test']);
      assert.equal(guest.status,200);assert.equal((await guest.json()).results[0].status,'correct');
      await json(await api('submit',request(undefined,input())),401);
      const unverified=await actor(false);await json(await submit(unverified,input()),403);
      const user=await actor();await json(await api('submit',request(user,input(),{origin:'https://attacker.invalid'})),403);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM practice_check_rate')).rows[0].n,0);
    });
    await t.test('actual correct and incorrect numeric results are private and best-correct is monotonic',async()=>{
      const user=await actor(),other=await actor();
      const wrong=await json(await submit(user,input('1')),201);assert.equal(wrong.attempt.results[0].status,'incorrect');
      let p=await progress(user);assert.equal(p.progress[0].status,'in-progress');assert.equal(p.progress[0].incorrectParts,1);
      const right=await json(await submit(user,input()),201);assert.equal(right.attempt.results[0].status,'correct');
      await json(await submit(user,input('1')),201);p=await progress(user);
      assert.equal(p.progress[0].status,'solved');assert.equal(p.progress[0].correctParts,1);assert.equal(p.solvedProblems,1);assert.equal(p.progress.length,1);assert.equal(p.savedChecks,3);
      assert.equal((await progress(other)).progress.length,0);
      await json(await api('progress',request(other,undefined,{account:user})),409);
      await json(await api('submit',request(other,input(),{account:user})),409);
      assert.equal((await progress(other)).savedChecks,0);
      const own=await json(await api('history',request(user)));assert.equal(own.attempts.length,3);
      assert.ok(own.attempts.every((a:Record<string,unknown>)=>!('userId'in a)&&!('user_id'in a)&&!('idempotencyKey'in a)));
      assert.equal((await json(await api('history',request(other)))).attempts.length,0);
    });
    await t.test('partial Arena successes combine across compatible attempts, not unanswered parts',async()=>{
      const user=await actor();const definition=getArchiveDefinition(arena.metadata.problemId)!;
      const parts=definition.parts.filter(p=>p.kind!=='self-review');assert.equal(parts.length,2);
      const answers=parts.map(p=>({partId:p.id,latex:p.kind==='expression'||p.kind==='special'?p.canonical:p.kind==='numeric'?String(p.target):''}));
      const body=(answer:typeof answers[number])=>({problemId:arena.metadata.problemId,version:arena.metadata.version,answers:[answer],idempotencyKey:randomUUID()});
      await json(await submit(user,body(answers[0])),201);
      let p=(await progress(user)).progress[0];assert.equal(p.status,'in-progress');assert.equal(p.correctParts,1);assert.equal(p.requiredParts,2);assert.equal(p.incorrectParts,0);
      await json(await submit(user,body(answers[1])),201);p=(await progress(user)).progress[0];assert.equal(p.status,'solved');assert.equal(p.correctParts,2);
    });
    await t.test('duplicate concurrent requests replay once and a changed payload cannot reuse a key',async()=>{
      const user=await actor(),body=input(),before=gradeCalls;
      const responses=await Promise.all([submit(user,body),submit(user,body)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);
      const receipts=await Promise.all(responses.map(r=>r.json()));assert.equal(receipts[0].attempt.id,receipts[1].attempt.id);assert.equal(gradeCalls-before,1);
      await json(await submit(user,{...body,answers:[{partId:'answer',latex:'1'}]}),409);
      assert.equal((await progress(user)).savedChecks,1);
    });
    await t.test('concurrent distinct-part successes are not lost',async()=>{
      const user=await actor(),definition=getArchiveDefinition(arena.metadata.problemId)!;
      const bodies=definition.parts.filter(p=>p.kind!=='self-review').map(p=>({problemId:arena.metadata.problemId,version:arena.metadata.version,answers:[{partId:p.id,latex:p.kind==='expression'||p.kind==='special'?p.canonical:p.kind==='numeric'?String(p.target):''}],idempotencyKey:randomUUID()}));
      assert.equal(bodies.length,2);await Promise.all(bodies.map(async b=>json(await submit(user,b),201)));
      assert.equal((await progress(user)).progress[0].status,'solved');
      const both={...bodies[0],idempotencyKey:randomUUID(),answers:bodies.flatMap(b=>b.answers)};
      const first=await json(await submit(user,both),201);const replay=await json(await submit(user,{...both,answers:[...both.answers].reverse()}),200);assert.equal(replay.attempt.id,first.attempt.id);
    });
    await t.test('inconclusive, invalid and self-review are not incorrect progress',async()=>{
      const user=await actor();await json(await submit(user,input('not_a_number')),201);
      const p=await progress(user);assert.equal(p.progress[0].status,'not-graded');assert.equal(p.inProgressProblems,0);assert.equal(p.solvedProblems,0);
      const reviewUser=await actor();const reviewApi=createPracticeCheckApi({...deps,grade:(body)=>({...gradeArchiveAnswers(body),results:[{partId:'answer',status:'inconclusive',message:'Could not decide.'}]})});
      await json(await reviewApi('submit',request(reviewUser,input())),201);assert.equal((await progress(reviewUser)).progress[0].status,'not-graded');
      const selfReview=practiceCheckCatalog().find(e=>e.metadata.parts.some(p=>p.kind==='self-review'))!;
      const reviewPart=selfReview.metadata.parts.find(p=>p.kind==='self-review')!;
      const selfUser=await actor();
      await json(await submit(selfUser,{problemId:selfReview.metadata.problemId,version:selfReview.metadata.version,answers:[{partId:reviewPart.id,latex:'My own reasoning'}],idempotencyKey:randomUUID()}),201);
      assert.equal((await progress(selfUser)).progress[0].status,'not-graded');
    });
    await t.test('version changes cannot combine old progress and committed old keys replay before catalogue work',async()=>{
      const user=await actor(),body=input();const saved=await json(await submit(user,body),201),before=gradeCalls;
      catalog=catalog.map(e=>e.metadata.problemId==='incline'?{...e,metadata:{...e.metadata,version:'f'.repeat(64)}}:e);
      assert.equal((await progress(user)).progress.length,0);assert.equal((await progress(user)).savedChecks,1);
      await json(await submit(user,input()),409);
      catalog=[];const replay=await json(await submit(user,body));assert.equal(replay.attempt.id,saved.attempt.id);assert.equal(gradeCalls,before);
      catalog=practiceCheckCatalog();
    });
    await t.test('lost committed response is explicitly unconfirmed and same-key retry returns the committed record',async()=>{
      const user=await actor(),body=input();let lose=true;
      const unstable=Object.create(pool) as Pool;unstable.query=pool.query.bind(pool);
      unstable.connect=(async()=>{const c=await pool.connect();return new Proxy(c,{get(target,key,receiver){if(key==='query')return async(...args:unknown[])=>{const value=await (target.query as(...a:unknown[])=>Promise<unknown>)(...args);if(args[0]==='COMMIT'&&lose){lose=false;throw new TypeError('lost receipt');}return value;};const value=Reflect.get(target,key,receiver);return typeof value==='function'?value.bind(target):value;}});}) as Pool['connect'];
      const faulty=createPracticeCheckApi({...deps,pool:unstable});const unknown=await json(await faulty('submit',request(user,body)),503);assert.equal(unknown.saveState,'unconfirmed');
      const retry=await json(await submit(user,body));assert.equal(retry.replayed,true);assert.equal((await progress(user)).savedChecks,1);
    });
    await t.test('history keyset is stable at equal millisecond timestamps and forged cursors remain account-scoped',async()=>{
      const user=await actor(),other=await actor();await seed(user,55);await seed(other,1);
      const first=await json(await api('history',request(user)));assert.equal(first.attempts.length,50);assert.ok(first.nextCursor);
      const second=await json(await api('history',request(user,undefined,{query:'?after='+first.nextCursor})));assert.equal(second.attempts.length,5);
      assert.equal(new Set([...first.attempts,...second.attempts].map(a=>a.id)).size,55);
      assert.equal((await json(await api('history',request(other,undefined,{query:'?after='+first.nextCursor})))).attempts.every((a:{id:string})=>a.id!==first.attempts[0].id),true);
      await json(await api('history',request(user,undefined,{query:'?after=broken'})),400);
      await json(await api('progress',request(user,undefined,{query:'?userId=victim'})),400);
    });
    await t.test('rolling-day and minute limits are bounded and replay does not consume new-attempt quota',async()=>{
      const user=await actor(),records=await seed(user,100);
      const limit=await submit(user,input());assert.equal(limit.status,429);assert.equal(limit.headers.get('retry-after'),null);
      await json(await submit(user,{...input(),idempotencyKey:records[0].key}),200);
      await pool.query("UPDATE practice_check_rate SET window_start=date_trunc('minute',clock_timestamp()),requests=20,submissions=20 WHERE user_id=$1",[user]);
      const minute=await submit(user,input());assert.equal(minute.status,429);assert.equal(minute.headers.get('retry-after'),'60');
      await pool.query("UPDATE practice_check_rate SET window_start=clock_timestamp()-interval '2 minutes' WHERE user_id=$1",[user]);
      await progress(user);const bucket=(await pool.query('SELECT requests,submissions FROM practice_check_rate WHERE user_id=$1',[user])).rows[0];assert.deepEqual(bucket,{requests:1,submissions:0});
    });
    await t.test('strict bounded transport refuses forged results, oversized bytes and duplicate parts',async()=>{
      const user=await actor();
      for(const body of [{...input(),correct:true},{...input(),userId:'victim'},{...input(),answers:[...input().answers,...input().answers]},{...input(),answers:[{partId:'answer',latex:'\u0000'}]}])await json(await submit(user,body),400);
      const huge=new Request('https://physcratic.test/api',{method:'POST',headers:{origin:'https://physcratic.test','content-type':'application/json','content-length':'1','x-user':user,'x-practice-account':user},body:'x'.repeat(65537)});
      await json(await api('submit',huge),413);await json(await api('submit',request(user,input(),{type:'text/plain'})),415);
      assert.equal((await progress(user)).savedChecks,0);
    });
    await t.test('a materialization failure rolls the attempt back and the original key can safely retry',async()=>{
      const user=await actor(),body=input();
      const unstable=Object.create(pool) as Pool;unstable.query=pool.query.bind(pool);
      unstable.connect=(async()=>{const c=await pool.connect();return new Proxy(c,{get(target,key,receiver){if(key==='query')return async(...args:unknown[])=>{if(String(args[0]).includes('INSERT INTO practice_check_part'))throw Error('part write unavailable');return (target.query as(...a:unknown[])=>Promise<unknown>)(...args);};const value=Reflect.get(target,key,receiver);return typeof value==='function'?value.bind(target):value;}});}) as Pool['connect'];
      const faulty=createPracticeCheckApi({...deps,pool:unstable});const failed=await json(await faulty('submit',request(user,body)),503);assert.equal(failed.saveState,'unconfirmed');
      assert.equal((await progress(user)).savedChecks,0);
      await json(await submit(user,body),201);assert.equal((await progress(user)).solvedProblems,1);
    });
    await t.test('unexpected trusted-grader replies fail closed before writing or exposing internal fields',async()=>{
      const user=await actor();
      for(const grade of [(body:Parameters<typeof gradeArchiveAnswers>[0])=>({...gradeArchiveAnswers(body),version:'f'.repeat(64)}),(body:Parameters<typeof gradeArchiveAnswers>[0])=>({...gradeArchiveAnswers(body),expected:'PRIVATE_SENTINEL'})]){
        const broken=createPracticeCheckApi({...deps,grade});const response=await json(await broken('submit',request(user,input())),503);
        assert.equal(response.saveState,'unconfirmed');assert.equal(JSON.stringify(response).includes('PRIVATE_SENTINEL'),false);
      }
      assert.equal((await progress(user)).savedChecks,0);
    });
    await t.test('concurrent rate charging saturates and never moves a bucket backwards',async()=>{
      const user=await actor();
      await pool.query("INSERT INTO practice_check_rate VALUES($1,date_trunc('minute',clock_timestamp())+interval '1 minute',1,0)",[user]);
      const responses=await Promise.all(Array.from({length:25},()=>submit(user,input())));
      assert.equal(responses.filter(r=>r.status===201).length,20);assert.equal(responses.filter(r=>r.status===429).length,5);
      const bucket=(await pool.query('SELECT requests,submissions FROM practice_check_rate WHERE user_id=$1',[user])).rows[0];
      assert.deepEqual(bucket,{requests:26,submissions:21});
    });
    await t.test('documented restricted runtime grants support legitimate writes and private reads',async()=>{
      const role='practice_runtime_'+randomUUID().replaceAll('-','');const user=await actor();
      await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD 'local-test-only'`);
      await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}; GRANT SELECT,INSERT ON practice_check_attempt TO ${role}; GRANT SELECT,INSERT,UPDATE ON practice_check_part,practice_check_rate TO ${role}`);
      const connection=new URL(url!);connection.username=role;connection.password='local-test-only';
      const restricted=new Pool({connectionString:connection.href,options:`-c search_path=${schema},public`,max:3});
      try{
        const runtime=createPracticeCheckApi({...deps,pool:restricted});
        await json(await runtime('submit',request(user,input('1'))),201);await json(await runtime('submit',request(user,input())),201);
        assert.equal((await json(await runtime('progress',request(user)))).solvedProblems,1);
        assert.equal((await json(await runtime('history',request(user)))).attempts.length,2);
        await assert.rejects(restricted.query('DELETE FROM practice_check_attempt WHERE user_id=$1',[user]),/permission denied/);
      }finally{
        await restricted.end();await pool.query(`REVOKE ALL ON practice_check_attempt,practice_check_part,practice_check_rate FROM ${role}; REVOKE ALL ON SCHEMA ${schema} FROM ${role}`);await admin.query(`DROP ROLE ${role}`);
      }
    });
    await t.test('immutable rows, same-owner/version lineage and populated rollback protect saved data',async()=>{
      const user=await actor(),other=await actor();const saved=await json(await submit(user,input()),201);
      await assert.rejects(pool.query('UPDATE practice_check_attempt SET answers=\'[]\' WHERE id=$1',[saved.attempt.id]),/immutable/);
      await assert.rejects(pool.query('DELETE FROM practice_check_attempt WHERE id=$1',[saved.attempt.id]),/immutable/);
      await assert.rejects(pool.query(`INSERT INTO practice_check_part VALUES($1,'practice','incline',$2,'forged',true,$3,clock_timestamp())`,[other,numeric.metadata.version,saved.attempt.id]),/foreign key/);
      await assert.rejects(pool.query('BEGIN;'+down+'COMMIT;'),/populated rollback/);await pool.query('ROLLBACK');
      assert.equal((await progress(user)).solvedProblems,1);assert.deepEqual((await pool.query('SELECT * FROM legacy_marker')).rows,[{id:17}]);
    });
    await t.test('uninstalled schema returns an explicit unconfirmed save and guest grading still works',async()=>{
      const user=await actor();const missing=new Pool({connectionString:url,options:'-c search_path=pg_catalog'});
      try{const unavailable=createPracticeCheckApi({...deps,pool:missing});const result=await json(await unavailable('submit',request(user,input())),503);assert.equal(result.saveState,'unconfirmed');}
      finally{await missing.end();}
      assert.equal((await handleArchiveGrade(request(undefined,input()),['https://physcratic.test'])).status,400,'guest endpoint never accepts an idempotency field');
      const {idempotencyKey:unused,...guest}=input();void unused;
      assert.equal((await handleArchiveGrade(request(undefined,guest),['https://physcratic.test'])).status,200);
    });
  }finally{await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
