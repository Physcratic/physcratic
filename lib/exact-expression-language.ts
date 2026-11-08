import "server-only";

export const symbolicLimits = Object.freeze({
  length: 180,
  tokens: 128,
  nodes: 96,
  depth: 16,
  variables: 8,
  terms: 128,
  degree: 16,
  exponent: 8,
  bits: 2048,
  operations: 40000,
  milliseconds: 100,
  witnesses: 64,
});
export type ReviewReason =
  | "symbolic-unsupported"
  | "symbolic-domain"
  | "symbolic-resource-limit"
  | "symbolic-inconclusive";
export class SymbolicReview extends Error {
  constructor(public reason: ReviewReason) {
    super(reason);
  }
}
export class Budget {
  private remaining = symbolicLimits.operations;
  private deadline = performance.now() + symbolicLimits.milliseconds;
  tick() {
    if (--this.remaining < 0 || performance.now() > this.deadline)
      throw new SymbolicReview("symbolic-resource-limit");
  }
}
const Z = BigInt(0),
  O = BigInt(1);
export type Q = { n: bigint; d: bigint };
export const abs = (n: bigint) => (n < Z ? -n : n);
export function rational(n: bigint, d: bigint, b: Budget): Q {
  b.tick();
  if (d === Z) throw new SymbolicReview("symbolic-domain");
  if (
    abs(n).toString(2).length > symbolicLimits.bits ||
    abs(d).toString(2).length > symbolicLimits.bits
  )
    throw new SymbolicReview("symbolic-resource-limit");
  if (d < Z) {
    n = -n;
    d = -d;
  }
  let x = abs(n),
    y = d;
  while (y !== Z) {
    b.tick();
    const r = x % y;
    x = y;
    y = r;
  }
  return { n: n / x, d: d / x };
}
export const integer = (n: number): Q => ({ n: BigInt(n), d: O });
export const neg = (a: Q): Q => ({ n: -a.n, d: a.d });
export const plus = (a: Q, c: Q, b: Budget) =>
  rational(a.n * c.d + c.n * a.d, a.d * c.d, b);
export const times = (a: Q, c: Q, b: Budget) =>
  rational(a.n * c.n, a.d * c.d, b);
export const divide = (a: Q, c: Q, b: Budget) =>
  rational(a.n * c.d, a.d * c.n, b);
export const compare = (a: Q, c: Q) => a.n * c.d - c.n * a.d;
export function power(a: Q, n: number, b: Budget): Q {
  let r = integer(1);
  for (let i = 0; i < n; i++) {
    b.tick();
    r = times(r, a, b);
  }
  return r;
}
function literal(text: string, b: Budget): Q {
  const [mantissa, exponentText] = text.toLowerCase().split("e"),
    exponent = exponentText ? Number(exponentText) : 0;
  const digits = mantissa.replace(".", ""),
    places = mantissa.includes(".")
      ? mantissa.length - mantissa.indexOf(".") - 1
      : 0;
  if (
    digits.length > 32 ||
    !Number.isInteger(exponent) ||
    Math.abs(exponent) > 24
  )
    throw new SymbolicReview("symbolic-resource-limit");
  const scale = places - exponent;
  let factor = O;
  for (let i = 0; i < Math.abs(scale); i++) {
    b.tick();
    factor *= BigInt(10);
  }
  return scale >= 0
    ? rational(BigInt(digits), factor, b)
    : rational(BigInt(digits) * factor, O, b);
}
// Bounds use their exact stored binary64 value, not a rounded decimal rendering.
export function binaryRational(value: number, b: Budget): Q {
  const data = new DataView(new ArrayBuffer(8));
  data.setFloat64(0, value);
  const bits = data.getBigUint64(0),
    e = Number((bits >> BigInt(52)) & BigInt(2047));
  const m = (bits & ((O << BigInt(52)) - O)) + (e ? O << BigInt(52) : Z),
    signed = bits >> BigInt(63) ? -m : m,
    shift = e ? e - 1075 : -1074;
  return shift >= 0
    ? rational(signed << BigInt(shift), O, b)
    : rational(signed, O << BigInt(-shift), b);
}
export type Ast =
  | { kind: "number"; value: Q }
  | { kind: "variable"; name: string }
  | { kind: "unary"; op: "+" | "-"; arg: Ast }
  | { kind: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Ast; right: Ast }
  | { kind: "call"; name: string; arg: Ast };
export function parseExpression(source: string, b: Budget): Ast {
  if (!source.trim() || source.length > symbolicLimits.length)
    throw new SymbolicReview("symbolic-resource-limit");
  const tokens: string[] = [];
  let offset = 0;
  while (offset < source.length) {
    b.tick();
    const rest = source.slice(offset),
      space = /^[ \t\r\n]+/.exec(rest);
    if (space) {
      offset += space[0].length;
      continue;
    }
    const token =
      /^(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z][A-Za-z0-9_]{0,31}|[+*/^()\-])/.exec(
        rest,
      )?.[0];
    if (!token) throw new SymbolicReview("symbolic-unsupported");
    tokens.push(token);
    offset += token.length;
    if (tokens.length > symbolicLimits.tokens)
      throw new SymbolicReview("symbolic-resource-limit");
  }
  let i = 0,
    nodes = 0;
  const node = (value: Ast): Ast => {
    b.tick();
    if (++nodes > symbolicLimits.nodes)
      throw new SymbolicReview("symbolic-resource-limit");
    return value;
  };
  function expression(min: number, depth: number): Ast {
    b.tick();
    if (depth > symbolicLimits.depth)
      throw new SymbolicReview("symbolic-resource-limit");
    const token = tokens[i++];
    let left: Ast;
    if (token === "+" || token === "-")
      left = node({ kind: "unary", op: token, arg: expression(25, depth + 1) });
    else if (token === "(") {
      left = expression(0, depth + 1);
      if (tokens[i++] !== ")") throw new SymbolicReview("symbolic-unsupported");
    } else if (token && /^[\d.]/.test(token))
      left = node({ kind: "number", value: literal(token, b) });
    else if (token && /^[A-Za-z]/.test(token)) {
      if (tokens[i] === "(") {
        i++;
        if (!["sqrt", "abs", "sin", "cos", "tan", "log"].includes(token))
          throw new SymbolicReview("symbolic-unsupported");
        const arg = expression(0, depth + 1);
        if (tokens[i++] !== ")")
          throw new SymbolicReview("symbolic-unsupported");
        left = node({ kind: "call", name: token, arg });
      } else left = node({ kind: "variable", name: token });
    } else throw new SymbolicReview("symbolic-unsupported");
    while (i < tokens.length) {
      const op = tokens[i],
        precedence =
          op === "+" || op === "-"
            ? 10
            : op === "*" || op === "/"
              ? 20
              : op === "^"
                ? 30
                : -1;
      if (precedence < min) break;
      i++;
      const right = expression(
        op === "^" ? precedence : precedence + 1,
        depth + 1,
      );
      left = node({
        kind: "binary",
        op: op as "+" | "-" | "*" | "/" | "^",
        left,
        right,
      });
    }
    return left;
  }
  const root = expression(0, 1);
  if (i !== tokens.length) throw new SymbolicReview("symbolic-unsupported");
  // Left-associated flat expressions also count toward the actual AST depth.
  function check(a: Ast, depth: number) {
    b.tick();
    if (depth > symbolicLimits.depth)
      throw new SymbolicReview("symbolic-resource-limit");
    if (a.kind === "binary") {
      check(a.left, depth + 1);
      check(a.right, depth + 1);
    } else if (a.kind === "unary" || a.kind === "call") check(a.arg, depth + 1);
  }
  check(root, 1);
  return root;
}
export function constant(a: Ast, b: Budget): Q {
  b.tick();
  if (a.kind === "number") return a.value;
  if (a.kind === "unary") {
    const v = constant(a.arg, b);
    return a.op === "-" ? neg(v) : v;
  }
  if (a.kind !== "binary") throw new SymbolicReview("symbolic-unsupported");
  const x = constant(a.left, b),
    y = constant(a.right, b);
  if (a.op === "+") return plus(x, y, b);
  if (a.op === "-") return plus(x, neg(y), b);
  if (a.op === "*") return times(x, y, b);
  if (a.op === "/") return divide(x, y, b);
  const exponent = integerExponent(y);
  if (exponent === 0 && x.n === Z) throw new SymbolicReview("symbolic-domain");
  return exponent < 0
    ? divide(integer(1), power(x, -exponent, b), b)
    : power(x, exponent, b);
}
export function integerExponent(q: Q) {
  if (q.d !== O || abs(q.n) > BigInt(symbolicLimits.exponent))
    throw new SymbolicReview("symbolic-resource-limit");
  return Number(q.n);
}
