import "server-only";

const exactLimits = Object.freeze({ bits: 2048, operations: 40000, milliseconds: 100 });
export class SymbolicReview extends Error {
  constructor(public reason: "symbolic-domain" | "symbolic-resource-limit") {
    super(reason);
  }
}
export class Budget {
  private remaining = exactLimits.operations;
  private deadline = performance.now() + exactLimits.milliseconds;
  tick() {
    if (--this.remaining < 0 || performance.now() > this.deadline)
      throw new SymbolicReview("symbolic-resource-limit");
  }
}
const Z = BigInt(0), O = BigInt(1);
export type Q = { n: bigint; d: bigint };
const abs = (n: bigint) => (n < Z ? -n : n);
export function rational(n: bigint, d: bigint, b: Budget): Q {
  b.tick();
  if (d === Z) throw new SymbolicReview("symbolic-domain");
  if (abs(n).toString(2).length > exactLimits.bits || abs(d).toString(2).length > exactLimits.bits)
    throw new SymbolicReview("symbolic-resource-limit");
  if (d < Z) {
    n = -n;
    d = -d;
  }
  let x = abs(n), y = d;
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
export const plus = (a: Q, c: Q, b: Budget) => rational(a.n * c.d + c.n * a.d, a.d * c.d, b);
export const times = (a: Q, c: Q, b: Budget) => rational(a.n * c.n, a.d * c.d, b);
export const divide = (a: Q, c: Q, b: Budget) => rational(a.n * c.d, a.d * c.n, b);
export function power(a: Q, n: number, b: Budget): Q {
  let r = integer(1);
  for (let i = 0; i < n; i++) {
    b.tick();
    r = times(r, a, b);
  }
  return r;
}

// Bounds use their exact stored binary64 value, not a rounded decimal rendering.
export function binaryRational(value: number, b: Budget): Q {
  const data = new DataView(new ArrayBuffer(8));
  data.setFloat64(0, value);
  const bits = data.getBigUint64(0), e = Number((bits >> BigInt(52)) & BigInt(2047));
  const m = (bits & ((O << BigInt(52)) - O)) + (e ? O << BigInt(52) : Z);
  const signed = bits >> BigInt(63) ? -m : m, shift = e ? e - 1075 : -1074;
  return shift >= 0 ? rational(signed << BigInt(shift), O, b) : rational(signed, O << BigInt(-shift), b);
}
