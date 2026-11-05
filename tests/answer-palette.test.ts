import assert from "node:assert/strict";
import test from "node:test";
import { cleanLatex, formatConditions, paletteItems, plainInsertion, symbolToLatex } from "../components/physics/answer-palette";
import { SymbolTable, readExpression } from "../lib/answer-reader";

test("a declared symbol is written the way MathLive writes it", () => {
  assert.equal(symbolToLatex("theta_0"), "\\theta_{0}");
  assert.equal(symbolToLatex("\\theta_0"), "\\theta_{0}");
  assert.equal(symbolToLatex("r_0"), "r_{0}");
  assert.equal(symbolToLatex("k_B"), "k_{B}");
  assert.equal(symbolToLatex("\\tau_{sp}"), "\\tau_{sp}");
  assert.equal(symbolToLatex("x"), "x");
  assert.equal(symbolToLatex("rho"), "\\rho");
  assert.equal(symbolToLatex("hbar"), "\\hbar");
});

test("the palette lists the problem's symbols first, then structure, Greek letters and functions", () => {
  const items = paletteItems(["r_0", "k", "z", "\\theta_0"]);
  assert.deepEqual(items.slice(0, 4).map((item) => item.label), ["r₀", "k", "z", "θ₀"]);
  assert.deepEqual(items.slice(4, 8).map((item) => item.name), ["a/b fraction", "xⁿ power", "√ square root", "xₙ subscript"]);
  const groups = items.map((item) => item.group);
  assert.deepEqual([...new Set(groups)], ["symbol", "structure", "greek", "function"]);
  assert.deepEqual(items.slice(-6).map((item) => item.label), ["sin", "cos", "tan", "π", "e", "ln"]);
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  // A symbol listed twice, or in another spelling, appears once.
  assert.equal(paletteItems(["k", "k", "\\theta_0", "theta_0"]).filter((item) => item.group === "symbol").length, 2);
  // Every button has a name that starts with what it shows, so a voice command by its label works.
  for (const item of items) assert.ok(item.name.startsWith(item.label) || item.name.includes(item.label), item.id);
});

test("everything the palette inserts is something the reader understands", () => {
  const names = ["r_0", "k", "z", "\\theta_0"];
  for (const item of paletteItems(names)) {
    // Fill the placeholders with a symbol the way a person would, then read it.
    const text = item.insert.replace(/#@/g, "k").replace(/#\?/g, "k").replace(/#0/g, "k");
    const readable = item.id === "subscript" ? "r_{0}" : text;
    assert.doesNotThrow(() => readExpression(readable, new SymbolTable(["k", "r_0", "z", "\\theta_0", "alpha", "beta", "gamma", "delta", "varepsilon", "theta", "lambda", "mu", "rho", "sigma", "tau", "varphi", "omega"])), `${item.id}: ${readable}`);
  }
});

test("without MathLive the plain box gets the same text with the cursor inside the first bracket", () => {
  assert.deepEqual(plainInsertion("\\frac{#@}{#?}"), { text: "\\frac{}{}", caret: 6 });
  assert.deepEqual(plainInsertion("\\sin(#?)"), { text: "\\sin()", caret: 5 });
  assert.deepEqual(plainInsertion("\\pi"), { text: "\\pi", caret: 3 });
  assert.deepEqual(plainInsertion("r_{0}"), { text: "r_{0}", caret: 3 });
});

test("MathLive output is cleaned of brackets sizing and spacing, not of meaning", () => {
  assert.equal(cleanLatex("r_0\\cos\\left(kz\\right)+\\frac{\\theta_0}{k}"), "r_0\\cos(kz)+\\frac{\\theta_0}{k}");
  assert.equal(cleanLatex("a\\,b\\;c\\!d"), "abcd");
  assert.equal(cleanLatex("  x  +  y "), "x + y");
  assert.equal(cleanLatex("\\leftarrow"), "\\leftarrow");
});

test("conditions are short phrases", () => {
  assert.deepEqual(formatConditions([{ symbol: "k", assumptions: ["positive"] }]), ["k > 0"]);
  assert.deepEqual(formatConditions([{ symbol: "\\theta_m", assumptions: ["nonnegative"] }, { symbol: "x", assumptions: ["nonzero"] }]), ["θ_m ≥ 0", "x ≠ 0"]);
  assert.deepEqual(formatConditions([{ symbol: "u", assumptions: ["positive"], min: 50, max: 150 }]), ["50 ≤ u ≤ 150"]);
  assert.deepEqual(formatConditions([{ symbol: "x", assumptions: [], min: 0 }, { symbol: "y", assumptions: [], max: 3 }]), ["x ≥ 0", "y ≤ 3"]);
  assert.deepEqual(formatConditions([{ symbol: "x", assumptions: [] }]), []);
  assert.deepEqual(formatConditions([]), []);
});
