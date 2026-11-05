/**
 * Easy mode for Problem Studio: pure helpers that read and write the same saved draft as Advanced.
 * Nothing here adds a field to the draft or changes how it is validated, published or graded.
 * Every function that changes a draft only touches what Easy shows, and keeps the rest as it was.
 */
import {
  AnswerReadError,
  SymbolTable,
  displayName,
  normaliseName,
  readExpression,
  readNumber,
} from "@/lib/answer-reader";
import { checkSampled, undecidedMessage } from "@/lib/sampled-check";
import { answerFromBuffer } from "@/lib/authored-student";
import { normalizeNumericUnits } from "@/lib/authored-grading-contracts";
import { authoredKeySchema } from "@/lib/problem-authoring";
import type { EditorBlock, EditorDraft } from "@/lib/problem-authoring-editor";

export type Key = EditorDraft["privateParts"][number]["key"];
export type PrivatePart = EditorDraft["privateParts"][number];
type Part = EditorDraft["content"]["sections"][number]["parts"][number];

/** The tick box text. The saved rights declaration is exactly this. */
export const RIGHTS_TEXT =
  "I wrote this problem and I'm happy to share it on Physcratic.";

/** The default tolerance of the Arena and practice checker for a number. Only Advanced can change it. */
export const DEFAULT_ABS_TOL = 1e-9;
export const DEFAULT_REL_TOL = 0.01;

/**
 * The unit labels the authored-problem checker knows. A copy of the list in lib/authored-numeric-grading.ts
 * (that file is server only). tests/easy-model.test.ts checks every entry against the real checker.
 */
export const UNITS = [
  "m", "cm", "mm", "km", "s", "ms", "kg", "g", "A", "K", "mol", "cd", "rad", "sr", "Hz", "N", "Pa", "J", "W", "C",
  "V", "F", "Ω", "S", "Wb", "T", "H", "lm", "lx", "Bq", "Gy", "Sv", "kat", "m/s", "m/s^2", "m^2", "m^3", "kg/m^3",
] as const;
const unitSet = new Set<string>(["", ...UNITS]);
export const knownUnit = (units: string) => unitSet.has(normalizeNumericUnits(units));

const nameShape = /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/;

// ---------------------------------------------------------------------------------------------------------------
// Text with maths. Easy shows one text box. Maths goes between dollar signs, as in "the mass $m$ moves".
// ---------------------------------------------------------------------------------------------------------------

type Span = { kind: "text"; text: string } | { kind: "math"; latex: string };

export function spansToText(spans: readonly Span[]): string {
  return spans.map((s) => (s.kind === "text" ? s.text : `$${s.latex}$`)).join("");
}
export function textToSpans(text: string): Span[] {
  const spans: Span[] = [];
  let last = 0;
  for (const match of text.matchAll(/\$([^$]+)\$/g)) {
    if (match.index > last) spans.push({ kind: "text", text: text.slice(last, match.index) });
    spans.push({ kind: "math", latex: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length || spans.length === 0) spans.push({ kind: "text", text: text.slice(last) });
  return spans;
}
const firstTextIndex = (blocks: readonly EditorBlock[]) => blocks.findIndex((b) => b.kind === "text");
/** The text of the first text block. Other blocks (equations, images) belong to Advanced and are kept. */
export function blocksText(blocks: readonly EditorBlock[]): string {
  const i = firstTextIndex(blocks);
  const block = i >= 0 ? blocks[i] : undefined;
  return block && block.kind === "text" ? spansToText(block.spans) : "";
}
/** The blocks with the first text block set to `text`. Other blocks are not touched. */
export function withBlocksText(blocks: EditorBlock[], text: string): EditorBlock[] {
  const i = firstTextIndex(blocks);
  if (i >= 0) {
    const next = [...blocks];
    next[i] = { ...(blocks[i] as Extract<EditorBlock, { kind: "text" }>), spans: textToSpans(text) };
    return next;
  }
  if (!text) return blocks;
  return [{ id: crypto.randomUUID(), kind: "text", spans: textToSpans(text) }, ...blocks];
}
/** Blocks that Easy does not show: anything except the first text block. */
export const hiddenBlockCount = (blocks: readonly EditorBlock[]) => Math.max(0, blocks.length - (firstTextIndex(blocks) >= 0 ? 1 : 0));

// ---------------------------------------------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------------------------------------------

export const partLetter = (index: number) => String.fromCharCode(97 + (index % 26)) + (index >= 26 ? String(Math.floor(index / 26) + 1) : "");

export type PartRef = { part: Part; sectionIndex: number; partIndex: number; position: number };
/** Every part of every section, in reading order. */
export function allParts(draft: EditorDraft): PartRef[] {
  let position = 0;
  return draft.content.sections.flatMap((section, sectionIndex) =>
    section.parts.map((part, partIndex) => ({ part, sectionIndex, partIndex, position: position++ })),
  );
}
export const privateFor = (draft: EditorDraft, partId: string): PrivatePart =>
  draft.privateParts.find((p) => p.partId === partId) ?? { partId, key: null, hints: [], solution: [] };

function upsertPrivate(d: EditorDraft, entry: PrivatePart) {
  const at = d.privateParts.findIndex((p) => p.partId === entry.partId);
  if (at >= 0) d.privateParts[at] = entry;
  else d.privateParts.push(entry);
}
function newPart(d: EditorDraft, position: number): Part {
  const id = crypto.randomUUID();
  const part: Part = { id, label: partLetter(position), blocks: [], answerMode: "manual" };
  upsertPrivate(d, { partId: id, key: { kind: "manual" }, hints: [], solution: [] });
  return part;
}
/** A problem has one section and one part from the start. Further sections are Advanced. */
export function ensureEasyShape(d: EditorDraft) {
  if (d.content.sections.length === 0)
    d.content.sections.push({ id: crypto.randomUUID(), title: "", blocks: [], parts: [] });
  if (allParts(d).length === 0) d.content.sections[0].parts.push(newPart(d, 0));
}
export function addEasyPart(d: EditorDraft) {
  ensureEasyShape(d);
  const section = d.content.sections.at(-1)!;
  if (allParts(d).length >= 50) return;
  section.parts.push(newPart(d, allParts(d).length));
}
export function removeEasyPart(d: EditorDraft, partId: string) {
  for (const section of d.content.sections) section.parts = section.parts.filter((p) => p.id !== partId);
  d.privateParts = d.privateParts.filter((p) => p.partId !== partId);
}
export function setQuestion(d: EditorDraft, partId: string, text: string) {
  const part = allParts(d).find((r) => r.part.id === partId)?.part;
  if (part) part.blocks = withBlocksText(part.blocks, text);
}
export function setProblemText(d: EditorDraft, text: string) {
  d.content.context = withBlocksText(d.content.context, text);
}
export function setHint(d: EditorDraft, partId: string, text: string) {
  const entry = structuredClone(privateFor(d, partId));
  entry.hints = withBlocksText(entry.hints, text);
  upsertPrivate(d, entry);
}
export function setSolution(d: EditorDraft, partId: string, text: string) {
  const entry = structuredClone(privateFor(d, partId));
  entry.solution = withBlocksText(entry.solution, text);
  upsertPrivate(d, entry);
}

/** What Easy cannot show, so the author knows Advanced holds more. Plain words, or an empty string. */
export function advancedNote(d: EditorDraft): string {
  const found: string[] = [];
  const sections = d.content.sections.length;
  if (sections > 1) found.push(`${sections} sections`);
  if (d.content.attachments.length) found.push(`${d.content.attachments.length} image or PDF files`);
  if (d.content.methodTags.length) found.push("method tags");
  let extra = hiddenBlockCount(d.content.context);
  for (const s of d.content.sections) extra += hiddenBlockCount(s.blocks) + (s.title ? 1 : 0);
  for (const r of allParts(d)) {
    extra += hiddenBlockCount(r.part.blocks);
    const p = privateFor(d, r.part.id);
    extra += hiddenBlockCount(p.hints) + hiddenBlockCount(p.solution);
  }
  if (extra) found.push("extra blocks");
  if (d.content.estimatedDifficulty) found.push("a difficulty estimate");
  return found.length ? `Advanced holds ${found.join(", ")}. They are kept and published with the rest.` : "";
}

// ---------------------------------------------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------------------------------------------

export type AnswerRead =
  | { kind: "empty" }
  | { kind: "number"; value: number }
  | { kind: "expression"; symbols: string[] }
  | { kind: "error"; message: string };

/** The text of an answer as Easy shows it, taken from the saved key. */
export function answerText(key: Key): string {
  if (!key || key.kind === "manual") return "";
  if (key.kind === "numeric") return key.value === null || key.value === "" ? "" : String(key.value);
  return key.expected;
}

/**
 * Decides what an answer is. A plain number (4.9, 3e8, 3×10^8, \frac{1}{2}) is a number. Anything else is an
 * expression whose symbols the reader finds. Function names (sin, ln) and constants (π, e) are never symbols.
 * A number followed by a unit is refused with a pointer to the Unit box, so a unit is never read as a symbol.
 */
export function readAnswer(raw: string): AnswerRead {
  const text = raw.trim();
  if (!text) return { kind: "empty" };
  if (text.length > 180) return { kind: "error", message: "This answer is longer than 180 characters. Shorten it." };
  try {
    return { kind: "number", value: readNumber(text) };
  } catch {
    /* Not a plain number. */
  }
  const united = /^(.+?)\s+([^\s\d][^\s]*)$/.exec(text);
  if (united && united[2] !== "" && unitSet.has(united[2])) {
    try {
      readNumber(united[1]);
      return { kind: "error", message: `Type only the number here. Choose the unit ${united[2]} in the Unit box once the number is read.` };
    } catch {
      /* Not a number with a unit. Read the whole text below. */
    }
  }
  try {
    const table = new SymbolTable([], true);
    readExpression(text, table);
    const bad = table.names.find((n) => !nameShape.test(n));
    if (bad) return { kind: "error", message: `${displayName(bad)} cannot be saved as a symbol. Use letters, digits and underscores, starting with a letter.` };
    if (table.names.length > 20) return { kind: "error", message: "An answer can use up to 20 symbols." };
    return { kind: "expression", symbols: [...table.names] };
  } catch (error) {
    if (error instanceof AnswerReadError) return { kind: "error", message: error.message };
    return { kind: "error", message: "This answer could not be read. Check the brackets and the symbols." };
  }
}

export const symbolLabels = (names: readonly string[]) => names.map(displayName);

/**
 * Sets the answer of one part from the text the author typed. The answer type, the symbols and the tolerance
 * are decided here. Settings that only Advanced shows (limits, angle unit, exclusions, tolerance) are kept
 * when the answer stays the same kind.
 */
export function applyAnswer(d: EditorDraft, partId: string, read: AnswerRead, text: string) {
  const ref = allParts(d).find((r) => r.part.id === partId);
  if (!ref) return;
  const entry = structuredClone(privateFor(d, partId));
  const old = entry.key;
  if (read.kind === "number") {
    const units = old?.kind === "numeric" ? old.units : "";
    entry.key =
      old?.kind === "numeric"
        ? { ...old, value: read.value, units }
        : { kind: "numeric", value: read.value, units, absTol: DEFAULT_ABS_TOL, relTol: DEFAULT_REL_TOL };
    ref.part.answerMode = "numeric";
  } else if (read.kind === "expression") {
    const expected = text.trim();
    if (old?.kind === "expression" && old.expected === expected) {
      /* Same answer: leave the whole key alone. */
    } else {
      const previous = old?.kind === "expression" ? old : null;
      entry.key = {
        kind: "expression",
        expected,
        // Symbols that stay keep their place and every setting. New ones follow, in the order the answer uses them.
        variables: [
          ...(previous?.variables.filter((v) => read.symbols.includes(normaliseName(v.name))) ?? []),
          ...read.symbols
            .filter((name) => !previous?.variables.some((v) => normaliseName(v.name) === name))
            .map((name) => ({ name, domain: "real" as const, assumptions: [] as ("positive" | "nonnegative" | "nonzero")[] })),
        ],
        angleUnit: previous?.angleUnit ?? "radians",
        exclusions: previous?.exclusions ?? [],
      };
    }
    ref.part.answerMode = "expression";
  } else if (read.kind === "empty") {
    entry.key = { kind: "manual" };
    ref.part.answerMode = "manual";
  } else return; // An unreadable answer changes nothing, and Publish stays blocked.
  upsertPrivate(d, entry);
}
export function setUnits(d: EditorDraft, partId: string, units: string) {
  const entry = structuredClone(privateFor(d, partId));
  if (entry.key?.kind !== "numeric") return;
  entry.key = { ...entry.key, units };
  upsertPrivate(d, entry);
}

// ---------------------------------------------------------------------------------------------------------------
// Publish rights
// ---------------------------------------------------------------------------------------------------------------

export type RightsState = "ticked" | "unticked" | "advanced";
/** "advanced": the rights were set in Advanced (permission, or the author's own words). Easy leaves them. */
export function rightsState(d: EditorDraft): RightsState {
  const { kind, rightsDeclaration } = d.content.provenance;
  if (kind === "authorized") return "advanced";
  if (rightsDeclaration === RIGHTS_TEXT) return "ticked";
  return rightsDeclaration.trim() ? "advanced" : "unticked";
}
export function setRights(d: EditorDraft, ticked: boolean) {
  if (rightsState(d) === "advanced") return;
  d.content.provenance = { ...d.content.provenance, kind: "original", rightsDeclaration: ticked ? RIGHTS_TEXT : "" };
}

// ---------------------------------------------------------------------------------------------------------------
// What stops Publish, in plain words, each one tied to a field
// ---------------------------------------------------------------------------------------------------------------

export type EasyIssue = { field: string; message: string };
/** `reads` holds what the author has typed for each part's answer, when it differs from the saved key. */
export function easyIssues(d: EditorDraft, reads: Readonly<Record<string, string>> = {}): EasyIssue[] {
  const issues: EasyIssue[] = [];
  if (!d.content.title.trim()) issues.push({ field: "title", message: "Give the problem a title." });
  const parts = allParts(d);
  if (parts.length === 0) issues.push({ field: "parts", message: "Add a part with a question and an answer." });
  for (const { part } of parts) {
    if (!blocksText(part.blocks).trim()) issues.push({ field: `question:${part.id}`, message: "Write the question for this part." });
    const entry = privateFor(d, part.id);
    const typed = part.id in reads ? reads[part.id] : answerText(entry.key);
    const read = readAnswer(typed);
    if (read.kind === "empty" || (read.kind !== "error" && entry.key?.kind === "manual"))
      issues.push({ field: `answer:${part.id}`, message: "Add the answer for this part." });
    else if (read.kind === "error") issues.push({ field: `answer:${part.id}`, message: read.message });
    else if (entry.key?.kind === "numeric" && !knownUnit(entry.key.units))
      issues.push({ field: `units:${part.id}`, message: `The checker does not know the unit "${entry.key.units}". Pick one from the list or leave it empty.` });
  }
  if (rightsState(d) === "unticked") issues.push({ field: "rights", message: "Tick the box to say you wrote this problem." });
  return issues;
}

// ---------------------------------------------------------------------------------------------------------------
// Test an answer: the same reader and checker a student gets, against this draft's own key
// ---------------------------------------------------------------------------------------------------------------

export type Verdict = "correct" | "incorrect" | "needs-review" | "ungraded";
/** The labels a student sees. tests/easy-model.test.ts checks they still match the student page. */
export const verdictLabel: Record<Verdict, string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  "needs-review": "Needs review",
  ungraded: "Ungraded",
};
export type TestResult =
  | { kind: "none"; message: string }
  | { kind: "unreadable"; message: string }
  | { kind: "checked"; verdict: Verdict; reason: string };

const zero = BigInt(0);
const one = BigInt(1);
const fractionMask = (one << BigInt(52)) - one;
type Dyadic = { coefficient: bigint; exponent: number };
function dyadic(value: number): Dyadic {
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setFloat64(0, value);
  const bits = bytes.getBigUint64(0);
  const exponent = Number((bits >> BigInt(52)) & BigInt(2047));
  const fraction = bits & fractionMask;
  const coefficient = exponent === 0 ? fraction : (one << BigInt(52)) + fraction;
  return { coefficient: bits >> BigInt(63) ? -coefficient : coefficient, exponent: exponent === 0 ? -1074 : exponent - 1075 };
}
function difference(a: Dyadic, b: Dyadic): Dyadic {
  const exponent = Math.min(a.exponent, b.exponent);
  const c = (a.coefficient << BigInt(a.exponent - exponent)) - (b.coefficient << BigInt(b.exponent - exponent));
  return { coefficient: c < zero ? -c : c, exponent };
}
function atMost(a: Dyadic, b: Dyadic) {
  const exponent = Math.min(a.exponent, b.exponent);
  return a.coefficient << BigInt(a.exponent - exponent) <= b.coefficient << BigInt(b.exponent - exponent);
}

type Evaluation = { status: Verdict; reason: string };
/** The numeric rule of lib/authored-numeric-grading.ts, exact over binary64 values. Parity is tested. */
export function checkNumberLikeStudent(answer: { value: number; units: string }, key: Extract<NonNullable<Key>, { kind: "numeric" }>): Evaluation {
  const expectedUnits = normalizeNumericUnits(key.units);
  const actualUnits = normalizeNumericUnits(answer.units);
  if (!unitSet.has(expectedUnits) || !unitSet.has(actualUnits)) return { status: "needs-review", reason: "units-unsupported" };
  if (expectedUnits !== actualUnits) return { status: "needs-review", reason: "units-mismatch" };
  const value = typeof key.value === "number" ? key.value : Number(key.value);
  const expected = dyadic(value);
  const relative = dyadic(Number(key.relTol));
  const relativeTolerance = {
    coefficient: relative.coefficient * (expected.coefficient < zero ? -expected.coefficient : expected.coefficient),
    exponent: relative.exponent + expected.exponent,
  };
  const delta = difference(dyadic(answer.value), expected);
  return atMost(delta, dyadic(Number(key.absTol))) || atMost(delta, relativeTolerance)
    ? { status: "correct", reason: "within-tolerance" }
    : { status: "incorrect", reason: "outside-tolerance" };
}
/** The expression rule of lib/authored-symbolic-grading.ts. Parity is tested. */
export function checkExpressionLikeStudent(expression: string, key: Extract<NonNullable<Key>, { kind: "expression" }>, seed: string): Evaluation {
  const outcome = checkSampled({
    seed,
    answer: expression,
    references: [key.expected],
    symbols: key.variables.map((v) => ({ name: v.name, assumptions: v.assumptions, min: typeof v.min === "number" ? v.min : undefined, max: typeof v.max === "number" ? v.max : undefined })),
    exclusions: key.exclusions,
    angleUnit: key.angleUnit,
    maxCharacters: 180,
  });
  if (outcome.status === "correct") return { status: "correct", reason: "symbolic-equivalent" };
  if (outcome.status === "incorrect") return { status: "incorrect", reason: "symbolic-counterexample" };
  if (outcome.status === "invalid") return { status: "needs-review", reason: "symbolic-unsupported" };
  return { status: "needs-review", reason: outcome.reason };
}

/**
 * What a student would see for this answer. `seed` is `${problemId}:${partId}`, as on the student route.
 * The key is the one in the draft (already saved or not), parsed with the same schema the server uses.
 */
export function testAnswer(input: { key: Key; seed: string; text: string; units: string }): TestResult {
  const parsedKey = authoredKeySchema.safeParse(input.key);
  if (!parsedKey.success || parsedKey.data.kind === "manual")
    return { kind: "none", message: parsedKey.success ? "This part has no checkable answer yet." : "Finish the answer above first. The checker cannot read it yet." };
  const key = parsedKey.data;
  if (!input.text.trim()) return { kind: "none", message: "Type an answer to see what the checker says." };
  if (key.kind === "numeric") {
    let answer;
    try {
      answer = answerFromBuffer({ kind: "numeric", value: input.text, units: input.units });
    } catch (error) {
      return { kind: "unreadable", message: error instanceof Error ? error.message : "Enter a number." };
    }
    if (answer.kind !== "numeric") return { kind: "unreadable", message: "Enter a number." };
    const result = checkNumberLikeStudent(answer, key);
    return { kind: "checked", verdict: result.status, reason: result.reason };
  }
  let answer;
  try {
    answer = answerFromBuffer({ kind: "expression", expression: input.text });
  } catch {
    return { kind: "unreadable", message: "Enter an answer of at most 180 characters." };
  }
  if (answer.kind !== "expression") return { kind: "unreadable", message: "Enter an answer." };
  const result = checkExpressionLikeStudent(answer.expression, key, input.seed);
  return { kind: "checked", verdict: result.status, reason: result.reason };
}

/** Plain words under the verdict. The labels are the student's. The reasons are for the author. */
export function verdictExplanation(verdict: Verdict, reason: string): string {
  switch (verdict) {
    case "correct":
      return "A student who types this sees Correct.";
    case "incorrect":
      return reason === "outside-tolerance"
        ? "A student who types this sees Incorrect. It is outside the allowed tolerance."
        : "A student who types this sees Incorrect. It disagrees with your answer for some test values.";
    case "ungraded":
      return "This part is not checked automatically.";
    default:
      if (reason === "units-mismatch") return "A student who types this sees Needs review. The unit is not the one in your answer.";
      if (reason === "units-unsupported") return "A student who types this sees Needs review. The checker does not know this unit.";
      if (reason === "symbolic-unsupported") return "A student who types this sees Needs review. The checker could not read it, or it uses a symbol the problem does not have.";
      if (reason === "time-limit" || reason === "few-valid-sets" || reason === "key-unreadable" || reason === "exclusion")
        return `A student who types this sees Needs review. ${undecidedMessage(reason)}`;
      return "A student who types this sees Needs review.";
  }
}
