import { z } from "zod";
import { problems } from "@/lib/physics";

export const practiceSubmissionSchema = z.object({
  problemId: z.string().min(1).max(100),
  answer: z.number().finite(),
  working: z.string().max(12_000).default(""),
  idempotencyKey: z.uuid(),
});

export function checkPracticeAnswer(problemId: string, answer: number) {
  const problem = problems.find((item) => item.id === problemId);
  if (!problem) throw new Error("Unknown practice problem.");
  return (
    Number.isFinite(answer) &&
    Math.abs(answer - problem.answer) <=
      Math.max(0.005, Math.abs(problem.answer) * 0.005)
  );
}
