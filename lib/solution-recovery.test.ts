import assert from "node:assert/strict";
import test from "node:test";
import { SolutionRecovery, solutionRecoveryKey } from "./solution-recovery";
import type { SolutionSubmission } from "./solution-grading";

const version = "a".repeat(64), problem = "ipho-2025-t1";
const key = "00000000-0000-4000-8000-000000000001";
const receipt = { id: "00000000-0000-4000-8000-000000000002", check: null, ratingEvent: null };
const draft = { partId: "A.1", working: "Work: α = 2", finalAnswer: "2", transcription: "written page" };
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
}
const input = (overrides: Partial<Omit<SolutionSubmission, "idempotencyKey">> = {}) => ({ problemId: problem, problemVersion: version, partId: draft.partId, working: draft.working, finalAnswer: draft.finalAnswer, evidence: [], ...overrides });

test("reload restores bounded Unicode text only for the same account, problem and version", () => {
  const store = storage(), first = new SolutionRecovery("A", problem, version, store);
  first.edit(draft);
  assert.deepEqual(new SolutionRecovery("A", problem, version, store).book.draft, draft);
  for (const [a, p, v] of [["B", problem, version], ["A", "ipho-2024-t1", version], ["A", problem, "b".repeat(64)]]) {
    assert.equal(new SolutionRecovery(a, p, v, store).book.draft.working, "");
  }
  assert.notEqual(solutionRecoveryKey("a:b", "c", version), solutionRecoveryKey("a", "b:c", version));
});
test("lost acknowledgement retries the identical normalized snapshot and key after reload", () => {
  const store = storage(), first = new SolutionRecovery("A", problem, version, store);
  first.edit(draft);
  const request = first.begin(input({ working: "  original  " }), () => key);
  const reloaded = new SolutionRecovery("A", problem, version, store);
  assert.deepEqual(reloaded.retry(), request);
  assert.equal(request.working, "original");
  assert.throws(() => reloaded.edit({ ...draft, working: "changed" }), /Retry/);
  assert.throws(() => reloaded.begin(input()), /Finish/);
  const exposed = reloaded.retry()!; exposed.working = "tampered";
  assert.equal(reloaded.retry()?.working, "original");
  reloaded.accept(receipt);
  assert.equal(new SolutionRecovery("A", problem, version, store).book.receipt?.id, receipt.id);
  assert.equal(new SolutionRecovery("A", problem, version, store).retry(), null);
});
test("pending attachment retry keeps only validated metadata, never file names or storage URLs", () => {
  const store = storage(), journal = new SolutionRecovery("A", problem, version, store);
  journal.edit(draft);
  const evidence = { id: receipt.id, mediaType: "image/png" as const, bytes: 12, sha256: "b".repeat(64) };
  const request = journal.begin(input({ evidence: [evidence], transcription: { text: draft.transcription, confirmed: true } }), () => key);
  assert.deepEqual(new SolutionRecovery("A", problem, version, store).retry(), request);
  assert.deepEqual(Object.keys(request.evidence[0]).sort(), ["bytes", "id", "mediaType", "sha256"]);
});
test("storage failure never starts a request or destroys in-memory working", () => {
  const store = storage(), journal = new SolutionRecovery("A", problem, version, store);
  store.setItem = () => { throw Error("quota"); };
  journal.edit(draft);
  assert.match(journal.warning, /unavailable/);
  assert.throws(() => journal.begin(input(), () => key), /preserve/);
  assert.equal(journal.retry(), null);
  assert.match(journal.exportText(), /α = 2/);
  assert.equal(new SolutionRecovery("A", problem, version).book.draft.working, "");
});
test("a failed receipt write preserves pending intent for another exact retry", () => {
  const store = storage(), journal = new SolutionRecovery("A", problem, version, store);
  journal.edit(draft); const request = journal.begin(input(), () => key);
  const set = store.setItem;
  store.setItem = () => { throw Error("full"); };
  assert.throws(() => journal.accept(receipt), /Retry the original/);
  assert.deepEqual(journal.retry(), request);
  assert.equal(journal.book.receipt, null);
  assert.equal(journal.startAnother(), false);
  store.setItem = set;
  journal.accept(receipt);
  assert.equal(journal.startAnother(), true);
  assert.equal(new SolutionRecovery("A", problem, version, store).book.draft.working, "");
});
test("corrupt, oversized and wrong-version recovery are left untouched", () => {
  for (const raw of ["broken", "x".repeat(200001), JSON.stringify({ draft, pending: { ...input({ problemVersion: "b".repeat(64) }), idempotencyKey: key }, receipt: null })]) {
    const store = storage(), k = solutionRecoveryKey("A", problem, version); store.setItem(k, raw);
    const journal = new SolutionRecovery("A", problem, version, store);
    assert.match(journal.warning, /unavailable/);
    journal.edit(draft);
    assert.equal(store.getItem(k), raw);
    assert.throws(() => journal.begin(input(), () => key), /preserve/);
  }
});
test("invalid receipt, ambiguous failures and definitive rejections preserve the right retry boundary", () => {
  const store = storage(), journal = new SolutionRecovery("A", problem, version, store);
  journal.edit(draft); journal.begin(input(), () => key);
  assert.throws(() => journal.accept({ id: "invalid" }));
  for (const status of [408, 409, 429, 500, 503]) assert.equal(journal.reject(status), false);
  assert.equal(journal.retry()?.idempotencyKey, key);
  assert.equal(journal.reject(400), true);
  assert.equal(journal.retry(), null);
  assert.deepEqual(journal.book.draft, draft);
  assert.equal(journal.begin(input(), () => receipt.id).idempotencyKey, receipt.id);
});
test("wrong-version and over-byte-limit requests never become pending", () => {
  const journal = new SolutionRecovery("A", problem, version, storage());
  assert.throws(() => journal.begin(input({ problemVersion: "b".repeat(64) }), () => key), /version changed/);
  assert.throws(() => journal.begin(input({ working: "\u0000".repeat(12000), evidence: [{ id: receipt.id, mediaType: "image/png", bytes: 1, sha256: version }], transcription: { text: "\u0000".repeat(12000), confirmed: true } }), () => key), /too large/);
  assert.equal(journal.retry(), null);
});
