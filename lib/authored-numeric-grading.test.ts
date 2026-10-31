import assert from "node:assert/strict";
import test from "node:test";
import { evaluateNumericAnswer } from "./authored-numeric-grading";
const key = (value = 0, absTol = 0, relTol = 0, units = "") => ({
  kind: "numeric",
  value,
  absTol,
  relTol,
  units,
});
const answer = (value: unknown, units = "") => ({
  kind: "numeric",
  value,
  units,
});
const status = (x: number, y: number, a = 0, r = 0) =>
  evaluateNumericAnswer(answer(x), key(y, a, r)).status;
function next(value: number, delta: bigint) {
  const b = Buffer.alloc(8);
  b.writeDoubleBE(value);
  b.writeBigUInt64BE(b.readBigUInt64BE() + delta);
  return b.readDoubleBE();
}

test("explicit inclusive absolute/relative tolerance with zero, negatives and no implicit epsilon", () => {
  assert.equal(status(0, 0), "correct");
  assert.equal(status(-0, 0), "correct");
  assert.equal(status(0, -0), "correct");
  assert.equal(status(1, -1), "incorrect");
  assert.equal(status(-10, -10), "correct");
  assert.equal(status(2, 0, 2), "correct");
  assert.equal(status(next(2, BigInt(1)), 0, 2), "incorrect");
  assert.equal(status(-2, 0, 2), "correct");
  assert.equal(status(-next(2, BigInt(1)), 0, 2), "incorrect");
  assert.equal(
    status(0.01, 0, 0, 1e100),
    "incorrect",
    "relative tolerance at zero is zero",
  );
  assert.equal(status(-11, -10, 0, 0.125), "correct");
  assert.equal(status(-12, -10, 0, 0.125), "incorrect");
  assert.equal(status(1.125, 1, 0, 0.125), "correct");
  assert.equal(status(next(1.125, BigInt(1)), 1, 0, 0.125), "incorrect");
  assert.equal(status(0.875, 1, 0, 0.125), "correct");
  assert.equal(status(next(0.875, -BigInt(1)), 1, 0, 0.125), "incorrect");
  assert.equal(
    status(1.25, 1, 0.125, 0.125),
    "incorrect",
    "use max, not sum, of tolerances",
  );
  assert.equal(status(0.1 + 0.2, 0.3), "incorrect");
  assert.equal(status(0.1 + 0.2, 0.3, 1e-16), "correct");
  assert.equal(status(0.3, 0.2, 0.1), "correct");
  assert.equal(status(0.1, 0.2, 0.1), "correct");
});
test("overflow and subnormal arithmetic never rounds an outside answer into acceptance", () => {
  const max = Number.MAX_VALUE,
    min = Number.MIN_VALUE;
  assert.equal(
    status(-max, max, 0, 1.5),
    "incorrect",
    "naive Infinity <= Infinity is unsound",
  );
  assert.equal(
    status(-max, max, 0, 2),
    "correct",
    "exact relative tolerance can exceed MAX_VALUE legitimately",
  );
  assert.equal(status(-max, max, max, 0), "incorrect");
  assert.equal(status(0, max, max), "correct");
  assert.equal(
    status(0, min, 0, 0.75),
    "incorrect",
    "rounded product would equal MIN_VALUE",
  );
  assert.equal(status(0, min, 0, 1), "correct");
  assert.equal(status(min, 0, 0, max), "incorrect");
  assert.equal(status(-min, min, min), "incorrect");
  assert.equal(status(-min, min, 0, 2), "correct");
  assert.equal(status(min, min, 0, min), "correct");
  assert.equal(status(2 * min, min, 0, min), "incorrect");
  assert.equal(status(next(max, -BigInt(1)), max), "incorrect");
});
test("strict finite numeric validation fails closed without coercion, evaluation or private error text", () => {
  for (const value of [
    NaN,
    Infinity,
    -Infinity,
    "1",
    "1e9999",
    "0x10",
    null,
    undefined,
    {},
    [],
    BigInt(1),
  ])
    assert.deepEqual(evaluateNumericAnswer(answer(value), key()), {
      status: "ungraded",
      reason: "invalid-input",
    });
  for (const patch of [
    { value: NaN },
    { value: Infinity },
    { absTol: -1 },
    { absTol: Infinity },
    { relTol: -1 },
    { relTol: NaN },
    { units: "m".repeat(81) },
    { value: "PRIVATE_KEY_SENTINEL" },
    { kind: "expression" },
    { extra: 1 },
  ])
    assert.deepEqual(evaluateNumericAnswer(answer(0), { ...key(), ...patch }), {
      status: "needs-review",
      reason: "key-unavailable",
    });
  assert.equal(
    evaluateNumericAnswer({ ...answer(0), units: "x".repeat(1_000_000) }, key())
      .status,
    "ungraded",
  );
  assert.equal(
    evaluateNumericAnswer({ ...answer(0), absTol: 1e300 }, key()).status,
    "ungraded",
  );
});
test("units are explicit case-sensitive labels: no conversion, dimension erasure, alias or arbitrary parser", () => {
  for (const units of ["", "m", "cm", "s", "kg", "N", "J", "m/s", "m/s^2", "Ω"])
    assert.equal(
      evaluateNumericAnswer(answer(2, units), key(2, 0, 0, units)).status,
      "correct",
    );
  assert.equal(
    evaluateNumericAnswer(answer(2, " m "), key(2, 0, 0, "m")).status,
    "correct",
  );
  for (const [a, b] of [
    ["m", "s"],
    ["m", "cm"],
    ["", "m"],
    ["K", "C"],
    ["rad", "sr"],
  ])
    assert.deepEqual(
      evaluateNumericAnswer(answer(0, a), key(0, 1e99, 1e99, b)),
      { status: "needs-review", reason: "units-mismatch" },
    );
  for (const units of [
    "M",
    "1",
    "meters",
    "m s^-1",
    "m/s²",
    "°C",
    "widgets",
    "m\u200b",
    "m;process.exit()",
    "<svg>",
    "m\ns",
  ])
    assert.deepEqual(
      evaluateNumericAnswer(answer(2, units), key(2, 0, 0, units)),
      { status: "needs-review", reason: "units-unsupported" },
    );
  assert.equal(
    evaluateNumericAnswer(answer(100, "cm"), key(1, 0, 0, "m")).status,
    "needs-review",
  );
});

// Independent oracle uses a fixed MIN_VALUE quantum for ALL numbers rather than
// the evaluator's exponent alignment. Products compare in MIN_VALUE^2 quanta.
function quantum(value: number): bigint {
  const b = Buffer.alloc(8);
  b.writeDoubleBE(value);
  const high = b.readUInt32BE(),
    low = b.readUInt32BE(4),
    e = (high >>> 20) & 2047;
  const mantissa =
    BigInt(high & 0xfffff) * BigInt(4294967296) +
    BigInt(low) +
    (e ? BigInt(4503599627370496) : BigInt(0));
  const scaled = mantissa << BigInt(e ? e - 1 : 0);
  return high >>> 31 ? -scaled : scaled;
}
const abs = (n: bigint) => (n < BigInt(0) ? -n : n);
function oracle(x: number, y: number, a: number, r: number) {
  const delta = abs(quantum(x) - quantum(y)) << BigInt(1074);
  return (
    delta <= quantum(a) << BigInt(1074) || delta <= quantum(r) * abs(quantum(y))
  );
}
let seed = 0x53a73f19;
function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return seed >>> 0;
}
function finite() {
  const b = Buffer.alloc(8);
  let hi = random();
  if (((hi >>> 20) & 2047) === 2047) hi ^= 1 << 20;
  b.writeUInt32BE(hi >>> 0);
  b.writeUInt32BE(random(), 4);
  return b.readDoubleBE();
}
test("seeded IEEE754 bit-pattern properties agree with independent exact rational oracle", () => {
  for (let i = 0; i < 2500; i++) {
    const x = finite(),
      y = finite(),
      a = Math.abs(finite()),
      r = Math.abs(finite());
    const correct = oracle(x, y, a, r);
    assert.equal(
      status(x, y, a, r),
      correct ? "correct" : "incorrect",
      `seed case ${i}: ${x},${y},${a},${r}`,
    );
    assert.equal(
      status(-x, -y, a, r),
      status(x, y, a, r),
      "simultaneous sign symmetry",
    );
    assert.equal(status(x, y, a, r), status(x, y, a, r), "deterministic");
    assert.equal(
      status(y, y, a, r),
      "correct",
      "reflexive for all finite keys",
    );
    if (correct) {
      assert.equal(status(x, y, Math.max(a, Math.abs(x)), r), "correct");
      assert.equal(status(x, y, a, Math.max(r, 2)), "correct");
    }
  }
});
test("exact power-of-two scaling preserves grades within representable range", () => {
  for (let i = 0; i < 600; i++) {
    const factor = 2 ** ((random() % 101) - 50),
      y = ((random() % 10000) - 5000) * 2 ** ((random() % 1001) - 500),
      a = Math.abs(y) * 0.125,
      r = 0.125,
      x = y + ((random() % 5) - 2) * a;
    assert.equal(
      status(x * factor, y * factor, a * factor, r),
      status(x, y, a, r),
    );
  }
});
