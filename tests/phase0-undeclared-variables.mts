// Phase 0 baseline: an expression key published with no declared variables can never mark a student correct.
// Run: pnpm exec tsx --conditions=react-server --test tests/phase0-undeclared-variables.mts
import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExpressionAnswer } from "../lib/authored-symbolic-grading";

const answer = { kind: "expression" as const, expression: "m*a" };
const base = { kind: "expression" as const, expected: "m*a", angleUnit: "radians" as const, exclusions: [] };
test("no variables declared: the student's own correct answer needs review", () => {
  const result = evaluateExpressionAnswer(answer, { ...base, variables: [] });
  console.log("no variables  ->", JSON.stringify(result));
  assert.notEqual(result.status, "correct");
});
test("m and a declared with no bounds: the same answer is correct", () => {
  const variables = ["m", "a"].map((name) => ({ name, domain: "real" as const, assumptions: [] }));
  const result = evaluateExpressionAnswer(answer, { ...base, variables });
  console.log("m, a declared ->", JSON.stringify(result));
  assert.equal(result.status, "correct");
});
