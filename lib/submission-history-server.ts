import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { individualRatingEvents, solutionAttempts, solutionChecks } from "@/lib/db/schema";
import type { SubmissionHistoryData } from "./submission-history-types";

/** Caller must validate the session and account restrictions before supplying userId. */
export async function getSubmissionHistory(userId: string): Promise<SubmissionHistoryData> {
  const attempts = await db.select({ id: solutionAttempts.id, problemId: solutionAttempts.problemId, partId: solutionAttempts.partId, payload: solutionAttempts.payload, status: solutionAttempts.status, createdAt: solutionAttempts.createdAt, check: { matched: solutionChecks.matched, awardedPoints: solutionChecks.awardedPoints, maxPoints: solutionChecks.maxPoints }, ratingEvent: { rating: individualRatingEvents.afterRating, change: individualRatingEvents.change } }).from(solutionAttempts).leftJoin(solutionChecks, and(eq(solutionChecks.attemptId, solutionAttempts.id), eq(solutionChecks.userId, userId))).leftJoin(individualRatingEvents, and(eq(individualRatingEvents.attemptId, solutionAttempts.id), eq(individualRatingEvents.userId, userId))).where(eq(solutionAttempts.userId, userId)).orderBy(desc(solutionAttempts.createdAt)).limit(50);
  // Empty histories never load the catalogue. Titles stay out of the client bundle.
  const titles = attempts.length ? new Map((await import("@/lib/corpus-catalog")).catalogProblems.map(problem => [problem.id, problem.title])) : new Map<string, string>();
  return { attempts: attempts.map(attempt => ({ ...attempt, title: titles.get(attempt.problemId) ?? attempt.problemId, createdAt: attempt.createdAt.toISOString() })) };
}
