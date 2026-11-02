import assert from "node:assert/strict";
import test from "node:test";
import { matchesPlainMath, normalizePlainMath, parsePlainMath, runPlainMath } from "./plain-math";

test("accepts the requested plain-text equation including Unicode fractions", () => {
  const result = runPlainMath("a = g*sin(theta) * 2^(½)", "g = 9.81\ntheta = pi/6");
  assert.ok(Math.abs(result.result! - 9.81 * 0.5 * Math.SQRT2) < 1e-10);
  assert.equal(result.symbol, "a");
  assert.deepEqual(result.missing, []);
});
test("supports Greek letters, roots, implicit multiplication and superscripts", () => {
  assert.equal(normalizePlainMath("a = g×sin(θ) * 2^(½)").expression, "g*sin(theta) * 2^((1/2))");
  assert.equal(runPlainMath("x² + √(9)", "x = 2").result, 7);
  assert.equal(runPlainMath("2g", "g = 3").result, 6);
  assert.equal(runPlainMath("ln(exp(2))").result, 2);
});
test("notation checks report missing values without inventing them", () => {
  const result = runPlainMath("a = g*sin(theta)");
  assert.equal(result.result, null);
  assert.deepEqual(result.missing, ["g", "theta"]);
});
test("matches configured equivalent expressions without running arbitrary code", () => {
  assert.equal(matchesPlainMath("a = g*sin(theta)*sqrt(2)", "a = sqrt(2)*sin(theta)*g", ["g", "theta"]), true);
  assert.equal(matchesPlainMath("b = g", "a = g", ["g"]), false);
  assert.equal(matchesPlainMath("a = -g", "a = g", ["g"]), false);
});
test("rejects commands, property access, recursion, unknown functions and resource bombs", () => {
  for (const input of ["import(1)", "evaluate(1)", "a=1; b=2", "a.b", "x[1]", "[1,2]", "f(x)=x", "constructor(1)", "random()", "9^99999", "9^(9^9)", "a = b = c", "sin", "x^x", "sin(".repeat(30) + "1" + ")".repeat(30)]) assert.throws(() => parsePlainMath(input), Error, input);
});
test("validates finite real values, domains and binding names", () => {
  for (const [input, values] of [["1/0", ""], ["sqrt(-1)", ""], ["g", "x = 1"], ["g", "g=2\ng=3"], ["g", "g=sin(x)"], ["g", "g=1/0"]]) assert.throws(() => runPlainMath(input, values));
  assert.throws(() => parsePlainMath("x+y", ["x"]), /Unknown variable y/);
});
