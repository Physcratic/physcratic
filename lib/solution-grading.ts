import { z } from "zod";

export const submissionLimits = { maxText: 12000, maxFiles: 5, maxFileBytes: 3 * 1024 * 1024, maxTotalBytes: 8 * 1024 * 1024 } as const;
export const submissionMediaTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
const evidenceSchema = z.object({
  id: z.string().uuid(),
  mediaType: z.enum(submissionMediaTypes),
  bytes: z.number().int().positive().max(submissionLimits.maxFileBytes),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export const solutionSubmissionSchema = z.object({
  problemId: z.string().regex(/^(ipho|apho|eupho)-\d{4}-t\d+$/),
  problemVersion: z.string().regex(/^[a-f0-9]{64}$/),
  partId: z.string().trim().min(1).max(32),
  working: z.string().trim().max(submissionLimits.maxText),
  finalAnswer: z.string().trim().max(1000),
  evidence: z.array(evidenceSchema).max(submissionLimits.maxFiles),
  transcription: z.object({ text: z.string().trim().min(1).max(submissionLimits.maxText), confirmed: z.literal(true) }).strict().optional(),
  idempotencyKey: z.string().uuid(),
}).strict().superRefine((submission, context) => {
  if (!submission.working && !submission.finalAnswer && !submission.evidence.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Provide reasoning, a final answer, or a supported attachment" });
  if (submission.evidence.reduce((sum, file) => sum + file.bytes, 0) > submissionLimits.maxTotalBytes) context.addIssue({ code: z.ZodIssueCode.custom, message: "Attachments exceed the aggregate upload limit" });
  if (new Set(submission.evidence.map((file) => file.id)).size !== submission.evidence.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate evidence identifiers" });
  if (submission.evidence.length && !submission.transcription) context.addIssue({ code: z.ZodIssueCode.custom, message: "Confirm the extracted handwriting and equations before grading" });
});

export type SolutionSubmission = z.infer<typeof solutionSubmissionSchema>;
export type SubmissionEvidence = SolutionSubmission["evidence"][number];

const criterionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  maxPoints: z.number().finite().positive(),
  sourceReference: z.string().min(1),
  acceptsEquivalentMethods: z.literal(true),
  errorCarryForward: z.enum(["allowed", "not-applicable"]),
}).strict();
export const markingRubricSchema = z.object({
  id: z.string().uuid(),
  problemId: z.string(),
  partId: z.string(),
  version: z.number().int().positive(),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  maxPoints: z.number().finite().positive(),
  status: z.enum(["draft", "approved"]),
  reviewedBy: z.string().min(1).nullable(),
  criteria: z.array(criterionSchema).min(1),
}).strict().superRefine((rubric, context) => {
  if (Math.abs(rubric.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0) - rubric.maxPoints) > 0.000001) context.addIssue({ code: z.ZodIssueCode.custom, message: "Criterion marks must equal the official subpart total" });
  if (new Set(rubric.criteria.map((criterion) => criterion.id)).size !== rubric.criteria.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Criterion identifiers must be unique" });
  if (rubric.status === "approved" && !rubric.reviewedBy) context.addIssue({ code: z.ZodIssueCode.custom, message: "An approved rubric requires a recorded independent reviewer" });
});
export const criterionAssessmentSchema = z.object({
  criterionId: z.string(),
  proposedPoints: z.number().finite().nonnegative(),
  evidenceQuote: z.string().max(2000),
  feedback: z.string().min(1).max(2000),
  uncertain: z.boolean(),
}).strict();

export function assessPracticeGrade(rubricInput: unknown, assessmentsInput: unknown, submissionInput: unknown) {
  const rubric = markingRubricSchema.parse(rubricInput);
  const assessments = z.array(criterionAssessmentSchema).parse(assessmentsInput);
  const submission = solutionSubmissionSchema.parse(submissionInput);
  if (rubric.status !== "approved") throw new Error("Unapproved rubrics cannot produce grades");
  if (submission.problemId !== rubric.problemId || submission.partId !== rubric.partId || submission.problemVersion !== rubric.sourceSha256) throw new Error("Submission and rubric must refer to the same problem, subpart and source version");
  const submittedEvidence = [submission.working, submission.finalAnswer, submission.transcription?.text ?? ""].join("\n");
  if (assessments.length !== rubric.criteria.length || new Set(assessments.map((item) => item.criterionId)).size !== assessments.length) throw new Error("Each criterion must be assessed exactly once");
  let total = 0;
  let needsReview = false;
  for (const criterion of rubric.criteria) {
    const assessment = assessments.find((item) => item.criterionId === criterion.id);
    if (!assessment || assessment.proposedPoints > criterion.maxPoints) throw new Error("Unknown, missing, or over-scored criterion");
    if (assessment.proposedPoints > 0 && (!assessment.evidenceQuote.trim() || !submittedEvidence.includes(assessment.evidenceQuote.trim()))) throw new Error("Credit requires an exact evidence quote from the submitted work");
    total += assessment.proposedPoints;
    needsReview ||= assessment.uncertain;
  }
  return {
    status: needsReview ? "needs-review" as const : "provisional" as const,
    proposedPoints: Math.round(total * 1_000_000) / 1_000_000,
    awardedPoints: null,
    maxPoints: rubric.maxPoints,
    rubricVersion: rubric.version,
    rated: false as const,
    eloDelta: 0 as const,
    criteria: assessments,
  };
}
