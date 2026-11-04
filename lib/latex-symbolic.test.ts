import assert from "node:assert/strict";
import test from "node:test";
import { checkArchivePart } from "./archive-grading";
import { archiveDefinitions } from "./archive-grading/catalog";
import { expression } from "./archive-grading/definitions";

const key = (canonical: string, symbols = "x", positive: string[] = []) => expression("result", "Result", canonical, symbols, "Declared real variables", { positive });

test("every reviewed wrong symbolic archive answer receives a definite incorrect grade", () => {
  const unresolved: string[] = [];
  for (const definition of archiveDefinitions) {
    for (const part of definition.parts) {
      if (part.kind !== "expression") continue;
      for (const answer of part.wrong) {
        const result = checkArchivePart(part, answer);
        if (result.status !== "incorrect") unresolved.push(`${definition.problemId}/${part.id}: ${result.status}`);
      }
    }
  }
  assert.deepEqual(unresolved, []);
});

test("advanced archive expressions accept exact algebraic rewrites and reject tiny offsets", () => {
  const examples = [
    ["arena-the-cosmic-kitchen", "b.density"],
    ["arena-the-cosmic-kitchen", "f.ratio"],
    ["arena-the-gas-with-elbows", "a.vi.partition"],
    ["arena-the-string-that-answered-back", "a.left"],
    ["arena-mind-the-gap", "a.radius"],
    ["arena-the-quantum-escape-room", "e.probability"],
  ];
  for (const [problemId, partId] of examples) {
    const part = archiveDefinitions.find((definition) => definition.problemId === problemId)!.parts.find((part) => part.id === partId)!;
    assert.equal(part.kind, "expression");
    if (part.kind !== "expression") continue;
    for (const answer of [`(${part.canonical})+0`, `2*(${part.canonical})/2`, `(${part.canonical})*1`]) {
      assert.equal(checkArchivePart(part, answer).status, "correct", `${partId}: ${answer}`);
    }
    assert.equal(checkArchivePart(part, `(${part.canonical})+10^{-20}`).status, "incorrect", partId);
  }
});

test("exact identities cover transcendental constants, radicals, logarithms and exponentials", () => {
  const cases: [string, string, string, string[]][] = [
    [String.raw`2\pi x`, String.raw`\pi(x+x)`, "x", []],
    [String.raw`3\sqrt{3}x`, String.raw`\sqrt{27}x`, "x", []],
    [String.raw`\sqrt{x y}`, String.raw`\sqrt{x}\sqrt{y}`, "x y", ["x", "y"]],
    [String.raw`x^{3/2}`, String.raw`x\sqrt{x}`, "x", ["x"]],
    [String.raw`\ln(x y)`, String.raw`\ln(x)+\ln(y)`, "x y", ["x", "y"]],
    [String.raw`\ln(x/y)`, String.raw`\ln(x)-\ln(y)`, "x y", ["x", "y"]],
    [String.raw`\exp(x+y)`, String.raw`\exp(x)\exp(y)`, "x y", []],
    [String.raw`\exp(-x)`, String.raw`1/\exp(x)`, "x", []],
    [String.raw`\ln(\exp(x))`, "x", "x", []],
    [String.raw`\exp(\ln(x))`, "x", "x", ["x"]],
    ["1", String.raw`\sin^2(x)+\cos^2(x)`, "x", []],
    ["1", String.raw`\sin(x)\sin(x)+\cos(x)\cos(x)`, "x", []],
    ["1", String.raw`\cosh^2(x)-\sinh^2(x)`, "x", []],
    [String.raw`\cos(x)`, String.raw`\cos(-x)`, "x", []],
    [String.raw`-\sin(x)`, String.raw`\sin(-x)`, "x", []],
  ];
  for (const [canonical, answer, symbols, positive] of cases) {
    assert.equal(checkArchivePart(key(canonical, symbols, positive), answer).status, "correct", `${answer} versus ${canonical}`);
  }
});

test("symbolic identities do not erase undefined operations or widen domains", () => {
  const cases: [string, string][] = [
    ["1", "x/x"],
    ["1", "x^0"],
    ["0", "0*(1/x)"],
    ["0", String.raw`0\sqrt{x}`],
    ["0", String.raw`\ln(x)-\ln(x)`],
    ["1", String.raw`\tan(x)/\tan(x)`],
    ["x+1", "(x^2-1)/(x-1)"],
    [String.raw`2\ln(x)`, String.raw`\ln(x^2)`],
    ["x", String.raw`\sqrt{x^2}`],
    [String.raw`\ln(x)+\ln(y)`, String.raw`\ln(x y)`],
    [String.raw`\sqrt{x}\sqrt{y}`, String.raw`\sqrt{x y}`],
  ];
  for (const [canonical, answer] of cases) {
    assert.notEqual(checkArchivePart(key(canonical, "x y"), answer).status, "correct", `${answer} versus ${canonical}`);
  }
});

test("symbolic decisions preserve exact coefficients and never rely on agreeing sample points", () => {
  for (const answer of ["1.00000000000000001", String.raw`\sin^2(x)+\cos^2(x)+10^{-20}`]) {
    assert.equal(checkArchivePart(key("1"), answer).status, "incorrect", answer);
  }
  const trap = String.raw`\sin(x)+x(x-1)(x+1)(x-2)(x+2)`;
  assert.notEqual(checkArchivePart(key(String.raw`\sin(x)`), trap).status, "correct");
  assert.notEqual(checkArchivePart(key("1"), String.raw`\sin^2(x)+\cos^2(2x)`).status, "correct");
  assert.notEqual(checkArchivePart(key("1"), String.raw`\sinh^2(x)+\cosh^2(x)`).status, "correct");
});
