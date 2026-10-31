import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { createAuthoredGrader } from "./authored-grading";
const ids = {
  problemId: "11111111-1111-4111-8111-111111111111",
  revisionId: "22222222-2222-4222-8222-222222222222",
  partId: "33333333-3333-4333-8333-333333333333",
};
const input = { ...ids, answer: { kind: "numeric", value: 23, units: "m" } };
const row = {
  schema_version: 1,
  answer_mode: "numeric",
  private_mode: "numeric",
  private_part_id: ids.partId,
  key: { kind: "numeric", value: 23, units: "m", absTol: 0, relTol: 0 },
};
function fixture(
  rows: unknown[] = [row],
  user: { id: string; emailVerified?: boolean } | null = {
    id: "server-user",
    emailVerified: true,
  },
) {
  let queries = 0;
  const pool = {
    async query() {
      queries++;
      return { rows };
    },
  } as unknown as Pool;
  return {
    grade: createAuthoredGrader({ pool, user: async () => user }),
    get queries() {
      return queries;
    },
  };
}
test("typed bounded request validation rejects forged key/actor fields before database access", async () => {
  const f = fixture();
  for (const invalid of [
    null,
    {},
    [],
    { ...input, userId: "victim" },
    { ...input, key: row.key },
    { ...input, version: 1 },
    { ...input, revisionId: "latest" },
    { ...input, partId: "' OR 1=1--" },
    { ...input, answer: { ...input.answer, expected: 23 } },
    { ...input, answer: { kind: "expression", expression: "x".repeat(181) } },
    { ...input, answer: { kind: "manual", text: "x".repeat(4001) } },
    { ...input, answer: { ...input.answer, value: Infinity } },
  ]) {
    assert.deepEqual(await f.grade(invalid), {
      status: "ungraded",
      reason: "invalid-input",
      engineVersion: "numeric-v1",
      selection: null,
    });
  }
  assert.equal(f.queries, 0);
});
test("missing and unverified server sessions never read private keys", async () => {
  for (const user of [null, { id: "u", emailVerified: false }, { id: "u" }]) {
    const f = fixture([row], user);
    assert.equal((await f.grade(input)).reason, "not-authorized");
    assert.equal(f.queries, 0);
  }
});
test("safe results contain only status, fixed reason/version and canonical immutable selection", async () => {
  const f = fixture();
  const result = await f.grade({
    ...input,
    problemId: ids.problemId.toUpperCase(),
  });
  assert.deepEqual(result, {
    status: "correct",
    reason: "within-tolerance",
    engineVersion: "numeric-v1",
    selection: ids,
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "engineVersion",
    "reason",
    "selection",
    "status",
  ]);
  assert.equal(JSON.stringify(result).includes('"key"'), false);
  assert.equal(
    (await f.grade({ ...input, answer: { ...input.answer, value: 24 } }))
      .status,
    "incorrect",
  );
  assert.equal((await fixture([]).grade(input)).reason, "revision-unavailable");
});
test("manual is explicitly ungraded; symbolic and mode mismatches never produce a false boolean grade", async () => {
  const manual = fixture([
    {
      ...row,
      answer_mode: "manual",
      private_mode: "manual",
      key: { kind: "manual" },
    },
  ]);
  for (const answer of [
    input.answer,
    { kind: "manual", text: "my reasoning" },
    { kind: "expression", expression: "2+2" },
  ])
    assert.equal((await manual.grade({ ...input, answer })).reason, "manual");
  const expression = {
    kind: "expression",
    expected: "x^2",
    variables: [],
    angleUnit: "radians",
    exclusions: [],
  };
  const symbolic = fixture([
    {
      ...row,
      answer_mode: "expression",
      private_mode: "expression",
      key: expression,
    },
  ]);
  assert.equal(
    (
      await symbolic.grade({
        ...input,
        answer: { kind: "expression", expression: "x*x" },
      })
    ).reason,
    "answer-mode-unsupported",
  );
  assert.equal(
    (
      await fixture().grade({
        ...input,
        answer: { kind: "manual", text: "23 m" },
      })
    ).reason,
    "answer-mode-unsupported",
  );
});
test("malformed private keys/identity/version/modes fail closed without diagnostics or secrets", async () => {
  for (const patch of [
    { key: null },
    { key: { ...row.key, value: "PRIVATE_SENTINEL" } },
    { key: { ...row.key, absTol: -1 } },
    { key: { ...row.key, units: "m".repeat(81) } },
    { private_part_id: ids.revisionId },
    { private_mode: "expression" },
    { answer_mode: "expression" },
    { schema_version: 2 },
  ]) {
    const result = await fixture([{ ...row, ...patch }]).grade(input);
    assert.equal(result.reason, "key-unavailable");
    assert.equal(JSON.stringify(result).includes("PRIVATE_SENTINEL"), false);
  }
  const pool = {
    query: async () => {
      throw Error("PRIVATE_SENTINEL DB credentials, keys, expected=23");
    },
  } as unknown as Pool;
  const result = await createAuthoredGrader({
    pool,
    user: async () => ({ id: "u", emailVerified: true }),
  })(input);
  assert.equal(result.reason, "service-unavailable");
  assert.equal(JSON.stringify(result).includes("PRIVATE_SENTINEL"), false);
});

test("server-only marker rejects grader imports outside the server condition", async () => {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(
    process.execPath,
    ["--import", "tsx", "--eval", "import('./lib/authored-grading.ts')"],
    { cwd: process.cwd(), encoding: "utf8", timeout: 10000 },
  );
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /cannot be imported from a Client Component module/);
});
