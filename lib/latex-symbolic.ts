import "server-only";
import { Budget, rational, integer, plus, times, divide, neg, compare, power, type Q } from "./exact-expression-arithmetic";
import type { ArchiveKeyPart } from "./archive-grading/definitions";
import { structuralForm, type AnswerNode } from "./exact-latex-answer";

type ExpressionPart = Extract<ArchiveKeyPart, { kind: "expression" }>;
type Term = { coefficient: Q; powers: Map<number, number> };
type Polynomial = Map<string, Term>;
type Requirement = { node: AnswerNode; allowed: number };
const negative = 1, zero = 2, positive = 4, unknown = 7;
const Z = BigInt(0), O = BigInt(1), TWO = BigInt(2);
const number = (value: string): AnswerNode => ({ type: "number", value });
const operation = (op: string, ...args: AnswerNode[]): AnswerNode => ({ type: "operation", op, args });

function signProduct(a: number, b: number) {
  let result = 0;
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
    if ((a & (x < 0 ? negative : x > 0 ? positive : zero)) && (b & (y < 0 ? negative : y > 0 ? positive : zero))) {
      const value = x * y;
      result |= value < 0 ? negative : value > 0 ? positive : zero;
    }
  }
  return result;
}
function signSum(a: number, b: number) {
  let result = 0;
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) {
    if ((a & (x < 0 ? negative : x > 0 ? positive : zero)) && (b & (y < 0 ? negative : y > 0 ? positive : zero))) {
      result |= x * y < 0 ? unknown : x + y < 0 ? negative : x + y > 0 ? positive : zero;
    }
  }
  return result;
}
const qSign = (q: Q) => q.n < Z ? negative : q.n > Z ? positive : zero;

class ExactIdentities {
  readonly budget = new Budget();
  private atoms = new Map<string, number>();
  private signs: number[] = [];
  private squares = new Map<number, Polynomial>();
  private values = new WeakMap<AnswerNode, Q | null>();
  private signCache = new WeakMap<AnswerNode, number>();
  constructor(private readonly part: ExpressionPart) {}
  private limit(condition: boolean) {
    this.budget.tick();
    if (!condition) throw new Error("Symbolic proof limit");
  }
  private literal(text: string) {
    const [mantissa, exponent = "0"] = text.toLowerCase().split("e");
    const places = mantissa.includes(".") ? mantissa.length - mantissa.indexOf(".") - 1 : 0;
    const scale = places - Number(exponent);
    this.limit(Math.abs(scale) <= 164);
    let factor = O;
    for (let i = 0; i < Math.abs(scale); i++) { this.budget.tick(); factor *= BigInt(10); }
    const coefficient = BigInt(mantissa.replace(".", ""));
    return scale >= 0 ? rational(coefficient, factor, this.budget) : rational(coefficient * factor, O, this.budget);
  }
  private value(node: AnswerNode): Q | undefined {
    this.budget.tick();
    if (this.values.has(node)) return this.values.get(node) ?? undefined;
    let result: Q | undefined;
    if (node.type === "number") result = this.literal(node.value);
    else if (node.type === "operation") {
      const args = node.args.map((arg) => this.value(arg));
      if (args.every((arg): arg is Q => arg !== undefined)) {
        const [a, b] = args;
        switch (node.op) {
          case "Add": result = args.reduce((sum, q) => plus(sum, q, this.budget), integer(0)); break;
          case "Subtract": result = plus(a, neg(b), this.budget); break;
          case "Negate": result = neg(a); break;
          case "Multiply": result = args.reduce((product, q) => times(product, q, this.budget), integer(1)); break;
          case "Divide": result = divide(a, b, this.budget); break;
          case "Abs": result = a.n < Z ? neg(a) : a; break;
          case "Power":
            if (b.d === O && b.n >= BigInt(-8) && b.n <= BigInt(8) && (a.n !== Z || b.n > Z)) {
              result = b.n < Z ? divide(integer(1), power(a, Number(-b.n), this.budget), this.budget) : power(a, Number(b.n), this.budget);
            }
        }
      }
    }
    this.values.set(node, result ?? null);
    return result;
  }
  private sign(node: AnswerNode): number {
    this.budget.tick();
    const cached = this.signCache.get(node);
    if (cached !== undefined) return cached;
    const value = this.value(node);
    let result = unknown;
    if (value) result = qSign(value);
    else if (node.type === "symbol") {
      if (node.name === "pi" || node.name === "e") result = positive;
      else {
        const assumptions = this.part.symbols[Number(node.name.slice(1))]?.assumptions ?? [];
        result = assumptions.includes("positive") ? positive : assumptions.includes("nonnegative") ? zero | positive : assumptions.includes("nonzero") ? negative | positive : unknown;
      }
    } else if (node.type === "operation") {
      const signs = node.args.map((arg) => this.sign(arg));
      const [a, b] = signs;
      switch (node.op) {
        case "Add": result = signs.reduce(signSum, zero); break;
        case "Subtract": result = signSum(a, signProduct(negative, b)); break;
        case "Negate": result = signProduct(negative, a); break;
        case "Multiply": result = signs.reduce(signProduct, positive); break;
        case "Divide": result = signProduct(a, b & ~zero) || unknown; break;
        case "Abs": case "Sqrt": result = a === zero ? zero : a & zero ? zero | positive : positive; break;
        case "Root": {
          const index = this.value(node.args[1]);
          result = index && index.n % TWO !== Z ? a : a === zero ? zero : a & zero ? zero | positive : positive;
          break;
        }
        case "Power": {
          const exponent = this.value(node.args[1]);
          if (exponent?.d === O) result = exponent.n === Z ? positive : exponent.n % TWO === Z ? (a & zero && exponent.n > Z ? zero | positive : positive) : exponent.n < Z ? a & ~zero : a;
          else if (exponent) result = a & zero && exponent.n > Z ? zero | positive : positive;
          break;
        }
        case "Exp": case "Cosh": result = positive; break;
        case "Ln": case "Log": {
          const input = this.value(node.args[0]);
          if (input && input.n > Z) result = qSign(plus(input, integer(-1), this.budget));
          break;
        }
      }
    }
    this.signCache.set(node, result);
    return result;
  }
  requirements(node: AnswerNode, result = new Map<string, Requirement>()): Map<string, Requirement> {
    this.budget.tick();
    if (node.type !== "operation") return result;
    node.args.forEach((arg) => this.requirements(arg, result));
    const require = (arg: AnswerNode, allowed: number) => result.set(`${allowed}:${structuralForm(arg)}`, { node: arg, allowed });
    if (node.op === "Divide") require(node.args[1], negative | positive);
    if (node.op === "Sqrt") require(node.args[0], zero | positive);
    if (node.op === "Root" && this.value(node.args[1])!.n % TWO === Z) require(node.args[0], zero | positive);
    if (node.op === "Ln" || node.op === "Log") require(node.args[0], positive);
    if (node.op === "Tan" || node.op === "Cot") require(operation(node.op === "Tan" ? "Cos" : "Sin", node.args[0]), negative | positive);
    if (node.op === "Power") {
      const exponent = this.value(node.args[1]);
      this.limit(exponent !== undefined);
      if (exponent!.d !== O) require(node.args[0], exponent!.n < Z ? positive : zero | positive);
      else if (exponent!.n <= Z) require(node.args[0], negative | positive);
    }
    return result;
  }
  matchingDomains(a: Map<string, Requirement>, b: Map<string, Requirement>) {
    // Reviewed forms may contain physical domain guards not expressible as symbol
    // assumptions. Preserve those guards in both directions, never cancel them away.
    for (const [left, right] of [[a, b], [b, a]]) for (const [id, requirement] of left) {
      const signs = this.sign(requirement.node);
      if (!(signs & requirement.allowed)) return false;
      if ((signs & ~requirement.allowed) !== 0 && !right.has(id)) return false;
    }
    return true;
  }
  private monomial(powers: Map<number, number>) {
    return [...powers].filter(([, exponent]) => exponent !== 0).sort(([a], [b]) => a - b).map(([id, exponent]) => `${id}:${exponent}`).join(",");
  }
  scalar(coefficient: Q): Polynomial {
    return coefficient.n === Z ? new Map() : new Map([["", { coefficient, powers: new Map() }]]);
  }
  private insert(result: Polynomial, coefficient: Q, powers: Map<number, number>) {
    this.budget.tick();
    powers = new Map([...powers].filter(([, exponent]) => exponent !== 0));
    this.limit([...powers.values()].reduce((sum, exponent) => sum + Math.abs(exponent), 0) <= 32);
    for (const [id, exponent] of powers) {
      const square = this.squares.get(id);
      if (exponent >= 2 && square) {
        const rest = new Map(powers);
        rest.set(id, exponent - 2);
        for (const term of square.values()) {
          const combined = new Map(rest);
          for (const [atom, degree] of term.powers) combined.set(atom, (combined.get(atom) ?? 0) + degree);
          this.insert(result, times(coefficient, term.coefficient, this.budget), combined);
        }
        return;
      }
    }
    const id = this.monomial(powers);
    const existing = result.get(id);
    const sum = existing ? plus(existing.coefficient, coefficient, this.budget) : coefficient;
    if (sum.n === Z) result.delete(id);
    else result.set(id, { coefficient: sum, powers });
    this.limit(result.size <= 128);
  }
  add(a: Polynomial, b: Polynomial): Polynomial {
    const result = new Map(a);
    for (const term of b.values()) this.insert(result, term.coefficient, term.powers);
    return result;
  }
  private negative(a: Polynomial): Polynomial {
    return new Map([...a].map(([id, term]) => [id, { ...term, coefficient: neg(term.coefficient) }]));
  }
  subtract(a: Polynomial, b: Polynomial) { return this.add(a, this.negative(b)); }
  private multiply(a: Polynomial, b: Polynomial): Polynomial {
    const result: Polynomial = new Map();
    for (const x of a.values()) for (const y of b.values()) {
      const powers = new Map(x.powers);
      for (const [id, exponent] of y.powers) powers.set(id, (powers.get(id) ?? 0) + exponent);
      this.insert(result, times(x.coefficient, y.coefficient, this.budget), powers);
    }
    return result;
  }
  private atom(name: string, signs: number, square?: Polynomial): Polynomial {
    let id = this.atoms.get(name);
    if (id === undefined) {
      id = this.atoms.size;
      this.limit(id < 64);
      this.atoms.set(name, id);
      this.signs[id] = signs;
      if (square) this.squares.set(id, square);
    }
    return new Map([[`${id}:1`, { coefficient: integer(1), powers: new Map([[id, 1]]) }]]);
  }
  private inverse(value: Polynomial): Polynomial {
    this.limit(value.size > 0);
    if (value.size === 1) {
      const term = [...value.values()][0];
      return new Map([[this.monomial(new Map([...term.powers].map(([id, exponent]) => [id, -exponent]))), {
        coefficient: divide(integer(1), term.coefficient, this.budget), powers: new Map([...term.powers].map(([id, exponent]) => [id, -exponent])),
      }]]);
    }
    const signature = [...value].sort(([a], [b]) => a.localeCompare(b)).map(([id, term]) => `${id}=${term.coefficient.n}/${term.coefficient.d}`).join(";");
    const atom = this.atom(`denominator:${signature}`, this.polynomialSign(value));
    return this.inverse(atom);
  }
  private pow(value: Polynomial, exponent: number): Polynomial {
    this.limit(Math.abs(exponent) <= 8);
    if (exponent < 0) return this.pow(this.inverse(value), -exponent);
    let result = this.scalar(integer(1));
    for (let i = 0; i < exponent; i++) result = this.multiply(result, value);
    return result;
  }
  polynomialSign(value: Polynomial) {
    let result = zero;
    for (const term of value.values()) {
      let signs = qSign(term.coefficient);
      for (const [id, exponent] of term.powers) {
        let atom = this.signs[id];
        if (exponent < 0) atom &= ~zero;
        if (exponent % 2 === 0) atom = atom & zero ? zero | positive : positive;
        signs = signProduct(signs, atom);
      }
      result = signSum(result, signs);
    }
    return result;
  }
  private squareFactors(value: bigint) {
    let outside = O, inside = value;
    for (let n = 2; n <= 64; n++) {
      const factor = BigInt(n), square = factor * factor;
      while (inside > Z && inside % square === Z) { this.budget.tick(); inside /= square; outside *= factor; }
    }
    let lo = Z, hi = inside + O;
    while (hi - lo > O) {
      this.budget.tick();
      const mid = (lo + hi) / TWO;
      if (mid * mid <= inside) lo = mid;
      else hi = mid;
    }
    if (lo * lo === inside) { outside *= lo; inside = O; }
    return { outside, inside };
  }
  private root(arg: AnswerNode, depth: number): Polynomial {
    const value = this.value(arg);
    if (value) {
      this.limit(value.n >= Z);
      if (value.n === Z) return this.scalar(integer(0));
      const numerator = this.squareFactors(value.n), denominator = this.squareFactors(value.d);
      const radicand = rational(numerator.inside * denominator.inside, O, this.budget);
      const factor = rational(numerator.outside, denominator.outside * denominator.inside, this.budget);
      if (radicand.n === O) return this.scalar(factor);
      return this.multiply(this.scalar(factor), this.atom(`root:${radicand.n}`, positive, this.scalar(radicand)));
    }
    if (arg.type === "operation") {
      if (arg.op === "Power" && this.value(arg.args[1])?.n === TWO && this.value(arg.args[1])?.d === O) return this.lower(operation("Abs", arg.args[0]), depth + 1);
      if (arg.op === "Multiply" && arg.args.length === 2 && structuralForm(arg.args[0]) === structuralForm(arg.args[1])) return this.lower(operation("Abs", arg.args[0]), depth + 1);
      if (arg.op === "Multiply" && arg.args.every((node) => !(this.sign(node) & negative))) return arg.args.map((node) => this.root(node, depth + 1)).reduce((a, b) => this.multiply(a, b), this.scalar(integer(1)));
      if (arg.op === "Divide" && !(this.sign(arg.args[0]) & negative) && this.sign(arg.args[1]) === positive) return this.multiply(this.root(arg.args[0], depth + 1), this.inverse(this.root(arg.args[1], depth + 1)));
    }
    const square = this.lower(arg, depth + 1);
    return this.atom(`root:${structuralForm(arg)}`, this.sign(arg) & zero ? zero | positive : positive, square);
  }
  lower(node: AnswerNode, depth = 0): Polynomial {
    this.limit(depth <= 32);
    const value = this.value(node);
    if (value) return this.scalar(value);
    if (node.type === "symbol") return this.atom(`symbol:${node.name}`, this.sign(node));
    this.limit(node.type === "operation");
    if (node.type !== "operation") throw new Error("Unsupported symbolic node");
    const [a, b] = node.args;
    if (node.op === "Add") return node.args.map((arg) => this.lower(arg, depth + 1)).reduce((left, right) => this.add(left, right), this.scalar(integer(0)));
    if (node.op === "Subtract") return this.subtract(this.lower(a, depth + 1), this.lower(b, depth + 1));
    if (node.op === "Negate") return this.negative(this.lower(a, depth + 1));
    if (node.op === "Multiply") return node.args.map((arg) => this.lower(arg, depth + 1)).reduce((left, right) => this.multiply(left, right), this.scalar(integer(1)));
    if (node.op === "Divide") return this.multiply(this.lower(a, depth + 1), this.inverse(this.lower(b, depth + 1)));
    if (node.op === "Power") {
      const exponent = this.value(b);
      this.limit(exponent !== undefined);
      if (exponent!.d === O && exponent!.n >= BigInt(-8) && exponent!.n <= BigInt(8)) return this.pow(this.lower(a, depth + 1), Number(exponent!.n));
      if (exponent!.d === TWO && (exponent!.n === O || !(this.sign(a) & negative))) {
        const whole = Number((exponent!.n - O) / TWO);
        return this.multiply(this.pow(this.lower(a, depth + 1), whole), this.root(a, depth + 1));
      }
      return this.atom(`power:${structuralForm(a)}:${exponent!.n}/${exponent!.d}`, this.sign(node));
    }
    if (node.op === "Sqrt" || (node.op === "Root" && this.value(b)?.n === TWO)) return this.root(a, depth + 1);
    if (node.op === "Abs") {
      if (!(this.sign(a) & negative)) return this.lower(a, depth + 1);
      if (!(this.sign(a) & positive)) return this.negative(this.lower(a, depth + 1));
    }
    if (node.op === "Exp") {
      if (this.value(a)?.n === Z) return this.scalar(integer(1));
      if (a.type === "operation") {
        if (a.op === "Add") return a.args.map((arg) => this.lower(operation("Exp", arg), depth + 1)).reduce((left, right) => this.multiply(left, right), this.scalar(integer(1)));
        if (a.op === "Subtract") return this.lower(operation("Divide", operation("Exp", a.args[0]), operation("Exp", a.args[1])), depth + 1);
        if (a.op === "Negate") return this.inverse(this.lower(operation("Exp", a.args[0]), depth + 1));
        if (a.op === "Ln" && this.sign(a.args[0]) === positive) return this.lower(a.args[0], depth + 1);
      }
    }
    if (node.op === "Ln" || node.op === "Log") {
      const input = this.value(a);
      if (input && input.n === input.d) return this.scalar(integer(0));
      if (node.op === "Ln" && a.type === "symbol" && a.name === "e") return this.scalar(integer(1));
      if (node.op === "Ln" && a.type === "operation" && a.op === "Exp") return this.lower(a.args[0], depth + 1);
      if (a.type === "operation") {
        if (a.op === "Multiply" && a.args.every((arg) => this.sign(arg) === positive)) return a.args.map((arg) => this.lower(operation(node.op, arg), depth + 1)).reduce((left, right) => this.add(left, right), this.scalar(integer(0)));
        if (a.op === "Divide" && a.args.every((arg) => this.sign(arg) === positive)) return this.subtract(this.lower(operation(node.op, a.args[0]), depth + 1), this.lower(operation(node.op, a.args[1]), depth + 1));
        if (a.op === "Power" && this.sign(a.args[0]) === positive && this.value(a.args[1])) return this.multiply(this.scalar(this.value(a.args[1])!), this.lower(operation(node.op, a.args[0]), depth + 1));
      }
    }
    if (["Sin", "Cos", "Sinh", "Cosh"].includes(node.op)) {
      if (this.value(a)?.n === Z) return this.scalar(integer(node.op === "Cos" || node.op === "Cosh" ? 1 : 0));
      if (a.type === "operation" && a.op === "Negate") {
        const base = this.lower(operation(node.op, a.args[0]), depth + 1);
        return node.op === "Sin" || node.op === "Sinh" ? this.negative(base) : base;
      }
      if (node.op === "Sin" || node.op === "Cosh") {
        const complement = this.atom(`${node.op === "Sin" ? "Cos" : "Sinh"}:${structuralForm(a)}`, unknown);
        const squared = this.pow(complement, 2);
        const relation = node.op === "Sin" ? this.subtract(this.scalar(integer(1)), squared) : this.add(this.scalar(integer(1)), squared);
        return this.atom(`${node.op}:${structuralForm(a)}`, this.sign(node), relation);
      }
    }
    return this.atom(`${node.op}:${node.args.map(structuralForm).join("|")}`, this.sign(node));
  }
}

export function compareLatexExpressions(actual: AnswerNode, expected: AnswerNode, part: ExpressionPart): "correct" | "incorrect" | "inconclusive" {
  try {
    if (part.exclusions.length) return "inconclusive";
    const algebra = new ExactIdentities(part);
    if (!algebra.matchingDomains(algebra.requirements(actual), algebra.requirements(expected))) return "inconclusive";
    const right = algebra.lower(expected), left = algebra.lower(actual);
    const difference = algebra.subtract(left, right);
    if (!difference.size) return "correct";
    const signs = algebra.polynomialSign(difference);
    // A nonzero exact difference proves disagreement everywhere both reviewed
    // domains are defined. Independent opaque-atom samples are never evidence.
    return !(signs & zero) ? "incorrect" : "inconclusive";
  } catch {
    return "inconclusive";
  }
}
