import assert from "node:assert/strict";
import test from "node:test";
import { checkSampled, sampledLimits, undecidedMessage, type SampledInput } from "./sampled-check";

const real = (...names: string[]) => names.map((name) => ({ name }));
const run = (answer: string, reference: string, symbols: SampledInput["symbols"], extra: Partial<SampledInput> = {}) =>
  checkSampled({ seed: "test:part", answer, references: [reference], symbols, ...extra });

test("equal expressions are correct, however they are written", () => {
  const x = real("x", "y");
  for (const [answer, reference] of [
    ["x*y", "y x"], ["(x+y)^2", "x^2+2xy+y^2"], ["1/x", "x^-1"], ["sin(x)^2+cos(x)^2", "1"], ["sqrt(x^2+1)", "(x^2+1)^(1/2)"],
    ["e^(ln(2)+x)", "2exp(x)"], ["x/y", "x*y^-1"], ["(x^3-y^3)/(x-y)", "x^2+x*y+y^2"], ["2*sin(x)*cos(x)", "sin(2x)"],
  ]) assert.deepEqual(run(answer, reference, x), { status: "correct" }, `${answer} vs ${reference}`);
});

test("different expressions are incorrect", () => {
  const x = real("x", "y");
  for (const [answer, reference] of [["x+y", "x-y"], ["x^2", "x^3"], ["x/y", "y/x"], ["sin(x)", "cos(x)"], ["x+1e-4", "x"], ["2x", "x"], ["0", "x*y"]])
    assert.deepEqual(run(answer, reference, x), { status: "incorrect" }, `${answer} vs ${reference}`);
});

test("sign rule: |x| is not x and sqrt(x^2) is not x when x can be negative", () => {
  const x = real("x");
  assert.deepEqual(run("|x|", "x", x), { status: "incorrect" });
  assert.deepEqual(run("x", "|x|", x), { status: "incorrect" });
  assert.deepEqual(run("sqrt(x^2)", "x", x), { status: "incorrect" });
  assert.deepEqual(run("abs(x)", "sqrt(x^2)", x), { status: "correct" });
  // Declared conditions are respected.
  for (const assumptions of [["positive"], ["nonnegative"]] as const) {
    assert.deepEqual(run("|x|", "x", [{ name: "x", assumptions }]), { status: "correct" });
    assert.deepEqual(run("sqrt(x^2)", "x", [{ name: "x", assumptions }]), { status: "correct" });
  }
  assert.deepEqual(run("|x|", "x", [{ name: "x", min: 0.5, max: 3 }]), { status: "correct" });
  assert.deepEqual(run("|x|", "x", [{ name: "x", min: -3, max: -0.5 }]), { status: "incorrect" });
});

test("a set is skipped only when the reference is undefined, and an answer undefined where the reference is fine is wrong", () => {
  const x = real("x");
  // The reference is undefined for negative x. Those sets are skipped and the answer is judged on the rest.
  assert.deepEqual(run("sqrt(x)", "sqrt(x)", x), { status: "correct" });
  assert.deepEqual(run("x^0.5", "sqrt(x)", x), { status: "correct" });
  // The reference is fine everywhere, the answer is undefined for negative x: a mismatch.
  assert.deepEqual(run("sqrt(x)", "x^3/x^2", x), { status: "incorrect" });
  assert.deepEqual(run("ln(x)", "x", x), { status: "incorrect" });
  assert.deepEqual(run("x/0", "x", x), { status: "incorrect" });
  // A reference that is never defined cannot be decided.
  assert.deepEqual(run("1", "sqrt(-x^2-1)", x), { status: "undecided", reason: "few-valid-sets" });
  assert.deepEqual(run("1", "1/0", x), { status: "undecided", reason: "few-valid-sets" });
});

test("positive, nonnegative, bounded and nonzero symbols", () => {
  // k > 0 makes ln(k) defined for every set.
  assert.deepEqual(run("ln(k)", "ln(k)", [{ name: "k", assumptions: ["positive"] }]), { status: "correct" });
  // Bounded: x stays inside [1, 2], so (x-1)(x-2) is never positive.
  assert.deepEqual(run("sqrt((x-1)*(2-x))", "sqrt(-(x-1)*(x-2))", [{ name: "x", min: 1, max: 2 }]), { status: "correct" });
  // An excluded value is never drawn, so the removable hole cannot make the reference undefined.
  assert.deepEqual(run("x+1", "(x^2-1)/(x-1)", real("x"), { exclusions: ["x != 1"] }), { status: "correct" });
  assert.deepEqual(run("x", "x", real("x"), { exclusions: ["not a condition"] }), { status: "undecided", reason: "exclusion" });
});

test("alternative references are accepted", () => {
  const out = (answer: string) => checkSampled({ seed: "s", answer, references: ["x", "-x"], symbols: real("x") });
  assert.deepEqual(out("-x"), { status: "correct" });
  assert.deepEqual(out("x"), { status: "correct" });
  assert.deepEqual(out("2x"), { status: "incorrect" });
});

test("the key's own symbols are used when it declares none", () => {
  assert.deepEqual(checkSampled({ seed: "s", answer: "a*m", references: ["m*a"] }), { status: "correct" });
  assert.deepEqual(checkSampled({ seed: "s", answer: "m+a", references: ["m*a"] }), { status: "incorrect" });
  const stray = checkSampled({ seed: "s", answer: "m*b", references: ["m*a"] });
  assert.equal(stray.status, "invalid");
  assert.match((stray as { message: string }).message, /^b isn't used here\./);
});

test("an undeclared symbol is named, with the nearest declared one", () => {
  const out = checkSampled({ seed: "s", answer: String.raw`\theta_o`, references: [String.raw`\theta_0`], symbols: [{ name: String.raw`\theta_0` }] });
  assert.deepEqual(out, { status: "invalid", message: "θ_o isn't used here. Did you mean θ₀?", symbol: "theta_o", suggestion: "theta_0" });
});

test("the same answer always gets the same result, and results do not depend on the seed for clear answers", () => {
  const outcomes = (seed: string) => ["x+1e-7*x", "x+3e-6*x", "x*(1+1e-5)", "x-1e-4"].map((answer) => checkSampled({ seed, answer, references: ["x"], symbols: real("x") }).status);
  for (let i = 0; i < 5; i++) assert.deepEqual(outcomes("problem:part"), ["correct", "incorrect", "incorrect", "incorrect"]);
  for (const seed of ["a", "b", "c:d", "problem:part-1", ""]) {
    assert.deepEqual(checkSampled({ seed, answer: "x*(1+1e-8)", references: ["x"], symbols: real("x") }), { status: "correct" }, seed);
    assert.deepEqual(checkSampled({ seed, answer: "x*(1+1e-5)", references: ["x"], symbols: real("x") }), { status: "incorrect" }, seed);
  }
});

test("tolerance is 1e-6 relative with a 1e-9 floor near zero", () => {
  const x = real("x");
  assert.deepEqual(run("x*(1+5e-7)", "x", x), { status: "correct" });
  assert.deepEqual(run("x*(1+2e-6)", "x", x), { status: "incorrect" });
  // Near zero, the floor applies: x - x is 0, so 1e-10 is within it and 1e-8 is not.
  assert.deepEqual(run("1e-10", "x-x", x), { status: "correct" });
  assert.deepEqual(run("1e-8", "x-x", x), { status: "incorrect" });
  assert.equal(sampledLimits.sets, 10);
});

test("exactly 10 valid sets are needed", () => {
  // The reference is defined for about one draw in a thousand. Not enough valid sets can be found.
  assert.deepEqual(run("x", "sqrt(1/(x^6)-1e9)", real("x")), { status: "undecided", reason: "few-valid-sets" });
  assert.match(undecidedMessage("few-valid-sets"), /^Could not be decided\./);
  assert.doesNotMatch(undecidedMessage("few-valid-sets"), /proven|subset/);
});

test("the check is limited in time and in input size", () => {
  let tick = 0;
  const clock = () => (tick += 200);
  assert.deepEqual(run("x", "x", real("x"), { now: clock }), { status: "undecided", reason: "time-limit" });
  const long = run("x+".repeat(600) + "1", "x", real("x"));
  assert.equal(long.status, "invalid");
  assert.equal(run("(".repeat(40) + "x" + ")".repeat(40), "x", real("x")).status, "invalid");
  assert.equal(run("x".repeat(5000), "x", real("x")).status, "invalid");
  const started = performance.now();
  assert.equal(run("x^x^x^x^x^x^x^x", "x", real("x")).status, "incorrect");
  assert.ok(performance.now() - started < 400);
});

test("the key's reference is never reported to the student", () => {
  const out = run("x+1", "x*y*z", real("x", "y", "z"));
  assert.deepEqual(out, { status: "incorrect" });
});

test("log: a saved key that says log still means ln, and a student has to write ln or log10", () => {
  assert.deepEqual(checkSampled({ seed: "s", answer: "ln(x)", references: ["log(x)"], symbols: [{ name: "x", min: 1, max: 5 }] }), { status: "correct" });
  const bare = checkSampled({ seed: "s", answer: "log(x)", references: ["log(x)"], symbols: [{ name: "x", min: 1, max: 5 }] });
  assert.equal(bare.status, "invalid");
  assert.equal((bare as { message: string }).message, "Write ln for the natural log, or log₁₀ for base 10.");
  assert.deepEqual(checkSampled({ seed: "s", answer: String.raw`\log_{10}(x)`, references: ["log10(x)"], symbols: [{ name: "x", min: 1, max: 5 }] }), { status: "correct" });
  assert.equal(checkSampled({ seed: "s", answer: "log10(x)", references: ["ln(x)"], symbols: [{ name: "x", min: 2, max: 5 }] }).status, "incorrect");
});
