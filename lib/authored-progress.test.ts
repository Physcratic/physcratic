import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { readAuthoredProgress } from "./authored-progress";
const url = process.env.AUTHORING_TEST_DATABASE_URL;
test("current community progress uses whole-problem completion and sticky correct parts in disposable PostgreSQL", { skip: !url }, async () => {
  const target = new URL(url!); assert.equal(target.hostname,"127.0.0.1"); assert.equal(target.pathname,"/physcratic_authoring_test");
  const schema = "progress_" + randomUUID().replaceAll("-","");
  const admin = new Pool({connectionString:url}); await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({connectionString:url, options: `-c search_path=${schema},public`});
  try {
    await pool.query(`CREATE TABLE authored_problem(id uuid PRIMARY KEY,state text,published_revision_id uuid);
      CREATE TABLE authored_revision(id uuid PRIMARY KEY,problem_id uuid,content jsonb,schema_version int);
      CREATE TABLE authored_revision_part(revision_id uuid,part_id uuid,answer_mode text);
      CREATE TABLE authored_attempt(user_id text,problem_id uuid,revision_id uuid,part_id uuid,status text,created_at timestamptz DEFAULT now());`);
    const problem = randomUUID(), revision = randomUUID(), old = randomUUID(), first = randomUUID(), second = randomUUID(), manual = randomUUID();
    await pool.query("INSERT INTO authored_problem VALUES($1,'published',$2)",[problem,revision]);
    await pool.query(`INSERT INTO authored_revision VALUES($1,$2,'{"title":"Current Title"}',1),($3,$2,'{"title":"Withdrawn Title"}',1)`,[revision,problem,old]);
    for (const [part,mode] of [[first,"numeric"],[second,"expression"],[manual,"manual"]]) await pool.query("INSERT INTO authored_revision_part VALUES($1,$2,$3)",[revision,part,mode]);
    const save = (user:string,rev:string,part:string,status:string) => pool.query("INSERT INTO authored_attempt(user_id,problem_id,revision_id,part_id,status) VALUES($1,$2,$3,$4,$5)",[user,problem,rev,part,status]);
    await save("A",old,first,"correct"); await save("B",revision,second,"correct");
    assert.deepEqual((await readAuthoredProgress(pool,"A")).progress,[]);
    await save("A",revision,manual,"ungraded");
    assert.equal((await readAuthoredProgress(pool,"A")).progress[0].status,"not-graded");
    await save("A",revision,first,"incorrect");
    assert.equal((await readAuthoredProgress(pool,"A")).progress[0].incorrectParts,1);
    await save("A",revision,first,"correct"); await save("A",revision,first,"incorrect");
    let state = (await readAuthoredProgress(pool,"A")).progress[0];
    assert.equal(state.status,"in-progress"); assert.equal(state.correctParts,1); assert.equal(state.incorrectParts,0);
    await save("A",revision,second,"needs-review"); assert.equal((await readAuthoredProgress(pool,"A")).progress[0].correctParts,1);
    await save("A",revision,second,"correct"); state = (await readAuthoredProgress(pool,"A")).progress[0];
    assert.equal(state.status,"solved"); assert.equal(state.requiredParts,2); assert.equal(state.title,"Current Title");
    assert.equal(JSON.stringify(state).includes("Withdrawn Title"),false);
    await pool.query("UPDATE authored_problem SET state='archived'");
    assert.deepEqual((await readAuthoredProgress(pool,"A")).progress,[]);
  } finally { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); }
});
