import assert from "node:assert/strict";
import test from "node:test";
import { AnswerReadError, SymbolTable, displayName, normaliseName, readExpression, readNumber, readerLimits } from "./answer-reader";

const table = (...names: string[]) => new SymbolTable(names);
const value = (text: string, names: string[], values: number[]) => readExpression(text, table(...names)).evaluate(values);
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));
const fails = (text: string, names: string[] = []) => {
  try { readExpression(text, table(...names)); } catch (error) { return error as AnswerReadError; }
  return assert.fail(`${text} should not be readable`);
};

test("LaTeX as MathLive writes it and plain typing give the same value", () => {
  const names = ["r_0", "k", "z", "\\theta_0"], v = [2, 0.7, 1.3, 0.4];
  const expected = 2 * Math.cos(0.7 * 1.3) + (0.4 / 0.7) * Math.sin(0.7 * 1.3);
  for (const text of [
    String.raw`r_0\cos(kz)+\frac{\theta_0}{k}\sin(kz)`,
    String.raw`r_{0}\cos\left(kz\right)+\frac{\theta_{0}}{k}\sin\left(kz\right)`,
    String.raw`\theta_0\sin(kz)/k + \cos(zk)r_0`,
    "theta_0*sin(k*z)/k + r_0*cos(k*z)",
    "θ₀ sin(kz)/k + r₀ cos(kz)",
    "r_0 cos kz + theta_0 sin kz / k",
    String.raw`r_0\cdot\cos(k\times z)+\theta_0\cdot\frac{\sin(kz)}{k}`,
  ]) assert.ok(near(value(text, names, v), expected), text);
});

test("zero is the subscript, the letter o is not accepted, and the error names the symbol and the nearest one", () => {
  const names = ["r_0", "k", "z", "\\theta_0"];
  const error = fails(String.raw`\theta_o\sin(kz)/k+r_o\cos(kz)`, names);
  assert.equal(error.kind, "symbol");
  assert.equal(error.message, "θ_o isn't used here. Did you mean θ₀?");
  assert.equal(fails("r_o", names).message, "r_o isn't used here. Did you mean r₀?");
  assert.equal(fails("r", names).message, "r isn't used here. Did you mean r₀?");
  assert.match(fails("q", names).message, /^q isn't used here\. Use r₀, k, z, θ₀\.$/);
  assert.match(fails("x", []).message, /This part takes a number/);
  assert.equal(displayName("theta_0"), "θ₀");
  assert.equal(displayName("tau_sp"), "τ_sp");
  assert.equal(normaliseName(String.raw`\mathrm{k}_{B}`), "k_B");
});

test("precedence follows what people type", () => {
  const v = (text: string, ...x: number[]) => value(text, ["x", "y"], x);
  assert.equal(v("-x^2", 3), -9);
  assert.equal(v("2^3^2"), 512);
  assert.equal(v("x^-1", 4), 0.25);
  assert.equal(v("x^{-2}", 2), 0.25);
  assert.equal(v("1/2 x y", 4, 3), 6);
  assert.equal(v("x/y/2", 12, 3), 2);
  assert.equal(v("2x^2y", 3, 2), 36);
  assert.equal(v("(x+1)(x-1)", 3), 8);
  assert.equal(v("x - -y", 1, 2), 3);
  assert.equal(v("sin^2(x)+cos^2(x)", 0.7), 1);
  assert.ok(near(v("sin x cos x", 0.7), Math.sin(0.7) * Math.cos(0.7)));
  assert.ok(near(v("sinx", 0.7), Math.sin(0.7)));
  assert.ok(near(v("tan x/y", 0.7, 2), Math.tan(0.7) / 2));
});

test("fractions, roots, absolute values, logarithms and constants", () => {
  const v = (text: string, ...x: number[]) => value(text, ["x"], x);
  assert.equal(v(String.raw`\frac12 x`, 8), 4);
  assert.equal(v(String.raw`\frac32`), 1.5);
  assert.equal(v(String.raw`\frac x2`, 8), 4);
  assert.equal(v(String.raw`\sqrt[3]{x}`, 27), 3);
  assert.equal(v(String.raw`\sqrt[3]{x}`, -27), -3);
  assert.equal(v("sqrt(x)", 16), 4);
  assert.equal(v("√x", 16), 4);
  assert.equal(v("|x|", -3), 3);
  assert.equal(v(String.raw`\left|x-1\right|`, -3), 4);
  assert.equal(v(String.raw`\lvert x\rvert`, -3), 3);
  assert.equal(v("abs(x)", -3), 3);
  assert.ok(near(v("ln(x)", Math.E), 1));
  assert.ok(near(v("log(x)", Math.E), 1));
  assert.ok(near(v(String.raw`e^{x}`, 1), Math.E));
  assert.ok(near(v(String.raw`\exp(x)`, 1), Math.E));
  assert.ok(near(v("2π", 0), 2 * Math.PI));
  assert.ok(near(v(String.raw`2\pi x`, 1), 2 * Math.PI));
  assert.ok(near(v("pi*x", 1), Math.PI));
  assert.ok(near(v("x²", 3), 9));
  assert.ok(near(v("x⁻¹", 4), 0.25));
});

test("a problem can declare e or pi as ordinary symbols", () => {
  assert.equal(value("e*2", ["e"], [5]), 10);
  assert.equal(value("pi*2", ["pi"], [5]), 10);
});

test("degrees are honoured", () => {
  const t = table("x");
  assert.ok(near(readExpression("sin(x)", t, { angleUnit: "degrees" }).evaluate([30]), 0.5));
  assert.ok(near(readExpression("arcsin(x)", t, { angleUnit: "degrees" }).evaluate([0.5]), 30));
});

test("multi-letter symbols, aliases and unbraced subscripts", () => {
  assert.equal(value("rho*h", ["rho", "h"], [3, 4]), 12);
  assert.equal(value(String.raw`\rho h`, ["rho", "h"], [3, 4]), 12);
  assert.equal(value("c0*c", ["c0", "c"], [3, 4]), 12);
  assert.equal(value("m_pm_n", ["m_p", "m_n"], [3, 4]), 12);
  assert.equal(value("k_BT", ["k_B", "T"], [3, 4]), 12);
  assert.equal(value("mc^2", ["m", "c"], [3, 4]), 48);
  assert.equal(value(String.raw`\tau_{sp}`, ["tau_sp"], [7]), 7);
  assert.equal(value("tau_sp", ["tau_sp"], [7]), 7);
  assert.equal(readExpression("u*x", new SymbolTable(["mu", "x"], false, { mu: ["u"] })).evaluate([3, 4]), 12);
});

test("numbers: decimals, scientific notation and arithmetic", () => {
  for (const text of ["300000000", "3e8", "3E8", "3×10^8", String.raw`3\times10^8`, String.raw`3\times 10^{8}`, "3*10^8", String.raw`3\cdot10^{8}`, "3e+8", "30e7", "0.3e9"]) assert.equal(readNumber(text), 3e8, text);
  assert.equal(readNumber(".5"), 0.5);
  assert.equal(readNumber("5."), 5);
  assert.equal(readNumber("-2.5e-3"), -0.0025);
  assert.equal(readNumber(String.raw`\frac{49}{10}`), 4.9);
  assert.equal(readNumber("49/10"), 4.9);
  assert.ok(near(readNumber(String.raw`\sqrt{13}`), Math.sqrt(13)));
  assert.equal(readNumber("−2"), -2);
  assert.equal(readNumber("  $4.9$ "), 4.9);
});

test("malformed, unsafe and over-budget input is refused with a plain message", () => {
  for (const text of [
    "", "   ", "4.9=4.9", "4.9;4.9", "1,5", "1/", "(1", "1)", String.raw`\frac{1}{`, String.raw`\frac{1}`, "2 3", "1.2.3", "x y z", "*3", "3**", "sin", "sin()", "||",
    String.raw`\newcommand{\x}{4}\x`, String.raw`\href{javascript:alert(1)}{4}`, String.raw`\input{secret}`, String.raw`\begin{cases}4\end{cases}`,
    "a".repeat(2000), "(".repeat(17) + "4" + ")".repeat(17), "1e999", "1e-999", String.raw`\sqrt[999]{1}`, "12345678901234567890", String.raw`\infty`, "4‮9", "<script>", "4%",
  ]) {
    try { readNumber(text); } catch (error) { assert.ok(error instanceof AnswerReadError, text); assert.ok(error.message.length > 10 && !/undefined|\[object/.test(error.message), text); continue; }
    assert.fail(`${JSON.stringify(text)} should be refused`);
  }
  for (const text of ["NaN", "Infinity", "1/0", "0/0", String.raw`\sqrt{-1}`, "0^0", "ln(0)", "1e300*1e300"]) {
    try { readNumber(text); } catch (error) { assert.ok(error instanceof AnswerReadError, text); continue; }
    assert.fail(`${text} should be refused`);
  }
  assert.equal(readerLimits.brackets, 16);
});

test("the reader is fast on adversarial input", () => {
  const started = performance.now();
  for (const text of ["(".repeat(500), "x^".repeat(500) + "1", "\\frac{".repeat(100), "+".repeat(1000) + "1", "sin ".repeat(300) + "1", "a".repeat(1024)]) {
    try { readExpression(text, table("x")); } catch (error) { assert.ok(error instanceof AnswerReadError); }
  }
  assert.ok(performance.now() - started < 500);
});

test("a / followed by symbols written next to each other is refused, with the student's own symbols in both readings", () => {
  const names = ["a", "b", "c", "h", "m", "k_B", "T", "x", "\\theta_0", "k", "z", "y"];
  const message = (text: string) => fails(text, names).message;
  assert.equal(message("a/bc"), "Add brackets: a/(bc) or (a/b)c.");
  assert.equal(message("h/mc"), "Add brackets: h/(mc) or (h/m)c.");
  assert.equal(message("kT/mc^2"), "Add brackets: kT/(mc^2) or (kT/m)c^2.");
  assert.equal(message("k_BT/mc^2"), "Add brackets: k_BT/(mc^2) or (k_BT/m)c^2.");
  assert.equal(message("a/b c"), "Add brackets: a/(bc) or (a/b)c.");
  assert.equal(message("m*a/bc"), "Add brackets: m*a/(bc) or (m*a/b)c.");
  assert.equal(message("a/2b"), "Add brackets: a/(2b) or (a/2)b.");
  assert.equal(message("x/y/zk"), "Add brackets: x/y/(zk) or (x/y/z)k.");
  assert.equal(message(String.raw`\theta_0/kz`), String.raw`Add brackets: \theta_0/(kz) or (\theta_0/k)z.`);
  assert.equal(message("a/sin(x) y"), "Add brackets: a/(sin(x)y) or (a/sin(x))y.");
  assert.equal(fails("a/bc", names).kind, "syntax");
});

test("clear divisions are not refused", () => {
  const names = ["a", "b", "c", "m", "v", "x", "y", "k"];
  const v = (text: string, ...x: number[]) => value(text, names, x);
  // a, b, c, m, v, x, y, k = 2..9 in the tests below unless given
  const vals = [12, 3, 2, 4, 5, 1, 1, 1];
  const at = (text: string) => value(text, names, vals);
  assert.equal(at("a/(bc)"), 2);
  assert.equal(at("(a/b)c"), 8);
  assert.equal(at("a/b*c"), 8);
  assert.equal(at("a/b"), 4);
  assert.equal(at("a/b/c"), 2);
  assert.equal(at("a/b+c"), 6);
  assert.equal(at("a/(b)c"), 8);
  assert.equal(at(String.raw`\frac{a}{b}c`), 8);
  assert.equal(at(String.raw`\frac{a}{bc}`), 2);
  assert.equal(at(String.raw`a/\sqrt{c}c`), (12 / Math.SQRT2) * 2);
  assert.equal(at("tan(x)/y"), Math.tan(1));
  // A plain number fraction before symbols is read left to right: 1/2 m v^2 is (1/2) m v^2.
  assert.equal(at("1/2 m v^2"), 0.5 * 4 * 25);
  assert.equal(at("1/2mv^2"), 0.5 * 4 * 25);
  assert.equal(at("-1/2 m v^2"), -0.5 * 4 * 25);
  assert.equal(at("3/4 m"), 3);
  assert.equal(at("x*1/2 m"), 2);
  assert.equal(v("a/2", 12), 6);
  // Two literal numbers side by side are still refused.
  fails("49/10 5", names);
  fails("1/2 3", names);
});
