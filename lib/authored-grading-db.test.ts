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
  "revision-bound private numeric and symbolic grading on disposable PostgreSQL",
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
        estimatedDifficulty: "1200",
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
        "symbolic private revision dispatch stays immutable and isolated during concurrent publication",
        async () => {
          const owner = await user(),
            student = await user(),
            d = doc(0);
          d.content.sections[0].parts[0].answerMode = "expression";
          d.privateParts[0].key = {
            kind: "expression",
            expected: "x^2+137",
            variables: [{ name: "x", domain: "real", assumptions: [] }],
            angleUnit: "radians",
            exclusions: [],
          };
          const created = await api("create", request(owner, d));
          assert.equal(created.status, 201);
          const problem = await created.json(),
            revision = await publish(owner, problem.problemId, 1),
            ids = selection({ ...problem, ...d }, revision.id);
          const candidate = { kind: "expression", expression: "x*x+137" };
          let result = await grader(student)({ ...ids, answer: candidate });
          assert.equal(result.status, "correct");
          assert.equal(result.engineVersion, "symbolic-v1");
          for (const value of [
            JSON.stringify(result),
            await (
              await api("public", request(student), problem.problemId)
            ).text(),
          ])
            for (const secret of [
              "x^2+137",
              "PRIVATE_REVISION_SOLUTION",
              '"expected"',
              '"variables"',
              '"key"',
            ])
              assert.equal(value.includes(secret), false);
          const next = structuredClone(d);
          if (next.privateParts[0].key?.kind !== "expression")
            throw Error("fixture");
          next.privateParts[0].key.expected = "x^2+999";
          assert.equal(
            (
              await api(
                "update",
                request(owner, { version: 2, ...next }),
                problem.problemId,
              )
            ).status,
            200,
          );
          const [newRevision, ...oldResults] = await Promise.all([
            publish(owner, problem.problemId, 3),
            ...Array.from({ length: 8 }, () =>
              grader(student)({ ...ids, answer: candidate }),
            ),
          ]);
          for (const r of oldResults) {
            assert.equal(r.status, "correct");
            assert.equal(r.selection?.revisionId, revision.id);
          }
          result = await grader(student)({
            ...ids,
            revisionId: newRevision.id,
            answer: candidate,
          });
          assert.equal(result.status, "incorrect");
          assert.equal(
            (
              await grader(student)({
                ...ids,
                revisionId: newRevision.id,
                answer: { kind: "expression", expression: "x*x+999" },
              })
            ).status,
            "correct",
          );
          const foreign = await create(student),
            foreignRev = await publish(student, foreign.problemId, 1);
          assert.equal(
            (
              await grader(student)({
                ...ids,
                revisionId: foreignRev.id,
                answer: candidate,
              })
            ).reason,
            "revision-unavailable",
          );
          const unverified = await user(false);
          assert.equal(
            (await grader(unverified)({ ...ids, answer: candidate })).reason,
            "not-authorized",
          );
          assert.equal(
            (
              await grader(student)({
                ...ids,
                expected: "x*x+137",
                answer: candidate,
              })
            ).reason,
            "invalid-input",
          );
          assert.equal(
            (
              await api(
                "unpublish",
                request(owner, { version: 4 }),
                problem.problemId,
              )
            ).status,
            200,
          );
          assert.equal(
            (await grader(student)({ ...ids, answer: candidate })).reason,
            "revision-unavailable",
          );
          assert.equal(
            (await grader(owner)({ ...ids, answer: candidate })).status,
            "correct",
          );
        },
      );
      await t.test(
        "symbolic exclusions and bounds are loaded from the selected private revision only",
        async () => {
          const owner = await user(),
            student = await user(),
            d = doc(0);
          d.content.sections[0].parts[0].answerMode = "expression";
          d.privateParts[0].key = {
            kind: "expression",
            expected: "x+1",
            variables: [{ name: "x", domain: "real", assumptions: [] }],
            angleUnit: "radians",
            exclusions: [],
          };
          const created = await api("create", request(owner, d));
          assert.equal(created.status, 201);
          const problem = await created.json(),
            first = await publish(owner, problem.problemId, 1),
            ids = selection({ ...problem, ...d }, first.id),
            answer = { kind: "expression", expression: "(x^2-1)/(x-1)" };
          // Phase 1: (x^2-1)/(x-1) equals x+1 wherever it is defined, so revision 1 is now correct (it needed review).
          assert.equal(
            (await grader(student)({ ...ids, answer })).reason,
            "symbolic-equivalent",
          );
          if (d.privateParts[0].key?.kind !== "expression")
            throw Error("fixture");
          // Revision 2 changes the key, so the same answer is judged differently for each pinned revision.
          d.privateParts[0].key.exclusions = ["x != 1"];
          d.privateParts[0].key.expected = "x+2";
          assert.equal(
            (
              await api(
                "update",
                request(owner, { version: 2, ...d }),
                problem.problemId,
              )
            ).status,
            200,
          );
          const second = await publish(owner, problem.problemId, 3);
          assert.equal(
            (await grader(student)({ ...ids, revisionId: second.id, answer }))
              .status,
            "incorrect",
          );
          assert.equal(
            (await grader(student)({ ...ids, answer })).reason,
            "symbolic-equivalent",
          );
          d.privateParts[0].key.expected = "x";
          d.privateParts[0].key.variables[0].min = 0;
          d.privateParts[0].key.exclusions = [];
          assert.equal(
            (
              await api(
                "update",
                request(owner, { version: 4, ...d }),
                problem.problemId,
              )
            ).status,
            200,
          );
          const third = await publish(owner, problem.problemId, 5);
          assert.equal(
            (
              await grader(student)({
                ...ids,
                revisionId: third.id,
                answer: { kind: "expression", expression: "sqrt(x^2)" },
              })
            ).status,
            "correct",
          );
          const row = await pool.query(
            "SELECT data->'key' AS key FROM authored_revision_private_part WHERE revision_id=$1",
            [first.id],
          );
          assert.deepEqual(row.rows[0].key.exclusions, []);
          assert.equal(row.rows[0].key.expected, "x+1");
        },
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
