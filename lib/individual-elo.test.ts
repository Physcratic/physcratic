import assert from "node:assert/strict";
import test from "node:test";
import { calculateIndividualElo, completeProblemScore, problemAnswerChecksSchema } from "./individual-elo";

test("standard Elo supports wins, losses and fractional credit", () => {
  assert.equal(calculateIndividualElo(1200, 1200, 1).rating, 1216);
  assert.equal(calculateIndividualElo(1200, 1200, 0).rating, 1184);
  assert.equal(calculateIndividualElo(1200, 1200, 0.5).change, 0);
  assert.ok(calculateIndividualElo(1200, 2000, 1).change > 16);
  assert.ok(calculateIndividualElo(1200, 400, 1).change < 16);
});
test("rating bounds are enforced and invalid scores rejected", () => {
  assert.equal(calculateIndividualElo(0, 0, 0).rating, 0);
  assert.equal(calculateIndividualElo(4000, 4000, 1).rating, 4000);
  for (const score of [-1, 1.1, NaN, Infinity]) assert.throws(() => calculateIndividualElo(1200, 1200, score));
  assert.throws(() => calculateIndividualElo(1200, -1, 1));
});
test("a partial set of subparts cannot generate a whole-problem rating", () => {
  const checks = problemAnswerChecksSchema.parse([{ partId: "A", expected: "g", variables: ["g"], maxPoints: 2 }, { partId: "B", expected: "m*g", variables: ["m", "g"], maxPoints: 6 }]);
  assert.equal(completeProblemScore(checks, [{ partId: "A", maxPoints: 2, awardedPoints: 2 }]), null);
  assert.equal(completeProblemScore(checks, [{ partId: "A", maxPoints: 2, awardedPoints: 2 }, { partId: "B", maxPoints: 6, awardedPoints: 0 }]), 0.25);
  assert.throws(() => completeProblemScore(checks, [{ partId: "A", maxPoints: 2, awardedPoints: 3 }, { partId: "B", maxPoints: 6, awardedPoints: 0 }]));
  assert.equal(problemAnswerChecksSchema.safeParse([checks[0], checks[0]]).success, false);
});
