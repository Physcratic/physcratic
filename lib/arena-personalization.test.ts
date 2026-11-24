import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import arena from "./arena/index.json";
import { getEstimatedProblemElo } from "./problem-archive";
import { bandRange } from "./rating-bands";
import { createUnifiedArenaApi } from "./unified-arena-api";
import { unifiedArenaPageSchema, type CollectionEntry } from "./unified-arena";
import { achievementFixtures, installAchievementFixtures } from "../tests/community-achievement-fixtures";

const url = process.env.AUTHORING_TEST_DATABASE_URL;
const secret = "disposable-arena-pagination-key";
const flags = () => ({ authors: false, badges: false, medals: false });
const opts = { enabled: () => true, secret: () => secret, user: async (r: Request) =>
  r.headers.has("x-test-session") ? { id: r.headers.get("x-test-session")! } : null };
const accountA = "private-student-alpha", accountB = "private-student-other";
function request(params: Record<string, string> = {}, session: string | null = accountA, account = session) {
  return new Request("https://test/?" + new URLSearchParams(params), { headers: {
    ...(session ? { "x-test-session": session } : {}), ...(account ? { "x-community-account": account } : {}),
  } });
}

test("feature off bypasses the completion session and preserves the public response exactly", async () => {
  const pool = { query: async () => assert.fail("Unexpected database access") } as unknown as Pool;
  const legacy = createUnifiedArenaApi(pool);
  const disabled = createUnifiedArenaApi(pool, flags, { ...opts, enabled: () => false, user: async () => assert.fail("Unexpected session access") });
  const r = request({ source: "arena" });
  assert.deepEqual(await (await disabled(r)).json(), await (await legacy(r)).json());
});

test("an enabled request with a stale account header fails closed before reading the catalogue", async () => {
  const pool = { query: async () => assert.fail("Unexpected database access") } as unknown as Pool;
  const api = createUnifiedArenaApi(pool, flags, opts);
  assert.equal((await api(request({}, accountB, accountA))).status, 409);
});

test("personalized PostgreSQL pages filter, rank and cursor both sources in one account snapshot", { skip: !url }, async t => {
  const conn = new URL(url!);
  assert.equal(conn.hostname, "127.0.0.1");
  assert.equal(conn.pathname, "/physcratic_authoring_test");
  const schema = "arena_private_" + randomUUID().replaceAll("-", "");
  const admin = new Pool({ connectionString: url });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ connectionString: url, options: `-c search_path=${schema},public` });
  const sql: { text: string; values?: unknown[] }[] = [];
  let beforeCandidates: (() => Promise<void>) | undefined;
  const observed = {
    query: pool.query.bind(pool),
    async connect() {
      const client = await pool.connect();
      return {
        query: async (query: { text: string; values?: unknown[] } | string, values?: unknown[]) => {
          const statement = typeof query === "string" ? { text: query, values } : query;
          sql.push(statement);
          if (beforeCandidates && statement.text.includes('AS "imageLinked"')) {
            const callback = beforeCandidates;
            beforeCandidates = undefined;
            await callback();
          }
          return client.query(statement);
        },
        release: () => client.release(),
      };
    },
  } as unknown as Pool;
  try {
    await installAchievementFixtures(pool);
    const fixtures = achievementFixtures(pool), author = await fixtures.user();
    await fixtures.user(accountA, false);
    await fixtures.user(accountB, false);
    const authored = new Map<string, number | null>();
    const template = (await fixtures.problem(author, undefined, true, "1200"));
    authored.set(`authored:${template.id}`, 1200);
    const tie = getEstimatedProblemElo("arena-mind-the-gap");
    const rows = Array.from({ length: 48 }, (_, index) => ({
      id: randomUUID(), revision: randomUUID(), part: randomUUID(), title: `Cursor Fixture ${index}`,
      rating: index % 11 === 0 ? null : index % 2 === 0 ? tie : 500,
    }));
    // Build immutable revisions with the real triggers. The fixture title and rating are public metadata.
    const seed = async (batch: typeof rows, published: boolean) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`INSERT INTO authored_problem(id,slug,owner_id)
          SELECT id,'cursor-'||id,$1 FROM jsonb_to_recordset($2) AS x(id uuid)`, [author, JSON.stringify(batch)]);
        await client.query(`INSERT INTO authored_revision_part(revision_id,part_id,answer_mode)
          SELECT revision,part,'manual' FROM jsonb_to_recordset($1) AS x(revision uuid, part uuid)`, [JSON.stringify(batch)]);
        await client.query(`INSERT INTO authored_revision_private_part(revision_id,part_id,answer_mode,data)
          SELECT revision,part,'manual',jsonb_build_object('partId',part,'key',jsonb_build_object('kind','manual'))
          FROM jsonb_to_recordset($1) AS x(revision uuid, part uuid)`, [JSON.stringify(batch)]);
        await client.query(`INSERT INTO authored_revision(id,problem_id,number,content)
          SELECT revision,id,1,jsonb_build_object('title',title,'topicTags',jsonb_build_array('Optics'),
            'methodTags','[]'::jsonb,'estimatedDifficulty',coalesce(rating::text,'Legacy'),
            'provenance',jsonb_build_object('kind','original','source','','rightsDeclaration','Synthetic fixture rights.'),
            'sections',jsonb_build_array(jsonb_build_object('parts',jsonb_build_array(jsonb_build_object('id',part,'answerMode','manual')))))
          FROM jsonb_to_recordset($1) AS x(id uuid, revision uuid, part uuid, title text, rating int)`, [JSON.stringify(batch)]);
        if (published) await client.query(`UPDATE authored_problem p SET state='published',published_revision_id=x.revision
          FROM jsonb_to_recordset($1) AS x(id uuid, revision uuid) WHERE p.id=x.id`, [JSON.stringify(batch)]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    };
    await seed(rows, true);
    for (const row of rows) authored.set(`authored:${row.id}`, row.rating);

    const api = createUnifiedArenaApi(observed, flags, opts);
    const guest = await (await api(request({}, null))).json();
    const off = await (await createUnifiedArenaApi(pool)(request())).json();
    assert.deepEqual(guest, off, "guest and flag-off retain the ordinary projection against the old schema");
    const unavailable = await (await api(request())).json();
    assert.equal(unavailable.personalization, "unavailable");
    assert.ok(unavailable.problems.every((row: CollectionEntry) => row.completed === undefined));
    for (const page of [unavailable, guest, off]) assert.equal(JSON.stringify(page).includes(accountA), false);

    const migration = (await readFile("migrations/0024_personal_completions.up.sql", "utf8")).replaceAll("public.",schema+".");
    await pool.query(migration);
    const ratings = new Map([...arena.problems.map(p => [`arena:${p.id}`, getEstimatedProblemElo(p.id)] as const), ...authored]);
    const mark = async (keys: string[], account = accountA) => pool.query(`INSERT INTO personal_problem_completion(user_id,problem_key)
      SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING`, [account, keys]);
    const selected = new Set(["arena:arena-mind-the-gap", ...rows.filter((_, index) => index % 3 === 0).map(row => `authored:${row.id}`)]);
    await mark([...selected]);
    await mark([`authored:${rows[1].id}`], accountB);
    const page = async (params: Record<string, string> = {}, account = accountA) => {
      const response = await api(request(params, account));
      assert.equal(response.status, 200, await response.clone().text());
      assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
      assert.match(response.headers.get("vary") ?? "", /X-Community-Account/i);
      return unifiedArenaPageSchema.parse(await response.json());
    };
    const list = async (filters: Record<string, string> = {}) => {
      const entries: CollectionEntry[] = []; let after: string | undefined, pages = 0;
      do {
        const result = await page({ ...filters, ...(after ? { after } : {}) });
        assert.equal(result.personalization, "active");
        entries.push(...result.problems);
        after = result.nextCursor ?? undefined;
        assert.ok(++pages <= 10);
      } while (after);
      return entries;
    };
    const expected = (done: Set<string>) => [...ratings.keys()].sort((a,b) =>
      Number(done.has(a)) - Number(done.has(b)) || (ratings.get(a) ?? 4001) - (ratings.get(b) ?? 4001) ||
      (a < b ? -1 : a > b ? 1 : 0));
    const mixed = await list();
    assert.ok(mixed.filter(p => !p.completed).length > 24);
    assert.ok(mixed.length >= 72);
    assert.deepEqual(mixed.map(p => p.key), expected(selected));
    assert.deepEqual(new Set(mixed.filter(p=>p.completed).map(p=>p.key)), selected);
    assert.deepEqual((await list({ source:"authored", tag:"Optics", difficulty:"unrated" })).map(p=>p.key),
      expected(selected).filter(k=>k.startsWith("authored:") && k!==`authored:${template.id}` && ratings.get(k)===null));
    assert.deepEqual((await list({ q:'"Mind the Gap"', source:"authored" })), []);
    assert.equal((await page({q:"Mind the Gap",source:"arena"})).problems[0].completed, true);
    assert.ok((await page({q:"Cursor Fixture 0",source:"authored",tag:"Optics",difficulty:"unrated"})).problems[0].completed);
    assert.deepEqual(await list({source:"authored",tag:"Thermodynamics"}), []);
    for (const difficulty of ["beginner-olympiad","intermediate-olympiad","advanced","mastery","1200-1599"] as const) {
      const [min,max] = bandRange(difficulty)!;
      assert.deepEqual((await list({difficulty})).map(p=>p.key), expected(selected).filter(key=>{
        const rating=ratings.get(key);
        return rating!=null && rating>=min && rating<max;
      }));
    }

    const first = await page({source:"authored"});
    const cursor = first.nextCursor!;
    assert.ok(cursor && !cursor.includes(accountA));
    assert.ok(!Buffer.from(cursor.split(".")[1],"base64url").toString().includes(accountA));
    assert.equal((await api(request({source:"authored",after:cursor}, accountB))).status, 400);
    assert.equal((await api(request({source:"arena",after:cursor}))).status, 400);
    assert.equal((await api(request({source:"authored",after:cursor+"x"}))).status, 400);
    assert.equal((await api(request({source:"authored",after:cursor},null))).status, 400);
    assert.equal((await api(request({},null,accountA))).status, 409);
    assert.equal((await api(request({},accountB,accountA))).status, 409);
    await mark([`authored:${rows[2].id}`]);
    assert.deepEqual(await (await api(request({source:"authored",after:cursor}))).json(), {code:"COMPLETION_ORDER_CHANGED"});
    await pool.query("DELETE FROM personal_problem_completion WHERE user_id=$1 AND problem_key=$2",[accountA,`authored:${rows[2].id}`]);

    const anchor = first.problems.at(-1)!;
    await pool.query("UPDATE authored_problem SET state='draft' WHERE id=$1",[anchor.id]);
    assert.equal((await api(request({source:"authored",after:cursor}))).status, 409);
    assert.ok(!(await list({source:"authored"})).some(p=>p.key===anchor.key));
    await pool.query("UPDATE authored_problem SET state='published' WHERE id=$1",[anchor.id]);
    assert.deepEqual((await list()).map(p=>p.key), expected(selected));

    // Another committed session writes between the initial owner read and the candidate query.
    const concurrent = `authored:${rows[4].id}`;
    beforeCandidates = async () => { await mark([concurrent]); };
    const stable = await page({q:rows[4].title,source:"authored"});
    assert.equal(stable.problems.find(p=>p.key===concurrent)?.completed, undefined);
    assert.equal((await page({q:rows[4].title,source:"authored"})).problems.find(p=>p.key===concurrent)?.completed, true);

    await mark([...ratings.keys()]);
    assert.deepEqual((await list()).map(p=>p.key),expected(new Set(ratings.keys())));
    assert.ok((await list()).every(p=>p.completed));
    await pool.query("DELETE FROM personal_problem_completion WHERE user_id=$1",[accountA]);
    assert.deepEqual((await list()).map(p=>p.key),expected(new Set()));
    assert.ok((await list()).every(p=>!p.completed));

    // Representative published catalogue and marks from other accounts for EXPLAIN.
    const workload = Array.from({length: 2500}, (_, index) => ({
      id:randomUUID(),revision:randomUUID(),part:randomUUID(),title:`Synthetic Mechanics ${index}`,rating:500 + index % 2500,
    }));
    await seed(workload,true);
    await mark(workload.slice(0,1800).map(p=>`authored:${p.id}`),accountB);
    await mark(workload.slice(0,120).map(p=>`authored:${p.id}`));
    await pool.query("ANALYZE authored_problem; ANALYZE authored_revision; ANALYZE personal_problem_completion");
    sql.length = 0;
    const sample = await page();
    assert.equal(sample.problems.length,24);
    assert.equal(sql.filter(q=>q.text.includes("FROM personal_problem_completion")).length,1);
    const candidates = sql.find(q=>q.text.includes('AS "imageLinked"'))!;
    assert.ok(candidates);
    assert.ok(sql.length <= 5, sql.map(q=>q.text.split("\n")[0]).join("\n"));
    const explain = await Promise.all(sql.filter(q=>q.text.trim().startsWith("SELECT") || q.text.trim().startsWith("WITH"))
      .map(async q => (await pool.query("EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) "+q.text,q.values)).rows[0]["QUERY PLAN"][0]));
    for (const plan of explain) {
      assert.match(JSON.stringify(plan), /personal_problem_completion_pkey|personal_problem_completion_history_idx/);
    }
    assert.match(JSON.stringify(explain[1]), /"Actual Rows":25/);
    t.diagnostic(`Representative workload: ${workload.length + authored.size} publications, 120 owner marks, ${sql.length} statements including transaction boundaries`);
    if(process.env.ARENA_PLAN_OUTPUT) await writeFile(process.env.ARENA_PLAN_OUTPUT,JSON.stringify(explain,null,2)+"\n");
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
