import assert from "node:assert/strict";
import test from "node:test";
import { checkArchivePart } from "./archive-grading";
import { expression } from "./archive-grading/definitions";

const key = (canonical: string) => expression("result", "Result", canonical, "x y", "Positive real x and y", { positive: ["x", "y"] });

test("nonconstant functions are never reduced to their special constant values", () => {
  const wrong: [string, string][] = [
    [String.raw`\ln(x)`, "0"],
    [String.raw`\log(x)`, "0"],
    [String.raw`\exp(x)`, "1"],
    [String.raw`\sin(x)`, "0"],
    [String.raw`\cos(x)`, "1"],
    [String.raw`\sinh(x)`, "0"],
    [String.raw`\cosh(x)`, "1"],
    [String.raw`\ln(x y)`, String.raw`\ln(x)-\ln(y)`],
    [String.raw`\ln(x)`, String.raw`\log(x)`],
    [String.raw`\exp(x+y)`, String.raw`\exp(x)+\exp(y)`],
    [String.raw`\sqrt{x+y}`, String.raw`\sqrt{x}+\sqrt{y}`],
    [String.raw`\sqrt{2}`, "1.4142135623730951"],
    [String.raw`\pi`, "3.141592653589793"],
    [String.raw`\sin^2(x)+\cos^2(y)`, "1"],
  ];
  for (const [canonical, answer] of wrong) assert.notEqual(checkArchivePart(key(canonical), answer).status, "correct", `${answer} versus ${canonical}`);
});

test("cancellation preserves guards on both the answer and the reviewed form", () => {
  for (const [canonical, answer] of [["x/x", "1"], ["x^0", "1"], ["0*(1/x)", "0"], [String.raw`\ln(x)-\ln(x)`, "0"]]) {
    const unrestricted = expression("result", "Result", canonical, "x", "All real x");
    assert.equal(checkArchivePart(unrestricted, answer).status, "inconclusive", `${answer} versus ${canonical}`);
  }
  for (const answer of [String.raw`0\ln(-1)`, String.raw`1+0/0`, String.raw`\sqrt{-1}^2`]) {
    assert.notEqual(checkArchivePart(key("0"), answer).status, "correct", answer);
  }
});

test("expansion, exponents and nesting stay bounded without speculative grades", () => {
  const start = performance.now();
  for (const answer of [
    String.raw`(\sin(x)+\cos(x)+\exp(x)+\ln(x))^8`,
    String.raw`(\sin(x)+\cos(x))^{100}`,
    `${"(".repeat(17)}x${")".repeat(17)}`,
    "10^{1000}",
  ]) assert.notEqual(checkArchivePart(key("1"), answer).status, "correct", answer);
  assert.ok(performance.now() - start < 2000, "bounded symbolic inputs must not monopolise the server");
});
