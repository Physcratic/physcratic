import type { ImportedNode, ImportedProblem } from "./imported-corpus-schema";
import { normalizeSourceText } from "./corpus-translation";

function textSegments(nodes: ImportedNode[]): string[] {
  return nodes.flatMap((node) => node.type === "text" ? [normalizeSourceText(node.text)] : textSegments(node.children ?? [])).filter(Boolean);
}

export function assessSolutionSource(problem: ImportedProblem) {
  if (problem.solution.format === "pdf") {
    return { status: "review-required" as const, canGrade: false as const, reason: "A source document is imported, but its answers and marking rubric have not been independently verified." };
  }
  const statement = normalizeSourceText(problem.statement.text);
  const novelSegments = textSegments(problem.solution.nodes).filter((text) => !statement.includes(text));
  if (novelSegments.length === 0 && problem.solution.figures.length === 0) {
    return { status: "missing-derivation" as const, canGrade: false as const, reason: "The imported solution page only repeats question text. It contains no independent derivation or answer and cannot be used as a grading reference." };
  }
  return { status: "review-required" as const, canGrade: false as const, reason: "Imported solution content is available, but completeness, physics and a marking rubric still need independent review." };
}
