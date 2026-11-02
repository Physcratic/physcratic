import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { evaluateExpressionAnswer } from "./authored-symbolic-grading";
import { symbolicLimits } from "./authored-expression-language";
import type { AuthoredKey } from "./problem-authoring";
// Semantic assertions must not depend on worker descheduling. Keep all algebraic
// assertions and operation/shape/bit limits. The attack test retains its real
// elapsed-time assertion; the two clock-policy tests exercise deadline expiry.
beforeEach((t) => {
  if (t.name.startsWith("wall-clock") || t.name.startsWith("parser, expansion")) return;
  if (!("mock" in t)) throw new Error("Expected per-test clock isolation");
  const now = performance.now();
  t.mock.method(performance, "now", () => now);
});

type Key = Extract<AuthoredKey, { kind: "expression" }>;
const variable = (
  name = "x",
  extra: Partial<Key["variables"][number]> = {},
) => ({
  name,
  domain: "real" as const,
  assumptions: [] as Key["variables"][number]["assumptions"],
  ...extra,
});
function key(expected: string, options: Partial<Key> = {}): Key {
  return {
    kind: "expression",
    expected,
    variables: [variable()],
    angleUnit: "radians",
    exclusions: [],
    ...options,
  };
}
const grade = (student: string, expected: string, options: Partial<Key> = {}) =>
  evaluateExpressionAnswer(
    { kind: "expression", expression: student },
    key(expected, options),
  );
const correct = (a: string, c: string, options: Partial<Key> = {}) =>
  assert.equal(grade(a, c, options).status, "correct", `${a} = ${c}`);
const review = (a: string, c: string, options: Partial<Key> = {}) =>
  assert.equal(
    grade(a, c, options).status,
    "needs-review",
    `${a} vs ${c} must not be guessed`,
  );

test("exact rational constants, polynomials and real AST precedence", () => {
  for (const [a, c] of [
    ["x*x", "x^2"],
    ["(x+1)^2", "x^2+2*x+1"],
    ["1/3+1/6", "1/2"],
    ["0.1+0.2", "0.3"],
    ["1.5e-2", "3/200"],
    ["2^2^3", "256"],
    ["-2^2", "-4"],
    ["2^-2", "1/4"],
    ["x+(-x)", "0"],
    [".5*x", "x/2"],
  ])
    correct(a, c);
  correct("(x+y)*(x-y)", "x^2-y^2", { variables: [variable(), variable("y")] });
  for (const [a, c] of [
    ["9007199254740993", "9007199254740992"],
    ["-x^2", "(-x)^2"],
    ["1/3", "0.3333333333333333"],
    ["x*x", "x^2+1"],
    ["2^2^3", "64"],
  ])
    assert.equal(grade(a, c).status, "incorrect");
});
test("rational identities require totality on the declared domain, preserving removable singularities", () => {
  review("(x^2-1)/(x-1)", "x+1");
  correct("(x^2-1)/(x-1)", "x+1", { exclusions: ["x != 1"] });
  correct("x+1", "(x^2-1)/(x-1)", { variables: [variable("x", { min: 2 })] });
  review("(x^2-1)/(x-1)", "x+1", {
    variables: [variable("x", { min: 1, max: 1 })],
  });
  correct("1/(x^2+1)", "2/(2*x^2+2)");
  review("x^-2", "1/(x*x)");
  correct("x^-2", "1/(x*x)", {
    variables: [variable("x", { assumptions: ["nonzero"] })],
  });
  for (const expression of ["0*(1/x)", "x/x-1", "(x/x)-(x/x)"])
    review(expression, "0");
  for (const expression of ["(1/x)^0", "x^0", "(1/(x-1))^0", "0^0"])
    review(expression, "1");
  correct("0*(1/x)", "0", { exclusions: ["x != 0"] });
  correct("x^0", "1", {
    variables: [variable("x", { assumptions: ["positive"] })],
  });
  review("1/0", "1/0");
  review("1/(x-x)", "1/(x-x)");
  review("0/(x-x)", "0");
  assert.equal(
    grade("1/x", "x").status,
    "incorrect",
    "exact both-defined x=2 counterexample",
  );
});
test("principal radicals and absolute values respect real signs rather than cancelling blindly", () => {
  assert.equal(
    grade("sqrt(x^2)", "x").status,
    "incorrect",
    "exact negative witness",
  );
  correct("sqrt(x^2)", "x", { variables: [variable("x", { min: 0 })] });
  correct("sqrt(x^2)", "x", {
    variables: [variable("x", { assumptions: ["nonnegative"] })],
  });
  correct("sqrt(x^2)", "x", {
    variables: [variable("x", { assumptions: ["positive"] })],
  });
  correct("sqrt(x^2)", "-x", { variables: [variable("x", { max: 0 })] });
  correct("abs(x)", "sqrt(x^2)");
  correct("abs(x)", "sqrt(x*x)");
  correct("x^(1/2)", "sqrt(x)", {
    variables: [variable("x", { min: 4, max: 4 })],
  });
  correct("sqrt(4/9)", "2/3");
  correct("abs(-1/2)", "1/2");
  correct("1/(abs(x)+1)", "2/(2*sqrt(x^2)+2)");
  assert.equal(
    grade("abs(x)/x", "1", {
      variables: [variable("x", { assumptions: ["nonzero"] })],
    }).status,
    "incorrect",
  );
  correct("abs(x)/x", "1", {
    variables: [variable("x", { assumptions: ["positive"] })],
  });
  review("sqrt(-1)", "sqrt(-1)");
  review("sqrt(2)", "2^(1/2)");
  review("sqrt(x)", "sqrt(x)");
});
test("trig/log identities outside the proven subset always need review, even after cancellation", () => {
  review("sin(x)^2+cos(x)^2", "1");
  review("log(x^2)", "2*log(x)");
  review("log(x^2)", "2*log(x)", {
    variables: [variable("x", { assumptions: ["positive"] })],
  });
  review("log(x^2)", "2*log(x)", {
    variables: [variable("x", { min: -2, max: -1 })],
  });
  for (const e of [
    "sin(x)-sin(x)",
    "0*log(x)",
    "0*tan(x)",
    "f(x)",
    "pi-pi",
    "e^x",
    "exp(x)",
    "sqrt(sin(x)^2)",
  ])
    review(e, "0");
  correct("sin(0)+tan(0)+log(1)", "0");
  correct("cos(0)", "1");
  correct("sin(0)", "0", { angleUnit: "degrees" });
  review("sin(x)^2+cos(x)^2", "1", { angleUnit: "degrees" });
});
test("bounds, assumptions and exclusions form an explicit nonempty real domain", () => {
  correct("x", "2", { variables: [variable("x", { min: 2, max: 2 })] });
  assert.equal(
    grade("x", "3", { variables: [variable("x", { min: 2, max: 2 })] }).status,
    "incorrect",
  );
  review("x*x", "x^2", {
    variables: [variable("x", { min: 1, max: 1 })],
    exclusions: ["x != 1"],
  });
  review("x*x", "x^2", {
    variables: [variable(), variable("unused", { min: 1, max: 1 })],
    exclusions: ["unused != 1"],
  });
  review("x*x", "x^2", {
    variables: [variable("x", { max: 0, assumptions: ["positive"] })],
  });
  for (const exclusion of [
    "x > 0",
    "x != y",
    "x != sqrt(2)",
    "y != 0",
    "x != Infinity",
    "x != 1; evil()",
  ])
    review("x*x", "x^2", { exclusions: [exclusion] });
  correct("(x-0.5)/(x-0.5)", "1", { exclusions: ["x != 1/2"] });
  correct("x*x", "x^2", {
    variables: [variable("x", { min: 0.1, max: 0.1 })],
    exclusions: ["x != 0.1"],
  });
  review("x*x", "x^2", {
    variables: [variable("x", { min: 0.1, max: 0.1 })],
    exclusions: ["x != 3602879701896397/36028797018963968"],
  });
  assert.equal(
    grade("x", "0.1", { variables: [variable("x", { min: 0.1, max: 0.1 })] })
      .status,
    "incorrect",
    "bounds preserve binary64, expression literals are exact decimal rationals",
  );
  correct("abs*abs", "abs^2", { variables: [variable("abs")] });
  review("y*y", "y^2");
  review("x*x", "x^2", {
    variables: Array.from({ length: 9 }, (_, i) => variable(`x${i}`)),
  });
});
test("parser, expansion, coefficients and work limits reject expression attacks without executing code", () => {
  const attacks = [
    "(".repeat(20) + "x" + ")".repeat(20),
    "x^99999999999999999999999999999999",
    "2^(2^8)",
    "(x^8)^8",
    "1e99999999999999999999",
    "x+".repeat(70) + "x",
    "x=" + "1",
    "x;process.exit()",
    "constructor(x)",
    "x.constructor",
    "[1,2]",
    "2 x",
    "sin(3 x)",
    "x!",
    "x%2",
    "x**2",
    "1<<2",
    "sqrt(1,2)",
    "import(x)",
    "__proto__",
    "globalThis.x=1",
  ];
  const start = performance.now();
  for (const expression of attacks) review(expression, "x");
  assert.ok(performance.now() - start < 2000);
  const options = {
    variables: ["a", "b", "c", "d", "z"].map((n) => variable(n)),
  };
  assert.equal(
    grade("(a+b+c+d+z)^8", "0", options).reason,
    "symbolic-resource-limit",
  );
  assert.equal(grade("(x^8)^8", "0").reason, "symbolic-resource-limit");
  assert.equal(grade("(1e24^8)^8", "0").reason, "symbolic-resource-limit");
  assert.equal(grade("x^9", "x^9").reason, "symbolic-resource-limit");
  assert.equal(
    grade("1".repeat(symbolicLimits.length + 1), "1").status,
    "needs-review",
  );
  assert.equal(
    evaluateExpressionAnswer(
      { kind: "expression", expression: "x" },
      { ...key("x"), expected: "PRIVATE_SENTINEL" },
    ).status,
    "needs-review",
  );
});
test("agreeing at every bounded witness point is inconclusive, never an equality proof", () => {
  const polynomial = "x*(x^2-1)*(x^2-4)*(x^2-9)*(x^2-16)*(x^2-25)*(x^2-36)";
  assert.deepEqual(grade(polynomial, "0"), {
    status: "needs-review",
    reason: "symbolic-inconclusive",
  });
});

let seed = 0x5b9f32d1;
function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return seed >>> 0;
}
test("seeded polynomial and total rational identity properties never depend on numerical agreement", () => {
  for (let i = 0; i < 220; i++) {
    const a = (random() % 11) - 5,
      b = (random() % 11) - 5,
      c = (random() % 11) - 5,
      d = (random() % 11) - 5;
    const left = `(${a}*x+${b})*(${c}*x+${d})`,
      expanded = `${a * c}*x^2+${a * d + b * c}*x+${b * d}`;
    correct(left, expanded);
    assert.equal(grade(left, `(${expanded})+1`).status, "incorrect");
    correct(`(${a}*x+${b})/(x^2+1)`, `(${2 * a}*x+${2 * b})/(2*x^2+2)`);
  }
});

test("wall-clock budget expiry explains a valid identity becoming needs-review after a scheduling pause", (t) => {
  const now = 1000;
  const clock = t.mock.method(performance, "now", () => now);
  // Same small identity recorded in the earlier parallel failure.
  assert.deepEqual(grade("(-2*x+0)*(2*x+-1)", "-4*x^2+2*x+0"), {
    status: "correct", reason: "symbolic-equivalent",
  });
  // Budget construction captures 1000; the next observation simulates a pause.
  let calls = 0;
  clock.mock.mockImplementation(() => ++calls === 1 ? now : now + symbolicLimits.milliseconds + 1);
  assert.deepEqual(grade("(-2*x+0)*(2*x+-1)", "-4*x^2+2*x+0"), {
    status: "needs-review", reason: "symbolic-resource-limit",
  });
});

test("wall-clock expiry is per evaluation and does not contaminate later identities", (t) => {
  let calls = 0;
  const clock = t.mock.method(performance, "now", () => ++calls === 1 ? 0 : symbolicLimits.milliseconds + 1);
  assert.deepEqual(grade("x+x", "2*x"), { status: "needs-review", reason: "symbolic-resource-limit" });
  clock.mock.mockImplementation(() => 2000);
  correct("x+x", "2*x");
});
