import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { createProblemAuthoringApi } from "./problem-authoring-api";
import { createAuthorMediaApi } from "./author-media-api";
import { createAuthoredLibraryApi } from "./authored-library-api";
import type { AuthoredDocument, PrivatePart } from "./problem-authoring";
import { memoryAuthorStorage, png } from "../tests/author-media-fixtures";

async function manifest() {
  const lines = (await readFile("docs/engineering/AUTHORING_MIGRATION_SHA256SUMS", "utf8")).trim().split("\n");
  return Promise.all(lines.map(async (line) => {
    const [checksum, path] = line.split(/\s+/);
    const sql = await readFile(path, "utf8");
    assert.equal(createHash("sha256").update(sql).digest("hex"), checksum, path);
    return { path, checksum, sql };
  }));
}

test("authoring migration bytes match the audited six-file SHA256 manifest", async () => {
  assert.equal((await manifest()).length, 6);
});

test("populated 0001-0003 upgrades to 0004-0006 without replacing records or an existing public ledger", {
  skip: !process.env.AUTHORING_TEST_DATABASE_URL && "Use disposable PostgreSQL runner",
}, async (t) => {
  const target = new URL(process.env.AUTHORING_TEST_DATABASE_URL!);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/physcratic_authoring_test");
  // A separate disposable database gives this test its own actual public schema.
  const database = `authoring_upgrade_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: target.href });
  await admin.query(`CREATE DATABASE ${database}`);
  target.pathname = `/${database}`;
  const pool = new Pool({ connectionString: target.href, max: 5 });
  const files = await manifest();
  const baseTables = ["user", "authored_problem", "authored_draft", "authored_revision",
    "authored_draft_private_part", "authored_revision_part", "authored_revision_private_part",
    "authored_write_limit", "author_media", "author_media_usage", "author_draft_media",
    "author_revision_media", "physcratic_integration_migrations"];
  async function snapshot(tables = baseTables) {
    return Promise.all(tables.map(async (table) => ({
      table,
      oid: (await pool.query("SELECT $1::regclass::oid::integer AS oid", [`public.${table}`])).rows[0].oid,
      rows: (await pool.query(`SELECT xmin::text AS xmin,ctid::text AS ctid,to_jsonb(t) AS data FROM public."${table}" t
        ${table === "physcratic_integration_migrations" ? "WHERE id IN ('0001_problem_authoring','0002_authored_write_limit','0003_author_media')" : ""}
        ORDER BY to_jsonb(t)::text`)).rows,
    })));
  }
  const historicalSource = "b191dd03d62aa4b01e7a3f08272b2417643f0d53";
  const handoffSource = "4e18931e1c3e2f18271e6ff9f274a158c0c40f9a";
  const migrationId = (index: number) => files[index].path.replace("migrations/", "").replace(".up.sql", "");
  async function apply(first: number, failAfterDDL = false, last = first) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SET LOCAL statement_timeout='10s'");
      // Proposed operator lock namespace, exercised locally; remote lock contract
      // still needs operator confirmation. Never infer it from the table name.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0))");
      await client.query("LOCK TABLE public.physcratic_integration_migrations IN EXCLUSIVE MODE");
      for (let index = first; index <= last; index++) {
        const ledger = (await client.query("SELECT id,sha256,source_commit,result FROM public.physcratic_integration_migrations ORDER BY id")).rows;
        assert.deepEqual(ledger, files.slice(0, index).map((file, i) => ({
          id: migrationId(i), sha256: file.checksum,
          source_commit: i < 3 ? historicalSource : handoffSource, result: "verified",
        })), "Ledger prefix/checksum/source mismatch");
        for (const match of files[index].sql.matchAll(/^CREATE (TABLE|FUNCTION|INDEX) ([a-z_]+)/gm)) {
          const exists = match[1] === "FUNCTION"
            ? (await client.query("SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1) AS present", [match[2]])).rows[0].present
            : (await client.query("SELECT to_regclass($1) IS NOT NULL AS present", [`public.${match[2]}`])).rows[0].present;
          assert.equal(exists, false, `Schema drift: unledgered ${match[1]} ${match[2]}`);
        }
        await client.query(files[index].sql);
        if (failAfterDDL && index === last) throw new Error("Injected failure before ledger append");
        await client.query("INSERT INTO public.physcratic_integration_migrations(id,sha256,source_commit,result) VALUES($1,$2,$3,'verified')", [migrationId(index), files[index].checksum, index < 3 ? historicalSource : handoffSource]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK"); throw error;
    } finally { client.release(); }
  }
  const owner = randomUUID(), student = randomUUID(), partId = randomUUID();
  const text = (value: string) => ({ id: randomUUID(), kind: "text" as const, spans: [{ kind: "text" as const, text: value }] });
  const content: AuthoredDocument = {
    title: "Upgrade pendulum fixture", topicTags: ["Mechanics"], methodTags: ["Energy"], estimatedDifficulty: "1200",
    context: [text("Retain this existing statement.")],
    sections: [{ id: randomUUID(), title: "Motion", blocks: [], parts: [{ id: partId, label: "a", blocks: [], answerMode: "manual" }] }],
    provenance: { kind: "original", source: "Local upgrade fixture", rightsDeclaration: "Original disposable test content." }, attachments: [],
  };
  const privateParts: PrivatePart[] = [{ partId, key: { kind: "manual" }, hints: [text("PRIVATE_UPGRADE_HINT")], solution: [text("PRIVATE_UPGRADE_SOLUTION")] }];
  const memory = memoryAuthorStorage();
  const deps = { pool, user: async () => ({ id: owner, emailVerified: true }), origin: () => true };
  const author = createProblemAuthoringApi(deps);
  const media = createAuthorMediaApi({ ...deps, storage: memory.storage });
  const req = (body?: unknown, method = "POST") => new Request("https://physcratic.test/api", {
    method, headers: { "content-type": "application/json" }, body: method === "GET" ? undefined : JSON.stringify(body),
  });
  async function json(response: Response, status = 200) {
    assert.equal(response.status, status, await response.clone().text());
    return response.json();
  }
  try {
    const version = (await pool.query("SHOW server_version")).rows[0].server_version as string;
    const expected = process.env.AUTHORING_TEST_EXPECTED_VERSION;
    if (expected) assert.ok(version.startsWith(`${expected} `) || version === expected, version);
    t.diagnostic(`Disposable PostgreSQL server_version=${version}`);
    await pool.query('CREATE TABLE public."user"(id text PRIMARY KEY, marker text NOT NULL)');
    await pool.query('INSERT INTO public."user" VALUES($1,\'existing author\'),($2,\'existing student\')', [owner, student]);
    // Reproduce the exact six-column ledger contract supplied by the operator.
    await pool.query(`CREATE TABLE public.physcratic_integration_migrations(
      id text PRIMARY KEY, sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
      source_commit text NOT NULL, applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      applied_by text NOT NULL DEFAULT CURRENT_USER, result text NOT NULL CHECK(result='verified'))`);
    for (let index = 0; index < 3; index++) await apply(index);
    await t.test("ledger matches supplied columns, defaults, constraints and historical sources/checksums", async () => {
      const columns = (await pool.query("SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='physcratic_integration_migrations' ORDER BY ordinal_position")).rows;
      assert.deepEqual(columns.map(c => [c.column_name, c.data_type, c.is_nullable]), [
        ["id", "text", "NO"], ["sha256", "text", "NO"], ["source_commit", "text", "NO"],
        ["applied_at", "timestamp with time zone", "NO"], ["applied_by", "text", "NO"], ["result", "text", "NO"],
      ]);
      assert.equal(columns[3].column_default, "clock_timestamp()");
      assert.equal(columns[4].column_default, "CURRENT_USER");
      await assert.rejects(pool.query("INSERT INTO public.physcratic_integration_migrations(id,sha256,source_commit,result) VALUES('invalid-checksum','bad',$1,'verified')", [handoffSource]), /check constraint/);
      await assert.rejects(pool.query("INSERT INTO public.physcratic_integration_migrations(id,sha256,source_commit,result) VALUES('invalid-result',$1,$2,'pending')", [files[0].checksum, handoffSource]), /check constraint/);
      await assert.rejects(pool.query("INSERT INTO public.physcratic_integration_migrations SELECT * FROM public.physcratic_integration_migrations LIMIT 1"), /duplicate key/);
    });
    const draft = await json(await author("create", req({ content, privateParts })), 201);
    // Retain a separate unpublished draft as well as published immutable rows.
    await json(await author("create", req({ content: { ...content, title: "DRAFT_UPGRADE_SECRET" }, privateParts })), 201);
    const form = new FormData();
    form.set("purpose", "statement-image");
    form.set("file", new File([new Uint8Array(png)], "fixture.png", { type: "image/png" }));
    const upload = await json(await media("upload", new Request("https://physcratic.test/api", { method: "POST", body: form }), draft.problemId), 201);
    content.context.push({ id: randomUUID(), kind: "image", mediaId: upload.id, alt: "Retained diagram", caption: "Existing media" });
    content.attachments.push({ id: upload.id, purpose: "statement-image" });
    const updated = await json(await author("update", req({ content, privateParts, version: draft.version }, "PUT"), draft.problemId));
    const published = await json(await author("publish", req({ version: updated.version }), draft.problemId));
    const before = await snapshot();
    assert.ok(before.every(table => table.rows.length > 0), "Every base table must have populated retention evidence");
    const storedBytes = [...memory.objects.entries()].map(([path, bytes]) => [path, Buffer.from(bytes).toString("hex")]);

    await t.test("an object without a ledger entry stops before applying migration SQL", async () => {
      // Inject an index only; no application rows are changed or removed.
      await pool.query("CREATE INDEX authored_attempt_history_idx ON public.\"user\"(id)");
      await assert.rejects(apply(3), /Schema drift: unledgered INDEX authored_attempt_history_idx/);
      assert.equal((await pool.query("SELECT to_regclass('public.authored_attempt') AS relation")).rows[0].relation, null);
      assert.deepEqual(await snapshot(), before);
      await pool.query("DROP INDEX public.authored_attempt_history_idx");
    });
    await t.test("failed 0004-0006 suffix rolls back all DDL and ledger appends", async () => {
      await assert.rejects(apply(3, true, 5), /Injected failure/);
      for (const relation of ["authored_attempt", "authored_solution_permission", "authored_revision_discovery_search_idx"])
        assert.equal((await pool.query("SELECT to_regclass($1) AS relation", [`public.${relation}`])).rows[0].relation, null);
      assert.deepEqual(await snapshot(), before);
    });
    await t.test("0004 preserves populated base rows, relation OIDs, xmin/ctid and ledger bytes", async () => {
      await apply(3); assert.deepEqual(await snapshot(), before);
    });
    const attemptId = randomUUID();
    await pool.query(`INSERT INTO authored_attempt(id,user_id,problem_id,revision_id,part_id,idempotency_key,answer,status,reason,engine_version,attempt_number)
      VALUES($1,$2,$3,$4,$5,$6,$7,'ungraded','manual','numeric-v1',1)`,
    [attemptId, student, draft.problemId, published.revision.id, partId, randomUUID(), JSON.stringify({ kind: "manual", text: "Existing pre-0005 working" })]);
    const oldAttempt = await snapshot(["authored_attempt"]);
    await t.test("0005 preserves existing attempts and defaults old solutions to denied", async () => {
      await apply(4);
      assert.deepEqual(await snapshot(), before);
      assert.deepEqual(await snapshot(["authored_attempt"]), oldAttempt);
      assert.equal((await pool.query("SELECT count(*)::integer AS n FROM authored_solution_permission")).rows[0].n, 0);
      assert.equal((await pool.query("SELECT count(*)::integer AS n FROM authored_solution_reveal")).rows[0].n, 0);
      assert.equal(oldAttempt[0].rows[0].data.assisted, false);
    });
    await t.test("0006 indexes existing publications without changing records or leaking private content", async () => {
      await apply(5);
      assert.deepEqual(await snapshot(), before);
      assert.deepEqual(await snapshot(["authored_attempt"]), oldAttempt);
      const entries = (await pool.query("SELECT id,sha256,source_commit,result FROM public.physcratic_integration_migrations ORDER BY id")).rows;
      assert.deepEqual(entries, files.map((file, i) => ({ id: migrationId(i), sha256: file.checksum, source_commit: i < 3 ? historicalSource : handoffSource, result: "verified" })));
      const response = await createAuthoredLibraryApi(pool)(req(undefined, "GET"));
      const page = await json(response);
      assert.equal(page.problems.length, 1);
      assert.equal(page.problems[0].problemId, draft.problemId);
      assert.equal(/PRIVATE_UPGRADE|DRAFT_UPGRADE_SECRET/.test(JSON.stringify(page)), false);
      const found = await pool.query("SELECT id FROM authored_revision WHERE authored_discovery_terms(content) @@ websearch_to_tsquery('simple','upgrade pendulum')");
      assert.equal(found.rows[0].id, published.revision.id);
      const indexes = await pool.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE '%discovery%'");
      assert.equal(indexes.rowCount, 4);
    });
    await t.test("pre-upgrade publication/media remain readable and immutable after the upgrade", async () => {
      await json(await author("public", req(undefined, "GET"), draft.problemId));
      const read = await media("read", req(undefined, "GET"), draft.problemId, upload.id);
      assert.equal(read.status, 200);
      assert.deepEqual(Buffer.from(await read.arrayBuffer()), png);
      await assert.rejects(pool.query("DELETE FROM author_media WHERE id=$1", [upload.id]), /Referenced media must be retained/);
      await assert.rejects(pool.query("UPDATE authored_revision SET number=2 WHERE id=$1", [published.revision.id]), /immutable/);
      await assert.rejects(pool.query("UPDATE authored_attempt SET reason='manual' WHERE id=$1", [attemptId]), /immutable/);
      assert.deepEqual([...memory.objects.entries()].map(([path, bytes]) => [path, Buffer.from(bytes).toString("hex")]), storedBytes);
      assert.deepEqual(await snapshot(), before);
    });
  } finally {
    await pool.end();
    // Remove only the database this test created, after all preservation checks.
    await admin.query(`DROP DATABASE ${database}`);
    await admin.end();
  }
});
