import { z } from "zod";

// Client-safe transport types only; evaluation and key retrieval are server-only.
const id = z.uuid().transform((value) => value.toLowerCase());
export const gradeSelectionSchema = z.strictObject({
  problemId: id,
  revisionId: id,
  partId: id,
});
export const numericAnswerSchema = z.strictObject({
  kind: z.literal("numeric"),
  value: z.number().finite(),
  units: z.string().max(80).trim(),
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
  | { status: "correct"; reason: "within-tolerance" }
  | { status: "incorrect"; reason: "outside-tolerance" }
  | {
      status: "needs-review";
      reason:
        | "units-unsupported"
        | "units-mismatch"
        | "answer-mode-unsupported"
        | "key-unavailable"
        | "service-unavailable";
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
  engineVersion: "numeric-v1";
  selection: GradeSelection | null;
};
