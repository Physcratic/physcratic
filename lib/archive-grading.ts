import "server-only";
import { archiveGradeRequestSchema, type ArchiveGradeResponse, type ArchivePartResult } from "./archive-grading-contracts";
import { archiveVersion, getArchiveDefinition } from "./archive-grading/catalog";
import type { ArchiveKeyPart } from "./archive-grading/definitions";
import { evaluateNumericAnswer } from "./authored-numeric-grading";
import { evaluateExpressionAnswer } from "./authored-symbolic-grading";
import { algebraExpression, constantValue, LatexAnswerError, parseLatexAnswer, structuralForm, type AnswerNode } from "./latex-answer";
import { compareLatexExpressions } from "./latex-symbolic";

const prepared = new WeakMap<ArchiveKeyPart, { forms: string[]; algebra: string | null; node: AnswerNode }>();
function prepare(part: ArchiveKeyPart) {
  let entry = prepared.get(part);
  if (entry) return entry;
  if (part.kind !== "expression") throw new Error("Expression key required");
  const nodes = [part.canonical, ...part.alternatives].map((value) => parseLatexAnswer(value, part.symbols));
  entry = { forms: nodes.map(structuralForm), algebra: algebraExpression(nodes[0]), node: nodes[0] };
  prepared.set(part, entry);
  return entry;
}
export function checkArchivePart(part: ArchiveKeyPart, latex: string): Omit<ArchivePartResult, "partId"> {
  if (part.kind === "self-review") return { status: "self-review", message: `Self-review: ${part.reason}` };
  if (!latex.trim()) return { status: "unanswered", message: "Unanswered. You can check this part later." };
  let node: AnswerNode;
  try {
    node = parseLatexAnswer(latex, part.symbols, part.kind === "special");
    if (part.kind === "special") {
      if (node.type === "infinity") return { status: "correct", message: "Correct: the interface is flat, so its radius of curvature is unbounded." };
      constantValue(node);
      return { status: "incorrect", message: "A finite radius does not describe this equal-pressure interface. Review the curvature convention." };
    }
    if (part.kind === "numeric") {
      const value = constantValue(node);
      // Units are fixed by the field, never parsed or converted from user text.
      let checked = evaluateNumericAnswer({ kind: "numeric", value, units: "" }, { kind: "numeric", value: part.target, units: "", absTol: part.absTol, relTol: part.relTol });
      if (part.absTol === 0 && part.relTol === 0) {
        const actual = algebraExpression(node);
        if (!actual) return { status: "inconclusive", message: "This part requires an exact value; the checker could not prove this constant expression exactly. Simplify it or compare with the solution." };
        checked = evaluateExpressionAnswer({ kind: "expression", expression: actual }, { kind: "expression", expected: String(part.target), variables: [], angleUnit: "radians", exclusions: [] });
      }
      return checked.status === "correct" ? { status: "correct", message: "Correct within this part’s numerical tolerance." } : checked.status === "incorrect" ? { status: "incorrect", message: "Not quite. Check your calculation, sign, and the displayed unit, then retry." } : { status: "inconclusive", message: "Could not verify this numeric result automatically. Review the worked solution." };
    }
  } catch (reason) {
    return { status: "invalid", message: reason instanceof LatexAnswerError ? reason.message : "The expression could not be parsed safely. Simplify it and retry." };
  }
  try {
    const key = prepare(part);
    if (key.forms.includes(structuralForm(node))) return { status: "correct", message: "Correct: matches a reviewed final-answer form under the stated assumptions. Your derivation has not been graded." };
    const actual = algebraExpression(node);
    if (actual && key.algebra) {
      const checked = evaluateExpressionAnswer({ kind: "expression", expression: actual }, {
        kind: "expression", expected: key.algebra, angleUnit: part.angleUnit, exclusions: part.exclusions,
        variables: part.symbols.map((symbol, index) => ({ name: `v${index}`, domain: "real", assumptions: symbol.assumptions })),
      });
      if (checked.status === "correct") return { status: "correct", message: "Correct: exact algebraic equivalence verified under the stated domain assumptions. Your derivation has not been graded." };
      if (checked.status === "incorrect") return { status: "incorrect", message: "This expression is not equivalent to the answer under the stated assumptions. Check signs and factors." };
    }
    const symbolic = compareLatexExpressions(node, key.node, part);
    if (symbolic === "correct") return { status: "correct", message: "Correct: exact symbolic identities verified with the original domain restrictions preserved. Your derivation has not been graded." };
    if (symbolic === "incorrect") return { status: "incorrect", message: "This expression has a provably nonzero difference from the answer. Check signs, factors and added terms." };
  } catch { /* A catalog/parser capability gap must never fail the student's answer. */ }
  return { status: "inconclusive", message: "Could not verify automatically. This may be an equivalent form outside the checker’s proven subset; compare it with the worked solution. This is not marked incorrect." };
}
export class ArchiveGradeRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export function gradeArchiveAnswers(input: unknown): ArchiveGradeResponse {
  const parsed = archiveGradeRequestSchema.safeParse(input);
  if (!parsed.success) throw new ArchiveGradeRequestError("Invalid request. Send only problem ID, current version, and part-ID/LaTeX answers.", 400);
  const definition = getArchiveDefinition(parsed.data.problemId);
  if (!definition) throw new ArchiveGradeRequestError("Only Arena and Quick practice problems can be checked here.", 404);
  const version = archiveVersion(definition);
  if (parsed.data.version !== version) throw new ArchiveGradeRequestError("The problem or answer key has changed. The answer fields are being refreshed; keep your input and retry.", 409);
  const answers = new Map<string, string>();
  for (const answer of parsed.data.answers) {
    if (answers.has(answer.partId) || !definition.parts.some((part) => part.id === answer.partId)) throw new ArchiveGradeRequestError("Unknown or duplicate answer part.", 400);
    answers.set(answer.partId, answer.latex);
  }
  const deadline = performance.now() + 1500;
  return { problemId: definition.problemId, version, results: definition.parts.map((part) => ({ partId: part.id,
    ...(performance.now() > deadline && answers.get(part.id)?.trim() && part.kind !== "self-review" ? { status: "inconclusive" as const, message: "The bounded check reached its time limit. Keep your answer and retry this part separately." } : checkArchivePart(part, answers.get(part.id) ?? "")),
  })) };
}
