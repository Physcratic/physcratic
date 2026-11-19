import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import arena from "./arena/index.json";
import { achievementFixtures } from "../tests/community-achievement-fixtures";

// 0021 replaces the fixed list of 18 Arena favourite keys from 0012 with a pattern. The API stays the catalogue gate.
const up = () => readFile("migrations/0021_arena_favourite_key_pattern.up.sql", "utf8");
const down = () => readFile("migrations/0021_arena_favourite_key_pattern.down.sql", "utf8");
const original = async () => readFile("migrations/0012_community_problem_stats.up.sql", "utf8");
const arenaKeysIn = (sql: string) => [...sql.matchAll(/'arena:(arena-[a-z0-9-]+)'/g)].map((m) => m[1]);
const catalogue = arena.problems.map((p) => p.id);

test("0021 pattern accepts every catalogue key and every key 0012 allowed", async () => {
  const pattern = new RegExp((await up()).match(/problem_key ~ '(\^arena:[^']+)'/)![1]);
  const old = arenaKeysIn(await original());
  assert.equal(old.length, 18);
  assert.equal(catalogue.length, 33);
  for (const id of [...catalogue, ...old]) assert.ok(pattern.test(`arena:${id}`), id);
});

test("0021 pattern rejects other prefixes and malformed Arena slugs", async () => {
  const pattern = new RegExp((await up()).match(/problem_key ~ '(\^arena:[^']+)'/)![1]);
  for (const key of ["foo:arena-mind-the-gap", "arena:mind-the-gap", "arena:arena-", "arena:arena--x", "arena:arena-X", "arena:arena-a b", "arena:arena-a-", "arena:arena-a\n", "arena-the-infinite-v", "authored:arena-mind-the-gap", ""]) {
    assert.ok(!pattern.test(key), JSON.stringify(key));
  }
});

test("0021 keeps the authored pattern and the 0012 down list exactly", async () => {
  const authored = "'^authored:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'";
  assert.ok((await up()).includes(authored));
  assert.ok((await down()).includes(authored));
  assert.deepEqual(arenaKeysIn(await down()).slice(0, 18), arenaKeysIn(await original()));
  assert.doesNotMatch(await up(), /INSERT|UPDATE|DELETE|DROP TABLE|DROP FUNCTION/);
});

const url = process.env.AUTHORING_TEST_DATABASE_URL;
test("0021 up, down, up on disposable PostgreSQL keeps accepted, rejected and authored keys exact", { skip: !url }, async () => {
  const target = new URL(url!);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/physcratic_authoring_test");
  const schema = "arena_keys_" + randomUUID().replaceAll("-", "");
  const admin = new Pool({ connectionString: url, max: 1 });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url, options: `-c search_path=${schema},public`, max: 4 });
  try {
    await pool.query('CREATE TABLE "user"(id text PRIMARY KEY,"emailVerified" boolean NOT NULL DEFAULT true)');
    for (const name of ["0001_problem_authoring", "0002_authored_write_limit", "0003_author_media", "0004_authored_attempts", "0005_authored_solution_access", "0006_authored_discovery", "0012_community_problem_stats"]) {
      await pool.query(`BEGIN;${await readFile(`migrations/${name}.up.sql`, "utf8")}COMMIT;`);
    }
    // A dedicated client, so a refused migration rolls back and never leaves a pooled connection in a failed transaction.
    const apply = async (sql: string) => {
      const client = await pool.connect();
      try {
        await client.query(`BEGIN;${sql}COMMIT;`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    };
    const f = achievementFixtures(pool);
    const owner = await f.user(undefined, false);
    const student = await f.user(undefined, false);
    const oldKeys = arenaKeysIn(await original()).map((id) => `arena:${id}`);
    const newKeys = catalogue.map((id) => `arena:${id}`).filter((key) => !oldKeys.includes(key));
    assert.equal(newKeys.length, 15);
    const insert = (key: string, who = student) => pool.query("INSERT INTO community_favourite(user_id,problem_key) VALUES($1,$2)", [who, key]);
    // 23514 is the CHECK or the guard. 22P02 is the generated authored id refusing text that is not a uuid, as in 0012.
    const rejects = (key: string, who = student) => assert.rejects(insert(key, who), (error: { code?: string }) => ["23514", "22P02"].includes(error.code ?? ""), key);

    // Before 0021 the 15 newer Arena problems are rejected and the 18 old ones work.
    await rejects(newKeys[0]);
    await insert(oldKeys[0]);
    await pool.query("DELETE FROM community_favourite WHERE user_id=$1", [student]);

    await apply(await up());
    for (const key of [...oldKeys, ...newKeys]) await insert(key);
    assert.equal(Number((await pool.query("SELECT count(*) FROM community_favourite WHERE user_id=$1", [student])).rows[0].count), 33);
    assert.equal(Number((await pool.query("SELECT favourites FROM community_problem_total WHERE problem_key=$1", [newKeys[0]])).rows[0].favourites), 1);
    for (const key of ["foo:arena-mind-the-gap", "arena:mind-the-gap", "arena:arena-", "arena:arena--x", "arena:arena-X", "authored:not-a-uuid", "", "arena-the-infinite-v"]) await rejects(key, owner);

    // Authored keys keep the exact pattern and the published-problem guard.
    const published = await f.problem(owner);
    await insert(`authored:${published.id}`);
    await rejects(`authored:${published.id.toUpperCase()}`);
    await rejects(`authored:${randomUUID()}`);

    // Down refuses while a newer key is saved, then restores the fixed list once those rows are gone.
    await assert.rejects(apply(await down()), /Preserve favourites for newer Arena problems/);
    await pool.query("DELETE FROM community_favourite WHERE problem_key=ANY($1::text[])", [newKeys]);
    await apply(await down());
    await rejects(newKeys[0], owner);
    await insert(oldKeys[1], owner);
    await rejects("authored:not-a-uuid", owner);
    await pool.query("DELETE FROM community_favourite WHERE user_id=$1 AND problem_key=$2", [owner, oldKeys[1]]);

    await apply(await up());
    await insert(newKeys[0], owner);
    assert.equal(Number((await pool.query("SELECT count(*) FROM community_favourite WHERE user_id=$1 AND problem_key=$2", [owner, newKeys[0]])).rows[0].count), 1);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`).catch(() => undefined);
    await admin.end();
  }
});
