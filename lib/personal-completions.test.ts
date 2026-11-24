import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import arena from "./arena/index.json";
import { createPersonalCompletionsApi } from "./personal-completions-api";
import { createPersonalCompletionsRoute, personalCompletionsEnabled } from "./personal-completions-route";
import { openCompletionCursor, sealCompletionCursor } from "./opaque-completion-cursor";

const origin = "https://physcratic.test";
const path = "/api/personal-completions";
const arenaKey = "arena:arena-mind-the-gap";
const retiredKey = "arena:arena-retired-fixture";
const database = process.env.AUTHORING_TEST_DATABASE_URL;

test("private cursor lengths are fixed and bindings authenticate randomized tokens", () => {
  const secret = "synthetic-one", actor = ["student"];
  for (const version of ["ph1","pc2"] as const) {
    const short = sealCompletionCursor(secret,version,actor,["a"]);
    const long = sealCompletionCursor(secret,version,actor,["z".repeat(128),"2026-01-01T00:00:00.123Z"]);
    assert.equal(short.length,long.length);
    assert.notEqual(short,sealCompletionCursor(secret,version,actor,["a"]));
    assert.deepEqual(openCompletionCursor(secret,version,actor,short),["a"]);
    assert.equal(openCompletionCursor(secret,version,["other"],short),null);
    assert.equal(openCompletionCursor("synthetic-two",version,actor,short),null);
  }
});

test("personal completions are OFF by default and use no bindings on the old schema", async () => {
  for (const value of [undefined, "false", "TRUE", "1"]) {
    assert.equal(personalCompletionsEnabled({ PERSONAL_COMPLETIONS_ENABLED: value }), false);
  }
  assert.equal(personalCompletionsEnabled({ PERSONAL_COMPLETIONS_ENABLED: "true" }), true);
  let loads = 0;
  const route = createPersonalCompletionsRoute(() => false, async () => {
    loads++;
    throw Error("Disabled completion route loaded private bindings");
  });
  for (const method of ["GET", "PUT"]) {
    const response = await route(new Request(origin + path, { method }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.equal(loads, 0);
  const actual = await import("../app/api/personal-completions/route");
  const previous = process.env.PERSONAL_COMPLETIONS_ENABLED;
  delete process.env.PERSONAL_COMPLETIONS_ENABLED;
  try {
    assert.equal((await actual.GET(new Request(origin + path))).status, 503);
    assert.equal((await actual.PUT(new Request(origin + path, { method: "PUT" }))).status, 503);
  } finally {
    if (previous !== undefined) process.env.PERSONAL_COMPLETIONS_ENABLED = previous;
  }
});

test("private completion API on disposable PostgreSQL", { skip: !database }, async t => {
  const target = new URL(database!);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/physcratic_authoring_test");
  assert.equal(target.search, "");
  const schema = `personal_completions_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: target.href });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: target.href, options: `-c search_path=${schema},public` });
  const up = async () => (await readFile("migrations/0025_personal_completions.up.sql", "utf8")).replaceAll("public.", `${schema}.`);
  const down = async () => (await readFile("migrations/0025_personal_completions.down.sql", "utf8")).replaceAll("public.", `${schema}.`);
  const api = createPersonalCompletionsApi({
    cursorSecret: "synthetic-history-review-secret",
    pool,
    user: async request => {
      const id = request.headers.get("x-test-session");
      return id ? { id, emailVerified: id !== "unverified" } : null;
    },
    origin: request => request.headers.get("origin") === origin,
  });
  const request = (query = "", body?: unknown, user = "a", displayed = user, requestOrigin = origin) => api(new Request(origin + path + query, {
    method: body === undefined ? "GET" : "PUT",
    headers: { "x-test-session": user, "x-community-account": displayed, "content-type": "application/json", origin: requestOrigin },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
  async function json(response: Response, status = 200) {
    assert.equal(response.status, status, await response.clone().text());
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("vary"), "Cookie, X-Community-Account");
    return response.json();
  }
  const status = (key: string, user = "a") => request(`?key=${encodeURIComponent(key)}`, undefined, user);
  const set = (key: string, completed: boolean, user = "a") => request("", { key, completed }, user);
  const problemId = randomUUID(), revisionId = randomUUID();
  const authoredKey = `authored:${problemId}`;
  try {
    await pool.query(`CREATE TABLE "user"(id text PRIMARY KEY, "emailVerified" boolean NOT NULL);
      INSERT INTO "user" VALUES ('a',true),('b',true),('history',true),('unverified',false);`);
    await pool.query(await readFile("migrations/0001_problem_authoring.up.sql", "utf8"));
    const oldSchema = createPersonalCompletionsRoute(() => false, async () => ({ personalCompletionsApi: api }));
    await json(await oldSchema(new Request(origin + path)), 503);
    for (const sql of [await up(), await down(), await up()]) await pool.query(`BEGIN; ${sql} COMMIT;`);
    const columns = await pool.query(`SELECT column_name FROM information_schema.columns
      WHERE table_schema=$1 AND table_name='personal_problem_completion' ORDER BY ordinal_position`, [schema]);
    assert.deepEqual(columns.rows.map(row => row.column_name), ["user_id", "problem_key", "completed_at"]);
    const publish = async (id: string, number: number, title: string) => {
      const part = randomUUID();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("INSERT INTO authored_revision_part(revision_id,part_id,answer_mode) VALUES($1,$2,'manual')", [id, part]);
        await client.query("INSERT INTO authored_revision_private_part(revision_id,part_id,answer_mode,data) VALUES($1,$2,'manual',$3)", [id, part, { partId: part, key: { kind: "manual" }, hints: [], solution: [] }]);
        await client.query("INSERT INTO authored_revision(id,problem_id,number,content) VALUES($1,$2,$3,$4)", [id, problemId, number, { title, sections: [{ parts: [{ id: part, answerMode: "manual" }] }] }]);
        await client.query("UPDATE authored_problem SET state='published', published_revision_id=$1 WHERE id=$2", [id, problemId]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    };
    await pool.query("INSERT INTO authored_problem(id,slug,owner_id) VALUES($1,'synthetic-completion-problem','a')", [problemId]);

    await t.test("same-account authentication precedes reads and mutations", async () => {
      for (const body of [undefined, { key: arenaKey, completed: true }]) {
        await json(await request("", body, "", ""), 401);
        await json(await request("", body, "b", "a"), 409);
        await json(await request("", body, "a", ""), 409);
      }
      await json(await set(arenaKey, true, "unverified"), 403);
      await json(await request("", { key: arenaKey, completed: true }, "a", "a", "https://untrusted.invalid"), 403);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM personal_completion_write_limit")).rows[0].n, 0);
    });

    await t.test("concurrent and repeated desired state writes preserve the first timestamp", async () => {
      assert.deepEqual(await json(await status(arenaKey)), { key: arenaKey, completed: false, completedAt: null });
      const writes = await Promise.all(Array.from({ length: 4 }, () => set(arenaKey, true)));
      const values = await Promise.all(writes.map(response => json(response)));
      assert.match(values[0].completedAt, /^\d{4}-\d\d-\d\dT/);
      for (const value of values) assert.deepEqual(value, { key: arenaKey, completed: true, completedAt: values[0].completedAt });
      assert.deepEqual(await json(await set(arenaKey, true)), values[0]);
      assert.deepEqual(await json(await status(arenaKey)), values[0]);
      assert.deepEqual(await json(await status(arenaKey, "b")), { key: arenaKey, completed: false, completedAt: null });
      assert.equal((await json(await request("", undefined, "b"))).count, 0);
      const other = await json(await set(arenaKey, true, "b"));
      const removals = await Promise.all([set(arenaKey, false), set(arenaKey, false)]);
      for (const response of removals) assert.deepEqual(await json(response), { key: arenaKey, completed: false, completedAt: null });
      assert.deepEqual(await json(await status(arenaKey, "b")), other);
      await json(await set(arenaKey, false, "b"));
    });

    await t.test("strict inputs and public availability are checked separately from removal", async () => {
      await json(await set("authored:invalid", true), 400);
      await json(await request("", { key: arenaKey, completed: true, answer: "private" }), 400);
      await json(await request(`?key=${arenaKey}&key=${arenaKey}`), 400);
      await json(await request(`?key=${arenaKey}&after=invalid`), 400);
      await json(await request("?after=invalid"), 400);
      await json(await set(retiredKey, true), 404);
      await json(await status(retiredKey), 404);
      await json(await set(authoredKey, true), 404);
      await json(await status(authoredKey), 404);
      await json(await set(`authored:${randomUUID()}`, true), 404);
      await pool.query("INSERT INTO personal_problem_completion(user_id,problem_key) VALUES('a',$1)", [retiredKey]);
      assert.equal((await json(await request())).count, 0);
      assert.deepEqual(await json(await set(retiredKey, false)), { key: retiredKey, completed: false, completedAt: null });
    });

    await t.test("republishing retains a mark, withdrawal hides it and still permits unmarking", async () => {
      await publish(revisionId, 1, "Public motion problem");
      const mark = await json(await set(`authored:${problemId.toUpperCase()}`, true));
      assert.equal(mark.key, authoredKey);
      await pool.query("UPDATE authored_problem SET state='archived',published_revision_id=NULL WHERE id=$1", [problemId]);
      await json(await status(authoredKey), 404);
      assert.deepEqual(await json(await request()), { count: 0, items: [], nextCursor: null });
      await publish(randomUUID(), 2, "Republished motion problem");
      assert.deepEqual(await json(await status(authoredKey)), mark);
      const list = await json(await request());
      assert.deepEqual(list, { count: 1, items: [{ key: authoredKey, title: "Republished motion problem", href: `/dashboard/authored/${problemId}`, completedAt: mark.completedAt }], nextCursor: null });
      await pool.query("UPDATE authored_problem SET state='archived',published_revision_id=NULL WHERE id=$1", [problemId]);
      assert.equal((await json(await set(authoredKey, false))).completed, false);
      assert.equal((await json(await set(authoredKey, false))).completed, false);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM personal_problem_completion WHERE user_id='a'")).rows[0].n, 0);
    });

    await t.test("history counts only visible marks and keyset pagination handles equal timestamps", async () => {
      const keys = arena.problems.slice(0, 26).map(problem => `arena:${problem.id}`);
      assert.equal(keys.length, 26);
      await pool.query(`INSERT INTO personal_problem_completion(user_id,problem_key,completed_at)
        SELECT 'history',key,'2026-01-01T00:00:00.123Z' FROM unnest($1::text[]) AS key`, [[...keys, retiredKey, authoredKey]]);
      const first = await json(await request("", undefined, "history"));
      assert.equal(first.count, 26);
      assert.equal(first.items.length, 24);
      assert.equal(typeof first.nextCursor, "string");
      assert.match(first.nextCursor, /^ph1\./);
      assert.throws(() => JSON.parse(Buffer.from(first.nextCursor.split(".")[1], "base64url").toString("utf8")));
      await json(await request(`?after=${encodeURIComponent(first.nextCursor)}`, undefined, "b"), 400);
      const corrupt = first.nextCursor.slice(0, 12) + (first.nextCursor[12] === "A" ? "B" : "A") + first.nextCursor.slice(13);
      await json(await request(`?after=${encodeURIComponent(corrupt)}`, undefined, "history"), 400);
      const last = await json(await request(`?after=${encodeURIComponent(first.nextCursor)}`, undefined, "history"));
      assert.equal(last.count, 26);
      assert.equal(last.nextCursor, null);
      assert.deepEqual([...first.items, ...last.items].map((item: { key: string }) => item.key), keys.sort().reverse());
      assert.deepEqual(Object.keys(first.items[0]).sort(), ["completedAt", "href", "key", "title"]);
      await assert.rejects(pool.query(`BEGIN; ${await down()} COMMIT;`), /Preserve personal completion/);
      await pool.query("ROLLBACK");
    });

    await t.test("completion quotas are shared across handlers and isolated from other accounts", async () => {
      await pool.query(`INSERT INTO personal_completion_write_limit(user_id,window_start,requests)
        VALUES('b',date_trunc('minute',clock_timestamp()),60)
        ON CONFLICT(user_id) DO UPDATE SET window_start=EXCLUDED.window_start,requests=EXCLUDED.requests`);
      const limited = await set(arenaKey, true, "b");
      await json(limited, 429);
      assert.equal(limited.headers.get("retry-after"), "60");
      assert.equal((await json(await status(arenaKey, "b"))).completed, false);
      assert.equal((await json(await set(arenaKey, true))).completed, true);
    });
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
