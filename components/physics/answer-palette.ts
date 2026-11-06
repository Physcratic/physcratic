// Pure helpers for the answer field: the palette buttons, how a declared symbol is written, the conditions line and
// the cleaning of what MathLive writes. No browser or server code, so they can be tested directly.
import { displayName, normaliseName } from "@/lib/answer-reader";

export type PadTab = "problem" | "operations" | "relations" | "greek" | "trig" | "other";

export const padTabs: { id: PadTab; label: string }[] = [
  { id: "problem", label: "Problem" },
  { id: "operations", label: "Operations" },
  { id: "relations", label: "Relations" },
  { id: "greek", label: "Greek" },
  { id: "trig", label: "Trig" },
  { id: "other", label: "Other" },
];

export type PaletteItem = {
  id: string;
  /** What the button shows. */
  label: string;
  /** What a screen reader says. */
  name: string;
  /** What is inserted at the cursor. #@ is the selection and #? the place to type next. */
  insert: string;
  /** The tab the button lives on. */
  group: PadTab;
  /** False when the answer checker cannot read it, so answer fields hide it. Text and solution fields show everything. */
  readable?: boolean;
  /** Greek capitals sit behind "Show more". */
  more?: boolean;
};

const isGreek = (base: string) => displayName(base) !== base;

/** LaTeX for a declared symbol: theta_0 becomes \theta_{0}, k_B becomes k_{B}, x stays x. */
export function symbolToLatex(name: string): string {
  const [base, ...rest] = normaliseName(name).split("_");
  const sub = rest.join("_");
  return `${isGreek(base) ? `\\${base}` : base}${sub ? `_{${sub}}` : ""}`;
}

/** The palette buttons for the problem's own symbols, in the order the problem lists them. */
export function symbolItems(symbols: readonly string[]): PaletteItem[] {
  const seen = new Set<string>();
  const items: PaletteItem[] = [];
  for (const raw of symbols) {
    const name = normaliseName(raw);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const label = displayName(name);
    items.push({ id: `symbol-${name}`, label, name: `${label} symbol`, insert: symbolToLatex(name), group: "problem", readable: true });
  }
  return items;
}

const lower: [string, string][] = [
  ["α", "alpha"], ["β", "beta"], ["γ", "gamma"], ["δ", "delta"], ["ε", "varepsilon"], ["ζ", "zeta"], ["η", "eta"], ["θ", "theta"],
  ["ι", "iota"], ["κ", "kappa"], ["λ", "lambda"], ["μ", "mu"], ["ν", "nu"], ["ξ", "xi"], ["π", "pi"], ["ρ", "rho"], ["σ", "sigma"],
  ["τ", "tau"], ["υ", "upsilon"], ["φ", "varphi"], ["χ", "chi"], ["ψ", "psi"], ["ω", "omega"],
];
const upper: [string, string][] = [
  ["Γ", "Gamma"], ["Δ", "Delta"], ["Θ", "Theta"], ["Λ", "Lambda"], ["Ξ", "Xi"], ["Π", "Pi"], ["Σ", "Sigma"], ["Υ", "Upsilon"],
  ["Φ", "Phi"], ["Ψ", "Psi"], ["Ω", "Omega"],
];

const item = (group: PadTab, id: string, label: string, name: string, insert: string, readable = true, more = false): PaletteItem => ({
  id, label, name, insert, group, readable, ...(more ? { more } : {}),
});

/** The fixed part of the pad. `readable` says whether the answer checker can read what the button writes. */
export const standardItems: PaletteItem[] = [
  item("operations", "plus", "+", "+ plus", "+"),
  item("operations", "minus", "−", "− minus", "-"),
  item("operations", "times", "×", "× times", "\\times"),
  item("operations", "divide", "÷", "÷ divide", "\\div"),
  item("operations", "fraction", "a/b", "a/b fraction", "\\frac{#@}{#?}"),
  item("operations", "power", "xⁿ", "xⁿ power", "#@^{#?}"),
  item("operations", "subscript", "xₙ", "xₙ subscript", "#@_{#?}"),
  item("operations", "root", "√", "√ square root", "\\sqrt{#?}"),
  item("operations", "nthroot", "ⁿ√", "ⁿ√ nth root", "\\sqrt[#?]{#?}"),
  item("operations", "exp", "eˣ", "eˣ e to the power", "e^{#?}"),
  item("operations", "tenpow", "10ˣ", "10ˣ ten to the power", "10^{#?}"),
  item("operations", "ln", "ln", "ln natural logarithm", "\\ln(#?)"),
  item("operations", "log", "log₁₀", "log₁₀ base 10 logarithm", "\\log_{10}(#?)"),
  item("operations", "abs", "|x|", "|x| absolute value", "\\left|#?\\right|"),
  item("operations", "factorial", "!", "! factorial", "!", false),
  item("relations", "eq", "=", "= equals", "=", false),
  item("relations", "ne", "≠", "≠ not equal", "\\ne", false),
  item("relations", "lt", "<", "< less than", "<", false),
  item("relations", "gt", ">", "> greater than", ">", false),
  item("relations", "le", "≤", "≤ less than or equal", "\\le", false),
  item("relations", "ge", "≥", "≥ greater than or equal", "\\ge", false),
  item("relations", "approx", "≈", "≈ approximately", "\\approx", false),
  item("relations", "propto", "∝", "∝ proportional to", "\\propto", false),
  ...lower.map(([glyph, name]) => item("greek", `greek-${name}`, glyph, `${glyph} ${name}`, `\\${name}`)),
  ...upper.map(([glyph, name]) => item("greek", `greek-${name}`, glyph, `${glyph} capital ${name.toLowerCase()}`, `\\${name}`, true, true)),
  ...["sin", "cos", "tan"].map((f) => item("trig", f, f, `${f} ${{ sin: "sine", cos: "cosine", tan: "tangent" }[f]}`, `\\${f}(#?)`)),
  ...["sin", "cos", "tan"].map((f) => item("trig", `arc${f}`, `${f}⁻¹`, `${f}⁻¹ inverse ${{ sin: "sine", cos: "cosine", tan: "tangent" }[f]}`, `\\arc${f}(#?)`)),
  ...["sinh", "cosh", "tanh"].map((f) => item("trig", f, f, `${f} hyperbolic ${f.slice(0, -1)}`, `\\${f}(#?)`)),
  item("other", "infinity", "∞", "∞ infinity", "\\infty", false),
  item("other", "partial", "∂", "∂ partial derivative", "\\partial", false),
  item("other", "nabla", "∇", "∇ nabla", "\\nabla", false),
  item("other", "hbar", "ħ", "ħ h bar", "\\hbar"),
  item("other", "degree", "°", "° degrees", "^\\circ", false),
  item("other", "vec", "v⃗", "v⃗ vector arrow", "\\vec{#@}", false),
  item("other", "hat", "v̂", "v̂ unit vector hat", "\\hat{#@}", false),
  item("other", "dot", "·", "· dot product", "\\cdot"),
  item("other", "cross", "⨯", "⨯ cross product", "\\times"),
];

/** The pad for the problem's own symbols plus the fixed buttons. */
export function paletteItems(symbols: readonly string[]): PaletteItem[] {
  return [...symbolItems(symbols), ...standardItems];
}

/** The buttons an answer field may show: only what the checker can read. */
export function answerItems(items: readonly PaletteItem[]): PaletteItem[] {
  return items.filter((entry) => entry.readable !== false);
}

/** What to put in a plain text box when MathLive is not there: the placeholder marks are dropped. */
export function plainInsertion(insert: string): { text: string; caret: number } {
  const text = insert.replace(/#[@?0]/g, "");
  const brace = text.indexOf("{");
  const paren = text.indexOf("(");
  const inside = [brace, paren].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  return { text, caret: inside === undefined ? text.length : inside + 1 };
}

/** MathLive writes \left( and \right) around brackets. The reader does not need them and the answer limit counts them. */
export function cleanLatex(latex: string): string {
  return latex.replace(/\\(?:left|right)(?![A-Za-z])\s?/g, "").replace(/\\[,;:!]/g, "").replace(/\s+/g, " ").trim();
}

export type SymbolCondition = { symbol: string; assumptions: readonly string[]; min?: number; max?: number };

/** Short phrases such as "k > 0" or "50 ≤ u ≤ 150", one per symbol that has a declared condition. */
export function formatConditions(conditions: readonly SymbolCondition[]): string[] {
  return conditions.flatMap((condition) => {
    const name = displayName(normaliseName(condition.symbol));
    const { min, max } = condition;
    if (min !== undefined && max !== undefined) return [`${min} ≤ ${name} ≤ ${max}`];
    if (min !== undefined) return [`${name} ≥ ${min}`];
    if (max !== undefined) return [`${name} ≤ ${max}`];
    if (condition.assumptions.includes("positive")) return [`${name} > 0`];
    if (condition.assumptions.includes("nonnegative")) return [`${name} ≥ 0`];
    if (condition.assumptions.includes("nonzero")) return [`${name} ≠ 0`];
    return [];
  });
}
