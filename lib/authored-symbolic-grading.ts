import "server-only";
import { authoredKeySchema, type AuthoredKey } from "./problem-authoring";
import {
  authoredAnswerSchema,
  type GradeEvaluation,
} from "./authored-grading-contracts";
import {
  Budget,
  SymbolicReview,
  symbolicLimits as L,
  parseExpression,
  constant,
  integerExponent,
  binaryRational,
  rational,
  integer,
  plus,
  times,
  divide,
  compare,
  neg,
  abs,
  power,
  type Q,
  type Ast,
} from "./authored-expression-language";

type Key = Extract<AuthoredKey, { kind: "expression" }>;
type Domain = {
  name: string;
  lo: Q | null;
  hi: Q | null;
  positive: boolean;
  excluded: Q[];
  points: Q[];
};
type Interval = { lo: Q | null; hi: Q | null };
type Term = { powers: number[]; q: Q };
type Poly = Map<string, Term>;
type Fraction = { n: Poly; d: Poly };
const Z = BigInt(0),
  O = BigInt(1);
const eq = (a: Q, c: Q) => compare(a, c) === Z;
function member(d: Domain, q: Q) {
  return (
    (!d.lo || compare(q, d.lo) >= Z) &&
    (!d.hi || compare(q, d.hi) <= Z) &&
    (!d.positive || q.n > Z) &&
    !d.excluded.some((e) => eq(e, q))
  );
}
function domains(key: Key, b: Budget): Domain[] {
  if (key.variables.length > L.variables)
    throw new SymbolicReview("symbolic-resource-limit");
  const ds = key.variables.map((v) => {
    let lo = v.min === undefined ? null : binaryRational(v.min, b);
    const hi = v.max === undefined ? null : binaryRational(v.max, b);
    if (
      v.assumptions.includes("positive") ||
      v.assumptions.includes("nonnegative")
    )
      if (!lo || lo.n < Z) lo = integer(0);
    return {
      name: v.name,
      lo,
      hi,
      positive: v.assumptions.includes("positive"),
      excluded: v.assumptions.includes("nonzero") ? [integer(0)] : [],
      points: [] as Q[],
    };
  });
  for (const text of key.exclusions) {
    b.tick();
    const m = /^\s*([A-Za-z][A-Za-z0-9_]{0,31})\s*!=\s*(.+?)\s*$/.exec(text);
    const d = m && ds.find((d) => d.name === m[1]);
    if (!m || !d) throw new SymbolicReview("symbolic-domain");
    d.excluded.push(constant(parseExpression(m[2], b), b));
  }
  for (const d of ds) {
    if (d.lo && d.hi && compare(d.lo, d.hi) > Z)
      throw new SymbolicReview("symbolic-domain");
    const add = (q: Q) => {
      b.tick();
      if (member(d, q) && !d.points.some((p) => eq(p, q))) d.points.push(q);
    };
    for (const n of [0, 1, -1, 2, -2]) add(integer(n));
    if (d.lo) add(d.lo);
    if (d.hi) add(d.hi);
    // >20 distinct interior points suffice to establish a nonempty interval after
    // all <=20 declared exclusions (+ nonzero/positive zero) are removed.
    for (let i = 1; i <= 24; i++) {
      if (d.lo && d.hi)
        add(
          plus(
            d.lo,
            times(
              plus(d.hi, neg(d.lo), b),
              rational(BigInt(i), BigInt(25), b),
              b,
            ),
            b,
          ),
        );
      else if (d.lo) add(plus(d.lo, integer(i), b));
      else if (d.hi) add(plus(d.hi, integer(-i), b));
      else {
        add(integer(i));
        add(integer(-i));
      }
    }
    if (!d.points.length) throw new SymbolicReview("symbolic-domain");
  }
  return ds;
}
// Closed rational interval enclosures. Null denotes the corresponding infinity.
function addRange(a: Interval, c: Interval, b: Budget): Interval {
  return {
    lo: a.lo && c.lo ? plus(a.lo, c.lo, b) : null,
    hi: a.hi && c.hi ? plus(a.hi, c.hi, b) : null,
  };
}
type End = Q | "-inf" | "+inf";
const sign = (q: End) =>
  typeof q === "string"
    ? q === "-inf"
      ? -1
      : 1
    : q.n < Z
      ? -1
      : q.n > Z
        ? 1
        : 0;
function endCompare(a: End, c: End) {
  if (a === c) return 0;
  if (a === "-inf" || c === "+inf") return -1;
  if (a === "+inf" || c === "-inf") return 1;
  const v = compare(a as Q, c as Q);
  return v < Z ? -1 : v > Z ? 1 : 0;
}
function multiplyRange(a: Interval, c: Interval, b: Budget): Interval {
  const result: End[] = [];
  for (const x of [a.lo ?? "-inf", a.hi ?? "+inf"] as End[])
    for (const y of [c.lo ?? "-inf", c.hi ?? "+inf"] as End[]) {
      b.tick();
      const s = sign(x) * sign(y);
      result.push(
        s === 0
          ? integer(0)
          : typeof x === "string" || typeof y === "string"
            ? s < 0
              ? "-inf"
              : "+inf"
            : times(x, y, b),
      );
    }
  result.sort(endCompare);
  return {
    lo: typeof result[0] === "string" ? null : (result[0] as Q),
    hi: typeof result[3] === "string" ? null : (result[3] as Q),
  };
}
function powerRange(a: Interval, n: number, b: Budget): Interval {
  if (n === 0) return { lo: integer(1), hi: integer(1) };
  if (n % 2)
    return {
      lo: a.lo ? power(a.lo, n, b) : null,
      hi: a.hi ? power(a.hi, n, b) : null,
    };
  const crosses = (!a.lo || a.lo.n <= Z) && (!a.hi || a.hi.n >= Z),
    lo = a.lo ? power(a.lo, n, b) : null,
    hi = a.hi ? power(a.hi, n, b) : null;
  return {
    lo: crosses
      ? integer(0)
      : lo && hi
        ? compare(lo, hi) < Z
          ? lo
          : hi
        : (lo ?? hi),
    hi: lo && hi ? (compare(lo, hi) > Z ? lo : hi) : null,
  };
}
class Algebra {
  readonly guards: Poly[] = [];
  constructor(
    readonly ds: Domain[],
    readonly b: Budget,
  ) {}
  scalar(q: Q): Poly {
    return q.n === Z
      ? new Map()
      : new Map([["0", { powers: Array(this.ds.length * 2).fill(0), q }]]);
  }
  // Canonical keys depend only on exponents (including constant monomials).
  private termKey(powers: number[]) {
    return powers.every((p) => p === 0) ? "0" : powers.join(",");
  }
  add(a: Poly, c: Poly): Poly {
    const r = new Map(a);
    for (const term of c.values()) {
      this.b.tick();
      const k = this.termKey(term.powers),
        old = r.get(k),
        q = old ? plus(old.q, term.q, this.b) : term.q;
      if (q.n === Z) r.delete(k);
      else r.set(k, { powers: term.powers, q });
      if (r.size > L.terms) throw new SymbolicReview("symbolic-resource-limit");
    }
    return r;
  }
  negative(a: Poly): Poly {
    return new Map(
      [...a].map(([k, t]) => [k, { powers: t.powers, q: neg(t.q) }]),
    );
  }
  multiply(a: Poly, c: Poly): Poly {
    const r: Poly = new Map();
    for (const x of a.values())
      for (const y of c.values()) {
        this.b.tick();
        const powers = x.powers.map((p, i) => p + y.powers[i]);
        if (powers.reduce((s, p) => s + p, 0) > L.degree)
          throw new SymbolicReview("symbolic-resource-limit");
        const k = this.termKey(powers),
          q = times(x.q, y.q, this.b),
          old = r.get(k),
          sum = old ? plus(old.q, q, this.b) : q;
        if (sum.n === Z) r.delete(k);
        else r.set(k, { powers, q: sum });
        if (r.size > L.terms)
          throw new SymbolicReview("symbolic-resource-limit");
      }
    return r;
  }
  pow(a: Poly, n: number) {
    let r = this.scalar(integer(1));
    for (let i = 0; i < n; i++) {
      this.b.tick();
      r = this.multiply(r, a);
    }
    return r;
  }
  fraction(q: Q): Fraction {
    return { n: this.scalar(q), d: this.scalar(integer(1)) };
  }
  atom(i: number): Fraction {
    const powers = Array(this.ds.length * 2).fill(0);
    powers[i] = 1;
    return {
      n: new Map([[this.termKey(powers), { powers, q: integer(1) }]]),
      d: this.scalar(integer(1)),
    };
  }
  guard(p: Poly) {
    this.b.tick();
    if (!p.size) throw new SymbolicReview("symbolic-domain");
    if (this.guards.length >= 128)
      throw new SymbolicReview("symbolic-resource-limit");
    this.guards.push(p);
  }
  range(p: Poly): Interval {
    let r: Interval = { lo: integer(0), hi: integer(0) };
    for (const t of p.values()) {
      let term: Interval = { lo: t.q, hi: t.q };
      for (let i = 0; i < t.powers.length; i++)
        if (t.powers[i]) {
          this.b.tick();
          const d = this.ds[i % this.ds.length];
          let atom: Interval = { lo: d.lo, hi: d.hi };
          if (i >= this.ds.length) {
            const squared = powerRange(atom, 2, this.b);
            atom = { lo: integer(0), hi: null };
            if (squared.hi) {
              const left = d.lo ? { n: abs(d.lo.n), d: d.lo.d } : integer(0),
                right = d.hi ? { n: abs(d.hi.n), d: d.hi.d } : integer(0);
              atom.hi = compare(left, right) > Z ? left : right;
            }
          }
          term = multiplyRange(
            term,
            powerRange(atom, t.powers[i], this.b),
            this.b,
          );
        }
      r = addRange(r, term, this.b);
    }
    return r;
  }
  private constValue(p: Poly): Q | undefined {
    if (!p.size) return integer(0);
    if (p.size !== 1) return;
    const t = [...p.values()][0];
    return t.powers.every((p) => p === 0) ? t.q : undefined;
  }
  value(f: Fraction): Q | undefined {
    const n = this.constValue(f.n),
      d = this.constValue(f.d);
    return n && d ? divide(n, d, this.b) : undefined;
  }
  nonzero(p: Poly): boolean {
    this.b.tick();
    const range = this.range(p);
    if ((range.lo && range.lo.n > Z) || (range.hi && range.hi.n < Z))
      return true;
    if (p.size === 1) {
      const t = [...p.values()][0];
      return t.powers.every(
        (n, i) => !n || !member(this.ds[i % this.ds.length], integer(0)),
      );
    }
    // Exact affine roots can be eliminated by bounds, assumptions or exclusions.
    let index = -1,
      coefficient = integer(0),
      offset = integer(0);
    for (const t of p.values()) {
      const degree = t.powers.reduce((s, n) => s + n, 0);
      if (degree === 0) {
        offset = t.q;
        continue;
      }
      if (degree !== 1) return false;
      const i = t.powers.indexOf(1);
      if (i >= this.ds.length || index !== -1) return false;
      index = i;
      coefficient = t.q;
    }
    return (
      index !== -1 &&
      !member(this.ds[index], divide(neg(offset), coefficient, this.b))
    );
  }
  private absolute(f: Fraction, arg: Ast): Fraction {
    const v = this.value(f);
    if (v) return this.fraction({ n: abs(v.n), d: v.d });
    const n = this.range(f.n),
      d = this.range(f.d);
    if (
      (n.lo && n.lo.n >= Z && d.lo && d.lo.n > Z) ||
      (n.hi && n.hi.n <= Z && d.hi && d.hi.n < Z)
    )
      return f;
    if (
      (n.hi && n.hi.n <= Z && d.lo && d.lo.n > Z) ||
      (n.lo && n.lo.n >= Z && d.hi && d.hi.n < Z)
    )
      return { n: this.negative(f.n), d: f.d };
    if (arg.kind === "variable") {
      const i = this.ds.findIndex((d) => d.name === arg.name);
      if (i !== -1) return this.atom(this.ds.length + i);
    }
    throw new SymbolicReview("symbolic-unsupported");
  }
  private sqrt(f: Fraction, arg: Ast): Fraction {
    const v = this.value(f);
    if (v) {
      if (v.n < Z) throw new SymbolicReview("symbolic-domain");
      const root = (n: bigint) => {
        let lo = Z,
          hi = n + O;
        while (hi - lo > O) {
          this.b.tick();
          const m = (lo + hi) / BigInt(2);
          if (m * m > n) hi = m;
          else lo = m;
        }
        return lo;
      };
      const n = root(v.n),
        d = root(v.d);
      if (n * n === v.n && d * d === v.d)
        return this.fraction(rational(n, d, this.b));
    }
    // Only principal square-root identities justified over real arguments.
    if (
      arg.kind === "binary" &&
      arg.op === "^" &&
      eq(constant(arg.right, this.b), integer(2))
    )
      return this.absolute(this.compile(arg.left), arg.left);
    if (
      arg.kind === "binary" &&
      arg.op === "*" &&
      arg.left.kind === "variable" &&
      arg.right.kind === "variable" &&
      arg.left.name === arg.right.name
    )
      return this.absolute(this.compile(arg.left), arg.left);
    throw new SymbolicReview("symbolic-unsupported");
  }
  compile(a: Ast): Fraction {
    this.b.tick();
    if (a.kind === "number") return this.fraction(a.value);
    if (a.kind === "variable") {
      const i = this.ds.findIndex((d) => d.name === a.name);
      if (i === -1) throw new SymbolicReview("symbolic-unsupported");
      const d = this.ds[i];
      if (d.lo && d.hi && eq(d.lo, d.hi)) return this.fraction(d.lo);
      return this.atom(i);
    }
    if (a.kind === "unary") {
      const f = this.compile(a.arg);
      return a.op === "-" ? { n: this.negative(f.n), d: f.d } : f;
    }
    if (a.kind === "call") {
      const f = this.compile(a.arg);
      if (a.name === "abs") return this.absolute(f, a.arg);
      if (a.name === "sqrt") return this.sqrt(f, a.arg);
      const v = this.value(f);
      if (v && v.n === Z && ["sin", "cos", "tan"].includes(a.name))
        return this.fraction(integer(a.name === "cos" ? 1 : 0));
      if (v && eq(v, integer(1)) && a.name === "log")
        return this.fraction(integer(0));
      throw new SymbolicReview("symbolic-unsupported");
    }
    const x = this.compile(a.left);
    if (a.op === "^") {
      const exponent = constant(a.right, this.b);
      if (eq(exponent, rational(O, BigInt(2), this.b)))
        return this.sqrt(x, a.left);
      const n = integerExponent(exponent);
      if (n <= 0) this.guard(x.n);
      return n < 0
        ? { n: this.pow(x.d, -n), d: this.pow(x.n, -n) }
        : { n: this.pow(x.n, n), d: this.pow(x.d, n) };
    }
    const y = this.compile(a.right);
    if (a.op === "+")
      return {
        n: this.add(this.multiply(x.n, y.d), this.multiply(y.n, x.d)),
        d: this.multiply(x.d, y.d),
      };
    if (a.op === "-")
      return {
        n: this.add(
          this.multiply(x.n, y.d),
          this.negative(this.multiply(y.n, x.d)),
        ),
        d: this.multiply(x.d, y.d),
      };
    if (a.op === "*")
      return { n: this.multiply(x.n, y.n), d: this.multiply(x.d, y.d) };
    this.guard(y.n);
    return { n: this.multiply(x.n, y.d), d: this.multiply(x.d, y.n) };
  }
  evaluate(p: Poly, point: Q[]): Q {
    let r = integer(0);
    for (const t of p.values()) {
      let v = t.q;
      for (let i = 0; i < t.powers.length; i++)
        if (t.powers[i]) {
          const source = point[i % point.length],
            q = i >= point.length ? { n: abs(source.n), d: source.d } : source;
          v = times(v, power(q, t.powers[i], this.b), this.b);
        }
      r = plus(r, v, this.b);
    }
    return r;
  }
}

// Conservative total-declared-domain equivalence. Exact rational counterexamples
// can reject; a finite collection of agreeing points can NEVER establish equality.
export function evaluateExpressionAnswer(
  answerInput: unknown,
  keyInput: unknown,
): GradeEvaluation {
  const b = new Budget();
  try {
    const answer = authoredAnswerSchema.safeParse(answerInput),
      key = authoredKeySchema.safeParse(keyInput);
    if (!answer.success || answer.data.kind !== "expression")
      throw new SymbolicReview("symbolic-unsupported");
    if (!key.success || key.data.kind !== "expression")
      return { status: "needs-review", reason: "key-unavailable" };
    const ds = domains(key.data, b),
      algebra = new Algebra(ds, b),
      left = algebra.compile(parseExpression(answer.data.expression, b)),
      right = algebra.compile(parseExpression(key.data.expected, b));
    const difference = algebra.add(
      algebra.multiply(left.n, right.d),
      algebra.negative(algebra.multiply(right.n, left.d)),
    );
    if (!difference.size) {
      if (algebra.guards.every((g) => algebra.nonzero(g)))
        return { status: "correct", reason: "symbolic-equivalent" };
      throw new SymbolicReview("symbolic-domain");
    }
    const base = ds.map((d) => d.points[0]),
      points: Q[][] = [base];
    for (let i = 0; i < ds.length; i++)
      for (const p of ds[i].points.slice(1, 7)) {
        const point = [...base];
        point[i] = p;
        points.push(point);
      }
    for (let j = 1; j <= 12; j++)
      points.push(ds.map((d) => d.points[j % d.points.length]));
    for (const point of points.slice(0, L.witnesses)) {
      b.tick();
      if (algebra.guards.some((g) => algebra.evaluate(g, point).n === Z))
        continue;
      if (
        algebra.evaluate(left.d, point).n === Z ||
        algebra.evaluate(right.d, point).n === Z
      )
        continue;
      if (algebra.evaluate(difference, point).n !== Z)
        return { status: "incorrect", reason: "symbolic-counterexample" };
    }
    throw new SymbolicReview("symbolic-inconclusive");
  } catch (e) {
    return {
      status: "needs-review",
      reason: e instanceof SymbolicReview ? e.reason : "symbolic-inconclusive",
    };
  }
}
