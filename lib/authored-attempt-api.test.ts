import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { createAuthoredAttemptApi } from "./authored-attempt-api";
import { createProblemAuthoringApi } from "./problem-authoring-api";
import { createAuthoredGrader } from "./authored-grading";
import { createAuthorMediaApi } from "./author-media-api";
import { isAllowedSubmissionOrigin } from "./submission-security";
import { memoryAuthorStorage, pdf } from "../tests/author-media-fixtures";
import type { AuthoredDocument, PrivatePart } from "./problem-authoring";
const testUrl = process.env.AUTHORING_TEST_DATABASE_URL;
test(
  "persistent authored student attempts against disposable PostgreSQL",
  {
    skip:
      !testUrl &&
      "Run scripts/test-problem-authoring.sh with react-server condition",
  },
  async (t) => {
    const target = new URL(testUrl!);
    assert.equal(target.hostname, "127.0.0.1");
    assert.equal(target.pathname, "/physcratic_authoring_test");
    const schema = `attempt_test_${randomUUID().replaceAll("-", "")}`,
      admin = new Pool({ connectionString: testUrl });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: testUrl,
      options: `-c search_path=${schema},public`,
      max: 10,
      statement_timeout: 5000,
      connectionTimeoutMillis: 3000,
    });
    const sessions = new Map<string, { id: string; emailVerified: boolean }>(),
      storage = memoryAuthorStorage();
    const deps = {
      pool,
      user: async (r: Request) =>
        sessions.get(r.headers.get("x-test-user") ?? ""),
      origin: (r: Request) =>
        isAllowedSubmissionOrigin(r, ["https://physcratic.test"]),
    };
    const author = createProblemAuthoringApi(deps),
      attempts = createAuthoredAttemptApi(deps),
      media = createAuthorMediaApi({ ...deps, storage: storage.storage });
    async function user(verified = true) {
      const id = randomUUID();
      sessions.set(id, { id, emailVerified: verified });
      await pool.query('INSERT INTO "user" VALUES($1)', [id]);
      return id;
    }
    function req(
      who?: string,
      body?: unknown,
      method = body === undefined ? "GET" : "POST",
      headers: Record<string, string> = {},
      query = "",
    ) {
      return new Request(`https://physcratic.test/api${query}`, {
        method,
        headers: {
          origin: "https://physcratic.test",
          "content-type": "application/json",
          ...(who ? { "x-test-user": who } : {}),
          ...headers,
        },
        body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
      });
    }
    function document(
      modes: ("numeric" | "expression" | "manual")[] = ["numeric"],
    ) {
      const parts = modes.map((answerMode, i) => ({
        id: randomUUID(),
        label: String(i + 1),
        answerMode,
        blocks: [],
      }));
      const content: AuthoredDocument = {
        title: "Original student task",
        topicTags: [],
        methodTags: [],
        estimatedDifficulty: null,
        context: [
          {
            id: randomUUID(),
            kind: "text",
            spans: [
              { kind: "text", text: "Find the displacement and explain." },
            ],
          },
        ],
        sections: [{ id: randomUUID(), title: "Motion", blocks: [], parts }],
        provenance: {
          kind: "original",
          source: "",
          rightsDeclaration: "I own this material.",
        },
        attachments: [],
      };
      const privateParts: PrivatePart[] = parts.map((p) => ({
        partId: p.id,
        key:
          p.answerMode === "numeric"
            ? { kind: "numeric", value: 2, units: "1", absTol: 0, relTol: 0 }
            : p.answerMode === "manual"
              ? { kind: "manual" }
              : {
                  kind: "expression",
                  expected: "x^2+137",
                  variables: [{ name: "x", domain: "real", assumptions: [] }],
                  angleUnit: "radians",
                  exclusions: [],
                },
        hints: [
          {
            id: randomUUID(),
            kind: "text",
            spans: [{ kind: "text", text: "PRIVATE_HINT_SENTINEL" }],
          },
        ],
        solution: [
          {
            id: randomUUID(),
            kind: "text",
            spans: [{ kind: "text", text: "PRIVATE_SOLUTION_SENTINEL" }],
          },
        ],
      }));
      return { content, privateParts };
    }
    async function draft(
      owner: string,
      modes?: Parameters<typeof document>[0],
    ) {
      const doc = document(modes),
        r = await author("create", req(owner, doc));
      assert.equal(r.status, 201, await r.clone().text());
      return { ...(await r.json()), ...doc };
    }
    async function publish(owner: string, id: string, version = 1) {
      const r = await author("publish", req(owner, { version }), id);
      assert.equal(r.status, 200, await r.clone().text());
      return (await r.json()).revision;
    }
    async function setup(modes?: Parameters<typeof document>[0]) {
      const owner = await user(),
        student = await user(),
        d = await draft(owner, modes),
        r = await publish(owner, d.problemId);
      return { owner, student, d, r };
    }
    function input(
      d: any,
      r: any,
      index = 0,
      answer: unknown = { kind: "numeric", value: 2, units: "" },
    ) {
      return {
        revisionId: r.id,
        partId: d.content.sections[0].parts[index].id,
        answer,
        idempotencyKey: randomUUID(),
      };
    }
    async function reset(who: string) {
      await pool.query("DELETE FROM authored_student_rate WHERE user_id=$1", [
        who,
      ]);
    }
    async function submit(
      who: string,
      d: any,
      r: any,
      body: unknown = input(d, r),
      api = attempts,
    ) {
      return api("submit", req(who, body), d.problemId);
    }
    async function total(who: string) {
      return (
        await pool.query(
          "SELECT count(*)::integer AS n FROM authored_attempt WHERE user_id=$1",
          [who],
        )
      ).rows[0].n;
    }
    async function assertStatus(response: Response, status: number) {
      assert.equal(response.status, status, await response.clone().text());
      return response;
    }
    async function seed(
      who: string,
      d: any,
      r: any,
      partId: string,
      n: number,
      when?: Date,
    ) {
      const ids = [];
      for (let i = 1; i <= n; i++) {
        const id = randomUUID();
        ids.push(id);
        await pool.query(
          `INSERT INTO authored_attempt(id,user_id,problem_id,revision_id,part_id,idempotency_key,answer,status,reason,engine_version,attempt_number,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,'correct','within-tolerance','numeric-v1',$8,coalesce($9::timestamptz,clock_timestamp()))`,
          [
            id,
            who,
            d.problemId,
            r.id,
            partId,
            randomUUID(),
            JSON.stringify({ kind: "numeric", value: 2, units: "" }),
            i,
            when ?? null,
          ],
        );
      }
      return ids;
    }
    try {
      await pool.query('CREATE TABLE "user" (id text PRIMARY KEY)');
      for (const migration of [
        "0001_problem_authoring",
        "0002_authored_write_limit",
        "0003_author_media",
        "0004_authored_attempts",
      ])
        await pool.query(
          "BEGIN;\n" +
            (await readFile(`migrations/${migration}.up.sql`, "utf8")) +
            "\nCOMMIT;",
        );
      await pool.query(
        await readFile("migrations/0004_authored_attempts.down.sql", "utf8"),
      );
      await pool.query(
        await readFile("migrations/0004_authored_attempts.up.sql", "utf8"),
      );
      await t.test(
        "verified sessions, strict identities, same-origin and real bounded/deadlined body protection",
        async () => {
          const { owner, student, d, r } = await setup(),
            unverified = await user(false),
            body = input(d, r);
          for (const action of ["submit", "read", "list", "info"] as const)
            for (const [who, status] of [
              [undefined, 401],
              [unverified, 403],
            ] as const)
              await assertStatus(
                await attempts(
                  action,
                  req(who, action === "submit" ? body : undefined),
                  action === "read" ? randomUUID() : d.problemId,
                ),
                status,
              );
          for (const headers of [
            { origin: "https://evil.test" },
            { origin: "null" },
            {
              origin: "https://physcratic.test",
              "sec-fetch-site": "cross-site",
            },
          ])
            await assertStatus(
              await attempts(
                "submit",
                req(student, body, "POST", headers as Record<string, string>),
                d.problemId,
              ),
              403,
            );
          await assertStatus(
            await attempts(
              "submit",
              req(student, body, "POST", { "content-type": "text/plain" }),
              d.problemId,
            ),
            415,
          );
          const evil = [
            { ...body, userId: owner },
            { ...body, ownerId: owner },
            { ...body, status: "correct" },
            { ...body, key: { value: 2 } },
            { ...body, assisted: false },
            { ...body, reveal: true },
            { ...body, answer: { kind: "numeric", value: "2", units: "" } },
            { ...body, answer: { kind: "numeric", value: null, units: "" } },
            {
              ...body,
              answer: { kind: "numeric", value: 2, units: "", expected: 2 },
            },
            { ...body, answer: { kind: "manual", text: "\u0000" } },
            { ...body, answer: { kind: "manual", text: "\ud800" } },
            { ...body, revisionId: "latest" },
          ];
          for (const forged of evil)
            await assertStatus(await submit(student, d, r, forged), 400);
          await reset(student);
          const large = new Request("https://physcratic.test/api", {
            method: "POST",
            headers: {
              origin: "https://physcratic.test",
              "content-type": "application/json",
              "content-length": "1",
              "x-test-user": student,
            },
            body: "x".repeat(20001),
          });
          await assertStatus(await attempts("submit", large, d.problemId), 413);
          const stalled = new ReadableStream({ start() {}, cancel() {} });
          const slow = new Request("https://physcratic.test/api", {
            method: "POST",
            headers: {
              origin: "https://physcratic.test",
              "content-type": "application/json",
              "x-test-user": student,
            },
            body: stalled,
            duplex: "half",
          } as RequestInit);
          await assertStatus(await attempts("submit", slow, d.problemId), 408);
          assert.equal(await total(student), 0);
        },
      );
      await t.test(
        "all four grading outcomes persist without solutions; published-reader companion exposes no private fields",
        async () => {
          const { owner, student, d, r } = await setup([
            "numeric",
            "expression",
            "manual",
          ]);
          const values = [
            input(d, r),
            input(d, r, 0, { kind: "numeric", value: 3, units: "1" }),
            input(d, r, 1, {
              kind: "expression",
              expression: "sin(x)^2+cos(x)^2",
            }),
            input(d, r, 2, { kind: "manual", text: "Reasoning" }),
          ];
          for (const [i, status] of [
            "correct",
            "incorrect",
            "needs-review",
            "ungraded",
          ].entries()) {
            const response = await assertStatus(
                await submit(student, d, r, values[i]),
                201,
              ),
              data = await response.json();
            assert.equal(data.attempt.status, status);
            assert.equal(data.attempt.revisionId, r.id);
            assert.equal(data.attempt.assisted, false);
            assert.equal(data.attempt.spoilerPolicy, "no-reveal-v1");
            assert.ok(data.attempt.createdAt.endsWith("Z"));
            assert.equal(
              response.headers.get("cache-control"),
              "private, no-store",
            );
            const history = await (
              await attempts("read", req(student), data.attempt.id)
            ).json();
            assert.deepEqual(history.attempt, data.attempt);
            for (const secret of [
              "PRIVATE_HINT_SENTINEL",
              "PRIVATE_SOLUTION_SENTINEL",
              "x^2+137",
              '"expected"',
              '"absTol"',
              '"key"',
            ])
              assert.equal(JSON.stringify(data).includes(secret), false);
            assert.equal(
              "userId" in data.attempt || "idempotencyKey" in data.attempt,
              false,
            );
          }
          const symbolic = await (
            await submit(
              student,
              d,
              r,
              input(d, r, 1, { kind: "expression", expression: "x*x+137" }),
            )
          ).json();
          assert.equal(symbolic.attempt.status, "correct");
          assert.equal(symbolic.attempt.engineVersion, "symbolic-v1");
          const metadata = await (
            await attempts("info", req(student), d.problemId)
          ).json();
          assert.equal(metadata.revisionId, r.id);
          assert.equal(metadata.limits.reveal, "disabled");
          assert.equal(metadata.parts[0].attemptsUsed >= 0, true);
          assert.equal(
            metadata.links.submit,
            `/api/authored-problems/${d.problemId}/attempts`,
          );
          for (const secret of [
            "PRIVATE_HINT_SENTINEL",
            "PRIVATE_SOLUTION_SENTINEL",
            "x^2+137",
            '"expected"',
            '"key"',
          ])
            assert.equal(JSON.stringify(metadata).includes(secret), false);
          assert.equal(
            (await author("public", req(student), d.problemId)).status,
            200,
          );
          const privateDraft = await draft(owner);
          await assertStatus(
            await attempts("info", req(student), privateDraft.problemId),
            404,
          );
          await assertStatus(
            await submit(owner, privateDraft, { id: randomUUID() }),
            404,
          );
        },
      );
      await t.test(
        "idempotent concurrent retries normalize answers and never consume another attempt or reveal after unpublish",
        async () => {
          const { owner, student, d, r } = await setup(),
            body = input(d, r),
            responses = await Promise.all(
              Array.from({ length: 8 }, () => submit(student, d, r, body)),
            );
          assert.deepEqual(
            responses.map((x) => x.status).sort(),
            [200, 200, 200, 200, 200, 200, 200, 201],
          );
          const results = await Promise.all(responses.map((x) => x.json())),
            id = results[0].attempt.id;
          assert.ok(results.every((x) => x.attempt.id === id));
          assert.equal(await total(student), 1);
          const reordered = {
            ...body,
            idempotencyKey: body.idempotencyKey.toUpperCase(),
            answer: { units: "1", value: 2, kind: "numeric" },
          };
          const repeat = await (
            await assertStatus(await submit(student, d, r, reordered), 200)
          ).json();
          assert.equal(repeat.attempt.id, id);
          await assertStatus(
            await submit(student, d, r, {
              ...body,
              answer: { kind: "numeric", value: 3, units: "" },
            }),
            409,
          );
          assert.equal(
            (await author("unpublish", req(owner, { version: 2 }), d.problemId))
              .status,
            200,
          );
          const replay = await (
            await assertStatus(await submit(student, d, r, body), 200)
          ).json();
          assert.deepEqual(replay.attempt, results[0].attempt);
          await assertStatus(await submit(student, d, r, input(d, r)), 404);
          assert.equal(await total(student), 1);
        },
      );
      await t.test(
        "simultaneous reuse of one key for different answers saves exactly one immutable record",
        async () => {
          const { student, d, r } = await setup(),
            body = input(d, r),
            results = await Promise.all([
              submit(student, d, r, body),
              submit(student, d, r, {
                ...body,
                answer: { kind: "numeric", value: 3, units: "" },
              }),
            ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
          assert.equal(await total(student), 1);
        },
      );
      await t.test(
        "own-only history, keyset pagination and idempotency ownership resist IDOR including problem authors",
        async () => {
          const { owner, student, d, r } = await setup(),
            other = await user(),
            response = await (await submit(student, d, r)).json(),
            id = response.attempt.id;
          for (const who of [other, owner])
            await assertStatus(await attempts("read", req(who), id), 404);
          assert.deepEqual(
            (await (await attempts("list", req(other))).json()).attempts,
            [],
          );
          await assertStatus(
            await attempts(
              "list",
              req(student, undefined, "GET", {}, "?userId=" + other),
            ),
            400,
          );
          const sameKey = input(d, r);
          const a = await (await submit(student, d, r, sameKey)).json(),
            b = await (await submit(other, d, r, sameKey)).json();
          assert.notEqual(a.attempt.id, b.attempt.id);
          const many = await setup(Array(6).fill("numeric")),
            ids: string[] = [];
          for (const part of many.d.content.sections[0].parts)
            ids.push(...(await seed(student, many.d, many.r, part.id, 10)));
          let after: string | null = null;
          const seen: string[] = [];
          for (let page = 0; page < 3; page++) {
            const listed = await (
              await attempts(
                "list",
                req(
                  student,
                  undefined,
                  "GET",
                  {},
                  `?problemId=${many.d.problemId}${after ? `&after=${after}` : ""}`,
                ),
              )
            ).json();
            seen.push(...listed.attempts.map((x: any) => x.id));
            after = listed.nextCursor;
            if (!after) break;
          }
          assert.equal(seen.length, 60);
          assert.equal(new Set(seen).size, 60);
          assert.ok(seen.every((x) => ids.includes(x)));
          const own = await (
            await attempts(
              "list",
              req(
                other,
                undefined,
                "GET",
                {},
                `?problemId=${many.d.problemId}`,
              ),
            )
          ).json();
          assert.deepEqual(own.attempts, []);
          await assertStatus(
            await attempts(
              "list",
              req(student, undefined, "GET", {}, "?after=not-json"),
            ),
            400,
          );
        },
      );
      await t.test(
        "persistent per-part and daily limits serialize across instances; POST exhaustion still permits own reads",
        async () => {
          const { student, d, r } = await setup(),
            second = createAuthoredAttemptApi(deps);
          const results = await Promise.all(
            Array.from({ length: 12 }, (_, i) =>
              submit(student, d, r, input(d, r), i % 2 ? attempts : second),
            ),
          );
          assert.equal(results.filter((x) => x.status === 201).length, 10);
          assert.equal(results.filter((x) => x.status === 429).length, 2);
          assert.equal(
            results.find((x) => x.status === 429)?.headers.get("retry-after"),
            null,
          );
          assert.equal(await total(student), 10);
          const keys = await pool.query(
            "SELECT idempotency_key,answer FROM authored_attempt WHERE user_id=$1 LIMIT 1",
            [student],
          );
          await assertStatus(
            await submit(student, d, r, {
              ...input(d, r),
              idempotencyKey: keys.rows[0].idempotency_key,
              answer: keys.rows[0].answer,
            }),
            200,
          );
          assert.equal(await total(student), 10);
          await pool.query(
            "INSERT INTO authored_student_rate VALUES($1,date_trunc('minute',clock_timestamp()),20,20) ON CONFLICT(user_id) DO UPDATE SET requests=20,submissions=20,window_start=date_trunc('minute',clock_timestamp())",
            [student],
          );
          await assertStatus(await submit(student, d, r, input(d, r)), 429);
          await assertStatus(await attempts("list", req(student)), 200);
          await assertStatus(
            await attempts("info", req(student), d.problemId),
            200,
          );
          await pool.query(
            "UPDATE authored_student_rate SET requests=60,submissions=0 WHERE user_id=$1",
            [student],
          );
          await assertStatus(await attempts("list", req(student)), 429);
          await pool.query(
            "UPDATE authored_student_rate SET window_start=now()-interval '2 minutes' WHERE user_id=$1",
            [student],
          );
          await assertStatus(await attempts("list", req(student)), 200);
          const quota = await setup(Array(11).fill("numeric"));
          for (const part of quota.d.content.sections[0].parts.slice(0, 10))
            await seed(quota.student, quota.d, quota.r, part.id, 10);
          await assertStatus(
            await submit(
              quota.student,
              quota.d,
              quota.r,
              input(quota.d, quota.r, 10),
            ),
            429,
          );
          assert.equal(await total(quota.student), 100);
          const old = await user();
          for (const part of quota.d.content.sections[0].parts.slice(0, 10))
            await seed(
              old,
              quota.d,
              quota.r,
              part.id,
              10,
              new Date(Date.now() - 25 * 3600000),
            );
          await assertStatus(
            await submit(old, quota.d, quota.r, input(quota.d, quota.r, 10)),
            201,
          );
        },
      );
      await t.test(
        "submission linearizes before unpublish/new publication; stale new attempts never grade historical keys",
        async () => {
          async function paused() {
            let entered!: () => void, release!: () => void;
            const ready = new Promise<void>((resolve) => (entered = resolve)),
              gate = new Promise<void>((resolve) => (release = resolve));
            const api = createAuthoredAttemptApi({
              ...deps,
              grade: async (c, u, value) => {
                entered();
                await gate;
                return createAuthoredGrader({ pool: c, user: async () => u })(
                  value,
                );
              },
            });
            return { api, ready, release };
          }
          const one = await setup(),
            pause = await paused(),
            body = input(one.d, one.r),
            pending = submit(one.student, one.d, one.r, body, pause.api);
          await pause.ready;
          let unpublishDone = false;
          const unpublish = author(
            "unpublish",
            req(one.owner, { version: 2 }),
            one.d.problemId,
          ).then((r) => {
            unpublishDone = true;
            return r;
          });
          await new Promise((resolve) => setTimeout(resolve, 40));
          assert.equal(unpublishDone, false);
          pause.release();
          const saved = await (await assertStatus(await pending, 201)).json();
          await assertStatus(await unpublish, 200);
          assert.equal(saved.attempt.revisionId, one.r.id);
          assert.equal(saved.attempt.status, "correct");
          await assertStatus(
            await submit(one.student, one.d, one.r, input(one.d, one.r)),
            404,
          );
          const two = await setup(),
            copy = structuredClone({
              content: two.d.content,
              privateParts: two.d.privateParts,
            });
          copy.privateParts[0].key.value = 99;
          await assertStatus(
            await author(
              "update",
              req(two.owner, { version: 2, ...copy }),
              two.d.problemId,
            ),
            200,
          );
          const gate = await paused(),
            original = input(two.d, two.r),
            submitted = submit(two.student, two.d, two.r, original, gate.api);
          await gate.ready;
          let publicationDone = false;
          const newPublication = publish(two.owner, two.d.problemId, 3).then(
            (r) => {
              publicationDone = true;
              return r;
            },
          );
          await new Promise((resolve) => setTimeout(resolve, 40));
          assert.equal(publicationDone, false);
          gate.release();
          const first = await (await assertStatus(await submitted, 201)).json(),
            newRevision = await newPublication;
          assert.equal(first.attempt.status, "correct");
          assert.equal(first.attempt.revisionId, two.r.id);
          await assertStatus(
            await submit(two.student, two.d, two.r, input(two.d, two.r)),
            409,
          );
          const replay = await (
            await assertStatus(
              await submit(two.student, two.d, two.r, original),
              200,
            )
          ).json();
          assert.equal(replay.attempt.id, first.attempt.id);
          const current = await (
            await assertStatus(
              await submit(
                two.student,
                two.d,
                newRevision,
                input(two.d, newRevision, 0, {
                  kind: "numeric",
                  value: 99,
                  units: "1",
                }),
              ),
              201,
            )
          ).json();
          assert.equal(current.attempt.status, "correct");
          assert.equal(current.attempt.attemptNumber, 1);
          await assertStatus(
            await submit(two.student, two.d, newRevision, {
              ...input(two.d, newRevision),
              partId: randomUUID(),
            }),
            404,
          );
        },
      );
      await t.test(
        "grading failure preserves review only when database healthy; invalid output and aborted transactions rollback retryably",
        async () => {
          const { student, d, r } = await setup();
          let calls = 0;
          const failed = createAuthoredAttemptApi({
              ...deps,
              grade: async () => {
                calls++;
                throw Error("PRIVATE_ERROR_SENTINEL");
              },
            }),
            body = input(d, r);
          const first = await (
            await assertStatus(await submit(student, d, r, body, failed), 201)
          ).json();
          assert.equal(first.attempt.status, "needs-review");
          assert.equal(first.attempt.reason, "service-unavailable");
          assert.equal(
            JSON.stringify(first).includes("PRIVATE_ERROR_SENTINEL"),
            false,
          );
          await assertStatus(await submit(student, d, r, body, failed), 200);
          assert.equal(calls, 1);
          for (const mode of ["selection", "extra", "pair", "db-abort"]) {
            const trial = input(d, r),
              before = await total(student),
              bad = createAuthoredAttemptApi({
                ...deps,
                grade: async (c, u, value) => {
                  if (mode === "db-abort") await c.query("SELECT 1/0");
                  const grade = await createAuthoredGrader({
                    pool: c,
                    user: async () => u,
                  })(value);
                  if (mode === "selection")
                    return {
                      ...grade,
                      selection: {
                        ...grade.selection,
                        revisionId: randomUUID(),
                      },
                    };
                  if (mode === "extra")
                    return { ...grade, key: "PRIVATE_ERROR_SENTINEL" };
                  return {
                    ...grade,
                    status: "correct",
                    reason: "outside-tolerance",
                  };
                },
              });
            const response = await assertStatus(
              await submit(student, d, r, trial, bad),
              503,
            );
            assert.equal(
              (await response.text()).includes("PRIVATE_ERROR_SENTINEL"),
              false,
            );
            assert.equal(await total(student), before);
            await assertStatus(await submit(student, d, r, trial), 201);
            assert.equal(await total(student), before + 1);
          }
        },
      );
      await t.test(
        "grader reuses transaction client even with one database connection",
        async () => {
          const { student, d, r } = await setup(),
            single = new Pool({
              connectionString: testUrl,
              options: `-c search_path=${schema},public`,
              max: 1,
              connectionTimeoutMillis: 500,
              statement_timeout: 2000,
            });
          try {
            const api = createAuthoredAttemptApi({ ...deps, pool: single });
            const response = await assertStatus(
              await submit(student, d, r, input(d, r), api),
              201,
            );
            assert.equal((await response.json()).attempt.status, "correct");
          } finally {
            await single.end();
          }
        },
      );
      await t.test(
        "submitted answers unlock no private solution PDF or hints, including after correctness",
        async () => {
          const owner = await user(),
            student = await user(),
            d = await draft(owner);
          const form = new FormData();
          form.set("purpose", "solution-pdf");
          form.set(
            "file",
            new File([pdf], "private-solution.pdf", {
              type: "application/pdf",
            }),
          );
          const uploaded = await media(
            "upload",
            new Request("https://physcratic.test/api", {
              method: "POST",
              headers: {
                origin: "https://physcratic.test",
                "x-test-user": owner,
              },
              body: form,
            }),
            d.problemId,
          );
          await assertStatus(uploaded, 201);
          const file = await uploaded.json();
          d.content.attachments = [{ id: file.id, purpose: "solution-pdf" }];
          await assertStatus(
            await author(
              "update",
              req(owner, {
                version: 1,
                content: d.content,
                privateParts: d.privateParts,
              }),
              d.problemId,
            ),
            200,
          );
          const r = await publish(owner, d.problemId, 2);
          const result = await (
            await assertStatus(await submit(student, d, r), 201)
          ).json();
          assert.equal(result.attempt.status, "correct");
          const publicJson = await (
              await author("public", req(student), d.problemId)
            ).text(),
            history = await (await attempts("list", req(student))).text(),
            info = await (
              await attempts("info", req(student), d.problemId)
            ).text();
          for (const text of [
            JSON.stringify(result),
            publicJson,
            history,
            info,
          ])
            for (const secret of [
              file.id,
              "PRIVATE_HINT_SENTINEL",
              "PRIVATE_SOLUTION_SENTINEL",
              "author-media/",
              "solution-pdf",
            ])
              assert.equal(text.includes(secret), false);
          await assertStatus(
            await media("read", req(student), d.problemId, file.id),
            404,
          );
          await assertStatus(
            await media("read", req(), d.problemId, file.id),
            404,
          );
        },
      );
      await t.test(
        "SQL guards preserve immutable attempts, exact FKs/status/answer shape, and populated rollback refuses",
        async () => {
          const { student, d, r } = await setup(),
            created = await (await submit(student, d, r)).json(),
            id = created.attempt.id;
          await assert.rejects(
            pool.query(
              "UPDATE authored_attempt SET status='incorrect' WHERE id=$1",
              [id],
            ),
            /immutable/,
          );
          await assert.rejects(
            pool.query("DELETE FROM authored_attempt WHERE id=$1", [id]),
            /immutable/,
          );
          async function invalid(
            answer: unknown,
            extra = {
              partId: d.content.sections[0].parts[0].id,
              status: "correct",
              reason: "within-tolerance",
              ordinal: 2,
            },
          ) {
            return pool.query(
              "INSERT INTO authored_attempt(id,user_id,problem_id,revision_id,part_id,idempotency_key,answer,status,reason,engine_version,attempt_number) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'numeric-v1',$10)",
              [
                randomUUID(),
                student,
                d.problemId,
                r.id,
                extra.partId,
                randomUUID(),
                JSON.stringify(answer),
                extra.status,
                extra.reason,
                extra.ordinal,
              ],
            );
          }
          for (const answer of [
            { kind: "numeric", value: 2 },
            { kind: "numeric", value: 2, units: "", key: { value: 2 } },
            { kind: "expression" },
            { kind: "manual" },
            { kind: "manual", text: "x".repeat(4001) },
          ])
            await assert.rejects(invalid(answer), /check constraint/);
          await assert.rejects(
            invalid(
              { kind: "numeric", value: 2, units: "" },
              {
                partId: randomUUID(),
                status: "correct",
                reason: "within-tolerance",
                ordinal: 2,
              },
            ),
            /foreign key/,
          );
          await assert.rejects(
            invalid(
              { kind: "numeric", value: 2, units: "" },
              {
                partId: d.content.sections[0].parts[0].id,
                status: "correct",
                reason: "outside-tolerance",
                ordinal: 2,
              },
            ),
            /check constraint/,
          );
          await assert.rejects(
            invalid(
              { kind: "numeric", value: 2, units: "" },
              {
                partId: d.content.sections[0].parts[0].id,
                status: "correct",
                reason: "within-tolerance",
                ordinal: 11,
              },
            ),
            /check constraint/,
          );
          const changed = structuredClone({
            content: d.content,
            privateParts: d.privateParts,
          });
          changed.privateParts[0].key.value = 3;
          await assertStatus(
            await author(
              "update",
              req(
                (
                  await pool.query(
                    "SELECT owner_id FROM authored_problem WHERE id=$1",
                    [d.problemId],
                  )
                ).rows[0].owner_id,
                { version: 2, ...changed },
              ),
              d.problemId,
            ),
            200,
          );
          const owner = (
            await pool.query(
              "SELECT owner_id FROM authored_problem WHERE id=$1",
              [d.problemId],
            )
          ).rows[0].owner_id;
          await publish(owner, d.problemId, 3);
          await assert.rejects(
            invalid({ kind: "numeric", value: 2, units: "" }),
            /current published revision/,
          );
          await assertStatus(
            await author("unpublish", req(owner, { version: 4 }), d.problemId),
            200,
          );
          await assert.rejects(
            invalid({ kind: "numeric", value: 2, units: "" }),
            /current published revision/,
          );
          await assert.rejects(
            pool.query(
              await readFile(
                "migrations/0004_authored_attempts.down.sql",
                "utf8",
              ),
            ),
            /populated rollback is forbidden/,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT count(*)::integer AS n FROM authored_attempt WHERE id=$1",
                [id],
              )
            ).rows[0].n,
            1,
          );
        },
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
