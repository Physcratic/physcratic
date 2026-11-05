// Pure helpers for the answer field: the palette buttons, how a declared symbol is written, the conditions line and
// the cleaning of what MathLive writes. No browser or server code, so they can be tested directly.
import { displayName, normaliseName } from "@/lib/answer-reader";

export type PaletteItem = {
  id: string;
  /** What the button shows. */
  label: string;
  /** What a screen reader says. */
  name: string;
  /** What is inserted at the cursor. #@ is the selection and #? the place to type next. */
  insert: string;
  group: "symbol" | "structure" | "greek" | "function";
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
    items.push({ id: `symbol-${name}`, label, name: `${label} symbol`, insert: symbolToLatex(name), group: "symbol" });
  }
  return items;
}

const greekLetters: [string, string][] = [
  ["α", "alpha"], ["β", "beta"], ["γ", "gamma"], ["δ", "delta"], ["ε", "varepsilon"], ["θ", "theta"], ["λ", "lambda"],
  ["μ", "mu"], ["ρ", "rho"], ["σ", "sigma"], ["τ", "tau"], ["φ", "varphi"], ["ω", "omega"],
];

/** The fixed part of the palette: structure, Greek letters, functions and constants. */
export const standardItems: PaletteItem[] = [
  { id: "fraction", label: "a/b", name: "a/b fraction", insert: "\\frac{#@}{#?}", group: "structure" },
  { id: "power", label: "xⁿ", name: "xⁿ power", insert: "#@^{#?}", group: "structure" },
  { id: "root", label: "√", name: "√ square root", insert: "\\sqrt{#?}", group: "structure" },
  { id: "subscript", label: "xₙ", name: "xₙ subscript", insert: "#@_{#?}", group: "structure" },
  ...greekLetters.map(([glyph, name]): PaletteItem => ({ id: `greek-${name}`, label: glyph, name: `${glyph} ${name}`, insert: `\\${name}`, group: "greek" })),
  { id: "sin", label: "sin", name: "sin sine", insert: "\\sin(#?)", group: "function" },
  { id: "cos", label: "cos", name: "cos cosine", insert: "\\cos(#?)", group: "function" },
  { id: "tan", label: "tan", name: "tan tangent", insert: "\\tan(#?)", group: "function" },
  { id: "pi", label: "π", name: "π pi", insert: "\\pi", group: "function" },
  { id: "e", label: "e", name: "e, the base of natural logarithms", insert: "e", group: "function" },
  { id: "ln", label: "ln", name: "ln natural logarithm", insert: "\\ln(#?)", group: "function" },
];

/** Problem symbols first, then fraction, power, root, subscript, Greek letters, sin, cos, tan, pi, e and ln. */
export function paletteItems(symbols: readonly string[]): PaletteItem[] {
  return [...symbolItems(symbols), ...standardItems];
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
