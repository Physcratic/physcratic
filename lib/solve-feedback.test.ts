import assert from "node:assert/strict";
import test from "node:test";
import { describePartResult, summariseCheck, summariseSavedCheck } from "./solve-feedback";

const r = (status: Parameters<typeof describePartResult>[0]) => ({ partId: "a", status, message: "" });

test("every grader status has words and a tone", () => {
  for (const status of ["correct", "incorrect", "invalid", "inconclusive", "self-review", "unanswered"] as const) {
    assert.ok(describePartResult(status).label.length > 0);
  }
  assert.equal(describePartResult("correct").tone, "success");
  assert.equal(describePartResult("incorrect").tone, "error");
});

test("never claims a partial status the grader does not return", () => {
  const all = [[r("correct"), r("incorrect")], [r("correct"), r("unanswered")], [r("incorrect")], [r("correct")]].map(summariseCheck);
  for (const summary of all) assert.doesNotMatch(summary.headline, /partly/i);
});

test("all correct matches the rule that reveals the solution", () => {
  assert.equal(summariseCheck([r("correct"), r("correct")]).allCorrect, true);
  assert.equal(summariseCheck([r("correct"), r("unanswered")]).allCorrect, false);
  assert.equal(summariseCheck([]).allCorrect, false);
});

test("mixed and wrong results ask for another try", () => {
  const mixed = summariseCheck([r("correct"), r("incorrect")]);
  assert.equal(mixed.needsAnotherTry, true);
  assert.equal(mixed.tone, "warning");
  assert.equal(summariseCheck([r("invalid")]).tone, "error");
  assert.equal(summariseCheck([r("correct"), r("unanswered")]).needsAnotherTry, false);
});

test("saved receipts describe durability without changing correctness or guest feedback", () => {
  for (const statuses of [["correct"], ["incorrect"], ["invalid"], ["inconclusive"], ["self-review"], ["correct", "unanswered"]] as const) {
    const results = statuses.map(status => r(status));
    const guest = summariseCheck(results), saved = summariseSavedCheck(results);
    assert.match(guest.detail, /Nothing is saved\./);
    assert.match(saved.detail, /Saved to your account\./);
    assert.doesNotMatch(saved.detail, /Nothing is saved/);
    const { detail: guestDetail, ...guestDecision } = guest;
    const { detail: savedDetail, ...savedDecision } = saved;
    void guestDetail; void savedDetail; assert.deepEqual(savedDecision, guestDecision);
  }
});
