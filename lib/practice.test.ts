import assert from "node:assert/strict";
import test from "node:test";
import { practiceSubmissionSchema, checkPracticeAnswer } from "./practice";
import { contestStatus, ratingTitle } from "./dashboard-data";

const attempt = {
  problemId: "incline",
  answer: 4.9,
  working: "Resolve gravity parallel to the slope.",
  idempotencyKey: "72f071c1-2afd-4a53-9a44-95de4e234c80",
};
test("practice submissions validate finite answers, bounded notes and retry keys", () => {
  assert.equal(practiceSubmissionSchema.safeParse(attempt).success, true);
  for (const input of [
    { ...attempt, answer: Infinity },
    { ...attempt, answer: NaN },
    { ...attempt, answer: "4.9" },
    { ...attempt, working: "a".repeat(12001) },
    { ...attempt, idempotencyKey: "invalid" },
  ])
    assert.equal(practiceSubmissionSchema.safeParse(input).success, false);
});
test("practice checks compute correctness instead of trusting a client flag", () => {
  assert.equal(checkPracticeAnswer("incline", 4.9), true);
  assert.equal(checkPracticeAnswer("incline", 4.91), true);
  assert.equal(checkPracticeAnswer("incline", 9.8), false);
  assert.equal(checkPracticeAnswer("incline", Infinity), false);
  assert.throws(() => checkPracticeAnswer("missing", 4.9));
});
test("contest state changes at exact published start and end times", () => {
  const contest = { startsAt: "2026-11-07T16:00:00Z", durationMinutes: 90 };
  const start = Date.parse(contest.startsAt);
  assert.equal(contestStatus(contest, start - 1), "upcoming");
  assert.equal(contestStatus(contest, start), "live");
  assert.equal(contestStatus(contest, start + 90 * 60_000 - 1), "live");
  assert.equal(contestStatus(contest, start + 90 * 60_000), "past");
});
test("rating titles use actual rating thresholds", () => {
  assert.equal(ratingTitle(1199), "Explorer");
  assert.equal(ratingTitle(1200), "Specialist");
  assert.equal(ratingTitle(1600), "Expert");
  assert.equal(ratingTitle(2000), "Master");
});
