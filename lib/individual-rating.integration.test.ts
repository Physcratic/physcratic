import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";
import { individualRatingEvents, individualRatings, problemRatings, solutionChecks } from "./db/schema";
import { checkAndRateSubmission } from "./individual-rating-server";
import type { SolutionSubmission } from "./solution-grading";

const testUrl = process.env.AUTHORING_TEST_DATABASE_URL;

test("disposable database: version gates, partial results, atomic ELO, repeat protection and per-user isolation", { skip: !testUrl && "Run pnpm test:db for disposable DB integration" }, async () => {
  const target = new URL(testUrl!);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/physcratic_authoring_test");
  const schemaName = `rating_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: testUrl });
  const pool = new Pool({ connectionString: testUrl, options: `-c search_path=${schemaName},public`, statement_timeout: 5000, connectionTimeoutMillis: 3000 });
  const db = drizzle(pool, { schema });
  const rollback = new Error("Verification transaction rollback");
  const userId = `verification-${randomUUID()}`;
  const otherUser = `verification-${randomUUID()}`;
  const problemId = `verification-${randomUUID()}`;
  const sourceVersion = "a".repeat(64);
  const submission = (partId: string, finalAnswer: string, version = sourceVersion): SolutionSubmission => ({ problemId, problemVersion: version, partId, finalAnswer, working: "Verification fixture", evidence: [], idempotencyKey: randomUUID() });
  try {
    await admin.query(`CREATE SCHEMA ${schemaName}`);
    await pool.query(`
      CREATE TABLE problem_rating (
        "problemId" text PRIMARY KEY, "sourceVersion" text NOT NULL,
        rating integer, "ratingVersion" integer NOT NULL DEFAULT 1,
        "ratedEnabled" boolean NOT NULL DEFAULT false, checks jsonb NOT NULL DEFAULT '[]',
        "reviewedBy" text, "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE individual_rating (
        "userId" text PRIMARY KEY, rating integer NOT NULL DEFAULT 1200,
        "ratedAttempts" integer NOT NULL DEFAULT 0, "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE individual_rating_event (
        id uuid PRIMARY KEY, "userId" text NOT NULL, "attemptId" uuid NOT NULL UNIQUE,
        "problemId" text NOT NULL, "sourceVersion" text NOT NULL, "ratingVersion" integer NOT NULL,
        "problemRating" integer NOT NULL, "beforeRating" integer NOT NULL, "afterRating" integer NOT NULL,
        change integer NOT NULL, score double precision NOT NULL, "expectedScore" double precision NOT NULL,
        "kFactor" integer NOT NULL DEFAULT 32, "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT individual_rating_event_once UNIQUE ("userId", "problemId")
      );
      CREATE TABLE solution_check (
        "attemptId" uuid PRIMARY KEY, "userId" text NOT NULL, "problemId" text NOT NULL, "partId" text NOT NULL,
        "sourceVersion" text NOT NULL, "ratingVersion" integer NOT NULL, matched boolean NOT NULL,
        "maxPoints" double precision NOT NULL, "awardedPoints" double precision NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
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
    try {
      await admin.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    } finally {
      await admin.end();
    }
  }
});
