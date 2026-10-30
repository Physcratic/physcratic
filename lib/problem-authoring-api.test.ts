import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { createProblemAuthoringApi } from "./problem-authoring-api";
import { isAllowedSubmissionOrigin } from "./submission-security";
import type { AuthoredDocument } from "./problem-authoring";

const testUrl = process.env.AUTHORING_TEST_DATABASE_URL;
test("authored HTTP handlers against disposable PostgreSQL", { skip: !testUrl && "Run scripts/test-problem-authoring.sh for disposable DB integration" }, async t => {
  const target = new URL(testUrl!);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/physcratic_authoring_test");
  const pool = new Pool({ connectionString: testUrl, max: 10 });
  // Test-only sessions are injected; production adapter uses Better Auth getSession.
  const sessions = new Map<string, { id: string; emailVerified?: boolean }>();
  const api = createProblemAuthoringApi({ pool, user: async request => sessions.get(request.headers.get("x-test-session") ?? ""), origin: request => isAllowedSubmissionOrigin(request, ["https://physcratic.test"]) });
  type Action = Parameters<typeof api>[0];
  function request(method = "GET", body?: unknown, session?: string, headers?: HeadersInit) {
    return new Request("https://physcratic.test/api/authored-problems/drafts", { method, headers: { "origin": "https://physcratic.test", "content-type": "application/json", ...(session ? { "x-test-session": session } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  async function user(verified = true) { const id = randomUUID(); sessions.set(id, { id, emailVerified: verified }); await pool.query('INSERT INTO "user"(id) VALUES($1)', [id]); return id; }
  function input() {
    const part = randomUUID();
    const content: AuthoredDocument = { title: "Original physics task", topicTags: ["Mechanics"], methodTags: [], estimatedDifficulty: null,
      context: [{ id: randomUUID(), kind: "text", spans: [{ kind: "text", text: "Find the displacement of a body." }] }],
      sections: [{ id: randomUUID(), title: "Motion", blocks: [], parts: [{ id: part, label: "a", answerMode: "numeric", blocks: [] }] }],
      provenance: { kind: "original", source: "", rightsDeclaration: "I own this original content." }, attachments: [] };
    return { content, privateParts: [{ partId: part, key: { kind: "numeric", value: 9876.54321, units: "m", absTol: 0.01, relTol: 0 }, hints: [], solution: [{ id: randomUUID(), kind: "text", spans: [{ kind: "text", text: "PRIVATE_SOLUTION_SENTINEL" }] }] }] };
  }
  async function create(owner: string, body = input()) {
    const response = await api("create", request("POST", body, owner)); assert.equal(response.status, 201, await response.clone().text()); return await response.json();
  }
  async function counts(id: string) { return (await pool.query("SELECT (SELECT count(*) FROM authored_revision WHERE problem_id=$1)::integer AS revisions,(SELECT version FROM authored_draft WHERE problem_id=$1) AS version", [id])).rows[0]; }
  try {
    await pool.query('CREATE TABLE "user" (id text PRIMARY KEY)');
    for (const migration of ["0001_problem_authoring", "0002_authored_write_limit"]) {
      await pool.query("BEGIN;\n" + await readFile(`migrations/${migration}.up.sql`, "utf8") + "\nCOMMIT;");
    }
    // Execute original sealing/rollback regression assertions as well as route-level tests.
    await pool.query((await readFile("migrations/0001_problem_authoring.test.sql", "utf8")).split("\n").filter(line => !line.startsWith("\\set ")).join("\n"));
    await t.test("missing/unverified sessions denied on every private action; public read stays open", async () => {
      const unverified = await user(false);
      for (const action of ["create", "list", "read", "update", "delete", "preview", "publish", "unpublish"] as Action[]) {
        for (const [session, status] of [[undefined, 401], [unverified, 403]] as const) assert.equal((await api(action, request("POST", {}, session), randomUUID())).status, status);
      }
      assert.equal((await api("public", request(), randomUUID())).status, 404);
    });
    await t.test("owner CRUD/list; reject forged identities, cross-account IDs and guessed draft previews", async () => {
      const owner = await user(), other = await user(); const d = await create(owner);
      assert.equal((await api("public", request(), d.problemId)).status, 404);
      const own = await api("read", request("GET", undefined, owner), d.problemId.toUpperCase()); assert.equal(own.status, 200); assert.equal((await own.json()).privateParts[0].key.value, 9876.54321);
      for (const action of ["read", "update", "delete", "preview", "publish", "unpublish"] as Action[]) assert.equal((await api(action, request(action === "read" || action === "preview" ? "GET" : "POST", action === "read" || action === "preview" ? undefined : { version: 1 }, other), d.problemId)).status, 404);
      const listed = await (await api("list", request("GET", undefined, owner))).json(); assert.equal(listed.drafts.length, 1); assert.equal(listed.drafts[0].problemId, d.problemId); assert.equal(JSON.stringify(listed).includes("privateParts"), false);
      assert.equal((await (await api("list", request("GET", undefined, other))).json()).drafts.length, 0);
      assert.equal((await api("create", request("POST", { ...input(), ownerId: other }, owner))).status, 400);
      const changed = await api("update", request("PUT", { ...input(), version: 1 }, owner), d.problemId); assert.equal(changed.status, 200); assert.equal((await changed.json()).version, 2);
      assert.equal((await api("delete", request("DELETE", { version: 1 }, owner), d.problemId)).status, 409);
      assert.equal((await api("delete", request("DELETE", { version: 2 }, owner), d.problemId)).status, 204);
      assert.equal((await api("read", request("GET", undefined, owner), d.problemId)).status, 404);
    });
    await t.test("stale/concurrent saves cannot overwrite data or mix statement and key versions", async () => {
      const owner = await user(), d = await create(owner); const a = input(), b = input();
      a.content.title = "A"; b.content.title = "B";
      const outcomes = await Promise.all([a,b].map(body => api("update", request("PUT", { ...body, version: 1 }, owner), d.problemId)));
      assert.deepEqual(outcomes.map(r => r.status).sort(), [200,409]);
      const saved = await (await api("read", request("GET", undefined, owner), d.problemId)).json();
      assert.equal(saved.version, 2); assert.equal(saved.privateParts[0].partId, saved.content.sections[0].parts[0].id);
      assert.equal((await api("update", request("PUT", { ...input(), version: 1 }, owner), d.problemId)).status, 409);
    });
    await t.test("incomplete drafts save, invalid publication rolls back and returns no keys/errors from payload", async () => {
      const owner = await user();
      for (const change of [
        (body: ReturnType<typeof input>) => { body.content.provenance.rightsDeclaration = ""; },
        (body: ReturnType<typeof input>) => { body.content.provenance.kind = "authorized"; body.content.provenance.source = ""; },
        (body: ReturnType<typeof input>) => { body.privateParts = []; },
        (body: ReturnType<typeof input>) => { body.content.context = []; },
      ]) {
        const body = input(); change(body); const d = await create(owner, body);
        const rejected = await api("publish", request("POST", { version: 1 }, owner), d.problemId);
        assert.equal(rejected.status, 400); assert.equal((await rejected.text()).includes("9876"), false);
        assert.deepEqual(await counts(d.problemId), { revisions: 0, version: 1 });
        assert.equal((await api("public", request(), d.problemId)).status, 404);
      }
      const bad = input(); bad.content.sections[0].parts[0].id = bad.content.context[0].id;
      assert.equal((await api("create", request("POST", bad, owner))).status, 400);
      const missingMode = input(); missingMode.content.sections[0].parts[0].answerMode = "expression";
      assert.equal((await api("create", request("POST", missingMode, owner))).status, 400);
    });
    await t.test("media refs in statement, attachments and private solutions are rejected until ownership registry exists", async () => {
      const owner = await user();
      const attachment = input(); attachment.content.attachments.push({ id: randomUUID(), purpose: "solution-pdf" });
      assert.equal((await api("create", request("POST", attachment, owner))).status, 400);
      const image = input(); image.privateParts[0].solution = [{ id: randomUUID(), kind: "image", mediaId: randomUUID(), alt: "x", caption: "" }] as never;
      assert.equal((await api("create", request("POST", image, owner))).status, 400);
      const statement = input(), mediaId = randomUUID(); statement.content.attachments = [{ id: mediaId, purpose: "statement-image" }]; statement.content.context = [{ id: randomUUID(), kind: "image", mediaId, alt: "x", caption: "" }];
      assert.equal((await api("create", request("POST", statement, owner))).status, 400);
    });
    await t.test("publication is atomic under races, immutable snapshots survive edits/unpublish, previews/public never leak", async () => {
      const owner = await user(), d = await create(owner);
      const preview = await api("preview", request("GET", undefined, owner), d.problemId); assert.equal(preview.status, 200);
      const safe = await preview.text(); assert.equal(safe.includes("PRIVATE_SOLUTION_SENTINEL") || safe.includes("9876.54321") || safe.includes('"key"'), false);
      const outcomes = await Promise.all([1,2].map(() => api("publish", request("POST", { version: 1 }, owner), d.problemId)));
      assert.deepEqual(outcomes.map(r => r.status).sort(), [200,409]);
      assert.deepEqual(await counts(d.problemId), { revisions: 1, version: 2 });
      const response = await api("public", request(), d.problemId); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
      const revision1 = await response.json(); assert.equal(revision1.number, 1); assert.equal(typeof revision1.publishedAt, "string");
      assert.equal(JSON.stringify(revision1).includes("PRIVATE_SOLUTION_SENTINEL") || JSON.stringify(revision1).includes("9876.54321") || JSON.stringify(revision1).includes("privateParts"), false);
      const next = input(); next.content.title = "New draft";
      assert.equal((await api("update", request("PUT", { ...next, version: 2 }, owner), d.problemId)).status, 200);
      assert.deepEqual(await (await api("public", request(), d.problemId)).json(), revision1);
      const saved = await api("publish", request("POST", { version: 3 }, owner), d.problemId); assert.equal(saved.status, 200); assert.equal((await saved.json()).revision.number, 2);
      assert.equal((await api("delete", request("DELETE", { version: 4 }, owner), d.problemId)).status, 409);
      assert.equal((await api("unpublish", request("POST", { version: 3 }, owner), d.problemId)).status, 409);
      assert.equal((await api("unpublish", request("POST", { version: 4 }, owner), d.problemId)).status, 200);
      assert.equal((await api("public", request(), d.problemId)).status, 404);
      assert.deepEqual(await counts(d.problemId), { revisions: 2, version: 5 });
      const old = await pool.query("SELECT content FROM authored_revision WHERE id=$1", [revision1.id]); assert.deepEqual(old.rows[0].content, revision1.content);
      await assert.rejects(pool.query("UPDATE authored_revision SET content='{}' WHERE id=$1", [revision1.id]), /immutable/);
      assert.equal((await api("delete", request("DELETE", { version: 5 }, owner), d.problemId)).status, 204);
      assert.equal((await pool.query("SELECT count(*)::integer AS count FROM authored_revision WHERE problem_id=$1", [d.problemId])).rows[0].count, 2);
    });
    await t.test("publish/update race consumes the same version exactly once", async () => {
      const owner = await user(), d = await create(owner);
      const results = await Promise.all([api("publish", request("POST", { version: 1 }, owner), d.problemId), api("update", request("PUT", { ...input(), version: 1 }, owner), d.problemId)]);
      assert.deepEqual(results.map(r => r.status).sort(), [200,409]);
      assert.equal((await counts(d.problemId)).version, 2);
    });
    await t.test("origin, JSON type/size, malformed IDs and persisted cross-instance write limits", async () => {
      const owner = await user();
      for (const origin of ["https://evil.test", "null", ""]) assert.equal((await api("create", request("POST", input(), owner, { origin }))).status, 403);
      assert.equal((await api("create", request("POST", input(), owner, { "sec-fetch-site": "cross-site" }))).status, 403);
      assert.equal((await api("create", request("POST", input(), owner, { "content-type": "text/plain" }))).status, 415);
      assert.equal((await api("read", request("GET", undefined, owner), "not-an-id")).status, 400);
      assert.equal((await api("create", request("POST", { huge: "x".repeat(2_000_001) }, owner))).status, 413);
      const d = await create(owner);
      await pool.query("UPDATE authored_write_limit SET window_start=date_trunc('minute',clock_timestamp()),requests=60 WHERE user_id=$1", [owner]);
      const instance = createProblemAuthoringApi({ pool, user: async () => ({ id: owner, emailVerified: true }), origin: () => true });
      assert.equal((await instance("publish", request("POST", { version: 1 }), d.problemId)).status, 429);
      assert.deepEqual(await counts(d.problemId), { revisions: 0, version: 1 });
    });
    await t.test("rate-limit migration rollback/reapply preserves authored history and user FK", async () => {
      const before = await pool.query("SELECT count(*)::integer AS total FROM authored_revision");
      for (const direction of ["down", "up"]) await pool.query("BEGIN;\n" + await readFile(`migrations/0002_authored_write_limit.${direction}.sql`, "utf8") + "\nCOMMIT;");
      assert.deepEqual((await pool.query("SELECT count(*)::integer AS total FROM authored_revision")).rows, before.rows);
      await assert.rejects(pool.query("INSERT INTO authored_write_limit VALUES('missing',now(),1)"), error => (error as {code?:string}).code === "23503");
    });
  } finally { await pool.end(); }
});
