import { z } from "zod";
import { practiceProgressEntrySchema } from "./practice-check-contracts";
export const problemProgressEntrySchema = z.union([
  practiceProgressEntrySchema,
  practiceProgressEntrySchema.extend({ kind: z.literal("authored"), problemId: z.uuid(), version: z.uuid(), href: z.string().regex(/^\/dashboard\/authored\/[0-9a-f-]{36}$/), requiredParts: z.number().int().nonnegative() }),
]);
export const problemProgressSchema = z.strictObject({
  progress: z.array(problemProgressEntrySchema).max(2000), savedChecks: z.number().int().nonnegative(),
  solvedProblems: z.number().int().nonnegative(), inProgressProblems: z.number().int().nonnegative(), notGradedProblems: z.number().int().nonnegative(),
  sources: z.strictObject({ practice: z.boolean(), authored: z.boolean() }),
});
export type ProblemProgress = z.infer<typeof problemProgressSchema>;
