import { z } from "zod";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { installAchievementFixtures, achievementFixtures, achievementRequest as req, achievementParsed as parsed } from "../tests/community-achievement-fixtures";
import { createPublicAuthoredSolutionApi } from "./authored-public-solution-api";
import { createPublicSolutionRoute } from "./authored-public-solution-route";
import { publicSolutionPath } from "./authored-public-solution-contracts";
import { storedSolutionPolicy, publicSolutionsEnabled, publicSolutionEvidence, publicSolutionPolicy } from "./authored-solution-policy";
import { createAuthoredAttemptApi } from "./authored-attempt-api";
import { createProblemAuthoringApi } from "./problem-authoring-api";
import { readProblemStats } from "./community/problem-stats-api";
import { readAuthoredProgress } from "./authored-progress";
import { createAuthorMediaApi } from "./author-media-api";
import { memoryAuthorStorage, png, pdf } from "../tests/author-media-fixtures";
import { studentAttemptSchema } from "./authored-student";

test("public solution flag and pre-schema lazy route are fail closed", async () => {
  assert.equal(publicSolutionsEnabled({}), false); assert.equal(publicSolutionsEnabled({ AUTHORED_PUBLIC_SOLUTIONS_ENABLED: "true" }), true);
  let loaded = false;
  const route = createPublicSolutionRoute(() => false, async () => { loaded = true; throw Error("private sentinel"); });
  assert.equal((await route(new Request("https://physcratic.test"), randomUUID())).status, 503); assert.equal(loaded, false);
  assert.equal(storedSolutionPolicy({}), "legacy-private-v1");
  for (const data of [{solution_policy:null}, {solution_policy:"unknown"}, {solution_policy:publicSolutionPolicy}, {solution_policy:"legacy-private-v1",solution_consented_at:new Date()}]) assert.throws(() => storedSolutionPolicy(data));
});

const url = process.env.AUTHORING_TEST_DATABASE_URL;
test("automatic public solutions, migration, restricted LOGIN, privacy and integrity on disposable PostgreSQL", { skip: !url }, async t => {
  const target = new URL(url!); assert.equal(target.hostname,"127.0.0.1"); assert.equal(target.pathname,"/physcratic_authoring_test");
  const schema = `public_solution_${randomUUID().replaceAll('-','')}`, role = schema+'_app';
  const admin = new Pool({connectionString:url}); await admin.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${role} LOGIN PASSWORD 'synthetic-public-solutions-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);
  const pool = new Pool({connectionString:url,options:`-c search_path=${schema},public`,max:10});
  const previous = process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED; delete process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;
  let runtime: Pool | undefined;
  try {
    await installAchievementFixtures(pool);
    await pool.query(await readFile('migrations/0012_community_problem_stats.up.sql','utf8'));
    const f = achievementFixtures(pool), author = await f.user(), student = await f.user(), other = await f.user(), unverified = await f.user('unverified');
    const fresh = await f.problem(author,['numeric'],false);
    const readFresh = await parsed(await f.author('read',req(author),fresh.id));
    await parsed(await f.author('update',req(author,{version:readFresh.version,content:fresh.content,privateParts:fresh.privateParts}),fresh.id));
    const legacy = await f.problem(author);
    const original = (await parsed(await f.submit(legacy,student),201)).attempt;
    const oldRow = (await pool.query('SELECT to_jsonb(a) AS value FROM authored_attempt a WHERE id=$1',[original.id])).rows[0].value;
    const store = memoryAuthorStorage(), api = createPublicAuthoredSolutionApi({pool,storage:store.storage});
    const read = (p=legacy,who?:string,media?:string) => api(req(who,undefined,'GET',publicSolutionPath(p.id,p.revision.id,media)),p.id,media);
    assert.equal((await read()).status,404,'pre-schema private publication is never public');
    assert.equal((await parsed(await f.author('public',req(),legacy.id))).id,legacy.revision.id);
    assert.equal((await readProblemStats(pool,[`authored:${legacy.id}`],null)).problems[0].solves,1);
    const publishRequest = {version:legacy.version,solutionPolicy:publicSolutionPolicy};
    const inactive = await parsed(await f.author('publish',req(author,publishRequest),legacy.id),412);
    assert.match(inactive.error,/Reload Problem Studio/);
    assert.equal((await parsed(await f.author('read',req(author),legacy.id))).version,legacy.version);
    process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED='true';
    const failedBeforeSchema=await f.author('publish',req(author,publishRequest),legacy.id);
    assert.equal(failedBeforeSchema.status,503);
    assert.equal((await parsed(await f.author('public',req(),legacy.id))).id,legacy.revision.id);
    delete process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;
    const up = await readFile('migrations/0020_authored_public_solutions.up.sql','utf8'), down = await readFile('migrations/0020_authored_public_solutions.down.sql','utf8');
    // Grant before migration: CREATE OR REPLACE must retain the established ACL.
    await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}; GRANT EXECUTE ON FUNCTION community_achievement_progress(text),community_achievement_problem_solved(text,uuid) TO ${role}`);
    await pool.query(`GRANT SELECT,INSERT,DELETE ON authored_problem,authored_draft,authored_draft_private_part TO ${role}; GRANT UPDATE(state,published_revision_id,updated_at) ON authored_problem TO ${role}; GRANT UPDATE(content,version,updated_at) ON authored_draft TO ${role}; GRANT SELECT,INSERT ON authored_revision,authored_revision_part,authored_revision_private_part,author_revision_media,authored_attempt,authored_solution_reveal TO ${role}; GRANT SELECT,INSERT,UPDATE ON authored_write_limit,authored_student_rate TO ${role}; GRANT SELECT ON author_media,author_draft_media,authored_solution_permission,authored_solution_permission_media,"user",community_problem_total,community_favourite TO ${role}; GRANT UPDATE(state) ON author_media TO ${role}; GRANT INSERT,DELETE ON author_draft_media TO ${role}`);
    const acl = (await pool.query("SELECT oid,proacl FROM pg_proc WHERE oid IN ('community_achievement_progress(text)'::regprocedure,'community_achievement_problem_solved(text,uuid)'::regprocedure) ORDER BY oid")).rows;
    await pool.query(`BEGIN; ${up} COMMIT`);
    assert.deepEqual((await pool.query("SELECT oid,proacl FROM pg_proc WHERE oid IN ('community_achievement_progress(text)'::regprocedure,'community_achievement_problem_solved(text,uuid)'::regprocedure) ORDER BY oid")).rows,acl);
    await pool.query(`BEGIN; ${down} COMMIT`); await pool.query(`BEGIN; ${up} COMMIT`);
    assert.deepEqual((await pool.query('SELECT to_jsonb(a) AS value FROM authored_attempt a WHERE id=$1',[original.id])).rows[0].value,oldRow);
    assert.equal((await read()).status,404,'migration does not convert existing publications');

    const login = new URL(url!);login.username=role;login.password='synthetic-public-solutions-only';
    runtime = new Pool({connectionString:login.href,options:`-c search_path=${schema},public`,max:5});
    assert.deepEqual((await runtime.query('SELECT current_user,session_user')).rows[0],{current_user:role,session_user:role});
    const runtimeAuthor = createProblemAuthoringApi({...f.deps,pool:runtime}), runtimeAttempts = createAuthoredAttemptApi({...f.deps,pool:runtime}), runtimePublic = createPublicAuthoredSolutionApi({pool:runtime,storage:store.storage});
    await t.test('publishing a saved version makes its solution public for all visitors',async()=>{
      process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED='true';
      assert.equal((await runtimeAuthor('publish',req(other,publishRequest),legacy.id)).status,404);
      assert.equal((await runtimeAuthor('publish',req(author,{...publishRequest,version:legacy.version-1}),legacy.id)).status,409);
      const stale = await parsed(await runtimeAuthor('publish',req(author,{version:legacy.version}),legacy.id),412);
      assert.match(stale.error,/Reload Problem Studio/);
      assert.equal((await parsed(await runtimeAuthor('read',req(author),legacy.id))).version,legacy.version);
      assert.equal((await parsed(await runtimeAuthor('public',req(),legacy.id))).id,legacy.revision.id);
      assert.equal((await read()).status,404);
      const published=await parsed(await runtimeAuthor('publish',req(author,publishRequest),legacy.id));legacy.version=published.version;const oldRevision=legacy.revision;legacy.revision=published.revision;
      assert.equal(legacy.revision.solutionPolicy,publicSolutionPolicy);
      assert.equal((await api(req(undefined,undefined,'GET',publicSolutionPath(legacy.id,oldRevision.id)),legacy.id)).status,409);
      for(const visitor of [undefined,student,unverified,other]){
        const response=await runtimePublic(req(visitor,undefined,'GET',publicSolutionPath(legacy.id,legacy.revision.id)),legacy.id);
        const data=await parsed(response);assert.equal(data.parts[0].solution[0].spans[0].text,'A private explanation');
        const text=JSON.stringify(data);for(const forbidden of ['absTol','relTol','expected','variables','hints','key','pathname',author])assert.ok(!text.includes(forbidden),forbidden);
      }
      assert.equal(Number((await pool.query('SELECT count(*) n FROM authored_solution_reveal')).rows[0].n),0);
      assert.deepEqual((await readAuthoredProgress(runtime!,other)).attemptedIds,[]);
    });
    await t.test('correctness preserved; receipts/replay/history use original revision evidence even when OFF',async()=>{
      const idempotencyKey=randomUUID(),body={revisionId:legacy.revision.id,partId:legacy.parts[0].id,answer:{kind:'numeric',value:2,units:'1'},idempotencyKey};
      const saved=(await parsed(await runtimeAttempts('submit',req(student,body),legacy.id),201)).attempt;
      assert.equal(saved.status,'correct');assert.equal(saved.assisted,false);assert.equal(saved.solutionEvidence,publicSolutionEvidence);studentAttemptSchema.parse(saved);
      // Frozen pre-public-policy strict receipt shape rejects the valid new evidence field.
      const oldClient=z.strictObject({id:z.string(),problemId:z.string(),revisionId:z.string(),partId:z.string(),answer:z.unknown(),status:z.string(),reason:z.string(),engineVersion:z.string(),attemptNumber:z.string(),createdAt:z.string(),spoilerPolicy:z.literal('no-reveal-v1'),assisted:z.boolean()});
      assert.equal(oldClient.safeParse(original).success,true);
      assert.equal(oldClient.safeParse(saved).success,false);
      assert.equal(studentAttemptSchema.safeParse({...saved,solutionEvidence:'wrong-policy'}).success,false);
      delete process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;
      assert.deepEqual((await parsed(await runtimeAttempts('submit',req(student,body),legacy.id))).attempt,saved);
      assert.equal((await parsed(await runtimeAttempts('read',req(student),saved.id))).attempt.solutionEvidence,publicSolutionEvidence);
      assert.equal((await parsed(await runtimeAttempts('read',req(other),saved.id),404)).error,'Attempt not found.');
      const history=await parsed(await runtimeAttempts('list',req(student)));assert.equal(history.attempts.find((a:{id:string})=>a.id===saved.id).solutionEvidence,publicSolutionEvidence);assert.ok(!history.attempts.find((a:{id:string})=>a.id===original.id).solutionEvidence);
      assert.equal((await readProblemStats(runtime!,[`authored:${legacy.id}`],null)).problems[0].solves,null);
      assert.equal((await runtime!.query('SELECT community_achievement_problem_solved($1,$2) AS value',[student,legacy.id])).rows[0].value,false);
      assert.equal((await runtime!.query('SELECT * FROM community_achievement_progress($1)',[student])).rows[0].solve_count,0);
      assert.equal((await readAuthoredProgress(runtime!,student)).progress[0].status,'solved');
      assert.deepEqual((await pool.query('SELECT to_jsonb(a) AS value FROM authored_attempt a WHERE id=$1',[original.id])).rows[0].value,oldRow);
      await assert.rejects(runtime!.query('UPDATE authored_attempt SET assisted=true WHERE id=$1',[saved.id]),{code:'42501'});
      await assert.rejects(runtime!.query('DELETE FROM authored_attempt WHERE id=$1',[saved.id]),{code:'42501'});
      await assert.rejects(runtime!.query('TRUNCATE authored_attempt'),{code:'42501'});
      await assert.rejects(runtime!.query('CREATE TABLE forbidden(x int)'),{code:'42501'});
    });
    await t.test('large public history does not inflate or starve legacy eligibility',async()=>{
      const independent=await f.problem(other);
      await parsed(await f.submit(independent,student),201);
      await pool.query(`INSERT INTO authored_attempt(id,user_id,problem_id,revision_id,part_id,idempotency_key,answer,status,reason,engine_version,attempt_number)
        SELECT gen_random_uuid(),$1,$2,$3,$4,gen_random_uuid(),'{"kind":"numeric","value":2,"units":"1"}'::jsonb,'correct','within-tolerance','numeric-v1',n
        FROM generate_series(2,15001) n`,[student,legacy.id,legacy.revision.id,legacy.parts[0].id]);
      const started=performance.now();
      assert.equal((await runtime!.query('SELECT * FROM community_achievement_progress($1)',[student])).rows[0].solve_count,1);
      t.diagnostic(`15000 public-history rows: achievement query ${(performance.now()-started).toFixed(1)}ms`);
      const stats=await readProblemStats(runtime!,[`authored:${legacy.id}`,`authored:${independent.id}`],null);
      assert.deepEqual(stats.problems.map(p=>p.solves),[null,1]);
    });
    await t.test('public images/PDFs only, hint/draft/unrelated files denied',async()=>{
      const mediaApi=createAuthorMediaApi({...f.deps,storage:store.storage});
      async function upload(purpose:string,bytes:Uint8Array){const form=new FormData();form.set('purpose',purpose);form.set('file',new File([new Uint8Array(bytes)],purpose==='solution-pdf'?'solution.pdf':'image.png',{type:purpose==='solution-pdf'?'application/pdf':'image/png'}));const response=await mediaApi('upload',new Request('https://physcratic.test/api',{method:'POST',headers:{origin:'https://physcratic.test','x-test-user':author},body:form}),legacy.id);return (await parsed(response,201)).id as string;}
      const image=await upload('solution-image',png),hint=await upload('solution-image',png),document=await upload('solution-pdf',pdf),unrelated=await upload('solution-pdf',pdf);
      legacy.privateParts[0].solution.push({id:randomUUID(),kind:'image',mediaId:image,alt:'Synthetic explanation',caption:''});legacy.privateParts[0].hints.push({id:randomUUID(),kind:'image',mediaId:hint,alt:'Private hint',caption:''});legacy.content.attachments.push({id:document,purpose:'solution-pdf'});
      const updated=await parsed(await f.author('update',req(author,{version:legacy.version,content:legacy.content,privateParts:legacy.privateParts}),legacy.id));legacy.version=updated.version;
      // The older public-aware Studio request remains compatible.
      process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED='true';const published=await parsed(await runtimeAuthor('publish',req(author,{version:legacy.version,publicSolutionConsent:true}),legacy.id));legacy.version=published.version;legacy.revision=published.revision;
      const content=await parsed(await read());assert.deepEqual(content.media.map((m:{id:string})=>m.id).sort(),[image,document].sort());
      for(const file of [image,document]){const r=await read(legacy,undefined,file);assert.equal(r.status,200);assert.ok((await r.arrayBuffer()).byteLength>0);assert.match(r.headers.get('content-security-policy')!,/sandbox/);}
      for(const file of [hint,unrelated,randomUUID()])assert.equal((await read(legacy,undefined,file)).status,404);
      assert.equal((await f.solutions('view',req(student,{revisionId:legacy.revision.id}),legacy.id,legacy.parts[0].id)).status,404);
      const broken = createPublicAuthoredSolutionApi({pool,storage:{get:async()=>new Uint8Array(1)}});
      assert.equal((await broken(req(undefined,undefined,'GET',publicSolutionPath(legacy.id,legacy.revision.id,document)),legacy.id,document)).status,503);
      let release!:()=>void, entered!:()=>void;
      const enteredPromise=new Promise<void>(r=>{entered=r;}), hold=new Promise<void>(r=>{release=r;});
      const delayed=createPublicAuthoredSolutionApi({pool,storage:{get:async(path)=>{entered();await hold;return store.storage.get(path);}}});
      const reading=delayed(req(undefined,undefined,'GET',publicSolutionPath(legacy.id,legacy.revision.id,document)),legacy.id,document);
      await enteredPromise;
      let withdrawn=false;
      const withdrawing=f.author('unpublish',req(author,{version:legacy.version}),legacy.id).then(r=>{withdrawn=true;return r;});
      await new Promise(r=>setTimeout(r,30));assert.equal(withdrawn,false,'publication lock orders media before withdrawal');release();
      assert.equal((await reading).status,200);await parsed(await withdrawing);legacy.version++;
      assert.equal((await read()).status,404);assert.equal((await read(legacy,undefined,document)).status,404);
      const archived=await parsed(await f.author('read',req(author),legacy.id));
      await parsed(await f.author('update',req(author,{version:archived.version,content:legacy.content,privateParts:legacy.privateParts}),legacy.id));
    });
    await t.test('populated down refuses without altering consent or history',async()=>{
      await assert.rejects(pool.query(`BEGIN; ${down} COMMIT`),/consent must be retained/);await pool.query('ROLLBACK');
      assert.equal((await pool.query("SELECT count(*)::int n FROM authored_revision WHERE solution_policy='public-solutions-v1'")).rows[0].n,2);
      assert.deepEqual((await pool.query('SELECT to_jsonb(a) AS value FROM authored_attempt a WHERE id=$1',[original.id])).rows[0].value,oldRow);
      await assert.rejects(pool.query("UPDATE authored_revision SET solution_policy='legacy-private-v1' WHERE solution_policy='public-solutions-v1'"),/immutable/);
    });
  } finally {
    if(previous===undefined)delete process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED;else process.env.AUTHORED_PUBLIC_SOLUTIONS_ENABLED=previous;
    await runtime?.end();await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE; DROP ROLE ${role}`);await admin.end();
  }
});
