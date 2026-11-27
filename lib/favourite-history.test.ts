import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import arena from "./arena/index.json";
import { createFavouriteHistoryApi } from "./favourite-history-api";
import { createFavouriteHistoryRoute, favouriteHistoryEnabled } from "./favourite-history-route";
import { favouritePageSchema } from "./favourite-history-contracts";
import { sealCompletionCursor } from "./opaque-completion-cursor";
import { createProblemStatsApi } from "./community/problem-stats-api";

const origin = "https://physcratic.test", secret = "synthetic-favourite-cursor-secret";
const request = (actor: string | null, query = "", expected = actor) => new Request(origin + "/api/favourites" + query, { headers: {
  ...(actor ? { "x-test-user": actor } : {}), ...(expected ? { "X-Community-Account": expected } : {}),
} });
const user = async (r: Request) => r.headers.has("x-test-user") ? { id: r.headers.get("x-test-user")!, emailVerified: true } : null;

test("favourite retrieval stays OFF and never loads private bindings on an old schema", async () => {
  assert.equal(favouriteHistoryEnabled({}), false);
  assert.equal(favouriteHistoryEnabled({ FAVOURITE_HISTORY_ENABLED: "true" }), false);
  assert.equal(favouriteHistoryEnabled({ COMMUNITY_PROBLEM_STATS_ENABLED: "true" }), false);
  assert.equal(favouriteHistoryEnabled({ FAVOURITE_HISTORY_ENABLED: "TRUE", COMMUNITY_PROBLEM_STATS_ENABLED: "true" }), false);
  assert.equal(favouriteHistoryEnabled({ FAVOURITE_HISTORY_ENABLED: "true", COMMUNITY_PROBLEM_STATS_ENABLED: "true" }), true);
  let loads = 0;
  const route = createFavouriteHistoryRoute(() => false, async () => { loads++; throw Error("Private bindings loaded"); });
  const response = await route(request("A"));
  assert.equal(response.status, 503); assert.equal(loads, 0);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Cookie, X-Community-Account");
  const previous = process.env.FAVOURITE_HISTORY_ENABLED;
  delete process.env.FAVOURITE_HISTORY_ENABLED;
  try {
    const actual = await import("../app/api/favourites/route");
    assert.equal((await actual.GET(request("A"))).status, 503);
  } finally { if (previous !== undefined) process.env.FAVOURITE_HISTORY_ENABLED = previous; }
});

test("guest, stale account, missing account, malformed and foreign cursors never touch favourite storage", async () => {
  let calls = 0;
  const pool = { query() { calls++; throw Error("Unexpected query"); }, connect() { calls++; throw Error("Unexpected connection"); } } as unknown as Pool;
  const api = createFavouriteHistoryApi({ pool, user, cursorSecret: secret });
  for (const [r, status] of [
    [request(null), 401], [request("B", "", "A"), 409], [request("A", "", null), 409],
    [request("A", "?owner=B"), 400], [request("A", "?after=x&after=y"), 400],
    [request("A", "?after=broken"), 400],
    [request("A", "?after=" + sealCompletionCursor(secret, "ph1", ["favourites-v1", "B"], ["arena:" + arena.problems[0].id])), 400],
    [request("A", "?after=" + sealCompletionCursor(secret, "ph1", ["A"], ["2026-11-27T00:00:00.000Z", "arena:" + arena.problems[0].id])), 400],
  ] as const) assert.equal((await api(r)).status, status);
  assert.equal((await api(new Request(origin + "/api/favourites", { method: "PUT" }))).status, 405);
  assert.equal(calls, 0);
  assert.equal((await createFavouriteHistoryApi({ pool, user })(request("A"))).status, 503);
  assert.equal(calls, 0);
});

test("favourite projection rejects private fields and unsafe reader links", () => {
  const key = "arena:" + arena.problems[0].id, title = arena.problems[0].title;
  assert.equal(favouritePageSchema.safeParse({ items: [{ key, title, href: "javascript:alert(1)" }], nextCursor: null }).success, false);
  assert.equal(favouritePageSchema.safeParse({ items: [{ key, title, href: "/dashboard/problems/" + arena.problems[0].id, userId: "private" }], nextCursor: null }).success, false);
});

const database = process.env.AUTHORING_TEST_DATABASE_URL;
test("private favourites use existing PostgreSQL records, bounded paging, current publications and shared quota", { skip: !database }, async t => {
  const target = new URL(database!);
  assert.equal(target.hostname, "127.0.0.1"); assert.equal(target.pathname, "/physcratic_authoring_test"); assert.equal(target.search, "");
  const schema = "favourite_history_" + randomUUID().replaceAll("-", "");
  const admin = new Pool({ connectionString: database }), pool = new Pool({ connectionString: database, options: `-c search_path=${schema},public` });
  await admin.query(`CREATE SCHEMA ${schema}`);
  t.after(async () => { await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); });
  // The production query's existing column/index contract, without providers, real identities or a production clone.
  await pool.query(`CREATE TABLE "user"(id text PRIMARY KEY);
    CREATE TABLE authored_problem(id uuid PRIMARY KEY,state text,published_revision_id uuid);
    CREATE TABLE authored_revision(id uuid PRIMARY KEY,problem_id uuid,schema_version integer,content jsonb);
    CREATE TABLE community_favourite(user_id text REFERENCES "user"(id) ON DELETE CASCADE,problem_key text,created_at timestamptz DEFAULT clock_timestamp(),PRIMARY KEY(user_id,problem_key));
    CREATE TABLE community_favourite_limit(user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,window_start timestamptz,requests integer CHECK(requests BETWEEN 1 AND 61));
    INSERT INTO "user" VALUES('A'),('B');`);
  const keys = arena.problems.map(p => "arena:" + p.id).sort();
  for (const key of keys) await pool.query("INSERT INTO community_favourite(user_id,problem_key) VALUES('A',$1)", [key]);
  const publicId = randomUUID(), hiddenId = randomUUID(), mismatchId = randomUUID();
  for (const [id, state, ownerMatch] of [[publicId, "published", true], [hiddenId, "draft", true], [mismatchId, "published", false]] as const) {
    const revision = randomUUID();
    await pool.query("INSERT INTO authored_problem VALUES($1,$2,$3)", [id, state, revision]);
    await pool.query("INSERT INTO authored_revision VALUES($1,$2,1,$3)", [revision, ownerMatch ? id : randomUUID(), JSON.stringify({ title: state === "published" && ownerMatch ? "Public Favourite" : "Private Title" })]);
    await pool.query("INSERT INTO community_favourite(user_id,problem_key) VALUES('A',$1)", ["authored:" + id]);
  }
  await pool.query("INSERT INTO community_favourite(user_id,problem_key) VALUES('A','arena:retired-key'),('B',$1)", [keys[0]]);
  const api = createFavouriteHistoryApi({ pool, user, cursorSecret: secret });
  const get = async (actor: string, query = "") => {
    const response = await api(request(actor, query)); assert.equal(response.status, 200, await response.clone().text());
    return favouritePageSchema.parse(await response.json());
  };
  const first = await get("A"); assert.equal(first.items.length, 24); assert.ok(first.nextCursor);
  assert.equal(JSON.stringify(first).includes("Private Title"), false);
  assert.equal(JSON.stringify(first).includes("retired-key"), false);
  const second = await get("A", "?after=" + first.nextCursor);
  const found = [...first.items, ...second.items];
  assert.equal(found.length, keys.length + 1); assert.equal(new Set(found.map(p => p.key)).size, found.length); assert.equal(second.nextCursor, null);
  assert.deepEqual((await get("B")).items.map(p => p.key), [keys[0]]);
  assert.equal((await api(request("B", "?after=" + first.nextCursor))).status, 400);
  const tampered = first.nextCursor!.slice(0, -4) + "AAAA";
  assert.equal((await api(request("A", "?after=" + tampered))).status, 400);
  // Deleting the boundary does not invalidate the encrypted range position or duplicate earlier items.
  await pool.query("DELETE FROM community_favourite WHERE user_id='A' AND problem_key=$1", [first.items.at(-1)!.key]);
  assert.deepEqual((await get("A", "?after=" + first.nextCursor)).items, second.items);
  await pool.query("UPDATE authored_revision SET content='{}' WHERE problem_id=$1", [publicId]);
  assert.equal((await api(request("A", "?after=" + first.nextCursor))).status, 503, "invalid source metadata is unavailable, not a client cursor error");
  await pool.query("UPDATE authored_revision SET content=$2 WHERE problem_id=$1", [publicId, JSON.stringify({ title: "Public Favourite" })]);
  await pool.query("UPDATE authored_problem SET state='withdrawn' WHERE id=$1", [publicId]);
  const afterWithdrawal = await get("A", "?after=" + first.nextCursor);
  assert.equal(afterWithdrawal.items.some(p => p.key === "authored:" + publicId), false);
  // Existing favourite writes and private reads consume the same persistent bucket.
  await pool.query("UPDATE community_favourite_limit SET requests=59 WHERE user_id='A'");
  const stats = createProblemStatsApi({ pool, user, origin: () => true });
  const write = await stats(new Request(origin + "/api/problem-stats", { method: "PUT", headers: { "X-Test-User": "A", "X-Community-Account": "A", "Content-Type": "application/json" }, body: JSON.stringify({ key: keys[0], favourite: true }) }));
  assert.equal(write.status, 200);
  const limited = await api(request("A")); assert.equal(limited.status, 429); assert.equal(limited.headers.get("retry-after"), "60");
  await pool.query("DELETE FROM community_favourite WHERE user_id='B'"); assert.deepEqual((await get("B")).items, []);
  await pool.query("DROP TABLE community_favourite"); assert.equal((await api(request("B"))).status, 503, "storage failure is not an empty list");
  await pool.query("DELETE FROM \"user\" WHERE id='B'");assert.equal((await api(request("B"))).status, 401, "an erased account cannot read cached membership");
});
