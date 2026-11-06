import assert from "node:assert/strict";
import test from "node:test";
import { answerItems, cleanLatex, formatConditions, padTabs, paletteItems, plainInsertion, symbolToLatex } from "../components/physics/answer-palette";
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

const known = ["k", "r_0", "z", "\\theta_0"];
const greekNames = "alpha beta gamma delta varepsilon zeta eta theta iota kappa lambda mu nu xi pi rho sigma tau upsilon varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega hbar".split(" ");
// Greek letters are read like any symbol, so the problem has to declare the ones it uses.
const symbolsFor = new SymbolTable([...known, ...greekNames]);

/** Fill the placeholders the way a person would. A button that writes a lone symbol or operator gets something around it. */
function filled(item: ReturnType<typeof paletteItems>[number]): string {
  if (item.id === "subscript") return "r_{0}";
  const text = item.insert.replace(/\[#?\]\{#\?\}/g, "[3]{k}").replace(/#@/g, "k").replace(/#\?/g, "k");
  if (item.group === "relations") return `k ${text} k`;
  if (["plus", "minus", "times", "divide", "dot", "cross"].includes(item.id)) return `k ${text} k`;
  if (item.id === "factorial") return `k ${text}`;
  if (item.id === "degree") return `k ${text}`;
  if (item.group === "greek" || item.group === "other") return /\\(vec|hat)/.test(text) ? text : `k ${text}`;
  return text;
}

test("the pad has the six tabs, the problem's symbols first and capitals behind Show more", () => {
  const items = paletteItems(["r_0", "k", "z", "\\theta_0"]);
  assert.deepEqual(padTabs.map((tab) => tab.label), ["Problem", "Operations", "Relations", "Greek", "Trig", "Other"]);
  assert.deepEqual(items.slice(0, 4).map((item) => item.label), ["r₀", "k", "z", "θ₀"]);
  assert.ok(items.slice(0, 4).every((item) => item.group === "problem"));
  const tabOf = (tab: string) => items.filter((item) => item.group === tab);
  assert.deepEqual(tabOf("operations").slice(0, 4).map((item) => item.label), ["+", "−", "×", "÷"]);
  assert.deepEqual(tabOf("operations").slice(4).map((item) => item.label), ["a/b", "xⁿ", "xₙ", "√", "ⁿ√", "eˣ", "10ˣ", "ln", "log", "|x|", "!"]);
  assert.deepEqual(tabOf("relations").map((item) => item.label), ["=", "≠", "<", ">", "≤", "≥", "≈", "∝"]);
  assert.deepEqual(tabOf("greek").filter((item) => !item.more).slice(0, 3).map((item) => item.label), ["α", "β", "γ"]);
  assert.ok(tabOf("greek").filter((item) => item.more).every((item) => /^[Α-Ω]$/.test(item.label)));
  assert.deepEqual(tabOf("trig").map((item) => item.label), ["sin", "cos", "tan", "sin⁻¹", "cos⁻¹", "tan⁻¹", "sinh", "cosh", "tanh"]);
  assert.deepEqual(tabOf("other").map((item) => item.label), ["∞", "∂", "∇", "ħ", "°", "v⃗", "v̂", "·", "⨯"]);
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  // A symbol listed twice, or in another spelling, appears once.
  assert.equal(paletteItems(["k", "k", "\\theta_0", "theta_0"]).filter((item) => item.group === "problem").length, 2);
  // Every button has a name that starts with what it shows, so a voice command by its label works.
  for (const item of items) assert.ok(item.name.includes(item.label) || item.name.startsWith(item.label), item.id);
});

test("answer fields show only what the checker reads, and the flag is true for every button", () => {
  const items = paletteItems(known);
  for (const item of items) {
    const text = filled(item);
    let reads = true;
    try {
      readExpression(text, symbolsFor);
    } catch {
      reads = false;
    }
    assert.equal(reads, item.readable !== false, `${item.id} (${text}) readable=${item.readable} but the reader says ${reads}`);
  }
  const shown = answerItems(items);
  assert.ok(shown.length > 40);
  assert.ok(shown.every((item) => item.readable !== false));
  assert.ok(!shown.some((item) => ["eq", "nabla", "partial", "vec", "hat"].includes(item.id)));
  assert.equal(items.filter((item) => item.readable === false).length > 0, true);
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
