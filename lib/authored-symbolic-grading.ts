import "server-only";
import { authoredKeySchema } from "./problem-authoring";
import { authoredAnswerSchema, type GradeEvaluation } from "./authored-grading-contracts";
import { checkSampled } from "./sampled-check";

// Authored expression answers are checked by the same seeded test-value method as practice and Arena answers.
// From 2026-11-05 (Phase 1) attempts keep the stored label `symbolic-v1`, because the attempts table only allows
// `numeric-v1` and `symbolic-v1`. A `sampled-v1` label needs a migration, requested in docs/engineering/answer-checking.md.
// The result codes are unchanged: "symbolic-equivalent" now means "agrees with the key for every test value".
export function evaluateExpressionAnswer(
  answerInput: unknown,
  keyInput: unknown,
  /** Identifies the problem and part, so the same answer always gets the same result. */
  seed = "authored",
): GradeEvaluation {
  try {
    const answer = authoredAnswerSchema.safeParse(answerInput);
    const key = authoredKeySchema.safeParse(keyInput);
    if (!answer.success || answer.data.kind !== "expression") return { status: "needs-review", reason: "symbolic-unsupported" };
    if (!key.success || key.data.kind !== "expression") return { status: "needs-review", reason: "key-unavailable" };
    const outcome = checkSampled({
      seed,
      answer: answer.data.expression,
      references: [key.data.expected],
      // A key that declares no symbols uses the symbols in its own expression.
      symbols: key.data.variables.map((variable) => ({ name: variable.name, assumptions: variable.assumptions, min: variable.min, max: variable.max })),
      exclusions: key.data.exclusions,
      angleUnit: key.data.angleUnit,
      maxCharacters: 180,
    });
    switch (outcome.status) {
      case "correct": return { status: "correct", reason: "symbolic-equivalent" };
      case "incorrect": return { status: "incorrect", reason: "symbolic-counterexample" };
      case "invalid": return { status: "needs-review", reason: "symbolic-unsupported" };
      default:
        return { status: "needs-review", reason: ({ "key-unreadable": "key-unavailable", exclusion: "symbolic-domain", "time-limit": "symbolic-resource-limit", "few-valid-sets": "symbolic-inconclusive" } as const)[outcome.reason] };
    }
  } catch {
    return { status: "needs-review", reason: "symbolic-inconclusive" };
  }
}
