import "server-only";
import { authoredKeySchema } from "./problem-authoring";
import {
  numericAnswerSchema,
  normalizeNumericUnits,
  type GradeEvaluation,
} from "./authored-grading-contracts";

// Only blank/ASCII "1" are aliases via the shared dimensionless policy.
// No physical unit conversions, prefix expansion, algebra or Unicode folding.
// These are exact unit labels, NOT an equivalence table. Unknown spellings need review.
const units = new Set([
  "",
  "m",
  "cm",
  "mm",
  "km",
  "s",
  "ms",
  "kg",
  "g",
  "A",
  "K",
  "mol",
  "cd",
  "rad",
  "sr",
  "Hz",
  "N",
  "Pa",
  "J",
  "W",
  "C",
  "V",
  "F",
  "Ω",
  "S",
  "Wb",
  "T",
  "H",
  "lm",
  "lx",
  "Bq",
  "Gy",
  "Sv",
  "kat",
  "m/s",
  "m/s^2",
  "m^2",
  "m^3",
  "kg/m^3",
]);
type Dyadic = { coefficient: bigint; exponent: number };
const zero = BigInt(0),
  one = BigInt(1),
  fractionMask = (one << BigInt(52)) - one;
function dyadic(value: number): Dyadic {
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setFloat64(0, value);
  const bits = bytes.getBigUint64(0),
    exponent = Number((bits >> BigInt(52)) & BigInt(2047));
  const fraction = bits & fractionMask;
  const coefficient =
    exponent === 0 ? fraction : (one << BigInt(52)) + fraction;
  return {
    coefficient: bits >> BigInt(63) ? -coefficient : coefficient,
    exponent: exponent === 0 ? -1074 : exponent - 1075,
  };
}
function difference(a: Dyadic, b: Dyadic): Dyadic {
  const exponent = Math.min(a.exponent, b.exponent);
  const coefficient =
    (a.coefficient << BigInt(a.exponent - exponent)) -
    (b.coefficient << BigInt(b.exponent - exponent));
  return {
    coefficient: coefficient < zero ? -coefficient : coefficient,
    exponent,
  };
}
function atMost(a: Dyadic, b: Dyadic) {
  const exponent = Math.min(a.exponent, b.exponent);
  return (
    a.coefficient << BigInt(a.exponent - exponent) <=
    b.coefficient << BigInt(b.exponent - exponent)
  );
}
// Exact comparison over the supplied binary64 values. A fixed four finite numbers
// bound all BigInts to <4300 bits, including subnormals and relative products.
// No floating subtraction/product, overflow, underflow, or implicit epsilon.
export function evaluateNumericAnswer(
  answerInput: unknown,
  keyInput: unknown,
): GradeEvaluation {
  const answer = numericAnswerSchema.safeParse(answerInput),
    key = authoredKeySchema.options[0].safeParse(keyInput);
  if (!answer.success) return { status: "ungraded", reason: "invalid-input" };
  if (!key.success)
    return { status: "needs-review", reason: "key-unavailable" };
  const expectedUnits = normalizeNumericUnits(key.data.units),
    actualUnits = answer.data.units;
  if (!units.has(expectedUnits) || !units.has(actualUnits))
    return { status: "needs-review", reason: "units-unsupported" };
  if (expectedUnits !== actualUnits)
    return { status: "needs-review", reason: "units-mismatch" };
  const expected = dyadic(key.data.value),
    relative = dyadic(key.data.relTol);
  const relativeTolerance = {
    coefficient:
      relative.coefficient *
      (expected.coefficient < zero
        ? -expected.coefficient
        : expected.coefficient),
    exponent: relative.exponent + expected.exponent,
  };
  const delta = difference(dyadic(answer.data.value), expected);
  const accepted =
    atMost(delta, dyadic(key.data.absTol)) || atMost(delta, relativeTolerance);
  return accepted
    ? { status: "correct", reason: "within-tolerance" }
    : { status: "incorrect", reason: "outside-tolerance" };
}
