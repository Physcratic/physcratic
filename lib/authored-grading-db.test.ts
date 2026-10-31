import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Pool } from "pg";
import { createAuthoredGrader } from "./authored-grading";
import { createProblemAuthoringApi } from "./problem-authoring-api";
import type { AuthoredDocument, PrivatePart } from "./problem-authoring";
const testUrl = process.env.AUTHORING_TEST_DATABASE_URL;
test(
  "revision-bound private numeric grading on disposable PostgreSQL",
  {
    skip:
      !testUrl &&
      "Run scripts/test-problem-authoring.sh with react-server condition",
  },
  async (t) => {
    const url = new URL(testUrl!);
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.pathname, "/physcratic_authoring_test");
    const schema = `grade_test_${randomUUID().replaceAll("-", "")}`,
      admin = new Pool({ connectionString: testUrl });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: testUrl,
      options: `-c search_path=${schema},public`,
      max: 10,
      statement_timeout: 2000,
    });
    const sessions = new Map<string, { id: string; emailVerified: boolean }>();
    const api = createProblemAuthoringApi({
      pool,
      user: async (r) => sessions.get(r.headers.get("x-test-user") ?? ""),
      origin: (r) => r.headers.get("origin") === "https://physcratic.test",
    });
    const grader = (id: string) =>
      createAuthoredGrader({ pool, user: async () => sessions.get(id) });
    const request = (id: string, body?: unknown) =>
      new Request("https://physcratic.test/api", {
        method: body ? "POST" : "GET",
        headers: {
          "x-test-user": id,
          origin: "https://physcratic.test",
          "content-type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    async function user(verified = true) {
      const id = randomUUID();
      sessions.set(id, { id, emailVerified: verified });
      await pool.query('INSERT INTO "user" VALUES($1)', [id]);
      return id;
    }
    function doc(value: number, partId: string = randomUUID()) {
      const content: AuthoredDocument = {
        title: "Find the displacement",
        topicTags: [],
        methodTags: [],
        estimatedDifficulty: null,
        context: [
          {
            id: randomUUID(),
            kind: "text",
            spans: [
              { kind: "text", text: "A body moves; find its displacement." },
            ],
          },
        ],
        sections: [
          {
            id: randomUUID(),
            title: "Motion",
            blocks: [],
            parts: [
              { id: partId, label: "a", blocks: [], answerMode: "numeric" },
            ],
          },
        ],
        provenance: {
          kind: "original",
          source: "",
          rightsDeclaration: "I own this work.",
        },
        attachments: [],
      };
      const privateParts: PrivatePart[] = [
        {
          partId,
          key: { kind: "numeric", value, units: "m", absTol: 0, relTol: 0 },
          hints: [],
          solution: [
            {
              id: randomUUID(),
              kind: "text",
              spans: [{ kind: "text", text: "PRIVATE_REVISION_SOLUTION" }],
            },
          ],
        },
      ];
      return { content, privateParts };
    }
    async function create(owner: string, value = 98765.4321, partId?: string) {
      const input = doc(value, partId),
        r = await api("create", request(owner, input));
      assert.equal(r.status, 201);
      return { ...(await r.json()), ...input };
    }
    async function publish(owner: string, id: string, version: number) {
      const r = await api("publish", request(owner, { version }), id);
      assert.equal(r.status, 200, await r.clone().text());
      return (await r.json()).revision;
    }
    const selection = (
      d: { problemId: string; content: AuthoredDocument },
      revisionId: string,
    ) => ({
      problemId: d.problemId,
      revisionId,
      partId: d.content.sections[0].parts[0].id,
    });
    const answer = (value: number) => ({
      kind: "numeric" as const,
      value,
      units: "m",
    });
    try {
      await pool.query('CREATE TABLE "user" (id text PRIMARY KEY)');
      for (const name of [
        "0001_problem_authoring",
        "0002_authored_write_limit",
        "0003_author_media",
      ])
        await pool.query(
          "BEGIN;\n" +
            (await readFile(`migrations/${name}.up.sql`, "utf8")) +
            "\nCOMMIT;",
        );
      await t.test(
        "saved dimensionless author keys and student labels agree across immutable revisions",
        async () => {
          const owner = await user(),
            student = await user();
          for (const authorUnits of ["1", ""]) {
            const d = await create(owner, 2);
            d.privateParts[0].key.units = authorUnits;
            assert.equal(
              (
                await api(
                  "update",
                  request(owner, {
                    version: 1,
                    content: d.content,
                    privateParts: d.privateParts,
                  }),
                  d.problemId,
                )
              ).status,
              200,
            );
            const revision = await publish(owner, d.problemId, 2),
              ids = selection(d, revision.id);
            const stored = await pool.query(
              "SELECT data->'key'->>'units' AS units FROM authored_revision_private_part WHERE revision_id=$1 AND part_id=$2",
              [revision.id, ids.partId],
            );
            assert.equal(
              stored.rows[0].units,
              authorUnits,
              "publication preserves existing author labels",
            );
            for (const units of ["", "1", " 1 "]) {
              assert.equal(
                (
                  await grader(student)({
                    ...ids,
                    answer: { kind: "numeric", value: 2, units },
                  })
                ).status,
                "correct",
              );
              assert.equal(
                (
                  await grader(student)({
                    ...ids,
                    answer: { kind: "numeric", value: 3, units },
                  })
                ).status,
                "incorrect",
              );
            }
            assert.equal(
              (
                await grader(student)({
                  ...ids,
                  answer: { kind: "numeric", value: 2, units: "m" },
                })
              ).reason,
              "units-mismatch",
            );
            assert.equal(
              (
                await grader(student)({
                  ...ids,
                  answer: { kind: "numeric", value: 2, units: "1/s" },
                })
              ).reason,
              "units-unsupported",
            );
          }
        },
      );
      await t.test(
        "exact immutable historical selection cannot substitute draft/current or foreign keys",
        async () => {
          const owner = await user(),
            student = await user(),
            d = await create(owner),
            old = await publish(owner, d.problemId, 1),
            ids = selection(d, old.id);
          const updated = doc(-321.25, ids.partId);
          assert.equal(
            (
              await api(
                "update",
                request(owner, { version: 2, ...updated }),
                d.problemId,
              )
            ).status,
            200,
          );
          const current = await publish(owner, d.problemId, 3);
          assert.equal(
            (await grader(student)({ ...ids, answer: answer(98765.4321) }))
              .status,
            "correct",
          );
          assert.equal(
            (await grader(student)({ ...ids, answer: answer(-321.25) })).status,
            "incorrect",
          );
          assert.equal(
            (
              await grader(student)({
                ...ids,
                revisionId: current.id,
                answer: answer(-321.25),
              })
            ).status,
            "correct",
          );
          const draft = doc(1000001, ids.partId);
          assert.equal(
            (
              await api(
                "update",
                request(owner, { version: 4, ...draft }),
                d.problemId,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await grader(owner)({
                ...ids,
                revisionId: current.id,
                answer: answer(1000001),
              })
            ).status,
            "incorrect",
          );
          const foreign = await create(student, 777, ids.partId),
            foreignRevision = await publish(student, foreign.problemId, 1);
          assert.equal(
            (
              await grader(student)({
                ...ids,
                revisionId: foreignRevision.id,
                answer: answer(777),
              })
            ).reason,
            "revision-unavailable",
          );
          assert.equal(
            (
              await grader(student)({
                ...ids,
                partId: randomUUID(),
                answer: answer(98765.4321),
              })
            ).reason,
            "revision-unavailable",
          );
          assert.equal(
            (
              await grader(student)({
                ...ids,
                revisionId: randomUUID(),
                answer: answer(98765.4321),
              })
            ).reason,
            "revision-unavailable",
          );
          await assert.rejects(
            pool.query(
              "UPDATE authored_revision_private_part SET data=jsonb_set(data,'{key,value}','999') WHERE revision_id=$1",
              [old.id],
            ),
            /immutable/,
          );
        },
      );
      await t.test(
        "verified actor and publication gate protect hidden revisions; no key leaks through grading/public JSON",
        async () => {
          const owner = await user(),
            student = await user(),
            unverified = await user(false),
            d = await create(owner),
            rev = await publish(owner, d.problemId, 1),
            ids = selection(d, rev.id),
            input = { ...ids, answer: answer(98765.4321) };
          for (const actor of ["missing", unverified])
            assert.equal((await grader(actor)(input)).reason, "not-authorized");
          const result = await grader(student)(input);
          assert.equal(result.status, "correct");
          for (const response of [
            JSON.stringify(result),
            await (await api("public", request(student), d.problemId)).text(),
          ])
            for (const secret of [
              "98765.4321",
              "PRIVATE_REVISION_SOLUTION",
              '"absTol"',
              '"relTol"',
              '"key"',
            ])
              assert.equal(response.includes(secret), false);
          assert.equal(
            (
              await api(
                "unpublish",
                request(owner, { version: 2 }),
                d.problemId,
              )
            ).status,
            200,
          );
          assert.equal(
            (await grader(student)(input)).reason,
            "revision-unavailable",
          );
          assert.equal((await grader(owner)(input)).status, "correct");
          assert.equal(
            (await grader(student)({ ...input, ownerId: owner })).reason,
            "invalid-input",
          );
          assert.equal(
            (
              await grader(student)({
                ...input,
                answer: { ...input.answer, key: { value: 98765.4321 } },
              })
            ).reason,
            "invalid-input",
          );
        },
      );
      await t.test(
        "concurrent new publication cannot swap the selected historical numeric key",
        async () => {
          const owner = await user(),
            student = await user(),
            d = await create(owner, 123),
            rev = await publish(owner, d.problemId, 1),
            ids = selection(d, rev.id);
          assert.equal(
            (
              await api(
                "update",
                request(owner, { version: 2, ...doc(999, ids.partId) }),
                d.problemId,
              )
            ).status,
            200,
          );
          const [next, ...results] = await Promise.all([
            publish(owner, d.problemId, 3),
            ...Array.from({ length: 12 }, () =>
              grader(student)({ ...ids, answer: answer(123) }),
            ),
          ]);
          assert.ok(next.id);
          for (const r of results) {
            assert.equal(r.status, "correct");
            assert.deepEqual(r.selection, ids);
          }
          const revisionIds = await pool.query(
            "SELECT id FROM authored_revision WHERE problem_id=$1",
            [d.problemId],
          );
          assert.equal(revisionIds.rowCount, 2);
        },
      );
      await t.test(
        "database timeout yields a safe review outcome and retains immutable key",
        async () => {
          const owner = await user(),
            d = await create(owner, 12),
            rev = await publish(owner, d.problemId, 1),
            ids = selection(d, rev.id),
            lock = await pool.connect();
          const limited = new Pool({
            connectionString: testUrl,
            options: `-c search_path=${schema},public`,
            statement_timeout: 80,
            max: 1,
          });
          try {
            await lock.query("BEGIN");
            await lock.query(
              "LOCK TABLE authored_revision_private_part IN ACCESS EXCLUSIVE MODE",
            );
            const result = await createAuthoredGrader({
              pool: limited,
              user: async () => sessions.get(owner),
            })({ ...ids, answer: answer(12) });
            assert.equal(result.reason, "service-unavailable");
            assert.equal(JSON.stringify(result).includes("timeout"), false);
          } finally {
            await lock.query("ROLLBACK");
            lock.release();
            await limited.end();
          }
          assert.equal(
            (await grader(owner)({ ...ids, answer: answer(12) })).status,
            "correct",
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
