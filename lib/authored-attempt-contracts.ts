import { z } from "zod";
import {
  authoredAnswerSchema,
  gradeSelectionSchema,
} from "./authored-grading-contracts";
const id = z.uuid().transform((v) => v.toLowerCase());
export const authoredAttemptPolicy = Object.freeze({
  requestsPerMinute: 60,
  submissionsPerMinute: 20,
  attemptsPerDay: 100,
  attemptsPerPart: 10,
  maxBodyBytes: 20000,
  bodyTimeoutMs: 5000,
  historyPageSize: 50,
  spoilerPolicy: "no-reveal-v1" as const,
  reveal: "disabled" as const,
});
export const studentSubmissionSchema = gradeSelectionSchema
  .omit({ problemId: true })
  .extend({ answer: authoredAnswerSchema, idempotencyKey: id })
  .superRefine((input, ctx) => {
    const answer = input.answer,
      strings =
        answer.kind === "numeric"
          ? [answer.units]
          : answer.kind === "expression"
            ? [answer.expression]
            : [answer.text];
    if (strings.some((text) => text.includes("\u0000") || !text.isWellFormed()))
      ctx.addIssue({
        code: "custom",
        message: "Answer text must be valid PostgreSQL-compatible Unicode",
      });
  });
const common = {
  engineVersion: z.enum(["numeric-v1", "symbolic-v1"]),
  selection: gradeSelectionSchema,
};
// Runtime allowlist, including status/reason pair consistency. No grader extras pass.
export const studentGradeSchema = z.discriminatedUnion("status", [
  z.strictObject({
    ...common,
    status: z.literal("correct"),
    reason: z.enum(["within-tolerance", "symbolic-equivalent"]),
  }),
  z.strictObject({
    ...common,
    status: z.literal("incorrect"),
    reason: z.enum(["outside-tolerance", "symbolic-counterexample"]),
  }),
  z.strictObject({
    ...common,
    status: z.literal("needs-review"),
    reason: z.enum([
      "units-unsupported",
      "units-mismatch",
      "answer-mode-unsupported",
      "key-unavailable",
      "service-unavailable",
      "symbolic-unsupported",
      "symbolic-domain",
      "symbolic-resource-limit",
      "symbolic-inconclusive",
    ]),
  }),
  z.strictObject({
    ...common,
    status: z.literal("ungraded"),
    reason: z.enum([
      "invalid-input",
      "not-authorized",
      "revision-unavailable",
      "manual",
    ]),
  }),
]);
export const attemptCursorSchema = z.strictObject({ at: z.iso.datetime(), id });
export type StudentSubmission = z.infer<typeof studentSubmissionSchema>;
export type StudentGrade = z.infer<typeof studentGradeSchema>;
export type AuthoredAttempt = {
  id: string;
  problemId: string;
  revisionId: string;
  partId: string;
  answer: z.infer<typeof authoredAnswerSchema>;
  status: StudentGrade["status"];
  reason: StudentGrade["reason"];
  engineVersion: StudentGrade["engineVersion"];
  attemptNumber: number;
  createdAt: string;
  spoilerPolicy: "no-reveal-v1";
  assisted: false;
};
