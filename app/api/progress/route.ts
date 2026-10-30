import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, max, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { practiceAttempts } from "@/lib/db/schema";
import { checkPracticeAnswer, practiceSubmissionSchema } from "@/lib/practice";
import { problems } from "@/lib/physics";
import { readSubmissionJson } from "@/lib/submission-request";
import { isSubmissionOrigin, submissionError, submissionUser } from "@/lib/submission-server";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await submissionUser(request);
    if (!user) return submissionError("Sign in to view your progress.", 401);
    const rows = await db.select({ problemId: practiceAttempts.problemId, correct: sql<boolean>`bool_or(${practiceAttempts.correct})`, attemptedAt: max(practiceAttempts.createdAt) })
      .from(practiceAttempts).where(eq(practiceAttempts.userId, user.id)).groupBy(practiceAttempts.problemId).orderBy(desc(max(practiceAttempts.createdAt)));
    return Response.json({ history: rows.map((row) => ({ ...row, attemptedAt: row.attemptedAt ? new Date(row.attemptedAt).getTime() : 0 })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return submissionError("Your progress could not be loaded. Please retry.", 503);
  }
}
export async function POST(request: Request) {
  try {
    if (!isSubmissionOrigin(request)) return submissionError("Request origin rejected.", 403);
    const user = await submissionUser(request);
    if (!user) return submissionError("Sign in to save your progress.", 401);
    let body: unknown;
    try { body = await readSubmissionJson(request); } catch { return submissionError("Invalid or oversized answer submission.", 400); }
    const parsed = practiceSubmissionSchema.safeParse(body);
    if (!parsed.success) return submissionError("Check your answer and working.", 400);
    const input = parsed.data;
    if (!problems.some((problem) => problem.id === input.problemId)) return submissionError("Unknown practice problem.", 400);
    const [existing] = await db.select({ id: practiceAttempts.id, problemId: practiceAttempts.problemId, answer: practiceAttempts.answer, working: practiceAttempts.working, correct: practiceAttempts.correct })
      .from(practiceAttempts).where(and(eq(practiceAttempts.userId, user.id), eq(practiceAttempts.idempotencyKey, input.idempotencyKey))).limit(1);
    if (existing) {
      if (existing.problemId !== input.problemId || existing.answer !== input.answer || existing.working !== input.working) return submissionError("This attempt key was already used. Please start a new attempt.", 409);
      return Response.json({ id: existing.id, correct: existing.correct });
    }
    return await db.transaction(async (transaction) => {
      const lock = await transaction.execute<{ acquired: boolean }>(sql`select pg_try_advisory_xact_lock(hashtextextended(${`practice:${user.id}`}, 0)) as acquired`);
      if (!lock.rows[0]?.acquired) return submissionError("An answer is already being saved. Please retry.", 429);
      const [usage] = await transaction.select({ total: count() }).from(practiceAttempts).where(and(eq(practiceAttempts.userId, user.id), gte(practiceAttempts.createdAt, new Date(Date.now() - 86_400_000))));
      if (usage.total >= 200) return submissionError("Daily practice check limit reached. Try again tomorrow.", 429);
      const correct = checkPracticeAnswer(input.problemId, input.answer);
      const [created] = await transaction.insert(practiceAttempts).values({ ...input, userId: user.id, id: randomUUID(), correct }).onConflictDoNothing().returning({ id: practiceAttempts.id, correct: practiceAttempts.correct });
      if (!created) return submissionError("An identical attempt is being saved. Please retry.", 409);
      return Response.json(created, { status: 201, headers: { "Cache-Control": "private, no-store" } });
    });
  } catch {
    return submissionError("Your progress could not be saved. Your answer is unchanged; please retry.", 503);
  }
}
