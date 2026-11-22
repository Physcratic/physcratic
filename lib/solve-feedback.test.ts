import assert from "node:assert/strict";
import test from "node:test";
import { describePartResult, resultMessage, summariseCheck, summariseSavedCheck } from "./solve-feedback";
import { checkArchivePart } from "./archive-grading";
import { expression } from "./archive-grading/definitions";

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

test("the grader's own first word is dropped when the label already says it", () => {
  assert.equal(resultMessage("incorrect", "Not correct. Your answer gives a different value."), "Your answer gives a different value.");
  assert.equal(resultMessage("correct", "Correct. Your answer matches the reference answer."), "Your answer matches the reference answer.");
  assert.equal(resultMessage("correct", "Correct: the interface is flat."), "the interface is flat.");
  // Other messages, and a first word that only starts the same way, are left as they are.
  assert.equal(resultMessage("incorrect", "Not quite. Check your calculation."), "Not quite. Check your calculation.");
  assert.equal(resultMessage("correct", "Correct within this part’s numerical tolerance."), "Correct within this part’s numerical tolerance.");
  assert.equal(resultMessage("invalid", "Not correct. This is a different status."), "Not correct. This is a different status.");
});

test("what the real grader says for a different value, shown after its label, reads once", () => {
  const result = checkArchivePart(expression("f", "f", "x+1", "x", "All real x"), "x+2");
  assert.equal(result.status, "incorrect");
  const label = describePartResult(result.status).label;
  const line = `${label}. ${resultMessage(result.status, result.message)}`;
  assert.equal(line.split(label).length - 1, 1, line);
  // The grading decision and its message are unchanged by this copy fix.
  assert.match(result.message, /^Not correct\. Your answer gives a different value from the reference answer for some test values\./);
});
