import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createAuthoredAttributionRoute, authoredAttributionEnabled } from "./authored-attribution-route";
import { createAuthoredAttributionApi } from "./authored-attribution-api";
import { authoredAttributionSchema } from "./authored-attribution-contracts";
const selection = { problemId: randomUUID(), revisionId: randomUUID() };
const request = (query = `revisionId=${selection.revisionId}`) => new Request(`https://physcratic.test/api/authored-problems/${selection.problemId}/attribution?${query}`);
async function body(response: Response, status = 200) { assert.equal(response.status, status); assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0"); return response.json(); }
test("attribution requires both existing gates and disabled requests never load bindings", async () => {
  for (const env of [{}, { COMMUNITY_AUTHORSHIP_ENABLED: "true" }, { COMMUNITY_PROFILES_ENABLED: "true" }]) assert.equal(authoredAttributionEnabled(env), false);
  assert.equal(authoredAttributionEnabled({ COMMUNITY_AUTHORSHIP_ENABLED: "true", COMMUNITY_PROFILES_ENABLED: "true" }), true);
  let imports = 0;
  const route = createAuthoredAttributionRoute(() => false, async () => { imports++; throw Error("bindings must remain unloaded"); });
  assert.deepEqual(await body(await route(request(), selection.problemId)), { ...selection, author: null }); assert.equal(imports, 0);
  for (const query of ["", `revisionId=${selection.revisionId}&revisionId=${selection.revisionId}`, `revisionId=${selection.revisionId}&ownerId=private`, "revisionId=bad"]) await body(await route(request(query), selection.problemId), 400);
  await body(await route(request(), "not-a-uuid"), 400); assert.equal(imports, 0);
});
test("gate withdrawal during a pending projection discards the previously public response", async () => {
  let enabled = true;
  const route = createAuthoredAttributionRoute(() => enabled, async () => ({ authoredAttributionApi: async () => { enabled = false; return Response.json({ ...selection, author: { displayName: "Previously public" } }); } }));
  assert.deepEqual(await body(await route(request(), selection.problemId)), { ...selection, author: null });
});
test("attribution contract rejects private fields and invalid public names", () => {
  const base = { ...selection, author: { displayName: "Public name" } };
  assert.equal(authoredAttributionSchema.safeParse(base).success, true);
  for (const value of [{ ...base, ownerId: "private" }, { ...base, author: { ...base.author, email: "PRIVATE_EMAIL" } }, { ...base, author: { displayName: "x".repeat(81) } }, { ...base, author: { displayName: "\ud800" } }]) assert.equal(authoredAttributionSchema.safeParse(value).success, false);
});
test("current public attribution on disposable PostgreSQL", { skip: !process.env.AUTHORING_TEST_DATABASE_URL && "Use scripts/test-problem-authoring.sh" }, async t => {
  const url = new URL(process.env.AUTHORING_TEST_DATABASE_URL!); assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.pathname, "/physcratic_authoring_test");
  const schema = `attribution_${randomUUID().replaceAll("-", "")}`; const admin = new Pool({ connectionString: url.href }); await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url.href, options: `-c search_path=${schema},public`, statement_timeout: 5000 });
  const api = createAuthoredAttributionApi(pool), route = createAuthoredAttributionRoute(() => true, async () => ({ authoredAttributionApi: api }));
  try {
    await pool.query(`CREATE TABLE "user"(id text PRIMARY KEY,name text,email text); CREATE TABLE authored_problem(id uuid PRIMARY KEY,owner_id text,state text,published_revision_id uuid); CREATE TABLE authored_revision(id uuid PRIMARY KEY,problem_id uuid,content jsonb); CREATE TABLE community_profile(user_id text PRIMARY KEY,display_name text,public_visibility boolean,bio text)`);
    await pool.query(`INSERT INTO "user" VALUES('PRIVATE_OWNER_ID','PRIVATE_AUTH_NAME','PRIVATE_EMAIL'); INSERT INTO community_profile VALUES('PRIVATE_OWNER_ID','Public Author',true,'PRIVATE_BIO')`);
    await pool.query('INSERT INTO authored_problem VALUES($1,$2,$3,$4)', [selection.problemId, 'PRIVATE_OWNER_ID', 'published', selection.revisionId]);
    await pool.query('INSERT INTO authored_revision VALUES($1,$2,$3)', [selection.revisionId, selection.problemId, { title: 'Published Title', estimatedDifficulty: '1200', privateSentinel: 'PRIVATE_CONTENT' }]);
    await t.test("public names come only from an allowlisted opted-in profile", async () => {
      const value = await body(await route(request(), selection.problemId)); assert.deepEqual(value, { ...selection, author: { displayName: "Public Author" } }); assert.doesNotMatch(JSON.stringify(value), /PRIVATE_|email|ownerId|handle|bio|content/);
    });
    await t.test("private and withdrawn profiles immediately return neutral on the next read", async () => {
      await pool.query('UPDATE community_profile SET public_visibility=false'); assert.equal((await body(await route(request(), selection.problemId))).author, null);
      await pool.query("UPDATE community_profile SET public_visibility=true,display_name='New Public Name'"); assert.equal((await body(await route(request(), selection.problemId))).author.displayName, 'New Public Name');
      await pool.query('UPDATE community_profile SET public_visibility=false'); assert.equal((await body(await route(request(), selection.problemId))).author, null);
    });
    await t.test("missing and blank profiles never fall back to private account identity", async () => {
      await pool.query('DELETE FROM community_profile'); assert.equal((await body(await route(request(), selection.problemId))).author, null);
      await pool.query("INSERT INTO community_profile VALUES('PRIVATE_OWNER_ID','   ',true,'PRIVATE_BIO')"); assert.equal((await body(await route(request(), selection.problemId))).author, null);
    });
    await t.test("unpublication, different revisions and cross-problem revision IDs cannot disclose names", async () => {
      await body(await api({ ...selection, revisionId: randomUUID() }), 404);
      await pool.query("UPDATE authored_problem SET state='archived'"); await body(await route(request(), selection.problemId), 404);
      await pool.query("UPDATE authored_problem SET state='published'; UPDATE authored_revision SET problem_id='00000000-0000-4000-8000-000000000001'"); await body(await route(request(), selection.problemId), 404);
      await pool.query('UPDATE authored_revision SET problem_id=$1', [selection.problemId]);
    });
    await t.test("missing profile schema fails neutral without exposing internal errors", async () => {
      await pool.query('DROP TABLE community_profile'); const value = await body(await route(request(), selection.problemId), 503); assert.deepEqual(value, { error: "Public attribution is unavailable." });
    });
  } finally { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); }
});
