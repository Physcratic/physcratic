import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PracticeCheckJournal, practiceRecoveryKey } from "./practice-check-client";
const version = "a".repeat(64);
const input = (latex = "4.9") => ({ problemId: "incline", version, answers: [{ partId: "answer", latex }] });
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
function receipt(request: ReturnType<typeof input>) {
  return { saved: true, replayed: false, attempt: { ...request, id: randomUUID(), kind: "practice", createdAt: new Date().toISOString(), results: [{ partId: "answer", status: "correct", message: "Correct." }] } };
}
test("draft and immutable pending retry survive reload without automatically sending", () => {
  const disk = storage(), journal = new PracticeCheckJournal("A", "incline", version, disk);
  journal.edit({ answer: "4.9" });
  const body = journal.begin(input(), randomUUID)!;
  journal.edit({ answer: "1" }); body.answers[0].latex = "forged caller mutation";
  assert.equal(journal.retry()!.answers[0].latex, "4.9");
  const loaded = new PracticeCheckJournal("A", "incline", version, disk);
  assert.deepEqual(loaded.book.answers, { answer: "1" });
  assert.deepEqual(loaded.retry(), journal.retry());
  assert.throws(() => loaded.begin(input("2"), randomUUID), /pending/);
  loaded.accept(receipt(input())); assert.equal(loaded.retry(), null);
  assert.deepEqual(loaded.book.answers, { answer: "1" });
  assert.equal(new PracticeCheckJournal("A", "incline", version, disk).retry(), null);
});
test("invalid inputs allocate no retry key or pending intent", () => {
  const disk = storage(), journal = new PracticeCheckJournal("A", "incline", version, disk);
  let allocations = 0; const uuid = () => { allocations++; return randomUUID(); };
  for (const latex of ["", "x".repeat(1025), "\u0000", "\ud800"]) assert.throws(() => journal.begin(input(latex), uuid));
  assert.throws(() => journal.begin({ ...input(), version: "b".repeat(64) }, uuid));
  assert.equal(allocations, 0); assert.equal(journal.retry(), null); assert.equal(disk.values.size, 0);
});
test("account, guest, problem and revision namespaces cannot read each other's drafts or retry bodies", () => {
  const disk = storage(), a = new PracticeCheckJournal("A", "incline", version, disk);
  a.edit({ answer: "private A" }); a.begin(input(), randomUUID);
  for (const [owner, problem, v] of [["B", "incline", version], ["guest", "incline", version], ["A", "pendulum", version], ["A", "incline", "b".repeat(64)]]) {
    const other = new PracticeCheckJournal(owner, problem, v, disk);
    assert.deepEqual(other.book.answers, {}); assert.equal(other.retry(), null);
  }
  assert.notEqual(practiceRecoveryKey("a:b", "incline", version), practiceRecoveryKey("a", "incline", version));
});
test("storage failures preserve full visible draft and prevent a saved-check request", () => {
  const disk = storage(), journal = new PracticeCheckJournal("A", "incline", version, disk);
  journal.edit({ answer: "old" }); const previous = disk.getItem(journal.key);
  disk.setItem = () => { throw Error("quota"); };
  const value = "x".repeat(210); journal.edit({ answer: value });
  assert.equal(journal.book.answers.answer, value); assert.match(journal.warning, /copy your answers/);
  assert.equal(journal.begin(input(), randomUUID), null); assert.equal(journal.retry(), null);
  assert.equal(disk.getItem(journal.key), previous);
});
test("hard recovery budget preserves the complete in-memory draft without truncation", () => {
  const disk = storage(), journal = new PracticeCheckJournal("A", "incline", version, disk);
  const value = "x".repeat(2_000_001); journal.edit({ answer: value });
  assert.equal(journal.book.answers.answer, value); assert.match(journal.warning, /Recovery is unavailable/);
  assert.equal(journal.begin(input(), randomUUID), null); assert.equal(disk.values.size, 0);
});
test("unreadable or retargeted recovery is left untouched and blocks new saved intents", () => {
  for (const raw of ["broken json", JSON.stringify({ answers: {}, pending: { ...input(), problemId: "pendulum", idempotencyKey: randomUUID() } })]) {
    const disk = storage(), key = practiceRecoveryKey("A", "incline", version); disk.setItem(key, raw);
    const journal = new PracticeCheckJournal("A", "incline", version, disk);
    journal.edit({ answer: "new typed work" }); assert.equal(journal.begin(input(), randomUUID), null);
    assert.equal(disk.getItem(key), raw); assert.equal(journal.book.answers.answer, "new typed work");
  }
});
test("mismatched and malformed receipts retain the original immutable retry", () => {
  const journal = new PracticeCheckJournal("A", "incline", version, storage()); journal.begin(input(), randomUUID);
  const original = journal.retry();
  for (const value of [{}, receipt(input("1")), receipt({ ...input(), version: "b".repeat(64) })]) assert.throws(() => journal.accept(value));
  assert.deepEqual(journal.retry(), original);
});
test("local cleanup failure after a saved receipt keeps the same safe retry key", () => {
  const disk = storage(), journal = new PracticeCheckJournal("A", "incline", version, disk); journal.begin(input(), randomUUID);
  const original = journal.retry(); disk.setItem = () => { throw Error("quota"); };
  assert.equal(journal.accept(receipt(input())).saved, true); assert.deepEqual(journal.retry(), original);
  assert.deepEqual(new PracticeCheckJournal("A", "incline", version, disk).retry(), original);
});
test("clearing or changing drafts never discards an unconfirmed pending save", () => {
  const disk = storage(), journal = new PracticeCheckJournal("A", "incline", version, disk); journal.begin(input(), randomUUID);
  const original = journal.retry(); journal.edit({}); assert.deepEqual(journal.retry(), original);
  assert.deepEqual(new PracticeCheckJournal("A", "incline", version, disk).retry(), original);
});

test("multibyte body overflow is rejected before allocating a retry key", () => {
  const journal = new PracticeCheckJournal("A", "incline", version, storage()); let allocated = 0;
  const large = { ...input(), answers: Array.from({ length: 64 }, (_, i) => ({ partId: `p${i}`, latex: "θ".repeat(1024) })) };
  assert.throws(() => journal.begin(large, () => { allocated++; return randomUUID(); }), /too large/);
  assert.equal(allocated, 0); assert.equal(journal.retry(), null);
});
