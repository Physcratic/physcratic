import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import arena from "../lib/arena/index.json";
import { favouritePageSchema } from "../lib/favourite-history-contracts";

function disposableTarget(raw: string) {
  const url = new URL(raw);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/physcratic_authoring_test");
  assert.equal(url.search, ""); assert.equal(url.hash, "");
  return url;
}

test("favourite LOGIN rehearsal refuses shared, decorated and wrong-database targets", () => {
  for (const target of ["https://127.0.0.1/physcratic_authoring_test", "postgresql://db.example/physcratic_authoring_test", "postgresql://127.0.0.1/production", "postgresql://127.0.0.1/physcratic_authoring_test?host=db.example", "postgresql://127.0.0.1/physcratic_authoring_test#extra"])
    assert.throws(() => disposableTarget(target));
  assert.equal(disposableTarget("postgresql://postgres:synthetic@127.0.0.1:5432/physcratic_authoring_test").port, "5432");
});

const raw = process.env.AUTHORING_TEST_DATABASE_URL;
test("favourite route uses real sessions and the existing restricted LOGIN contract", { skip: !raw }, async t => {
  const root = disposableTarget(raw!);
  const name = "favourite_runtime_" + randomUUID().replaceAll("-", "");
  const owner = name + "_owner", role = name + "_app";
  const admin = new Pool({ connectionString: root.href, max: 1 });
  let setup: Pool | undefined, app: Pool | undefined;
  let ownerCreated = false, databaseCreated = false, roleCreated = false, closing = false;
  const previous = { ...process.env }, idleErrors: Error[] = [];
  const onError = (error: Error) => { if (!closing) idleErrors.push(error); };
  admin.on("error", onError);
  try {
    assert.equal((await admin.query("SHOW server_version_num")).rows[0].server_version_num, "180007");
    await admin.query(`CREATE ROLE ${owner} NOLOGIN`); ownerCreated = true;
    await admin.query(`CREATE DATABASE ${name} OWNER ${owner}`); databaseCreated = true;
    const database = new URL(root); database.pathname = "/" + name;
    setup = new Pool({ connectionString: database.href, max: 1 }); setup.on("error", onError);
    await setup.query(`SET ROLE ${owner}; SET search_path=public,pg_catalog`);
    const { fixtureDDL, seed } = await import("../scripts/authoring-release-production/package/test-fixture.mjs");
    for (const ddl of fixtureDDL()) await setup.query(ddl);
    await seed(setup);
    await setup.query(await readFile("migrations/20261031_auth_rate_limit.sql", "utf8"));
    const migrations = JSON.parse(await readFile("scripts/production-upgrade/migrations.json", "utf8")) as { path: string }[];
    for (const migration of migrations) await setup.query(await readFile(migration.path, "utf8"));
    // Existing migration, disposable database only. This is not installation approval.
    await setup.query(await readFile("migrations/0021_arena_favourite_key_pattern.up.sql", "utf8"));
    await setup.query("RESET ROLE");
    const bind = (sql: string) => sql.replaceAll(':"runtime_role"', role).replaceAll(":'runtime_role'", "'" + role + "'")
      .replaceAll(':"database_name"', name).replaceAll(":'database_name'", "'" + name + "'");
    await setup.query(bind(await readFile("scripts/runtime-role/provision.review.sql", "utf8"))); roleCreated = true;
    await setup.query(`ALTER ROLE ${role} PASSWORD 'synthetic-favourite-runtime-only'`);
    const { hashPassword } = await import("better-auth/crypto");
    await setup.query('UPDATE account SET password=$1 WHERE "userId" IN ($2,$3)', [await hashPassword("synthetic-password-123"), "synthetic-user-0", "synthetic-user-1"]);
    await setup.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1', ["synthetic-user-1"]);
    const login = new URL(database); login.username = role; login.password = "synthetic-favourite-runtime-only";
    for (const key of Object.keys(process.env)) if (/^(VERCEL|RESEND_|COMMUNITY_|ACCOUNT_DELETION_|AUTHORING_STAGING_|FAVOURITE_|PG|POSTGRES)/.test(key)) delete process.env[key];
    Object.assign(process.env, { NODE_ENV: "test", DATABASE_URL: login.href, BETTER_AUTH_URL: "http://localhost:3000",
      FAVOURITE_HISTORY_CURSOR_SECRET: "synthetic-favourite-only-cursor-secret-at-least-32-characters",
      BETTER_AUTH_SECRET: "synthetic-favourite-runtime-secret-at-least-32-characters", AUTH_EMAIL_TRANSPORT: "memory" });
    ({ pool: app } = await import("../lib/db")); app!.on("error", onError);
    assert.deepEqual((await app.query("SELECT current_user,session_user")).rows[0], { current_user: role, session_user: role });
    const capability = (await app.query("SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0];
    assert.deepEqual(Object.values(capability), [false, false, false, false]);
    assert.equal((await app.query("SELECT pg_has_role(current_user,$1,'MEMBER') AS member", [owner])).rows[0].member, false);
    const request = (path = "/api/favourites", cookie = "", account?: string, body?: unknown, method = body === undefined ? "GET" : "POST") => new Request("http://localhost:3000" + path, {
      method, headers: { origin: "http://localhost:3000", cookie, "content-type": "application/json", ...(account ? { "X-Community-Account": account } : {}) }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const check = async (response: Response, status = 200) => { assert.equal(response.status, status, await response.clone().text()); return response.json(); };
    const route = await import("../app/api/favourites/route");
    await check(await route.GET(request()), 503);
    process.env.FAVOURITE_HISTORY_ENABLED = "true";
    await check(await route.GET(request()), 503);
    process.env.COMMUNITY_PROBLEM_STATS_ENABLED = "true";
    const { auth } = await import("../lib/auth");
    const signIn = async (index: number) => {
      const response = await auth.handler(request("/api/auth/sign-in/email", "", undefined, { email: `synthetic-${index}@example.invalid`, password: "synthetic-password-123" }));
      await check(response);
      const cookie = response.headers.getSetCookie().map(value => value.split(";")[0]).filter(value => value.includes("session_token")).join("; ");
      assert.ok(cookie); return cookie;
    };
    const a = await signIn(0), b = await signIn(1), aid = "synthetic-user-0", bid = "synthetic-user-1";
    await t.test("missing favourite permissions fail closed, existing reviewed grants suffice", async () => {
      await check(await route.GET(request("/api/favourites", a, aid)), 503);
      await setup!.query(bind(await readFile("scripts/activation/favourites-grants.review.sql", "utf8")));
      // Preserve the already reviewed baseline correction. No new grant proposal.
      await setup!.query(`REVOKE UPDATE(id) ON authored_problem FROM ${role}`);
      await setup!.query("SELECT set_config('physcratic.audit_contract','batch-a',false)");
      const audit = await setup!.query(bind(await readFile("scripts/runtime-role/verify.readonly.sql", "utf8"))) as unknown as { rows: unknown[] }[];
      assert.deepEqual(audit.at(-2)!.rows, []);
      assert.deepEqual(favouritePageSchema.parse(await check(await route.GET(request("/api/favourites", a, aid)))).items, []);
      for (const sql of ['DELETE FROM "user"', "UPDATE authored_problem SET id=id", "SELECT * FROM community_profile", "INSERT INTO practice_attempt(id) VALUES(gen_random_uuid())", "UPDATE community_problem_total SET favourites=0"])
        await assert.rejects(app!.query(sql), { code: "42501" });
    });
    const stats = await import("../app/api/community/problem-stats/route");
    const favourite = async (cookie: string, account: string, key: string) => check(await stats.PUT(request("/api/community/problem-stats", cookie, account, { key, favourite: true }, "PUT")));
    for (const problem of arena.problems.slice(0, 25)) await favourite(a, aid, "arena:" + problem.id);
    await favourite(b, bid, "arena:" + arena.problems[0].id);
    const { validDraft } = await import("./publish-rule-fixtures");
    const draft = validDraft();
    const drafts = await import("../app/api/authored-problems/drafts/route");
    const made = await check(await drafts.POST(request("/api/authored-problems/drafts", a, undefined, { content: draft.content, privateParts: draft.privateParts })), 201);
    const publish = await import("../app/api/authored-problems/drafts/[id]/publish/route");
    await check(await publish.POST(request(`/api/authored-problems/drafts/${made.problemId}/publish`, a, undefined, { version: made.version }), { params: Promise.resolve({ id: made.problemId }) }));
    await favourite(a, aid, "authored:" + made.problemId);
    const get = async (cookie: string, account: string, query = "") => {
      const response = await route.GET(request("/api/favourites" + query, cookie, account));
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("vary"), "Cookie, X-Community-Account");
      return favouritePageSchema.parse(await check(response));
    };
    const first = await get(a, aid); assert.equal(first.items.length, 24); assert.ok(first.nextCursor);
    const { openCompletionCursor } = await import("../lib/opaque-completion-cursor");
    assert.deepEqual(openCompletionCursor(process.env.FAVOURITE_HISTORY_CURSOR_SECRET!, "ph1", ["favourites-v1", aid], first.nextCursor), [first.items.at(-1)!.key]);
    assert.equal(openCompletionCursor(process.env.BETTER_AUTH_SECRET!, "ph1", ["favourites-v1", aid], first.nextCursor), null, "the real route uses the dedicated key rather than the authentication key");
    await t.test("owner paging and publication filtering through actual route exports", async () => {
      const second = await get(a, aid, "?after=" + first.nextCursor);
      assert.equal(second.items.length, 2); assert.equal(second.nextCursor, null);
      assert.equal(new Set([...first.items, ...second.items].map(item => item.key)).size, 26);
      assert.ok(second.items.some(item => item.key === "authored:" + made.problemId));
      assert.deepEqual((await get(b, bid)).items.map(item => item.key), ["arena:" + arena.problems[0].id]);
      await setup!.query("UPDATE authored_problem SET state='archived',published_revision_id=NULL WHERE id=$1", [made.problemId]);
      assert.equal((await get(a, aid, "?after=" + first.nextCursor)).items.some(item => item.key === "authored:" + made.problemId), false);
      await setup!.query(`REVOKE SELECT ON community_favourite FROM ${role}`);
      const unavailable = await route.GET(request("/api/favourites", a, aid));
      assert.equal(unavailable.headers.get("cache-control"), "private, no-store");
      await check(unavailable, 503);
      await setup!.query(`GRANT SELECT ON community_favourite TO ${role}`);
    });
    await t.test("guest, stale cookie, foreign cursor and expired session cannot read or charge another account", async () => {
      const charges = async () => Number((await setup!.query("SELECT requests FROM community_favourite_limit WHERE user_id=$1", [bid])).rows[0].requests);
      const before = await charges();
      await check(await route.GET(request()), 401);
      await check(await route.GET(request("/api/favourites", b)), 409);
      await check(await route.GET(request("/api/favourites", b, aid)), 409);
      await check(await route.GET(request("/api/favourites?after=" + first.nextCursor, b, bid)), 400);
      assert.equal(await charges(), before);
      await setup!.query('UPDATE session SET "expiresAt"=now()-interval \'1 day\' WHERE "userId"=$1', [bid]);
      await check(await route.GET(request("/api/favourites", b, bid)), 401);
      assert.equal(await charges(), before);
      await check(await auth.handler(request("/api/auth/sign-out", a, undefined, {})));
      await check(await route.GET(request("/api/favourites", a, aid)), 401);
    });
    delete process.env.FAVOURITE_HISTORY_ENABLED;
    await check(await route.GET(request("/api/favourites", a, aid)), 503);
    assert.deepEqual(idleErrors, []);
  } finally {
    closing = true;
    await app?.end(); await setup?.end();
    if (databaseCreated) await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
    if (roleCreated) await admin.query(`DROP ROLE ${role}`);
    if (ownerCreated) await admin.query(`DROP ROLE ${owner}`);
    await admin.end();
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});
