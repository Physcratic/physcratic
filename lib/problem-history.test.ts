import test from "node:test";
import assert from "node:assert/strict";
import { recordProblemResult, type ProblemHistoryEntry } from "./problem-history";

test("history starts empty and records a real incorrect attempt", () => {
  const history: ProblemHistoryEntry[] = [];
  assert.deepEqual(recordProblemResult(history, "incline", false, 1), [
    { problemId: "incline", correct: false, attemptedAt: 1 },
  ]);
  assert.deepEqual(history, []);
});

test("a correct retry replaces the unresolved entry without duplicates", () => {
  const wrong = recordProblemResult([], "incline", false, 1);
  const repeated = recordProblemResult(wrong, "incline", false, 2);
  const corrected = recordProblemResult(repeated, "incline", true, 3);
  assert.deepEqual(corrected, [{ problemId: "incline", correct: true, attemptedAt: 3 }]);
});

test("a previously solved problem never returns to the unresolved list", () => {
  const correct = recordProblemResult([], "incline", true, 1);
  assert.equal(recordProblemResult(correct, "incline", false, 2)[0].correct, true);
});

test("history preserves other problems and orders the latest attempt first", () => {
  const first = recordProblemResult([], "incline", false, 1);
  const second = recordProblemResult(first, "circuit", true, 2);
  const retried = recordProblemResult(second, "incline", true, 3);
  assert.deepEqual(retried.map((entry) => entry.problemId), ["incline", "circuit"]);
  assert.equal(retried[1].correct, true);
});
