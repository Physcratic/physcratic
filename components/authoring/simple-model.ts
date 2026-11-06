/**
 * Simple mode for Problem Studio: pure helpers that read and write the same saved draft as Advanced.
 * Nothing here adds a field to the draft or changes how it is validated, published or graded.
 * Every function that changes a draft only touches what Simple shows, and keeps the rest as it was.
 */
import {
  AnswerReadError,
  SymbolTable,
  displayName,
  normaliseName,
  readExpression,
  readNumber,
} from "@/lib/answer-reader";
import { parseRating } from "@/lib/rating-bands";
import { checkSampled, undecidedMessage } from "@/lib/sampled-check";
import { answerFromBuffer } from "@/lib/authored-student";
import { normalizeNumericUnits } from "@/lib/authored-grading-contracts";
import { authoredKeySchema } from "@/lib/problem-authoring";
import type { EditorBlock, EditorDraft } from "@/lib/problem-authoring-editor";

export type Key = EditorDraft["privateParts"][number]["key"];
export type PrivatePart = EditorDraft["privateParts"][number];
type Part = EditorDraft["content"]["sections"][number]["parts"][number];

export const STUDIO_MODE_KEY = "physcratic.studio.mode";
export type StudioMode = "simple" | "advanced";
/** The author's last choice, kept in this browser only. Simple until they pick Advanced (an old "easy" value means Simple). */
export function readStudioMode(): StudioMode {
  try {
    return window.localStorage.getItem(STUDIO_MODE_KEY) === "advanced" ? "advanced" : "simple";
  } catch {
    return "simple";
  }
}

/** The tick box text. The saved rights declaration is exactly this. */
export const RIGHTS_TEXT =
  "I wrote this problem and I'm happy to share it on Physcratic.";

/** The default tolerance of the Arena and practice checker for a number. Only Advanced can change it. */
export const DEFAULT_ABS_TOL = 1e-9;
export const DEFAULT_REL_TOL = 0.01;

/**
 * The unit labels the authored-problem checker knows. A copy of the list in lib/authored-numeric-grading.ts
 * (that file is server only). tests/simple-model.test.ts checks every entry against the real checker.
 */
export const UNITS = [
  "m", "cm", "mm", "km", "s", "ms", "kg", "g", "A", "K", "mol", "cd", "rad", "sr", "Hz", "N", "Pa", "J", "W", "C",
  "V", "F", "Ω", "S", "Wb", "T", "H", "lm", "lx", "Bq", "Gy", "Sv", "kat", "m/s", "m/s^2", "m^2", "m^3", "kg/m^3",
] as const;
const unitSet = new Set<string>(["", ...UNITS]);
export const knownUnit = (units: string) => unitSet.has(normalizeNumericUnits(units));

const nameShape = /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/;

// ---------------------------------------------------------------------------------------------------------------
// Text with maths. Simple edits the first text block of a field as spans: text and inline equations.
// ---------------------------------------------------------------------------------------------------------------

export type Span = { kind: "text"; text: string } | { kind: "math"; latex: string };

/** Text with each equation between dollar signs. Only for titles, tests and messages. */
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
const firstImageIndex = (blocks: readonly EditorBlock[]) => blocks.findIndex((b) => b.kind === "image");
/** The spans of the first text block. Other blocks (equations, images) are Advanced's or Simple's picture and are kept. */
export function blocksSpans(blocks: readonly EditorBlock[]): Span[] {
  const i = firstTextIndex(blocks);
  const block = i >= 0 ? blocks[i] : undefined;
  return block && block.kind === "text" ? block.spans.map((s) => ({ ...s })) : [];
}
export const blocksText = (blocks: readonly EditorBlock[]) => spansToText(blocksSpans(blocks));
/** The blocks with the first text block set to `spans`. Other blocks are not touched. */
export function withBlocksSpans(blocks: EditorBlock[], spans: readonly Span[]): EditorBlock[] {
  const i = firstTextIndex(blocks);
  const next: Span[] = spans.length ? spans.map((s) => ({ ...s })) : [{ kind: "text", text: "" }];
  if (i >= 0) {
    const copy = [...blocks];
    copy[i] = { ...(blocks[i] as Extract<EditorBlock, { kind: "text" }>), spans: next };
    return copy;
  }
  if (!spans.length) return blocks;
  return [{ id: crypto.randomUUID(), kind: "text", spans: next }, ...blocks];
}
/** Blocks Simple does not show: everything except the first text block and the first picture. */
const hiddenBlocks = (blocks: readonly EditorBlock[]) => {
  const text = firstTextIndex(blocks) >= 0 ? 1 : 0;
  const picture = firstImageIndex(blocks) >= 0 ? 1 : 0;
  return Math.max(0, blocks.length - text - picture);
};

/** The first words of a question as a title: up to five words, title case, no equations. */
export function deriveTitle(spans: readonly Span[]): string {
  const small = new Set(["a", "an", "the", "of", "in", "on", "at", "to", "is", "are", "and", "or", "for", "by", "with"]);
  const words = spans
    .filter((s): s is Extract<Span, { kind: "text" }> => s.kind === "text")
    .map((s) => s.text)
    .join(" ")
    .replace(/[^\p{L}\p{N}'\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  while (words.length > 2 && small.has(words.at(-1)!.toLowerCase())) words.pop();
  return words
    .map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .slice(0, 200);
}

/** Symbols written in the equations of a question, offered on the answer palette. Never saved. */
export function mathSymbols(spans: readonly Span[]): string[] {
  const names: string[] = [];
  for (const span of spans) {
    if (span.kind !== "math") continue;
    try {
      const table = new SymbolTable([], true);
      readExpression(span.latex, table);
      for (const name of table.names) if (nameShape.test(name) && !names.includes(name)) names.push(name);
    } catch {
      /* A half-written equation offers nothing. */
    }
  }
  return names.slice(0, 20);
}

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
export function ensureSimpleShape(d: EditorDraft) {
  if (d.content.sections.length === 0)
    d.content.sections.push({ id: crypto.randomUUID(), title: "", blocks: [], parts: [] });
  if (allParts(d).length === 0) d.content.sections[0].parts.push(newPart(d, 0));
}
export function addPart(d: EditorDraft) {
  ensureSimpleShape(d);
  const section = d.content.sections.at(-1)!;
  if (allParts(d).length >= 50) return;
  section.parts.push(newPart(d, allParts(d).length));
}
export function removePart(d: EditorDraft, partId: string) {
  for (const section of d.content.sections) section.parts = section.parts.filter((p) => p.id !== partId);
  d.privateParts = d.privateParts.filter((p) => p.partId !== partId);
}
/**
 * Sets the question of a part. The title follows the first question until the author writes their own.
 * `partId` is any part. Only the first part feeds the title.
 */
export function setQuestion(d: EditorDraft, partId: string, spans: readonly Span[]) {
  const refs = allParts(d);
  const ref = refs.find((r) => r.part.id === partId);
  if (!ref) return;
  const before = deriveTitle(blocksSpans(ref.part.blocks));
  ref.part.blocks = withBlocksSpans(ref.part.blocks, spans);
  if (refs[0].part.id === partId && (!d.content.title.trim() || d.content.title === before)) d.content.title = deriveTitle(spans);
}
/** The intro many Advanced drafts keep in the shared context. Simple shows it only when it has text. */
export function setIntro(d: EditorDraft, spans: readonly Span[]) {
  d.content.context = withBlocksSpans(d.content.context, spans);
}
/** The first image of the main question (the shared setup). More images belong to Advanced. */
export const contextPictureOf = (d: EditorDraft): Picture | null => pictureOf(d.content.context);
export function addContextPicture(d: EditorDraft, mediaId: string) {
  if (d.content.context.some((b) => b.kind === "image")) return;
  const at = firstTextIndex(d.content.context) + 1;
  d.content.context = [...d.content.context.slice(0, at), { id: crypto.randomUUID(), kind: "image", mediaId, alt: "", caption: "" }, ...d.content.context.slice(at)];
}
export function setContextPictureAlt(d: EditorDraft, alt: string) {
  const i = firstImageIndex(d.content.context);
  if (i >= 0) d.content.context = d.content.context.map((b, j) => (j === i && b.kind === "image" ? { ...b, alt } : b));
}
export function removeContextPicture(d: EditorDraft) {
  const i = firstImageIndex(d.content.context);
  if (i >= 0) d.content.context = d.content.context.filter((_, j) => j !== i);
}
export function setSolution(d: EditorDraft, partId: string, spans: readonly Span[]) {
  const entry = structuredClone(privateFor(d, partId));
  entry.solution = withBlocksSpans(entry.solution, spans);
  upsertPrivate(d, entry);
}

export type Picture = { blockId: string; mediaId: string; alt: string };
/** The first picture of a part's question. More pictures belong to Advanced. */
export function pictureOf(blocks: readonly EditorBlock[]): Picture | null {
  const block = blocks.find((b): b is Extract<EditorBlock, { kind: "image" }> => b.kind === "image");
  return block ? { blockId: block.id, mediaId: block.mediaId, alt: block.alt } : null;
}
/** Puts an uploaded picture after the question text. The statement-image reference is added by the editor's normaliser. */
export function addPicture(d: EditorDraft, partId: string, mediaId: string) {
  const part = allParts(d).find((r) => r.part.id === partId)?.part;
  if (!part || part.blocks.some((b) => b.kind === "image")) return;
  const at = firstTextIndex(part.blocks) + 1;
  part.blocks = [...part.blocks.slice(0, at), { id: crypto.randomUUID(), kind: "image", mediaId, alt: "", caption: "" }, ...part.blocks.slice(at)];
}
export function setPictureAlt(d: EditorDraft, partId: string, alt: string) {
  const part = allParts(d).find((r) => r.part.id === partId)?.part;
  if (!part) return;
  const i = firstImageIndex(part.blocks);
  if (i >= 0) part.blocks = part.blocks.map((b, j) => (j === i && b.kind === "image" ? { ...b, alt } : b));
}
export function removePicture(d: EditorDraft, partId: string) {
  const part = allParts(d).find((r) => r.part.id === partId)?.part;
  if (!part) return;
  const i = firstImageIndex(part.blocks);
  if (i >= 0) part.blocks = part.blocks.filter((_, j) => j !== i);
}

/** What Simple cannot show, so the author knows Advanced holds more. Plain words, or an empty string. */
export function advancedNote(d: EditorDraft): string {
  const found: string[] = [];
  const sections = d.content.sections.length;
  if (sections > 1) found.push(`${sections} sections`);
  if (allParts(d).some((r) => privateFor(d, r.part.id).hints.length)) found.push("hints");
  const pdfs = d.content.attachments.filter((a) => a.purpose.endsWith("pdf")).length;
  if (pdfs) found.push(pdfs === 1 ? "a PDF" : `${pdfs} PDFs`);
  if (d.content.methodTags.length) found.push("method tags");
  // A rating is shown in Simple. An older free-text label is not, so it is still named.
  if (d.content.estimatedDifficulty && parseRating(d.content.estimatedDifficulty) === null) found.push("a difficulty label");
  let extra = hiddenBlocks(d.content.context);
  for (const s of d.content.sections) extra += s.blocks.length + (s.title ? 1 : 0);
  for (const r of allParts(d)) {
    extra += hiddenBlocks(r.part.blocks);
    const solution = privateFor(d, r.part.id).solution;
    extra += Math.max(0, solution.length - (firstTextIndex(solution) >= 0 ? 1 : 0));
  }
  if (extra) found.push("more blocks");
  return found.length ? `Advanced also has ${found.join(", ")}. We keep it and publish it with the rest.` : "";
}

// ---------------------------------------------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------------------------------------------

export type AnswerRead =
  | { kind: "empty" }
  | { kind: "number"; value: number }
  | { kind: "expression"; symbols: string[] }
  | { kind: "error"; message: string };

/** The text of an answer as Simple shows it, taken from the saved key. */
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
/** "advanced": the rights were set in Advanced (permission, or the author's own words). Simple leaves them. */
/** The tick box text when the problem is adapted from somewhere else. The saved rights declaration is exactly this. */
export const ADAPTED_RIGHTS_TEXT = "I have permission to share this adapted problem on Physcratic.";

export type SourceState =
  | { choice: "wrote"; ticked: boolean }
  | { choice: "adapted"; ticked: boolean; source: string }
  | { choice: "advanced" };
/** Where the problem is from, read from the saved provenance. A rights declaration written in Advanced is kept and not shown as a tick. */
export function sourceState(d: EditorDraft): SourceState {
  const { kind, source, rightsDeclaration } = d.content.provenance;
  const own = kind === "original" ? RIGHTS_TEXT : ADAPTED_RIGHTS_TEXT;
  if (rightsDeclaration !== own && rightsDeclaration.trim()) return { choice: "advanced" };
  const ticked = rightsDeclaration === own;
  return kind === "original" ? { choice: "wrote", ticked } : { choice: "adapted", ticked, source };
}
export function rightsState(d: EditorDraft): RightsState {
  const state = sourceState(d);
  return state.choice === "advanced" ? "advanced" : state.ticked ? "ticked" : "unticked";
}
/** "I wrote it" or "Adapted from". Switching clears the tick, so a rights claim is never carried over to the other choice. */
export function setSourceChoice(d: EditorDraft, choice: "wrote" | "adapted") {
  if (sourceState(d).choice === "advanced") return;
  d.content.provenance = choice === "wrote"
    ? { kind: "original", source: "", rightsDeclaration: "" }
    : { kind: "authorized", source: d.content.provenance.source, rightsDeclaration: "" };
}
export function setSourceText(d: EditorDraft, text: string) {
  if (d.content.provenance.kind !== "authorized") return;
  d.content.provenance = { ...d.content.provenance, source: text.slice(0, 2000) };
}
export function setRights(d: EditorDraft, ticked: boolean) {
  const state = sourceState(d);
  if (state.choice === "advanced") return;
  d.content.provenance = { ...d.content.provenance, rightsDeclaration: ticked ? (state.choice === "wrote" ? RIGHTS_TEXT : ADAPTED_RIGHTS_TEXT) : "" };
}

/** The estimated difficulty as a rating, from the stored string. Null when there is none or it is an older free-text label. */
export const difficultyRating = (d: EditorDraft): number | null => parseRating(d.content.estimatedDifficulty ?? "");
/** An older label written in Advanced that is not a rating. It is kept until the author picks a band or types a rating. */
export const difficultyLabel = (d: EditorDraft): string => (difficultyRating(d) === null ? (d.content.estimatedDifficulty ?? "").trim() : "");
/** Saves a rating, or clears the estimate when the text is empty. Anything that is not a whole rating from 0 to 4000 is not saved. */
export function setDifficulty(d: EditorDraft, text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    d.content.estimatedDifficulty = null;
    return true;
  }
  const rating = parseRating(trimmed);
  if (rating === null) return false;
  d.content.estimatedDifficulty = String(rating);
  return true;
}

// ---------------------------------------------------------------------------------------------------------------
// What stops Publish, in plain words, each one tied to a field
// ---------------------------------------------------------------------------------------------------------------

export type SimpleIssue = { field: string; message: string };
/** `reads` holds what the author has typed for each part's answer, when it differs from the saved key. */
export function simpleIssues(d: EditorDraft, reads: Readonly<Record<string, string>> = {}): SimpleIssue[] {
  const issues: SimpleIssue[] = [];
  const parts = allParts(d);
  if (parts.length === 0) issues.push({ field: "parts", message: "Add a question first." });
  for (const { part } of parts) {
    if (!blocksSpans(part.blocks).some((s) => (s.kind === "text" ? s.text.trim() : s.latex.trim())))
      issues.push({ field: `question:${part.id}`, message: "Write the question first." });
    const picture = pictureOf(part.blocks);
    if (picture && !picture.alt.trim()) issues.push({ field: `picture:${part.id}`, message: "Describe the image so everyone can follow it." });
    const entry = privateFor(d, part.id);
    // Simple asks for a worked solution. Advanced and older problems can still publish without one.
    if (!blocksSpans(entry.solution).some((s) => (s.kind === "text" ? s.text.trim() : s.latex.trim())))
      issues.push({ field: `solution:${part.id}`, message: "Add the worked solution." });
    const typed = part.id in reads ? reads[part.id] : answerText(entry.key);
    const read = readAnswer(typed);
    if (read.kind === "empty" || (read.kind !== "error" && entry.key?.kind === "manual"))
      issues.push({ field: `answer:${part.id}`, message: "Add the final answer." });
    else if (read.kind === "error") issues.push({ field: `answer:${part.id}`, message: read.message });
    else if (entry.key?.kind === "numeric" && !knownUnit(entry.key.units))
      issues.push({ field: `units:${part.id}`, message: `We don't know the unit "${entry.key.units}". Pick one from the list or leave it empty.` });
  }
  if (!d.content.title.trim()) issues.push({ field: "title", message: "Give it a title, or write the question and we'll make one." });
  const source = sourceState(d);
  if (source.choice === "adapted" && !source.source.trim()) issues.push({ field: "source", message: "Say where it's from." });
  if (rightsState(d) === "unticked")
    issues.push({ field: "rights", message: source.choice === "adapted" ? "Tick the box to say you have permission to share it." : "Tick the box to say you wrote this problem." });
  const contextPicture = contextPictureOf(d);
  if (contextPicture && !contextPicture.alt.trim()) issues.push({ field: "picture:main", message: "Describe the image so everyone can follow it." });
  return issues;
}

// ---------------------------------------------------------------------------------------------------------------
// Test an answer: the same reader and checker a student gets, against this draft's own key
// ---------------------------------------------------------------------------------------------------------------

export type Verdict = "correct" | "incorrect" | "needs-review" | "ungraded";
/** The labels a student sees. tests/simple-model.test.ts checks they still match the student page. */
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
