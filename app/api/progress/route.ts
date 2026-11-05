import { desc, eq, max, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { practiceAttempts } from "@/lib/db/schema";
import { submissionError, submissionUser } from "@/lib/submission-server";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await submissionUser(request);
    if (!user) return submissionError("Sign in to view your progress.", 401);
    const rows = await db
      .select({
        problemId: practiceAttempts.problemId,
        correct: sql<boolean>`bool_or(${practiceAttempts.correct})`,
        attemptedAt: max(practiceAttempts.createdAt),
      })
      .from(practiceAttempts)
      .where(eq(practiceAttempts.userId, user.id))
      .groupBy(practiceAttempts.problemId)
      .orderBy(desc(max(practiceAttempts.createdAt)));
    return Response.json(
      {
        history: rows.map((row) => ({
          ...row,
          attemptedAt: row.attemptedAt
            ? new Date(row.attemptedAt).getTime()
            : 0,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return submissionError(
      "Your progress could not be loaded. Please retry.",
      503,
    );
  }
}
