// The one checker for every expression answer on the site (practice, Arena, archive, contests, authored).
// Method: pick 10 random sets of values for the problem's symbols, evaluate the reference and the student's answer for
// each set, and call the answer correct when every set agrees. It matches no answer form and names no problem.
//
// Values come from a generator seeded by the problem and part, so the same answer always gets the same result.
// A set is skipped only when the reference is undefined or not finite there. If the student's answer is undefined
// or not finite where the reference is fine, that set is a mismatch.
import {
  AnswerReadError,
  SymbolTable,
  normaliseName,
  readExpression,
  readNumber,
  type AngleUnit,
  type Evaluator,
  type SymbolDecl,
} from "./answer-reader";

export const sampledLimits = Object.freeze({
  sets: 10,
  attemptsPerSet: 30,
  relativeTolerance: 1e-6,
  absoluteFloor: 1e-9,
  milliseconds: 400,
});

export type SampledOutcome =
  | { status: "correct" }
  | { status: "incorrect" }
  /** The answer could not be read. `symbol` is set when it used a symbol the problem does not declare. */
  | { status: "invalid"; message: string; symbol?: string; suggestion?: string }
  /** No 10 valid sets could be found, the key could not be read, or the time limit was reached. */
  | { status: "undecided"; reason: "few-valid-sets" | "key-unreadable" | "exclusion" | "time-limit" };

export type SampledInput = {
  /** Identifies the problem and part. Fixes the random values. */
  seed: string;
  answer: string;
  /** The reference answer first, then any other accepted forms. The answer is correct if it matches any. */
  references: readonly string[];
  symbols?: readonly SymbolDecl[];
  /** Conditions such as "x != 1". */
  exclusions?: readonly string[];
  angleUnit?: AngleUnit;
  maxCharacters?: number;
  relativeTolerance?: number;
  absoluteFloor?: number;
  /** For tests. */
  now?: () => number;
};

function hashSeed(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
function generator(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One random value for a symbol. Between 0.5 and 5 in size, either sign, unless the declaration says otherwise. */
function draw(decl: SymbolDecl | undefined, random: () => number): number {
  const assumptions = decl?.assumptions ?? [];
  const positive = assumptions.includes("positive");
  const nonnegative = positive || assumptions.includes("nonnegative");
  const hasMin = decl?.min !== undefined, hasMax = decl?.max !== undefined;
  if (!nonnegative && !hasMin && !hasMax) {
    const magnitude = 0.5 + random() * 4.5;
    return random() < 0.5 ? -magnitude : magnitude;
  }
  let lo = hasMin ? decl!.min! : nonnegative ? 0.5 : -5;
  let hi = hasMax ? decl!.max! : 5;
  if (lo >= hi && !(hasMin && hasMax)) { if (hasMin) hi = lo + 4.5; else lo = hi - 4.5; }
  if (nonnegative && lo < 0) lo = hasMin ? 0 : lo;
  if (positive && lo <= 0) lo = Math.min(0.5, hi / 2);
  if (hi <= lo) return lo;
  let value = lo + random() * (hi - lo);
  if (assumptions.includes("nonzero") && Math.abs(value) < 0.05) value = lo + random() * (hi - lo);
  return value;
}

function satisfies(decl: SymbolDecl, value: number): boolean {
  const assumptions = decl.assumptions ?? [];
  return (
    (!assumptions.includes("positive") || value > 0) &&
    (!assumptions.includes("nonnegative") || value >= 0) &&
    (!assumptions.includes("nonzero") || value !== 0) &&
    (decl.min === undefined || value >= decl.min) &&
    (decl.max === undefined || value <= decl.max)
  );
}

type Exclusion = { index: number; value: number };

export function checkSampled(input: SampledInput): SampledOutcome {
  const now = input.now ?? (() => performance.now());
  const deadline = now() + sampledLimits.milliseconds;
  const angle = input.angleUnit ?? "radians";
  const options = { angleUnit: angle, maxCharacters: input.maxCharacters };
  const declared = (input.symbols ?? []).map((symbol) => ({ ...symbol, name: normaliseName(symbol.name) }));

  // The key. Its own symbols are added to the declared ones, so a key with no declared symbols still works.
  const table = new SymbolTable(declared.map((symbol) => symbol.name), true, Object.fromEntries(declared.map((symbol) => [symbol.name, symbol.aliases ?? []])));
  const references: Evaluator[] = [];
  for (const reference of input.references) {
    try { references.push(readExpression(reference, table, options).evaluate); }
    catch { return { status: "undecided", reason: "key-unreadable" }; }
  }
  if (!references.length) return { status: "undecided", reason: "key-unreadable" };
  const names = [...table.names];
  const closed = new SymbolTable(names, false, Object.fromEntries(declared.map((symbol) => [symbol.name, symbol.aliases ?? []])));

  let student: Evaluator;
  try { student = readExpression(input.answer, closed, options).evaluate; }
  catch (error) {
    if (error instanceof AnswerReadError) return { status: "invalid", message: error.message, symbol: error.symbol, suggestion: error.suggestion };
    throw error;
  }

  const exclusions: Exclusion[] = [];
  for (const text of input.exclusions ?? []) {
    const parts = /^\s*(.+?)\s*!=\s*(.+?)\s*$/.exec(text);
    const index = parts ? closed.index(normaliseName(parts[1])) : -1;
    if (!parts || index < 0) return { status: "undecided", reason: "exclusion" };
    try { exclusions.push({ index, value: readNumber(parts[2], options) }); }
    catch { return { status: "undecided", reason: "exclusion" }; }
  }
  const decls = names.map((name) => declared.find((symbol) => symbol.name === name));
  const relative = input.relativeTolerance ?? sampledLimits.relativeTolerance;
  const floor = input.absoluteFloor ?? sampledLimits.absoluteFloor;

  let allDecided = true;
  let decidedWrong = false;
  for (let r = 0; r < references.length; r++) {
    const random = generator(`${input.seed}|${r}`);
    const reference = references[r];
    let valid = 0, attempts = 0, matched = true;
    while (valid < sampledLimits.sets && attempts < sampledLimits.sets * sampledLimits.attemptsPerSet) {
      if (now() > deadline) return { status: "undecided", reason: "time-limit" };
      attempts++;
      const values = decls.map((decl) => draw(decl, random));
      // A value that breaks its own declaration (such as positive with a maximum of 0) is never used.
      if (decls.some((decl, i) => decl && !satisfies(decl, values[i]))) continue;
      if (exclusions.some((e) => Math.abs(values[e.index] - e.value) <= 1e-9 * Math.max(1, Math.abs(e.value)))) continue;
      const expected = reference(values);
      if (!Number.isFinite(expected)) continue;
      valid++;
      if (!matched) continue;
      const actual = student(values);
      if (!Number.isFinite(actual) || Math.abs(actual - expected) > Math.max(floor, relative * Math.abs(expected))) matched = false;
    }
    if (valid < sampledLimits.sets) { allDecided = false; continue; }
    if (matched) return { status: "correct" };
    decidedWrong = true;
  }
  if (decidedWrong && allDecided) return { status: "incorrect" };
  return { status: "undecided", reason: "few-valid-sets" };
}

/** Plain words for an undecided check. Shown to the student. */
export function undecidedMessage(reason: Extract<SampledOutcome, { status: "undecided" }>["reason"]): string {
  if (reason === "time-limit") return "Could not be decided. The check took too long, so nothing was marked. Try a shorter form of the answer.";
  if (reason === "few-valid-sets") return "Could not be decided. We could not find enough test values where the reference answer is defined, so nothing was marked. Compare your answer with the worked solution.";
  return "Could not be decided. This part cannot be checked automatically. Compare your answer with the worked solution.";
}
