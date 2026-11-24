import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PendingSaveRetrier, parseRetryAfter, retryPolicy, type RetryHost, type RetryStatus, type SaveOutcome } from "./pending-save-retry";
import { PracticeCheckJournal } from "./practice-check-client";

/** A host with a fake clock and fake timers, so the tests run instantly and nothing is really waited for. */
function fakeHost(options: { pending?: () => boolean; attempt: () => Promise<SaveOutcome>; retryAfter?: () => number | undefined }) {
  let clock = 0, next = 1;
  const timers = new Map<number, { at: number; run: () => void; ms: number }>();
  const delays: number[] = [];
  const statuses: RetryStatus[] = [];
  const host: RetryHost = {
    hasPending: options.pending ?? (() => true),
    attempt: options.attempt,
    setTimer: (run, ms) => { const id = next++; timers.set(id, { at: clock + ms, run, ms }); delays.push(ms); return id; },
    clearTimer: (id) => { timers.delete(id as number); },
    now: () => clock,
    onStatus: (status) => statuses.push(status),
    takeRetryAfter: options.retryAfter,
  };
  return {
    host, delays, statuses, timers,
    advance(ms: number) { clock += ms; },
    /** Moves the clock to the next timer and runs it. */
    async fireNext() {
      const [id, timer] = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0] ?? [];
      assert.ok(timer, "a timer is waiting");
      clock = Math.max(clock, timer.at);
      timers.delete(id);
      timer.run();
      await flush();
    },
  };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; };
/** A window and a document with real event dispatch. */
function fakeBrowser() {
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  return { win, doc };
}

test("a pending save is sent again when the browser comes back online", async () => {
  let attempts = 0;
  const { host } = fakeHost({ attempt: async () => { attempts++; return "failed"; } });
  const retrier = new PendingSaveRetrier(host);
  const { win, doc } = fakeBrowser();
  retrier.attach(win, doc);
  win.dispatchEvent(new Event("online"));
  await flush();
  assert.equal(attempts, 1);
  retrier.dispose();
});

test("a pending save is sent again when the tab becomes visible, and not while it is hidden", async () => {
  let attempts = 0;
  const { host, advance } = fakeHost({ attempt: async () => { attempts++; return "failed"; } });
  const retrier = new PendingSaveRetrier(host);
  const { win, doc } = fakeBrowser();
  retrier.attach(win, doc);
  doc.visibilityState = "hidden";
  doc.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(attempts, 0, "hidden tab sends nothing");
  advance(5_000);
  doc.visibilityState = "visible";
  doc.dispatchEvent(new Event("visibilitychange"));
  await flush();
  assert.equal(attempts, 1);
  retrier.dispose();
});

test("a pending save is sent again on the next Check press", async () => {
  let attempts = 0;
  const { host } = fakeHost({ attempt: async () => { attempts++; return "saved"; } });
  const retrier = new PendingSaveRetrier(host);
  assert.equal(await retrier.trigger("check"), "saved");
  assert.equal(attempts, 1);
});

test("the backoff timer waits longer each time and stops at the cap", async () => {
  let attempts = 0;
  const fake = fakeHost({ attempt: async () => { attempts++; return "failed"; } });
  const retrier = new PendingSaveRetrier(fake.host);
  retrier.arm();
  for (let i = 0; i < retryPolicy.maxTimerAttempts + 1; i++) await fake.fireNext();
  assert.equal(attempts, retryPolicy.maxTimerAttempts + 1);
  assert.deepEqual(fake.delays, [2_000, 5_000, 15_000, 30_000, 60_000, 60_000]);
  assert.equal(fake.timers.size, 0, "no timer is left, so it cannot loop forever");
  assert.equal(fake.statuses.at(-1), "stalled");
  // Waiting longer changes nothing. Only a new signal sends again.
  fake.advance(10 * 60_000);
  await flush();
  assert.equal(attempts, retryPolicy.maxTimerAttempts + 1);
  assert.equal(await retrier.trigger("online"), "failed");
  assert.equal(attempts, retryPolicy.maxTimerAttempts + 2);
  assert.equal(fake.timers.size, 1, "a new signal starts one new bounded series");
  retrier.dispose();
});

test("a save the server rejected for good is not retried on a timer", async () => {
  let attempts = 0;
  const fake = fakeHost({ attempt: async () => { attempts++; return "rejected"; } });
  const retrier = new PendingSaveRetrier(fake.host);
  retrier.arm();
  await fake.fireNext();
  assert.equal(attempts, 1);
  assert.equal(fake.timers.size, 0);
  assert.equal(fake.statuses.at(-1), "stalled");
  // The next Check press is a new signal and tries once more.
  fake.advance(retryPolicy.minGapMs);
  assert.equal(await retrier.trigger("check"), "rejected");
  assert.equal(attempts, 2);
  assert.equal(fake.timers.size, 0);
  retrier.dispose();
});

test("two quick triggers cause one save", async () => {
  let attempts = 0;
  const gate = deferred<SaveOutcome>();
  const fake = fakeHost({ attempt: () => { attempts++; return gate.promise; } });
  const retrier = new PendingSaveRetrier(fake.host);
  const results = [retrier.trigger("online"), retrier.trigger("visible"), retrier.trigger("check")];
  gate.resolve("failed");
  assert.deepEqual(await Promise.all(results), ["failed", "ignored", "ignored"]);
  assert.equal(attempts, 1);
  // Right after a fast failure, another trigger is still too close to count.
  assert.equal(await retrier.trigger("online"), "ignored");
  assert.equal(attempts, 1);
  fake.advance(retryPolicy.minGapMs);
  assert.equal(await retrier.trigger("online"), "failed");
  assert.equal(attempts, 2);
  retrier.dispose();
});

test("a trigger long after one started, while it is still out, adds nothing", async () => {
  let attempts = 0;
  const gate = deferred<SaveOutcome>();
  const fake = fakeHost({ attempt: () => { attempts++; return gate.promise; } });
  const retrier = new PendingSaveRetrier(fake.host);
  const first = retrier.trigger("online");
  fake.advance(10 * 60_000);
  assert.equal(await retrier.trigger("check"), "ignored");
  assert.equal(attempts, 1);
  gate.resolve("saved");
  assert.equal(await first, "saved");
  retrier.dispose();
});

test("a pending save is not duplicated when it succeeds late", async () => {
  let attempts = 0, pending = true;
  const gate = deferred<SaveOutcome>();
  const fake = fakeHost({ pending: () => pending, attempt: () => { attempts++; return gate.promise; } });
  const retrier = new PendingSaveRetrier(fake.host);
  retrier.arm();
  const first = retrier.trigger("online");
  // While the first save is still out, the timer, the tab and the Check button all fire.
  fake.advance(60_000);
  await Promise.all([retrier.trigger("timer"), retrier.trigger("visible"), retrier.trigger("check")]);
  assert.equal(attempts, 1);
  pending = false;
  gate.resolve("saved");
  assert.equal(await first, "saved");
  assert.equal(fake.timers.size, 0);
  assert.equal(await retrier.trigger("check"), "ignored", "nothing is pending any more, so nothing is sent");
  assert.equal(attempts, 1);
  assert.equal(fake.statuses.at(-1), "idle");
  retrier.dispose();
});

test("a failure is never thrown and never drops the pending save", async () => {
  const fake = fakeHost({ attempt: async () => { throw new Error("offline"); } });
  const retrier = new PendingSaveRetrier(fake.host);
  assert.equal(await retrier.trigger("online"), "failed");
  assert.equal(fake.timers.size, 1);
  retrier.dispose();
});

test("detaching stops the listeners, and disposing stops the timer", async () => {
  let attempts = 0;
  const fake = fakeHost({ attempt: async () => { attempts++; return "failed"; } });
  const retrier = new PendingSaveRetrier(fake.host);
  const { win, doc } = fakeBrowser();
  const detach = retrier.attach(win, doc);
  retrier.arm();
  detach();
  win.dispatchEvent(new Event("online"));
  await flush();
  assert.equal(attempts, 0);
  retrier.dispose();
  assert.equal(fake.timers.size, 0);
});

// The same journal and idempotency key the answer panel uses, against a server that saves each key once.
const version = "a".repeat(64);
const input = (latex: string) => ({ problemId: "incline", version, answers: [{ partId: "answer", latex }] });
function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
function fakeServer() {
  const saved = new Map<string, ReturnType<typeof makeReceipt>>();
  return {
    saved,
    post(request: { idempotencyKey: string; problemId: string; version: string; answers: { partId: string; latex: string }[] }) {
      const known = saved.get(request.idempotencyKey);
      if (known) return { ...known, replayed: true };
      const receipt = makeReceipt(request);
      saved.set(request.idempotencyKey, receipt);
      return receipt;
    },
  };
}
function makeReceipt(request: { problemId: string; version: string; answers: { partId: string; latex: string }[] }) {
  return { saved: true as const, replayed: false, attempt: { problemId: request.problemId, version: request.version, answers: request.answers, id: randomUUID(), kind: "practice" as const, createdAt: new Date().toISOString(), results: [{ partId: "answer", status: "correct" as const, message: "Correct." }] } };
}

test("an answer typed while a retry is in flight survives, and the same answer is saved once", async () => {
  const journal = new PracticeCheckJournal("A", "incline", version, memoryStorage());
  journal.edit({ answer: "4.9" });
  assert.ok(journal.begin(input("4.9"), randomUUID));
  const server = fakeServer();
  const gate = deferred<void>();
  let calls = 0;
  const fake = fakeHost({
    pending: () => Boolean(journal.book.pending),
    attempt: async () => {
      const request = journal.retry()!;
      calls++;
      // The first try reaches the server, but the answer is lost on the way back. The second waits for the person typing.
      const receipt = server.post(request);
      if (calls === 1) return "failed";
      await gate.promise;
      journal.accept(receipt);
      return "saved";
    },
  });
  const retrier = new PendingSaveRetrier(fake.host);
  retrier.arm();
  await fake.fireNext();
  assert.equal(calls, 1);
  assert.ok(journal.book.pending, "still pending after the lost reply");
  // The next try is in flight. The person keeps typing.
  fake.advance(60_000);
  const second = retrier.trigger("online");
  await flush();
  journal.edit({ answer: "5.1" });
  gate.resolve();
  assert.equal(await second, "saved");
  assert.equal(journal.book.pending, null);
  assert.deepEqual(journal.book.answers, { answer: "5.1" }, "the typed answer was not overwritten");
  assert.equal(server.saved.size, 1, "both tries used one idempotency key, so the server kept one save");
  retrier.dispose();
});

test("a Retry-After longer than the policy delay is the wait", async () => {
  const fake = fakeHost({ attempt: async () => "failed", retryAfter: () => 30_000 });
  const retrier = new PendingSaveRetrier(fake.host);
  retrier.arm();
  assert.deepEqual(fake.delays, [30_000], "the first policy delay is 2 seconds, the server asked for 30");
  await fake.fireNext();
  assert.deepEqual(fake.delays, [30_000, 30_000], "a later policy delay of 5 seconds is also shorter than 30");
  retrier.dispose();
});

test("a Retry-After shorter than the policy delay does not shorten it", async () => {
  const fake = fakeHost({ attempt: async () => "failed", retryAfter: () => 500 });
  const retrier = new PendingSaveRetrier(fake.host);
  retrier.arm();
  await fake.fireNext();
  await fake.fireNext();
  assert.deepEqual(fake.delays, [2_000, 5_000, 15_000]);
  retrier.dispose();
});

test("a missing or bad Retry-After changes nothing", async () => {
  for (const asked of [undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const fake = fakeHost({ attempt: async () => "failed", retryAfter: () => asked });
    const retrier = new PendingSaveRetrier(fake.host);
    retrier.arm();
    assert.deepEqual(fake.delays, [2_000], String(asked));
    retrier.dispose();
  }
  const plain = fakeHost({ attempt: async () => "failed" });
  const retrier = new PendingSaveRetrier(plain.host);
  retrier.arm();
  assert.deepEqual(plain.delays, [2_000], "a host that never reports one");
  retrier.dispose();
});

test("the Retry-After header is read as seconds and nothing else", () => {
  assert.equal(parseRetryAfter("30"), 30_000);
  assert.equal(parseRetryAfter(" 7 "), 7_000);
  assert.equal(parseRetryAfter("1.5"), 1_500);
  for (const bad of [null, undefined, "", "0", "0.0", "-5", "abc", "10s", "Wed, 21 Oct 2026 07:28:00 GMT", "1e3", "Infinity"]) assert.equal(parseRetryAfter(bad), undefined, String(bad));
});

test("a Retry-After is capped at 120 seconds", async () => {
  const fake = fakeHost({ attempt: async () => "failed", retryAfter: () => 3_600_000 });
  const retrier = new PendingSaveRetrier(fake.host);
  retrier.arm();
  assert.deepEqual(fake.delays, [retryPolicy.maxRetryAfterMs]);
  assert.equal(retryPolicy.maxRetryAfterMs, 120_000);
  retrier.dispose();
});

test("with a Retry-After every time, the attempts still stop at the cap and one is in flight at a time", async () => {
  let attempts = 0;
  const fake = fakeHost({ attempt: async () => { attempts++; return "failed"; }, retryAfter: () => 90_000 });
  const retrier = new PendingSaveRetrier(fake.host);
  retrier.arm();
  for (let i = 0; i < retryPolicy.maxTimerAttempts + 1; i++) await fake.fireNext();
  assert.equal(attempts, retryPolicy.maxTimerAttempts + 1);
  assert.equal(fake.timers.size, 0, "no timer is left");
  assert.equal(fake.statuses.at(-1), "stalled");
  retrier.dispose();
});

test("the Retry-After is asked for once per timer, so an old 429 does not stretch a later wait", async () => {
  let queued: number | undefined = 40_000;
  const fake = fakeHost({ attempt: async () => "failed", retryAfter: () => { const now = queued; queued = undefined; return now; } });
  const retrier = new PendingSaveRetrier(fake.host);
  retrier.arm();
  await fake.fireNext();
  assert.deepEqual(fake.delays, [40_000, 5_000]);
  retrier.dispose();
});

test("a save the server rejected for good is still not retried on a timer, whatever Retry-After says", async () => {
  const fake = fakeHost({ attempt: async () => "rejected", retryAfter: () => 10_000 });
  const retrier = new PendingSaveRetrier(fake.host);
  assert.equal(await retrier.trigger("check"), "rejected");
  assert.equal(fake.timers.size, 0);
  assert.equal(fake.statuses.at(-1), "stalled");
  retrier.dispose();
});
