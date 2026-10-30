import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { individualRatingEvents, individualRatings, problemRatings, solutionChecks } from "@/lib/db/schema";
import { calculateIndividualElo, completeProblemScore, initialIndividualRating, problemAnswerChecksSchema } from "@/lib/individual-elo";
import { matchesPlainMath, parsePlainMath } from "@/lib/plain-math";
import type { SolutionSubmission } from "@/lib/solution-grading";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function checkAndRateSubmission(transaction: Transaction, userId: string, attemptId: string, submission: SolutionSubmission) {
  const [configuration] = await transaction.select().from(problemRatings).where(eq(problemRatings.problemId, submission.problemId)).for("share").limit(1);
  if (!configuration || !configuration.reviewedBy || configuration.sourceVersion !== submission.problemVersion || !submission.finalAnswer) return;
  const configured = problemAnswerChecksSchema.safeParse(configuration.checks);
  if (!configured.success) return;
  const check = configured.data.find((item) => item.partId === submission.partId);
  if (!check) return;
  let matched: boolean;
  try {
    parsePlainMath(check.expected, check.variables);
    matched = matchesPlainMath(submission.finalAnswer, check.expected, check.variables);
  } catch {
    return;
  }
  await transaction.insert(solutionChecks).values({ attemptId, userId, problemId: submission.problemId, partId: submission.partId, sourceVersion: submission.problemVersion, ratingVersion: configuration.ratingVersion, matched, maxPoints: check.maxPoints, awardedPoints: matched ? check.maxPoints : 0 }).onConflictDoNothing();
  if (!configuration.ratedEnabled || configuration.rating === null) return;
  const [previous] = await transaction.select({ id: individualRatingEvents.id }).from(individualRatingEvents).where(and(eq(individualRatingEvents.userId, userId), eq(individualRatingEvents.problemId, submission.problemId))).limit(1);
  if (previous) return;
  const firstChecks = await transaction.selectDistinctOn([solutionChecks.partId], { partId: solutionChecks.partId, maxPoints: solutionChecks.maxPoints, awardedPoints: solutionChecks.awardedPoints }).from(solutionChecks).where(and(eq(solutionChecks.userId, userId), eq(solutionChecks.problemId, submission.problemId), eq(solutionChecks.sourceVersion, submission.problemVersion), eq(solutionChecks.ratingVersion, configuration.ratingVersion))).orderBy(asc(solutionChecks.partId), asc(solutionChecks.createdAt), asc(solutionChecks.attemptId));
  // Rating the first checked answer for each subpart prevents retry-based Elo farming.
  const score = completeProblemScore(configured.data, firstChecks);
  if (score === null) return;
  await transaction.insert(individualRatings).values({ userId, rating: initialIndividualRating }).onConflictDoNothing();
  const [account] = await transaction.select().from(individualRatings).where(eq(individualRatings.userId, userId)).for("update");
  const update = calculateIndividualElo(account.rating, configuration.rating, score);
  const [event] = await transaction.insert(individualRatingEvents).values({ id: randomUUID(), userId, attemptId, problemId: submission.problemId, sourceVersion: submission.problemVersion, ratingVersion: configuration.ratingVersion, problemRating: configuration.rating, beforeRating: account.rating, afterRating: update.rating, change: update.change, score, expectedScore: update.expectedScore, kFactor: update.kFactor }).onConflictDoNothing().returning({ id: individualRatingEvents.id });
  if (event) await transaction.update(individualRatings).set({ rating: update.rating, ratedAttempts: sql`${individualRatings.ratedAttempts} + 1`, updatedAt: new Date() }).where(eq(individualRatings.userId, userId));
}

export async function getSubmissionAssessment(userId: string, attemptId: string) {
  const [check] = await db.select({ matched: solutionChecks.matched, awardedPoints: solutionChecks.awardedPoints, maxPoints: solutionChecks.maxPoints }).from(solutionChecks).where(and(eq(solutionChecks.userId, userId), eq(solutionChecks.attemptId, attemptId))).limit(1);
  const [ratingEvent] = await db.select({ rating: individualRatingEvents.afterRating, change: individualRatingEvents.change }).from(individualRatingEvents).where(and(eq(individualRatingEvents.userId, userId), eq(individualRatingEvents.attemptId, attemptId))).limit(1);
  return { check: check ?? null, ratingEvent: ratingEvent ?? null };
}

export async function getIndividualRating(userId: string) {
  const [account] = await db.select({ rating: individualRatings.rating, ratedAttempts: individualRatings.ratedAttempts }).from(individualRatings).where(eq(individualRatings.userId, userId)).limit(1);
  const history = await db.select({ problemId: individualRatingEvents.problemId, rating: individualRatingEvents.afterRating, change: individualRatingEvents.change, createdAt: individualRatingEvents.createdAt }).from(individualRatingEvents).where(eq(individualRatingEvents.userId, userId)).orderBy(desc(individualRatingEvents.createdAt)).limit(100);
  return { rating: account?.rating ?? null, ratedAttempts: account?.ratedAttempts ?? 0, initialRating: initialIndividualRating, history };
}
