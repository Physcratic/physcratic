import { z } from "zod";

// Client-safe transport policy/types; evaluation and key retrieval are server-only.
export const numericUnitsHelp =
  "Use 1 or leave blank for a dimensionless answer; they are equivalent. Other unit labels must match exactly.";
// The sole label alias: blank and ASCII "1" both denote dimensionless quantities.
// Do not rewrite stored author keys or interpret unit expressions/conversions.
export function normalizeNumericUnits(units: string): string {
  const label = units.trim();
  return label === "1" ? "" : label;
}
const id = z.uuid().transform((value) => value.toLowerCase());
export const gradeSelectionSchema = z.strictObject({
  problemId: id,
  revisionId: id,
  partId: id,
});
export const numericAnswerSchema = z.strictObject({
  kind: z.literal("numeric"),
  value: z.number().finite(),
  units: z.string().max(80).transform(normalizeNumericUnits),
});
export const authoredAnswerSchema = z.discriminatedUnion("kind", [
  numericAnswerSchema,
  z.strictObject({
    kind: z.literal("expression"),
    expression: z.string().min(1).max(180),
  }),
  z.strictObject({ kind: z.literal("manual"), text: z.string().max(4000) }),
]);
export const authoredGradeInputSchema = gradeSelectionSchema.extend({
  answer: authoredAnswerSchema,
});
export type GradeSelection = z.infer<typeof gradeSelectionSchema>;
export type AuthoredGradeInput = z.infer<typeof authoredGradeInputSchema>;
export type NumericAnswer = z.infer<typeof numericAnswerSchema>;
export type GradeEvaluation =
  | { status: "correct"; reason: "within-tolerance" | "symbolic-equivalent" }
  | {
      status: "incorrect";
      reason: "outside-tolerance" | "symbolic-counterexample";
    }
  | {
      status: "needs-review";
      reason:
        | "units-unsupported"
        | "units-mismatch"
        | "answer-mode-unsupported"
        | "key-unavailable"
        | "service-unavailable"
        | "symbolic-unsupported"
        | "symbolic-domain"
        | "symbolic-resource-limit"
        | "symbolic-inconclusive";
    }
  | {
      status: "ungraded";
      reason:
        | "invalid-input"
        | "not-authorized"
        | "revision-unavailable"
        | "manual";
    };
export type AuthoredGradeResult = GradeEvaluation & {
  engineVersion: "numeric-v1" | "symbolic-v1";
  selection: GradeSelection | null;
};
