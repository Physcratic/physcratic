import "server-only";
import { ComputeEngine } from "@cortex-js/compute-engine";
import { archiveAnswerLimit } from "./archive-grading-contracts";
import type { ArchiveSymbol } from "./archive-grading/definitions";
import { Budget, rational, integer, plus, times, divide, neg, power, binaryRational, type Q } from "./exact-expression-language";

export type AnswerNode =
  | { type: "number"; value: string }
  | { type: "symbol"; name: string }
  | { type: "infinity" }
  | { type: "operation"; op: string; args: AnswerNode[] };
export class LatexAnswerError extends Error {}
const engine = new ComputeEngine();
const commands = new Set("frac dfrac tfrac sqrt cdot times left right big bigl bigr Big Bigl Bigr sin cos tan cot sinh cosh tanh exp ln log operatorname mathrm infty pi hbar alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta kappa lambda mu nu xi rho sigma tau phi varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Phi Psi Omega vert lvert rvert".split(" "));
const spacingCommands = new Map([
  [",", ","], [":", ":"], [";", ";"], ["!", "!"], [" ", " "],
  ["quad", "quad"], ["qquad", "qquad"], ["enspace", "enspace"],
  ["thinspace", ","], ["medspace", ":"], ["thickspace", ";"],
]);
const arities: Record<string, number | "many"> = { Add: "many", Multiply: "many", InvisibleOperator: "many", Subtract: 2, Divide: 2, Rational: 2, Negate: 1, Power: 2, Sqrt: 1, Root: 2, Sin: 1, Cos: 1, Tan: 1, Cot: 1, Sinh: 1, Cosh: 1, Tanh: 1, Exp: 1, Ln: 1, Log: 1, Abs: 1, Sign: 1, Delimiter: 1 };
const aliasCache = new WeakMap<ArchiveSymbol[], Map<string, string>>();
function aliasesFor(symbols: ArchiveSymbol[]) {
  let aliases = aliasCache.get(symbols);
  if (aliases) return aliases;
  aliases = new Map();
  symbols.forEach((symbol, index) => {
    for (const latex of [symbol.latex, ...symbol.aliases]) {
      const parsed = engine.parse(latex, { form: "raw" });
      const raw = parsed.json;
      if (parsed.errors.length || typeof raw !== "string") throw new Error(`Invalid catalog symbol ${latex}`);
      if (aliases!.has(raw) && aliases!.get(raw) !== `v${index}`) throw new Error("Ambiguous catalog alias");
      aliases!.set(raw, `v${index}`);
    }
  });
  aliasCache.set(symbols, aliases);
  return aliases;
}
export function parseLatexAnswer(input: string, symbols: ArchiveSymbol[] = [], allowInfinity = false): AnswerNode {
  if (!input.trim() || input.length > archiveAnswerLimit) throw new LatexAnswerError("Enter a single result of at most 1024 characters.");
  const source = input.replace(/\\([a-zA-Z]+|[^a-zA-Z]|$)/g, (match, command: string) => {
    const spacing = spacingCommands.get(command);
    if (spacing !== undefined) return `\\${spacing}`;
    if (!commands.has(command)) throw new LatexAnswerError("Unsupported or incomplete LaTeX command. Use ordinary arithmetic and the listed symbols.");
    return match;
  });
  if (/[^a-zA-Z0-9\\{}()[\].,+\-*/^_|\s]/u.test(source.replace(/\\[,;!: ]/g, " "))) throw new LatexAnswerError("Enter the result only, without dollar delimiters, equations, units, or programming constructs.");
  let depth = 0;
  for (const char of source) {
    if ("{([".includes(char) && ++depth > 16) throw new LatexAnswerError("The expression is too deeply nested. Use a simpler final result.");
    if ("})]".includes(char) && --depth < 0) throw new LatexAnswerError("Check the grouping delimiters.");
  }
  if (depth !== 0) throw new LatexAnswerError("Close every grouping delimiter.");
  if ((source.match(/[+*/^\-]|\\(?:frac|sqrt)/g) ?? []).length > 96 || /\d{33}/.test(source)) throw new LatexAnswerError("The expression exceeds the grading resource limits.");
  for (const match of source.matchAll(/\d(?:\.\d*)?e([+-]?\d+)/gi)) {
    if (Math.abs(Number(match[1])) > 100) throw new LatexAnswerError("Use scientific-notation exponents between −100 and 100.");
  }
  const aliases = aliasesFor(symbols);
  // Keep spacing tokens until after parsing so fraction and root arguments stay intact.
  const parsed = engine.parse(source, { form: "raw" });
  if (parsed.errors.length) throw new LatexAnswerError("The LaTeX could not be parsed. Check fractions, roots, and grouping.");
  let nodes = 0;
  function convert(raw: unknown, level: number): AnswerNode {
    if (++nodes > 96 || level > 16) throw new LatexAnswerError("The expression exceeds the grading resource limits.");
    if (typeof raw === "number" || (raw && typeof raw === "object" && !Array.isArray(raw) && "num" in raw)) {
      const text = typeof raw === "number" ? String(raw) : String((raw as { num: unknown }).num);
      if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || text.length > 64 || !Number.isFinite(Number(text)) || Math.abs(Number(text.split(/e/i)[1] ?? 0)) > 100) throw new LatexAnswerError("Use finite numbers with bounded exponents and precision.");
      return { type: "number", value: text };
    }
    if (typeof raw === "string") {
      const declared = aliases.get(raw);
      if (declared) return { type: "symbol", name: declared };
      if (raw === "Pi") return { type: "symbol", name: "pi" };
      if (raw === "ExponentialE") return { type: "symbol", name: "e" };
      if (raw === "PositiveInfinity" && allowInfinity && /^\+?\\infty$/.test(source.replace(/\s/g, ""))) return { type: "infinity" };
      throw new LatexAnswerError("Undeclared symbol or nonfinite value. Use the listed notation and omit unit suffixes.");
    }
    if (Array.isArray(raw) && raw[0] === "InvisibleOperator") {
      const factors = raw.slice(1).filter((item) => !(Array.isArray(item) && item[0] === "HorizontalSpacing" && item.length === 2 && typeof item[1] === "number"));
      if (factors.length === 1) return convert(factors[0], level + 1);
      raw = ["InvisibleOperator", ...factors];
    }
    if (Array.isArray(raw) && raw.length === 2 && typeof raw[0] === "string" && aliases.has(raw[0])) {
      return { type: "operation", op: "Multiply", args: [convert(raw[0], level + 1), convert(raw[1], level + 1)] };
    }
    if (!Array.isArray(raw) || typeof raw[0] !== "string" || !Object.hasOwn(arities, raw[0])) throw new LatexAnswerError("Unsupported construct. Enter one expression, not an assignment, list, block, derivative, or piecewise expression.");
    const arity = arities[raw[0]];
    if ((arity === "many" && raw.length < 3) || (arity !== "many" && raw.length !== arity + 1)) throw new LatexAnswerError("Unsupported expression structure.");
    const args = raw.slice(1).map((node) => convert(node, level + 1));
    if (raw[0] === "Delimiter") return args[0];
    const node: AnswerNode = { type: "operation", op: raw[0] === "InvisibleOperator" ? "Multiply" : raw[0] === "Rational" ? "Divide" : raw[0], args };
    if (node.op === "Power") {
      if (args[0].type === "symbol" && args[0].name === "e") return { type: "operation", op: "Exp", args: [args[1]] };
      const exponent = constantValue(args[1]);
      if (Math.abs(exponent) > 100) throw new LatexAnswerError("The exponent is too large.");
    }
    if (node.op === "Root") {
      const index = constantValue(args[1]);
      if (!Number.isInteger(index) || index < 2 || index > 8) throw new LatexAnswerError("Use a root index between 2 and 8.");
    }
    return node;
  }
  return convert(parsed.json, 0);
}

export function constantValue(node: AnswerNode): number {
  const budget = new Budget();
  const zero = BigInt(0), one = BigInt(1), ten = BigInt(10);
  function valueOf(value: Q): number {
    const result = Number(value.n) / Number(value.d);
    if (!Number.isFinite(result) || (result === 0 && value.n !== zero) || Math.abs(result) > 1e100) throw new LatexAnswerError("The result exceeds the checker’s finite magnitude or precision limits.");
    return result;
  }
  function evaluate(value: AnswerNode): Q {
    budget.tick();
    if (value.type === "number") {
      const [mantissa, exponent = "0"] = value.value.toLowerCase().split("e");
      const places = mantissa.includes(".") ? mantissa.length - mantissa.indexOf(".") - 1 : 0;
      const scale = places - Number(exponent);
      const coefficient = BigInt(mantissa.replace(".", ""));
      let factor = one;
      for (let i = 0; i < Math.abs(scale); i++) { budget.tick(); factor *= ten; }
      return scale >= 0 ? rational(coefficient, factor, budget) : rational(coefficient * factor, one, budget);
    }
    if (value.type === "symbol") {
      if (value.name === "pi") return binaryRational(Math.PI, budget);
      if (value.name === "e") return binaryRational(Math.E, budget);
      throw new LatexAnswerError("A numeric answer cannot contain variables.");
    }
    if (value.type !== "operation") throw new LatexAnswerError("This answer requires a finite value.");
    const values = value.args.map(evaluate);
    const [a, b] = values;
    switch (value.op) {
      case "Add": return values.reduce((sum, term) => plus(sum, term, budget), integer(0));
      case "Subtract": return plus(a, neg(b), budget);
      case "Multiply": return values.reduce((product, term) => times(product, term, budget), integer(1));
      case "Divide": if (b.n === zero) throw new LatexAnswerError("Division by zero is not defined."); return divide(a, b, budget);
      case "Negate": return neg(a);
      case "Abs": return a.n < zero ? neg(a) : a;
      case "Sqrt":
      case "Root": {
        const index = value.op === "Sqrt" ? 2 : valueOf(b);
        if (a.n < zero && index % 2 === 0) throw new LatexAnswerError("Use a real-valued root.");
        const input = valueOf(a);
        const result = input < 0 ? -((-input) ** (1 / index)) : input ** (1 / index);
        if (!Number.isFinite(result) || (result === 0 && a.n !== zero)) throw new LatexAnswerError("The root exceeds the checker’s magnitude limits.");
        return binaryRational(result, budget);
      }
      case "Power": {
        const exponent = valueOf(b);
        if (Math.abs(exponent) > 100 || (a.n === zero && exponent <= 0) || (a.n < zero && b.d !== one)) throw new LatexAnswerError("Undefined power or exponent outside the grading limit.");
        if (b.d === one) return exponent >= 0 ? power(a, exponent, budget) : divide(integer(1), power(a, -exponent, budget), budget);
        const result = valueOf(a) ** exponent;
        if (!Number.isFinite(result) || (result === 0 && a.n !== zero)) throw new LatexAnswerError("The power exceeds the checker’s magnitude limits.");
        return binaryRational(result, budget);
      }
      default: throw new LatexAnswerError("For a numeric answer use constants, fractions, roots, and arithmetic; do not include functions or units.");
    }
  }
  return valueOf(evaluate(node));
}

// Only reorders associative/commutative operations. It never cancels factors,
// removes zero terms, changes roots, or discards a denominator/domain guard.
export function structuralForm(node: AnswerNode): string {
  function normalize(value: AnswerNode): unknown {
    if (value.type !== "operation") return value;
    if (value.op === "Negate") return normalize({ type: "operation", op: "Multiply", args: [{ type: "number", value: "-1" }, value.args[0]] });
    if (value.op === "Subtract") return normalize({ type: "operation", op: "Add", args: [value.args[0], { type: "operation", op: "Negate", args: [value.args[1]] }] });
    const items: AnswerNode[] = [];
    const op = value.op;
    function flatten(child: AnswerNode) {
      if ((op === "Add" || op === "Multiply") && child.type === "operation" && child.op === op) child.args.forEach(flatten);
      else items.push(child);
    }
    value.args.forEach(flatten);
    const args = items.map(normalize);
    if (value.op === "Add" || value.op === "Multiply") args.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return [value.op, ...args];
  }
  return JSON.stringify(normalize(node));
}

export function algebraExpression(node: AnswerNode): string | null {
  if (node.type === "number") return node.value;
  if (node.type === "symbol") return /^v\d+$/.test(node.name) ? node.name : null;
  if (node.type !== "operation") return null;
  const args = node.args.map(algebraExpression);
  if (args.some((value) => value === null)) return null;
  if (node.op === "Negate") return `(-${args[0]})`;
  if (node.op === "Sqrt" || node.op === "Abs") return `${node.op === "Sqrt" ? "sqrt" : "abs"}(${args[0]})`;
  const operator = ({ Add: "+", Subtract: "-", Multiply: "*", Divide: "/", Power: "^" } as Record<string, string>)[node.op];
  return operator ? `(${args.join(operator)})` : null;
}
