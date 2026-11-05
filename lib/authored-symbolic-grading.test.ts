import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { evaluateExpressionAnswer } from "./authored-symbolic-grading";
import { sampledLimits } from "./sampled-check";
import type { AuthoredKey } from "./problem-authoring";
// Phase 1: authored expression answers are checked with seeded test values (lib/sampled-check.ts) and keep the stored
// label symbolic-v1. Assertions that depended on the old exact "proven subset" prover were rewritten. Every rewrite
// says why. An expectation was only moved from incorrect to correct where the two expressions are really equal.
//
// Semantic assertions must not depend on worker descheduling, so the clock is frozen except in the clock tests.
beforeEach((t) => {
  if (t.name.startsWith("wall-clock") || t.name.startsWith("parser, expansion")) return;
  if (!("mock" in t)) throw new Error("Expected per-test clock isolation");
  const now = performance.now();
  t.mock.method(performance, "now", () => now);
});

type Key = Extract<AuthoredKey, { kind: "expression" }>;
const variable = (name = "x", extra: Partial<Key["variables"][number]> = {}) => ({
  name,
  domain: "real" as const,
  assumptions: [] as Key["variables"][number]["assumptions"],
  ...extra,
});
function key(expected: string, options: Partial<Key> = {}): Key {
  return { kind: "expression", expected, variables: [variable()], angleUnit: "radians", exclusions: [], ...options };
}
const grade = (student: string, expected: string, options: Partial<Key> = {}) =>
  evaluateExpressionAnswer({ kind: "expression", expression: student }, key(expected, options));
const correct = (a: string, c: string, options: Partial<Key> = {}) => assert.equal(grade(a, c, options).status, "correct", `${a} = ${c}`);
const incorrect = (a: string, c: string, options: Partial<Key> = {}) => assert.equal(grade(a, c, options).status, "incorrect", `${a} != ${c}`);
const review = (a: string, c: string, options: Partial<Key> = {}) => assert.equal(grade(a, c, options).status, "needs-review", `${a} vs ${c} must not be guessed`);

test("constants, polynomials and precedence", () => {
  for (const [a, c] of [
    ["x*x", "x^2"], ["(x+1)^2", "x^2+2*x+1"], ["1/3+1/6", "1/2"], ["0.1+0.2", "0.3"], ["1.5e-2", "3/200"], ["2^2^3", "256"],
    ["-2^2", "-4"], ["2^-2", "1/4"], ["x+(-x)", "0"], [".5*x", "x/2"],
  ]) correct(a, c);
  correct("(x+y)*(x-y)", "x^2-y^2", { variables: [variable(), variable("y")] });
  for (const [a, c] of [["-x^2", "(-x)^2"], ["x*x", "x^2+1"], ["2^2^3", "64"]]) incorrect(a, c);
  // Changed input: "1/3" against 0.3333333333333333 was incorrect under exact rational arithmetic. The test values cannot
  // tell numbers that differ by 3e-17, so the pair is replaced by one that is outside the 1e-6 tolerance.
  incorrect("1/3", "0.33333");
  correct("1/3", "0.3333333333");
  // Changed: 9007199254740993 against 9007199254740992 was incorrect (exact integers). A number that does not survive
  // binary64 is now refused instead of rounded, so the pair is needs-review and never correct.
  review("9007199254740993", "9007199254740992");
});

test("removable holes: equal wherever both are defined", () => {
  // Changed from needs-review: (x^2-1)/(x-1) and x+1 are equal at every point where the first is defined.
  correct("(x^2-1)/(x-1)", "x+1");
  correct("(x^2-1)/(x-1)", "x+1", { exclusions: ["x != 1"] });
  correct("x+1", "(x^2-1)/(x-1)", { variables: [variable("x", { min: 2 })] });
  // The domain holds only x = 1. The key x+1 is fine there and the answer is undefined, which is a mismatch (it was needs-review).
  incorrect("(x^2-1)/(x-1)", "x+1", { variables: [variable("x", { min: 1, max: 1 })] });
  // With the key undefined on the whole domain there is nothing to test.
  review("x+1", "(x^2-1)/(x-1)", { variables: [variable("x", { min: 1, max: 1 })] });
  correct("1/(x^2+1)", "2/(2*x^2+2)");
  // Changed from needs-review: x^-2 and 1/(x*x) are equal wherever x is not 0.
  correct("x^-2", "1/(x*x)");
  correct("x^-2", "1/(x*x)", { variables: [variable("x", { assumptions: ["nonzero"] })] });
  // Changed from needs-review: these really equal 0 or 1 wherever they are defined.
  for (const expression of ["0*(1/x)", "x/x-1", "(x/x)-(x/x)"]) correct(expression, "0");
  for (const expression of ["(1/x)^0", "x^0", "(1/(x-1))^0"]) correct(expression, "1");
  // Changed from needs-review: 0^0 is undefined, and an answer undefined where the key is fine is incorrect.
  incorrect("0^0", "1");
  incorrect("0/(x-x)", "0");
  correct("0*(1/x)", "0", { exclusions: ["x != 0"] });
  correct("x^0", "1", { variables: [variable("x", { assumptions: ["positive"] })] });
  // A key that is never defined cannot be decided.
  review("1/0", "1/0");
  review("1/(x-x)", "1/(x-x)");
  incorrect("1/x", "x");
});

test("signs: |x| and sqrt(x^2) are not x when x can be negative", () => {
  incorrect("sqrt(x^2)", "x");
  incorrect("abs(x)", "x");
  incorrect("x", "abs(x)");
  correct("sqrt(x^2)", "x", { variables: [variable("x", { min: 0 })] });
  correct("sqrt(x^2)", "x", { variables: [variable("x", { assumptions: ["nonnegative"] })] });
  correct("sqrt(x^2)", "x", { variables: [variable("x", { assumptions: ["positive"] })] });
  correct("abs(x)", "x", { variables: [variable("x", { min: 0.5, max: 3 })] });
  incorrect("abs(x)", "x", { variables: [variable("x", { max: -0.5 })] });
  correct("sqrt(x^2)", "-x", { variables: [variable("x", { max: 0 })] });
  correct("abs(x)", "sqrt(x^2)");
  correct("abs(x)", "sqrt(x*x)");
  correct("x^(1/2)", "sqrt(x)", { variables: [variable("x", { min: 4, max: 4 })] });
  correct("sqrt(4/9)", "2/3");
  correct("abs(-1/2)", "1/2");
  correct("1/(abs(x)+1)", "2/(2*sqrt(x^2)+2)");
  incorrect("abs(x)/x", "1", { variables: [variable("x", { assumptions: ["nonzero"] })] });
  correct("abs(x)/x", "1", { variables: [variable("x", { assumptions: ["positive"] })] });
  review("sqrt(-1)", "sqrt(-1)");
  // Changed from needs-review: these are equal.
  correct("sqrt(2)", "2^(1/2)");
  correct("sqrt(x)", "sqrt(x)");
});

test("trig, log and exp are checked like everything else", () => {
  // Changed from needs-review: sin^2 + cos^2 is 1, in radians and in degrees.
  correct("sin(x)^2+cos(x)^2", "1");
  correct("sin(x)^2+cos(x)^2", "1", { angleUnit: "degrees" });
  correct("log(x^2)", "2*log(x)");
  correct("log(x^2)", "2*log(x)", { variables: [variable("x", { assumptions: ["positive"] })] });
  // The key 2*log(x) is undefined for every x in [-2, -1].
  review("log(x^2)", "2*log(x)", { variables: [variable("x", { min: -2, max: -1 })] });
  // Changed from needs-review: each of these equals 0 wherever it is defined.
  for (const e of ["sin(x)-sin(x)", "0*tan(x)", "pi-pi"]) correct(e, "0");
  // Undefined for negative x while the key (0) is fine there, so incorrect.
  incorrect("0*log(x)", "0");
  incorrect("sqrt(sin(x)^2)", "0");
  incorrect("e^x", "0");
  incorrect("exp(x)", "0");
  review("f(x)", "0");
  correct("sin(0)+tan(0)+log(1)", "0");
  correct("cos(0)", "1");
  correct("sin(0)", "0", { angleUnit: "degrees" });
  correct("sin(x)", "sin(x+2*pi)");
  incorrect("sin(x)", "sin(x+2)");
  correct("sin(x)", "cos(90-x)", { angleUnit: "degrees" });
  incorrect("sin(x)", "cos(90-x)");
});

test("bounds, assumptions and exclusions", () => {
  correct("x", "2", { variables: [variable("x", { min: 2, max: 2 })] });
  incorrect("x", "3", { variables: [variable("x", { min: 2, max: 2 })] });
  // Nothing can be tested when exclusions remove the whole domain or the declaration contradicts itself.
  review("x*x", "x^2", { variables: [variable("x", { min: 1, max: 1 })], exclusions: ["x != 1"] });
  review("x*x", "x^2", { variables: [variable(), variable("unused", { min: 1, max: 1 })], exclusions: ["unused != 1"] });
  review("x*x", "x^2", { variables: [variable("x", { max: 0, assumptions: ["positive"] })] });
  // Conditions the checker cannot read are not guessed. "x != sqrt(2)" can be read now, so it moved to the next list.
  for (const exclusion of ["x > 0", "x != y", "y != 0", "x != Infinity", "x != 1; evil()"]) review("x*x", "x^2", { exclusions: [exclusion] });
  correct("x*x", "x^2", { exclusions: ["x != sqrt(2)"] });
  correct("(x-0.5)/(x-0.5)", "1", { exclusions: ["x != 1/2"] });
  // Changed from correct: a variable fixed at the binary64 value of 0.1 with the exclusion "x != 0.1" leaves no value, because
  // numbers here are binary64 and 0.1 is the same number as the bound. The old exact decimal did not collide with it.
  review("x*x", "x^2", { variables: [variable("x", { min: 0.1, max: 0.1 })], exclusions: ["x != 0.1"] });
  review("x*x", "x^2", { variables: [variable("x", { min: 0.1, max: 0.1 })], exclusions: ["x != 3602879701896397/36028797018963968"] });
  // Removed: grade("x", "0.1") with x fixed at the binary64 0.1 was incorrect because the bound is not the exact decimal 0.1.
  // They differ by 5e-17 relative, far inside the 1e-6 tolerance, so the new method cannot and should not tell them apart.
  correct("abs*abs", "abs^2", { variables: [variable("abs")] });
  // Changed from needs-review: a symbol that only the key uses is added to the declared ones.
  correct("y*y", "y^2");
  correct("x*x", "x^2", { variables: Array.from({ length: 9 }, (_, i) => variable(`x${i}`)) });
});

test("an ambiguous division needs review and is not guessed", () => {
  const options = { variables: ["a", "b", "c"].map((n) => variable(n)) };
  review("a/bc", "a/(b*c)", options);
  correct("a/(bc)", "a/(b*c)", options);
  correct("(a/b)c", "a*c/b", options);
  correct("1/2 a b", "a*b/2", options);
});

test("a key that declares no symbols uses the symbols in its own expression", () => {
  const result = (a: string, c: string) => evaluateExpressionAnswer({ kind: "expression", expression: a }, key(c, { variables: [] }));
  assert.equal(result("a*m", "m*a").status, "correct");
  assert.equal(result("m+a", "m*a").status, "incorrect");
  assert.equal(result("rho*S*h*g+m*g", "(m+rho*S*h)*g").status, "correct");
  assert.equal(result("m*b", "m*a").status, "needs-review");
});

test("parser, expansion, coefficients and work limits reject expression attacks without executing code", () => {
  const unsafe = [
    "(".repeat(20) + "x" + ")".repeat(20), "x^99999999999999999999999999999999", "1e99999999999999999999", "x=" + "1", "x;process.exit()",
    "constructor(x)", "x.constructor", "[1,2]", "x!", "x%2", "1<<2", "sqrt(1,2)", "import(x)", "__proto__", "globalThis.x=1", "1".repeat(181),
  ];
  const start = performance.now();
  for (const expression of unsafe) review(expression, "x");
  // Changed from needs-review: these are valid expressions that are not equal to x. They no longer need review, they are incorrect.
  for (const expression of ["2 x", "sin(3 x)", "x**2", "2^(2^8)", "(x^8)^8", "x+".repeat(70) + "x"]) incorrect(expression, "x");
  assert.ok(performance.now() - start < 2000);
  // Large but valid input finishes quickly and is judged on its value.
  const options = { variables: ["a", "b", "c", "d", "z"].map((n) => variable(n)) };
  assert.equal(grade("(a+b+c+d+z)^8", "0", options).status, "incorrect");
  assert.equal(grade("(1e24^8)^8", "0").status, "incorrect");
  const result = evaluateExpressionAnswer({ kind: "expression", expression: "x" }, { ...key("x"), expected: "PRIVATE_SENTINEL" });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|SENTINEL/);
});

test("a polynomial that is zero at many integers is not zero", () => {
  // Changed from needs-review: the old witnesses were small integers that are all roots. Random real values are not.
  incorrect("x*(x^2-1)*(x^2-4)*(x^2-9)*(x^2-16)*(x^2-25)*(x^2-36)", "0");
});

let seed = 0x5b9f32d1;
function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return seed >>> 0;
}
test("seeded polynomial and rational identity properties", () => {
  for (let i = 0; i < 220; i++) {
    const a = (random() % 11) - 5, b = (random() % 11) - 5, c = (random() % 11) - 5, d = (random() % 11) - 5;
    const left = `(${a}*x+${b})*(${c}*x+${d})`, expanded = `${a * c}*x^2+${a * d + b * c}*x+${b * d}`;
    correct(left, expanded);
    incorrect(left, `(${expanded})+1`);
    correct(`(${a}*x+${b})/(x^2+1)`, `(${2 * a}*x+${2 * b})/(2*x^2+2)`);
  }
});

test("the same answer gets the same result for the same seed and may differ in sampling for another", () => {
  const answer = { kind: "expression" as const, expression: "x*(1+1e-8)" };
  for (const seedText of ["p1:a", "p1:b", "p2:a"]) assert.deepEqual(evaluateExpressionAnswer(answer, key("x"), seedText), { status: "correct", reason: "symbolic-equivalent" });
  const wrong = { kind: "expression" as const, expression: "x*(1+1e-5)" };
  for (const seedText of ["p1:a", "p1:b", "p2:a"]) assert.deepEqual(evaluateExpressionAnswer(wrong, key("x"), seedText), { status: "incorrect", reason: "symbolic-counterexample" });
});

test("wall-clock budget expiry makes a valid identity needs-review after a scheduling pause", (t) => {
  const now = 1000;
  const clock = t.mock.method(performance, "now", () => now);
  assert.deepEqual(grade("(-2*x+0)*(2*x+-1)", "-4*x^2+2*x+0"), { status: "correct", reason: "symbolic-equivalent" });
  // The check records the start time, then the next reading shows a long pause.
  let calls = 0;
  clock.mock.mockImplementation(() => (++calls === 1 ? now : now + sampledLimits.milliseconds + 1));
  assert.deepEqual(grade("(-2*x+0)*(2*x+-1)", "-4*x^2+2*x+0"), { status: "needs-review", reason: "symbolic-resource-limit" });
});

test("wall-clock expiry is per evaluation and does not contaminate later identities", (t) => {
  let calls = 0;
  const clock = t.mock.method(performance, "now", () => (++calls === 1 ? 0 : sampledLimits.milliseconds + 1));
  assert.deepEqual(grade("x+x", "2*x"), { status: "needs-review", reason: "symbolic-resource-limit" });
  clock.mock.mockImplementation(() => 2000);
  correct("x+x", "2*x");
});
