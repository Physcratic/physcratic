import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import {
  StudentSolverSession,
  StudentRequestError,
  answerFromBuffer,
  formKey,
  studentRequest,
  studentReadError,
  studentAttemptSchema,
} from "./authored-student";
import type { StudentSubmission } from "./authored-attempt-contracts";
const problem = randomUUID(),
  revision = randomUUID(),
  part = randomUUID();
const numeric = { kind: "numeric" as const, value: "2", units: "1" };
function memory() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
}
function result(body: StudentSubmission) {
  return {
    attempt: {
      id: randomUUID(),
      problemId: problem,
      revisionId: body.revisionId,
      partId: body.partId,
      answer: body.answer,
      status: "correct",
      reason: "within-tolerance",
      engineVersion: "numeric-v1",
      attemptNumber: "1",
      createdAt: new Date().toISOString(),
      spoilerPolicy: "no-reveal-v1",
      assisted: false,
    },
    replayed: false,
  };
}
test("editing a local answer does not show an unnecessary submission status", () => {
  const storage = memory();
  const session = new StudentSolverSession(problem, "A", storage);
  session.edit(revision, part, numeric);
  assert.equal(session.snapshot().message, "");
  assert.deepEqual(session.buffer(revision, part, "numeric"), numeric);
  assert.equal(session.snapshot().book.pending, null);
});
test("numeric buffers reject incomplete, nonfinite and nonzero underflow; dimensionless aliases survive", () => {
  for (const value of [
    "-",
    "1e",
    "Infinity",
    "NaN",
    "0x10",
    "1e9999",
    "1e-9999",
    "-1e-9999",
    "0.00001e-9999",
  ])
    assert.throws(() => answerFromBuffer({ ...numeric, value }), value);
  for (const [value, expected] of [
    ["0e-9999", 0],
    ["-0", -0],
    ["5e-324", Number.MIN_VALUE],
    ["-5e-324", -Number.MIN_VALUE],
    ["1e308", 1e308],
  ] as const)
    assert.equal(
      (answerFromBuffer({ ...numeric, value }) as { value: number }).value,
      expected,
    );
  for (const units of ["", "1", " 1 "]) {
    const a = answerFromBuffer({ ...numeric, units });
    assert.equal(a.kind, "numeric");
    if (a.kind === "numeric") assert.equal(a.units, "");
  }
  assert.equal(
    (answerFromBuffer({ ...numeric, units: "m" }) as { units: string }).units,
    "m",
  );
});
test("read deadlines survive a caller cancellation signal", async () => {
  const oldFetch = globalThis.fetch,
    oldTimeout = AbortSignal.timeout;
  let combined: AbortSignal | undefined;
  AbortSignal.timeout = () => {
    const c = new AbortController();
    setTimeout(() => c.abort(), 5);
    return c.signal;
  };
  globalThis.fetch = async (_url, init) => {
    combined = init?.signal as AbortSignal;
    return new Promise((_resolve, reject) =>
      combined!.addEventListener("abort", () => reject(Error("deadline")), {
        once: true,
      }),
    );
  };
  try {
    const c = new AbortController();
    await assert.rejects(
      studentRequest("/test", { signal: c.signal }),
      /deadline/,
    );
    assert.equal(c.signal.aborted, false);
    assert.equal(combined?.aborted, true);
  } finally {
    globalThis.fetch = oldFetch;
    AbortSignal.timeout = oldTimeout;
  }
});
test("ambiguous retry and reload reuse exact immutable payload; receipts require explicit new intent", async () => {
  const storage = memory(),
    sent: StudentSubmission[] = [];
  let fail = true;
  const send = async (b: StudentSubmission) => {
    sent.push(structuredClone(b));
    if (fail) throw Error("lost response");
    return result(b);
  };
  const a = new StudentSolverSession(problem, "A", storage, send);
  a.edit(revision, part, numeric);
  await a.submit(revision, part, "numeric");
  assert.equal(sent.length, 1);
  assert.ok(a.snapshot().book.pending);
  a.edit(revision, part, { ...numeric, value: "3" });
  assert.equal(a.buffer(revision, part, "numeric").kind, "numeric");
  const b = new StudentSolverSession(problem, "A", storage, send);
  assert.equal(sent.length, 1, "reload never posts");
  fail = false;
  await Promise.all([b.retry(), b.retry()]);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[1], sent[0]);
  await b.submit(revision, part, "numeric");
  assert.equal(
    sent.length,
    2,
    "fast second click after acknowledgement blocked",
  );
  assert.ok(b.snapshot().book.receipts[formKey(revision, part)]);
  b.startAnother(revision, part);
  await b.submit(revision, part, "numeric");
  assert.equal(sent.length, 3);
  assert.notEqual(sent[2].idempotencyKey, sent[0].idempotencyKey);
  assert.equal(
    new StudentSolverSession(problem, "B", storage, send).snapshot().book
      .pending,
    null,
  );
});
test("synchronous in-flight guard and account disposal ignore late completions", async () => {
  const storage = memory();
  let finish!: (v: unknown) => void,
    calls = 0;
  const send = async () => {
    calls++;
    return new Promise((r) => (finish = r));
  };
  const a = new StudentSolverSession(problem, "A", storage, send);
  a.edit(revision, part, numeric);
  const sending = a.submit(revision, part, "numeric");
  await a.submit(revision, part, "numeric");
  assert.equal(calls, 1);
  const original = a.snapshot().book.pending!.body;
  a.dispose();
  finish(result(original));
  await sending;
  assert.ok(a.snapshot().book.pending);
  assert.equal(a.snapshot().lastResult, null);
  const b = new StudentSolverSession(problem, "B", storage);
  assert.deepEqual(b.snapshot().book.buffers, {});
});
test("uncertain HTTP errors preserve original intent; stale revisions require explicit resolution", async () => {
  for (const status of [401, 403, 408, 429, 500, 503]) {
    const a = new StudentSolverSession(problem, "A", memory(), async () => {
      throw new StudentRequestError(status, 1);
    });
    a.edit(revision, part, numeric);
    await a.submit(revision, part, "numeric");
    assert.equal(a.snapshot().book.pending?.rejected, false);
    assert.equal(a.snapshot().lastStatus, status);
    if (status === 429) assert.ok(a.snapshot().retryAt > Date.now());
  }
  const sent: StudentSubmission[] = [];
  const a = new StudentSolverSession(problem, "A", memory(), async (b) => {
    sent.push(b);
    throw new StudentRequestError(409);
  });
  a.edit(revision, part, numeric);
  await a.submit(revision, part, "numeric");
  assert.equal(a.snapshot().book.pending?.rejected, true);
  await a.retry();
  assert.equal(sent.length, 1);
  const next = randomUUID();
  a.edit(next, part, numeric);
  await a.submit(next, part, "numeric");
  assert.equal(sent.length, 1, "never silently retarget");
  a.closeRejected();
  await a.submit(next, part, "numeric");
  assert.equal(sent[1].revisionId, next);
  assert.notEqual(sent[0].idempotencyKey, sent[1].idempotencyKey);
});
test("storage failures never lose retry identity or initiate an unrecorded send", async () => {
  let fail = true,
    calls = 0;
  const storage = memory(),
    write = storage.setItem;
  storage.setItem = (k, v) => {
    if (fail) throw Error("quota");
    write(k, v);
  };
  const a = new StudentSolverSession(problem, "A", storage, async (b) => {
    calls++;
    fail = true;
    return result(b);
  });
  a.edit(revision, part, numeric);
  await a.submit(revision, part, "numeric");
  assert.equal(calls, 0);
  fail = false;
  await a.submit(revision, part, "numeric");
  assert.equal(calls, 1);
  assert.ok(a.snapshot().book.pending);
  assert.ok(a.snapshot().lastResult);
  assert.deepEqual(
    new StudentSolverSession(problem, "A", storage).snapshot().book.pending,
    a.snapshot().book.pending,
  );
});
test("invalid recovery is preserved and hostile or mismatched server replies cannot acknowledge a send", async () => {
  const storage = memory(),
    key = `physcratic:solve:v1:A:${problem}`;
  storage.values.set(key, "{broken");
  let calls = 0;
  const a = new StudentSolverSession(problem, "A", storage, async (b) => {
    calls++;
    return result(b);
  });
  await a.submit(revision, part, "numeric");
  assert.equal(calls, 0);
  assert.equal(storage.values.get(key), "{broken");
  assert.equal(a.snapshot().rawRecovery, "{broken");
  for (const hostile of [true, false]) {
    const b = new StudentSolverSession(problem, "C", memory(), async (body) => {
      const r = result(body);
      return hostile
        ? { ...r, attempt: { ...r.attempt, expected: "SECRET" } }
        : { ...r, attempt: { ...r.attempt, revisionId: randomUUID() } };
    });
    b.edit(revision, part, numeric);
    await b.submit(revision, part, "numeric");
    assert.ok(b.snapshot().book.pending);
    assert.equal(b.snapshot().lastResult, null);
  }
  const r = result({
    revisionId: revision,
    partId: part,
    answer: { kind: "numeric", value: 2, units: "" },
    idempotencyKey: randomUUID(),
  });
  assert.equal(studentAttemptSchema.safeParse(r.attempt).success, true);
});

test("read errors never invent a saved submission or retry key", () => {
  for (const status of [408, 429, 500, 503]) {
    const message = studentReadError(new StudentRequestError(status));
    assert.doesNotMatch(message, /original|retry key|confirm the save/);
    assert.match(message, /read|loading/);
  }
});

test("server-derived assisted attempts and restored receipts accept true without trusting answer fields", async () => {
  const storage = memory();
  const session = new StudentSolverSession(
    problem,
    "assisted",
    storage,
    async (body) => {
      const r = result(body);
      r.attempt.assisted = true;
      return r;
    },
  );
  session.edit(revision, part, numeric);
  await session.submit(revision, part, "numeric");
  assert.equal(session.snapshot().lastResult?.assisted, true);
  assert.equal(
    new StudentSolverSession(problem, "assisted", storage).snapshot().book
      .receipts[formKey(revision, part)].attempt.assisted,
    true,
  );
});
