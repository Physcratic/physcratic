import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { createCommunityProfileApi } from "./community/profile-api";
import { communityProfilesEnabled, createCommunityProfileRoute } from "./community/profile-route";
import { profilePatchSchema, reservedProfileHandles } from "./community/profile-contracts";
import { physicsTopics } from "./physics-taxonomy";
import { isAllowedSubmissionOrigin } from "./submission-security";

test("profile validation normalizes handles, bounds Unicode text, and allows only canonical topics", () => {
  assert.equal(profilePatchSchema.parse({ handle: "  Ada_123 " }).handle, "ada_123");
  assert.equal(profilePatchSchema.safeParse({ bio: "🙂".repeat(500) }).success, true);
  assert.equal(profilePatchSchema.safeParse({ favoriteTopicIds: physicsTopics.map(t => t.id) }).success, true);
  for (const input of [
    {}, { userId: "other" }, { role: "admin" }, { email: "private@test.invalid" },
    { handle: "ab" }, { handle: "x".repeat(25) }, { handle: "héllo" }, { handle: "_ada" },
    { handle: "ada/slash" }, { handle: "ada\u0000" }, { handle: "ada\ud800" },
    { bio: "x".repeat(501) }, { bio: "🙂".repeat(501) }, { bio: "\u0000" },
    { displayName: "x".repeat(81) }, { displayName: "line\nbreak" },
    { educationLevel: "admin" }, { publicVisibility: "true" }, { publicVisibility: null },
    { favoriteTopicIds: ["Mechanics"] }, { favoriteTopicIds: ["energy-conservation"] },
    { favoriteTopicIds: ["mechanics", "mechanics"] }, { favoriteTopicIds: [null] },
    ...reservedProfileHandles.map(handle => ({ handle: handle.toUpperCase() })),
  ]) assert.equal(profilePatchSchema.safeParse(input).success, false, JSON.stringify(input));
});

test("profile flag is explicit and disabled routes never load database/auth dependencies", async () => {
  for (const flag of [undefined, "", "false", "1", "TRUE", " true "])
    assert.equal(communityProfilesEnabled({ COMMUNITY_PROFILES_ENABLED: flag }), false);
  assert.equal(communityProfilesEnabled({ COMMUNITY_PROFILES_ENABLED: "true" }), true);
  let loads = 0;
  const route = createCommunityProfileRoute(() => false, async () => { loads++; throw new Error("MISSING_TABLE_SENTINEL"); });
  for (const [action, method] of [["own", "GET"], ["own", "PATCH"], ["public", "GET"]] as const) {
    const response = await route(action, new Request("https://physcratic.test/api/community/profile", { method }), "ada");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Profiles are disabled." });
    assert.match(response.headers.get("cache-control")!, /private.*no-store/);
  }
  assert.equal(loads, 0);
  const enabled = createCommunityProfileRoute(() => true, async () => { throw new Error("PRIVATE_CONFIG_SENTINEL"); });
  assert.deepEqual(await (await enabled("own", new Request("https://physcratic.test"))).json(), { error: "Profiles are temporarily unavailable." });
});

test("actual profile route exports are safe when the flag is unset and schema is absent", async () => {
  const previous = process.env.COMMUNITY_PROFILES_ENABLED;
  delete process.env.COMMUNITY_PROFILES_ENABLED;
  try {
    const own = await import("../app/api/community/profile/route");
    const publicRoute = await import("../app/api/community/profile/[handle]/route");
    const request = new Request("https://physcratic.test/api/community/profile");
    assert.equal((await own.GET(request)).status, 503);
    assert.equal((await own.PATCH(new Request(request, { method: "PATCH" }))).status, 503);
    assert.equal((await publicRoute.GET(request, { params: Promise.resolve({ handle: "ada" }) })).status, 503);
  } finally {
    if (previous === undefined) delete process.env.COMMUNITY_PROFILES_ENABLED;
    else process.env.COMMUNITY_PROFILES_ENABLED = previous;
  }
});

const url = process.env.AUTHORING_TEST_DATABASE_URL;
test("community profile API, constraints and migration on disposable PostgreSQL", { skip: !url && "Use scripts/test-problem-authoring.sh" }, async t => {
  const target = new URL(url!);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/physcratic_authoring_test");
  assert.equal(target.search, "");
  const schema = `profile_test_${randomUUID().replaceAll("-", "")}`;
  const role = `${schema}_runtime`;
  const admin = new Pool({ connectionString: url, max: 1 });
  const setup = new Pool({ connectionString: url, options: `-c search_path=${schema}`, max: 5, statement_timeout: 10000 });
  const pools: Pool[] = [];
  t.after(async () => {
    await Promise.all(pools.map(p => p.end()));
    await setup.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.query(`DROP ROLE IF EXISTS ${role}`);
    await admin.end();
  });
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.query(`CREATE ROLE ${role} NOLOGIN`);
  const up = await readFile("migrations/0007_community_profile.up.sql", "utf8");
  const down = await readFile("migrations/0007_community_profile.down.sql", "utf8");
  await setup.query(`CREATE TABLE "user"(id text PRIMARY KEY,name text,email text);
    INSERT INTO "user" VALUES ('owner','PRIVATE_REAL_NAME','PRIVATE_EMAIL'),('other','OTHER_PRIVATE_NAME','OTHER_PRIVATE_EMAIL');
    INSERT INTO "user" SELECT 'race'||i,'Private','private'||i FROM generate_series(0,20) i;`);
  await setup.query(`BEGIN; ${up} COMMIT;`);
  await setup.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role};
    GRANT SELECT,INSERT,UPDATE ON community_profile,community_profile_write_limit TO ${role}`);
  const sessions = new Map([
    ["owner", { id: "owner", emailVerified: true }], ["other", { id: "other", emailVerified: true }],
    ["unverified", { id: "owner", emailVerified: false }],
    ...Array.from({ length: 21 }, (_, i) => [`race${i}`, { id: `race${i}`, emailVerified: true }] as const),
  ]);
  const instances = Array.from({ length: 2 }, () => {
    const pool = new Pool({ connectionString: url, options: `-c search_path=${schema} -c role=${role}`, max: 5 });
    pools.push(pool);
    return createCommunityProfileApi({ pool, user: async r => sessions.get(r.headers.get("x-test-session") ?? ""),
      origin: r => isAllowedSubmissionOrigin(r, ["https://physcratic.test"]) });
  });
  const request = (body?: unknown, session = "owner", extra: Record<string, string> = {}, query = "") => new Request(`https://physcratic.test/api/community/profile${query}`, {
    method: body === undefined ? "GET" : "PATCH",
    headers: { "x-test-session": session, "X-Community-Account": session === "unverified" ? "owner" : session, origin: "https://physcratic.test", "content-type": "application/json", ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const own = (body?: unknown, session = "owner", instance = 0) => instances[instance]("own", request(body, session));
  const lookup = (handle: string) => instances[0]("public", request(), handle);
  const resetLimit = () => setup.query("TRUNCATE community_profile_write_limit");
  t.beforeEach(async () => { await setup.query("TRUNCATE community_profile,community_profile_write_limit"); });

  await t.test("missing own reads are stable and never initialize/publish real account identity", async () => {
    assert.deepEqual(await (await own()).json(), { profile: null });
    assert.deepEqual(await (await own()).json(), { profile: null });
    assert.equal((await setup.query("SELECT * FROM community_profile")).rowCount, 0);
    assert.equal((await own({ bio: "No handle yet" })).status, 400);
    const created = await own({ handle: "  Ada_123 " });
    assert.equal(created.status, 201);
    const { profile } = await created.json();
    assert.equal(profile.userId, "owner");
    assert.equal(profile.handle, "ada_123");
    assert.equal(profile.displayName, "");
    assert.equal(profile.bio, "");
    assert.equal(profile.educationLevel, "prefer-not-to-say");
    assert.deepEqual(profile.favoriteTopicIds, []);
    assert.equal(profile.publicVisibility, false);
    assert.ok(!JSON.stringify(profile).includes("PRIVATE"));
    assert.equal((await lookup("ADA_123")).status, 404);
  });
  await t.test("owner editing, explicit publishing, privacy opt-out and timestamps", async () => {
    const created = (await (await own({ handle: "ada", displayName: "Chosen name" })).json()).profile;
    const response = await own({ displayName: "Edited", bio: "Physics\n🙂", educationLevel: "university", favoriteTopicIds: ["mechanics", "optics"], publicVisibility: true });
    assert.equal(response.status, 200);
    const edited = (await response.json()).profile;
    assert.equal(edited.createdAt, created.createdAt);
    assert.ok(new Date(edited.updatedAt) >= new Date(created.updatedAt));
    const visible = await instances[0]("public", request(undefined, "guest"), "ADA");
    assert.deepEqual(await visible.json(), { profile: { handle: "ada", displayName: "Edited", bio: "Physics\n🙂", educationLevel: "university", favoriteTopicIds: ["mechanics", "optics"] } });
    assert.match(visible.headers.get("cache-control")!, /private.*no-store/);
    assert.equal(visible.headers.get("vary"), "Cookie");
    assert.equal(visible.headers.get("x-content-type-options"), "nosniff");
    await own({ publicVisibility: false });
    const hidden = await lookup("ada"), missing = await lookup("missing");
    assert.equal(hidden.status, 404);
    assert.deepEqual(await hidden.json(), await missing.json());
    assert.equal((await own({ handle: "ADA" })).status, 200);
    assert.equal((await own({ handle: "renamed" })).status, 409);
    assert.equal((await lookup("renamed")).status, 404);
    assert.equal((await own({ favoriteTopicIds: physicsTopics.map(topic => topic.id) })).status, 200, "SQL accepts the full canonical topic registry");
    assert.equal((await setup.query('SELECT name,email FROM "user" WHERE id=\'owner\'')).rows[0].name, "PRIVATE_REAL_NAME");
  });
  await t.test("session ownership, unverified writes, selectors, spoofing and CSRF", async () => {
    assert.equal((await own(undefined, "guest")).status, 401);
    assert.equal((await own({ handle: "stolen" }, "guest")).status, 401);
    assert.equal((await own({ handle: "stolen" }, "unverified")).status, 403);
    assert.equal((await instances[0]("own", request({ handle: "stolen" }, "owner", { origin: "https://evil.test" }))).status, 403);
    assert.equal((await instances[0]("own", request({ handle: "stolen" }, "owner", { "sec-fetch-site": "cross-site" }))).status, 403);
    await own({ handle: "private_owner" });
    for (const body of [{ userId: "other", bio: "IDOR" }, { ownerId: "other" }, { handle: "stolen", role: "admin" }, { createdAt: new Date().toISOString() }])
      assert.equal((await own(body)).status, 400);
    assert.equal((await instances[0]("own", request(undefined, "other", {}, "?userId=owner"))).status, 400);
    assert.deepEqual(await (await own(undefined, "other")).json(), { profile: null });
    await own({ handle: "other_user" }, "other");
    await own({ bio: "Other account text" }, "other");
    assert.equal((await (await own()).json()).profile.bio, "");
    assert.equal((await setup.query("SELECT count(*)::int n FROM community_profile_write_limit")).rows[0].n, 2);
  });
  await t.test("duplicate handles, case normalization and concurrent cross-instance claims", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => own({ handle: i % 2 ? "CONCURRENT" : "concurrent" }, `race${i}`, i % 2)));
    assert.equal(results.filter(r => r.status === 201).length, 1);
    assert.equal(results.filter(r => r.status === 409).length, 7);
    assert.equal((await setup.query("SELECT count(*)::int n FROM community_profile")).rows[0].n, 1);
    assert.equal((await own({ handle: "Concurrent" }, "other")).status, 409);
    assert.equal((await own({ handle: "another" }, "other")).status, 201, "conflict rolls back and releases connection");
  });
  await t.test("concurrent lazy initialization and disjoint edits preserve one profile and both updates", async () => {
    const creation = await Promise.all([own({ handle: "one_owner", bio: "saved" }), own({ handle: "one_owner", displayName: "Chosen" }, "owner", 1)]);
    assert.deepEqual(creation.map(r => r.status).sort(), [200, 201]);
    await Promise.all([own({ educationLevel: "high-school" }), own({ favoriteTopicIds: ["waves"] }, "owner", 1)]);
    const saved = (await (await own()).json()).profile;
    assert.equal(saved.bio, "saved"); assert.equal(saved.displayName, "Chosen");
    assert.equal(saved.educationLevel, "high-school"); assert.deepEqual(saved.favoriteTopicIds, ["waves"]);
  });
  await t.test("atomic bounded rate limits across instances, separate accounts and window reset", async () => {
    await own({ handle: "limited" }); await resetLimit();
    const results = await Promise.all(Array.from({ length: 24 }, (_, i) => own({ bio: `save ${i}` }, "owner", i % 2)));
    assert.equal(results.filter(r => r.status === 200).length, 10);
    assert.equal(results.filter(r => r.status === 429).length, 14);
    assert.equal(results.find(r => r.status === 429)!.headers.get("retry-after"), "60");
    assert.equal((await setup.query("SELECT requests FROM community_profile_write_limit WHERE user_id='owner'")).rows[0].requests, 11);
    assert.equal((await own({ handle: "separate" }, "other", 1)).status, 201);
    await setup.query("UPDATE community_profile_write_limit SET window_start=now()-interval '2 minutes' WHERE user_id='owner'");
    assert.equal((await own({ bio: "Reset works" }, "owner", 1)).status, 200);
    assert.equal((await setup.query("SELECT requests FROM community_profile_write_limit WHERE user_id='owner'")).rows[0].requests, 1);
  });
  await t.test("invalid requests are bounded, counted and return nonleaking errors", async () => {
    for (const body of [{ handle: "ADMIN" }, { handle: "ab" }, { bio: "x".repeat(501) }, { favoriteTopicIds: ["fake"] }, { publicVisibility: "true" }])
      assert.equal((await own(body)).status, 400);
    assert.equal((await setup.query("SELECT requests FROM community_profile_write_limit WHERE user_id='owner'")).rows[0].requests, 5);
    assert.equal((await instances[0]("own", request({ handle: "valid" }, "owner", { "content-type": "text/plain" }))).status, 415);
    const broken = request({}, "owner");
    assert.equal((await instances[0]("own", new Request(broken.url, { method: "PATCH", headers: broken.headers, body: "{" }))).status, 400);
    assert.equal((await own({ bio: "x".repeat(9000) })).status, 413);
    assert.equal((await setup.query("SELECT count(*)::int n FROM community_profile")).rows[0].n, 0);
  });
  await t.test("PostgreSQL enforces integrity, reserved handles, limits and immutable identity", async () => {
    for (const handle of reservedProfileHandles)
      await assert.rejects(setup.query("INSERT INTO community_profile(user_id,handle) VALUES('owner',$1)", [handle]), { code: "23514" });
    await assert.rejects(setup.query("INSERT INTO community_profile(user_id,handle) VALUES('missing','valid')"), { code: "23503" });
    await assert.rejects(setup.query("INSERT INTO community_profile(user_id,handle) VALUES('owner','UPPERCASE')"), { code: "23514" });
    await own({ handle: "valid" });
    await assert.rejects(setup.query("INSERT INTO community_profile(user_id,handle) VALUES('other','valid')"), { code: "23505" });
    for (const change of ["user_id='other'", "handle='changed'", "created_at=now()+interval '1 day'", "bio=repeat('x',501)", "education_level='admin'", "favorite_topic_ids=ARRAY['unknown']"])
      await assert.rejects(setup.query(`UPDATE community_profile SET ${change} WHERE user_id='owner'`), { code: "23514" });
    assert.equal((await own({ bio: "Legitimate edit" })).status, 200, "restricted runtime grants suffice, including trigger");
    await assert.rejects(pools[0].query("DELETE FROM community_profile"), { code: "42501" });
  });
  await t.test("disabled missing-schema routes do no DB work, enabled missing schema fails closed", async () => {
    const empty = new Pool({ connectionString: url, options: "-c search_path=pg_catalog" });
    try {
      const api = createCommunityProfileApi({ pool: empty, user: async () => ({ id: "owner", emailVerified: true }), origin: () => true });
      const disabled = createCommunityProfileRoute(() => false, async () => ({ communityProfileApi: api }));
      assert.deepEqual(await (await disabled("public", request(), "valid")).json(), { error: "Profiles are disabled." });
      for (const response of [await api("public", request(), "valid"), await api("own", request()), await api("own", request({ handle: "valid" }))]) {
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), { error: "Profiles are temporarily unavailable." });
      }
    } finally { await empty.end(); }
  });
  await t.test("0007 up/down/up preserves existing accounts and populated rollback refuses data loss", async () => {
    const before = (await setup.query('SELECT * FROM "user" ORDER BY id')).rows;
    assert.equal((await setup.query("SELECT count(*)::int n FROM community_profile")).rows[0].n, 0);
    await setup.query(down);
    assert.equal((await setup.query("SELECT to_regclass('community_profile') t")).rows[0].t, null);
    await setup.query(`BEGIN; ${up} COMMIT;`);
    assert.deepEqual((await setup.query('SELECT * FROM "user" ORDER BY id')).rows, before);
    await setup.query("INSERT INTO community_profile(user_id,handle) VALUES('owner','survivor')");
    await assert.rejects(setup.query(down), { code: "55000" });
    assert.equal((await setup.query("SELECT handle FROM community_profile")).rows[0].handle, "survivor");
    assert.deepEqual((await setup.query('SELECT * FROM "user" ORDER BY id')).rows, before);
  });
});

test("stale profile account rejects own reads and first-profile writes before any query", async () => {
  let queries = 0;
  const pool = { query: async () => { queries++; throw Error("No quota writes"); }, connect: async () => { queries++; throw Error("No profile transaction"); } };
  const api = createCommunityProfileApi({ pool: pool as unknown as Pool, user: async () => ({ id: "B", emailVerified: true }), origin: () => true });
  for (const method of ["GET", "PATCH"]) {
    const response = await api("own", new Request("https://test/api/community/profile", { method, headers: { "X-Community-Account": "A" } }));
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "ACCOUNT_CHANGED");
    assert.equal(response.headers.get("Vary"), "Cookie, X-Community-Account");
  }
  assert.equal(queries, 0);
});

test("profile client distinguishes account changes from handle conflicts", async () => {
  const { profileRequest } = await import("./community/profile-client");
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ error: "Rejected", code: "ACCOUNT_CHANGED" }, { status: 409 });
    await assert.rejects(profileRequest("https://test/api/community/profile"), /Your account changed\. Reload/);
    globalThis.fetch = async () => Response.json({ error: "Handle unavailable" }, { status: 409 });
    await assert.rejects(profileRequest("https://test/api/community/profile"), /That username is unavailable/);
  } finally { globalThis.fetch = original; }
});
