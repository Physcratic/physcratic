// Test helper: writes equal forms and wrong forms of a reference answer from its parsed tree.
// It rewrites any expression the same way (swap terms and factors, a/b as a*b^-1, sqrt as a power, plain or LaTeX
// style) and knows nothing about any problem. Used by lib/archive-grading-sampled.test.ts and the Phase 1 audit.
import { SymbolTable, readTree, type ExprNode } from "../lib/answer-reader";

export type Style = "plain" | "latex";

function generator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = <T,>(items: T[], random: () => number) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
};

export function flattenSum(node: ExprNode): { negative: boolean; term: ExprNode }[] {
  if (node.t === "bin" && node.op === "+") return [...flattenSum(node.a), ...flattenSum(node.b)];
  if (node.t === "bin" && node.op === "-") return [...flattenSum(node.a), ...flattenSum(node.b).map((x) => ({ ...x, negative: !x.negative }))];
  if (node.t === "neg") return flattenSum(node.a).map((x) => ({ ...x, negative: !x.negative }));
  return [{ negative: false, term: node }];
}
export function flattenProduct(node: ExprNode): ExprNode[] {
  if (node.t === "bin" && node.op === "*") return [...flattenProduct(node.a), ...flattenProduct(node.b)];
  return [node];
}

/** Writes `node` as text. `symbols[i]` is how symbol i is written in this style. */
export function print(node: ExprNode, symbols: readonly string[], style: Style, random: () => number): string {
  const p = (n: ExprNode) => print(n, symbols, style, random);
  const wrap = (text: string) => (style === "latex" ? `\\left(${text}\\right)` : `(${text})`);
  switch (node.t) {
    case "num": {
      const text = String(node.v);
      const written = style === "latex" && /e/.test(text) ? text.replace(/^(.*)e([+-]?\d+)$/, (_m, m, e) => `${m}\\times10^{${Number(e)}}`) : text;
      return node.v < 0 ? wrap(written) : written;
    }
    case "sym": return symbols[node.i];
    case "neg": return random() < 0.5 ? `-${wrap(p(node.a))}` : style === "latex" ? `\\left(-1\\right)\\cdot${wrap(p(node.a))}` : `(-1)*${wrap(p(node.a))}`;
    case "fn": {
      if (node.f === "sqrt") {
        const inner = p(node.a);
        if (random() < 0.5) return style === "latex" ? `{${wrap(inner)}}^{\\frac{1}{2}}` : `${wrap(inner)}^(1/2)`;
        return style === "latex" ? `\\sqrt{${inner}}` : `sqrt(${inner})`;
      }
      if (node.f === "abs") return style === "latex" ? `\\left|${p(node.a)}\\right|` : `abs(${p(node.a)})`;
      const name = ({ asin: "arcsin", acos: "arccos", atan: "arctan" } as Record<string, string>)[node.f] ?? node.f;
      return style === "latex" ? `\\${name}${wrap(p(node.a))}` : `${name}(${p(node.a)})`;
    }
    case "root": return `\\sqrt[${p(node.n)}]{${p(node.a)}}`;
    case "bin": {
      if (node.op === "+" || node.op === "-") {
        const terms = shuffle(flattenSum(node), random);
        return terms.map((t, i) => `${t.negative ? "-" : i ? "+" : ""}${wrap(p(t.term))}`).join("");
      }
      if (node.op === "*") return shuffle(flattenProduct(node), random).map((f) => wrap(p(f))).join(style === "latex" ? "\\cdot " : "*");
      if (node.op === "/") {
        const mode = random();
        if (mode < 0.4) return style === "latex" ? `${wrap(p(node.a))}\\cdot${wrap(p(node.b))}^{-1}` : `${wrap(p(node.a))}*${wrap(p(node.b))}^(-1)`;
        if (mode < 0.7) return style === "latex" ? `\\frac{${p(node.a)}}{${p(node.b)}}` : `${wrap(p(node.a))}/${wrap(p(node.b))}`;
        return style === "latex" ? `${wrap(p(node.b))}^{-1}\\cdot${wrap(p(node.a))}` : `${wrap(p(node.b))}^(-1)*${wrap(p(node.a))}`;
      }
      return style === "latex" ? `${wrap(p(node.a))}^{${p(node.b)}}` : `${wrap(p(node.a))}^(${p(node.b)})`;
    }
  }
}

export type Variants = { equal: string[]; wrong: string[] };

/**
 * Equal and wrong forms of `reference`. `latexSymbols` are the declared spellings, in table order.
 * Returns null when the reference cannot be read.
 */
export function variantsOf(reference: string, declared: readonly string[], latexSymbols: readonly string[], seed: number): Variants | null {
  const table = new SymbolTable(declared, true);
  let tree: ExprNode;
  try { tree = readTree(reference, table); } catch { return null; }
  const plainNames = table.names;
  const latexNames = plainNames.map((name, i) => latexSymbols[i] ?? name.replace(/_(.+)$/, "_{$1}"));
  const equal: string[] = [];
  for (let n = 0; n < 6; n++) {
    const style: Style = n % 2 ? "latex" : "plain";
    equal.push(print(tree, style === "latex" ? latexNames : plainNames.map((name) => name.replace(/^(.*?)_(.+)$/, "$1_{$2}")), style, generator(seed * 31 + n)));
  }
  const text = (t: ExprNode) => print(t, plainNames.map((name) => name.replace(/^(.*?)_(.+)$/, "$1_{$2}")), "plain", generator(seed));
  const wrong = [
    `-(${text(tree)})`,
    `2*(${text(tree)})`,
    `(${text(tree)})*1.01`,
    `(${text(tree)})*(1+1e-4)`,
    `(${text(tree)})+(${text(tree)})*1e-3`,
  ];
  return { equal, wrong };
}

/** Number written in other ways. */
export function numberVariants(target: number): string[] {
  const [mantissa, exponent] = target.toExponential(14).split("e");
  return [String(target), target.toPrecision(15), `${mantissa}\\times10^{${Number(exponent)}}`, `${mantissa}*10^${Number(exponent)}`, `${mantissa}e${Number(exponent)}`];
}
