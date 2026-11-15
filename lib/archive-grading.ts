import "server-only";
import { archiveAnswerLimit, archiveGradeRequestSchema, type ArchiveGradeResponse, type ArchivePartResult } from "./archive-grading-contracts";
import { archiveVersion, getArchiveDefinition } from "./archive-grading/catalog";
import type { ArchiveKeyPart } from "./archive-grading/definitions";
import { AnswerReadError, readNumber } from "./answer-reader";
import { checkSampled, undecidedMessage } from "./sampled-check";

const MATCH = "Correct. Your answer matches the reference answer for every set of test values. Your derivation has not been graded.";
const DIFFERS = "Not correct. Your answer gives a different value from the reference answer for some test values. Check signs, factors and which symbols you used.";
const EXACT_RELATIVE = 1e-9;
const EXACT_FLOOR = 1e-12;

/** Checks one typed answer against one part's key. `problemId` fixes the random test values together with the part. */
export function checkArchivePart(part: ArchiveKeyPart, latex: string, problemId = ""): Omit<ArchivePartResult, "partId"> {
  if (part.kind === "self-review") return { status: "self-review", message: `Self-review: ${part.reason}` };
  if (!latex.trim()) return { status: "unanswered", message: "Unanswered. You can check this part later." };
  if (part.kind === "special") {
    // The one part whose answer is "unbounded" (a flat interface). Anything else must be a finite number.
    if (/^\+?\\infty$/.test(latex.replace(/\s/g, ""))) return { status: "correct", message: "Correct: the interface is flat, so its radius of curvature is unbounded." };
    try { readNumber(latex); } catch (reason) { return invalid(reason); }
    return { status: "incorrect", message: "A finite radius does not describe this equal-pressure interface. Review the curvature convention." };
  }
  if (part.kind === "numeric") {
    let value: number;
    try { value = readNumber(latex); } catch (reason) { return invalid(reason); }
    // Units are fixed by the field, never parsed or converted from user text.
    const exact = part.absTol === 0 && part.relTol === 0;
    const allowed = exact ? Math.max(EXACT_FLOOR, EXACT_RELATIVE * Math.abs(part.target)) : Math.max(part.absTol, part.relTol * Math.abs(part.target));
    return Math.abs(value - part.target) <= allowed
      ? { status: "correct", message: "Correct within this part’s numerical tolerance." }
      : { status: "incorrect", message: "Not quite. Check your calculation, sign, and the displayed unit, then retry." };
  }
  const outcome = checkSampled({
    seed: `${problemId}:${part.id}`,
    answer: latex,
    references: [part.canonical, ...part.alternatives],
    symbols: part.symbols.map((symbol) => ({ name: symbol.latex, assumptions: symbol.assumptions, aliases: symbol.aliases, min: symbol.min, max: symbol.max })),
    exclusions: part.exclusions,
    angleUnit: part.angleUnit,
    maxCharacters: archiveAnswerLimit,
  });
  if (outcome.status === "correct") return { status: "correct", message: MATCH };
  if (outcome.status === "incorrect") return { status: "incorrect", message: DIFFERS };
  if (outcome.status === "invalid") return { status: "invalid", message: outcome.message };
  return { status: "inconclusive", message: undecidedMessage(outcome.reason) };
}
function invalid(reason: unknown): Omit<ArchivePartResult, "partId"> {
  if (reason instanceof AnswerReadError) return { status: "invalid", message: reason.message };
  return { status: "invalid", message: "This could not be read as a maths expression. Simplify it and retry." };
}
export class ArchiveGradeRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export function gradeArchiveAnswers(input: unknown): ArchiveGradeResponse {
  const parsed = archiveGradeRequestSchema.safeParse(input);
  if (!parsed.success) throw new ArchiveGradeRequestError("Invalid request. Send only problem ID, current version, and part-ID/LaTeX answers.", 400);
  const definition = getArchiveDefinition(parsed.data.problemId);
  if (!definition) throw new ArchiveGradeRequestError("This problem does not have configured answer checks.", 404);
  const version = archiveVersion(definition);
  if (parsed.data.version !== version) throw new ArchiveGradeRequestError("The problem or answer key has changed. The answer fields are being refreshed; keep your input and retry.", 409);
  const answers = new Map<string, string>();
  for (const answer of parsed.data.answers) {
    if (answers.has(answer.partId) || !definition.parts.some((part) => part.id === answer.partId)) throw new ArchiveGradeRequestError("Unknown or duplicate answer part.", 400);
    answers.set(answer.partId, answer.latex);
  }
  const deadline = performance.now() + 1500;
  return { problemId: definition.problemId, version, results: definition.parts.map((part) => ({ partId: part.id,
    ...(performance.now() > deadline && answers.get(part.id)?.trim() && part.kind !== "self-review" ? { status: "inconclusive" as const, message: "The bounded check reached its time limit. Keep your answer and retry this part separately." } : checkArchivePart(part, answers.get(part.id) ?? "", definition.problemId)),
  })) };
}
