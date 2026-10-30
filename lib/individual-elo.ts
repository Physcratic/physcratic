import { z } from "zod";

export const initialIndividualRating = 1200;
export const individualKFactor = 32;
export const problemAnswerCheckSchema = z.object({
  partId: z.string().trim().min(1).max(32),
  expected: z.string().trim().min(1).max(350),
  variables: z.array(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,24}$/)).max(16),
  maxPoints: z.number().finite().positive().max(100),
}).strict();
export const problemAnswerChecksSchema = z.array(problemAnswerCheckSchema).min(1).max(100).refine((checks) => new Set(checks.map((check) => check.partId)).size === checks.length, "Subpart labels must be unique");
export type ProblemAnswerCheck = z.infer<typeof problemAnswerCheckSchema>;

export function calculateIndividualElo(before: number, problemRating: number, score: number) {
  if (![before, problemRating].every((value) => Number.isInteger(value) && value >= 0 && value <= 4000) || !Number.isFinite(score) || score < 0 || score > 1) throw new Error("Invalid rating or score");
  const expectedScore = 1 / (1 + 10 ** ((problemRating - before) / 400));
  const rating = Math.min(4000, Math.max(0, Math.round(before + individualKFactor * (score - expectedScore))));
  return { rating, change: rating - before, expectedScore, kFactor: individualKFactor };
}

export function completeProblemScore(checks: readonly ProblemAnswerCheck[], results: readonly { partId: string; maxPoints: number; awardedPoints: number }[]) {
  if (!checks.length) return null;
  const selected = checks.map((check) => results.find((result) => result.partId === check.partId));
  if (selected.some((result) => !result)) return null;
  let awarded = 0;
  let maximum = 0;
  checks.forEach((check, index) => {
    const result = selected[index]!;
    if (result.maxPoints !== check.maxPoints || !Number.isFinite(result.awardedPoints) || result.awardedPoints < 0 || result.awardedPoints > check.maxPoints) throw new Error("Invalid trusted answer result");
    maximum += check.maxPoints;
    awarded += result.awardedPoints;
  });
  return awarded / maximum;
}
