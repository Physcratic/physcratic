import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { db, pool } from "./db";
import { individualRatingEvents, individualRatings, problemRatings, solutionChecks } from "./db/schema";
import { checkAndRateSubmission } from "./individual-rating-server";
import type { SolutionSubmission } from "./solution-grading";

test("live database: version gates, partial results, atomic ELO, repeat protection and per-user isolation", { skip: process.env.RUN_DATABASE_TESTS !== "1" }, async () => {
  const rollback = new Error("Verification transaction rollback");
  const userId = `verification-${randomUUID()}`;
  const otherUser = `verification-${randomUUID()}`;
  const problemId = `verification-${randomUUID()}`;
  const sourceVersion = "a".repeat(64);
  const submission = (partId: string, finalAnswer: string, version = sourceVersion): SolutionSubmission => ({ problemId, problemVersion: version, partId, finalAnswer, working: "Verification fixture", evidence: [], idempotencyKey: randomUUID() });
  try {
    await db.transaction(async (transaction) => {
      await transaction.insert(problemRatings).values({ problemId, sourceVersion, rating: 1200, ratedEnabled: true, reviewedBy: "rollback-only verification", checks: [{ partId: "A", expected: "a = g*sin(theta)*2^(1/2)", variables: ["g", "theta"], maxPoints: 2 }, { partId: "B", expected: "m*g", variables: ["m", "g"], maxPoints: 6 }] });
      await checkAndRateSubmission(transaction, userId, randomUUID(), submission("A", "a=g*sin(theta)*2^(½)", "b".repeat(64)));
      let checks = await transaction.select().from(solutionChecks).where(eq(solutionChecks.userId, userId));
      assert.equal(checks.length, 0, "Stale source must not be graded");
      await checkAndRateSubmission(transaction, userId, randomUUID(), submission("A", "a=g*sin(theta)*2^(½)"));
      let events = await transaction.select().from(individualRatingEvents).where(eq(individualRatingEvents.userId, userId));
      assert.equal(events.length, 0, "Partial problem must not award ELO");
      await checkAndRateSubmission(transaction, userId, randomUUID(), submission("B", "-m*g"));
      events = await transaction.select().from(individualRatingEvents).where(eq(individualRatingEvents.userId, userId));
      assert.equal(events.length, 1);
      assert.equal(events[0].score, 0.25);
      assert.equal(events[0].afterRating, 1192);
      await checkAndRateSubmission(transaction, userId, randomUUID(), submission("B", "m*g"));
      const [account] = await transaction.select().from(individualRatings).where(eq(individualRatings.userId, userId));
      assert.equal(account.rating, 1192, "Retries must not farm ELO");
      assert.equal(account.ratedAttempts, 1);
      const unrelated = await transaction.select().from(individualRatingEvents).where(and(eq(individualRatingEvents.userId, otherUser), eq(individualRatingEvents.problemId, problemId)));
      assert.equal(unrelated.length, 0);
      await transaction.update(problemRatings).set({ ratedEnabled: false }).where(eq(problemRatings.problemId, problemId));
      await checkAndRateSubmission(transaction, otherUser, randomUUID(), submission("A", "a=g*sin(theta)*2^(½)"));
      await checkAndRateSubmission(transaction, otherUser, randomUUID(), submission("B", "m*g"));
      const unrated = await transaction.select().from(individualRatings).where(eq(individualRatings.userId, otherUser));
      assert.equal(unrated.length, 0, "Unrated problems must not create earned ratings");
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await pool.end();
  }
});
