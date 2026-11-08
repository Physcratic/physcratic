import "server-only";
import type { ArchivePartResult } from "./archive-grading-contracts";
import type { ArchiveKeyPart } from "./archive-grading/definitions";
import { evaluateNumericAnswer } from "./authored-numeric-grading";
import { constantValue, LatexAnswerError, parseLatexAnswer, structuralForm, type AnswerNode } from "./exact-latex-answer";
import { compareLatexExpressions } from "./latex-symbolic";

const prepared = new WeakMap<ArchiveKeyPart, { forms: string[]; node: AnswerNode }>();
function prepare(part: ArchiveKeyPart) {
  let entry = prepared.get(part);
  if (entry) return entry;
  if (part.kind !== "expression") throw new Error("Expression key required");
  const nodes = [part.canonical, ...part.alternatives].map((value) => parseLatexAnswer(value, part.symbols));
  entry = { forms: nodes.map(structuralForm), node: nodes[0] };
  prepared.set(part, entry);
  return entry;
}

// Explicit exact verification is independent of the site's default sampled checker and its input conventions.
export function checkArchivePartExactly(part: ArchiveKeyPart, latex: string): Omit<ArchivePartResult, "partId"> {
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
    if (part.kind === "numeric" && (part.absTol !== 0 || part.relTol !== 0)) {
      const value = constantValue(node);
      const checked = evaluateNumericAnswer({ kind: "numeric", value, units: "" }, { kind: "numeric", value: part.target, units: "", absTol: part.absTol, relTol: part.relTol });
      if (checked.status === "correct") return { status: "correct", message: "Correct within this part’s numerical tolerance." };
      if (checked.status === "incorrect") return { status: "incorrect", message: "Not quite. Check your calculation, sign, and the displayed unit, then retry." };
    }
  } catch (reason) {
    return { status: "invalid", message: reason instanceof LatexAnswerError ? reason.message : "The expression could not be parsed safely. Simplify it and retry." };
  }
  try {
    const key = part.kind === "expression" ? prepare(part) : { forms: [], node: parseLatexAnswer(String(part.target)) };
    if (key.forms.includes(structuralForm(node))) return { status: "correct", message: "Correct. Your answer matches a reviewed exact form. Your derivation has not been graded." };
    const symbolic = compareLatexExpressions(node, key.node, part);
    if (symbolic === "correct") return { status: "correct", message: "Correct. Exact symbolic equivalence verified with the original domain restrictions preserved. Your derivation has not been graded." };
    if (symbolic === "incorrect") return { status: "incorrect", message: "This expression has a nonzero exact difference from the answer. Check signs, factors and added terms." };
  } catch { /* An unsupported exact proof must not turn into an incorrect grade. */ }
  return { status: "inconclusive", message: "Could not verify this answer exactly. Compare it with the worked solution. This is not marked incorrect." };
}
