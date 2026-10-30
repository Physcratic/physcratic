import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { archiveProgress } from "@/lib/db/schema";
import { iphoSubproblems } from "@/lib/ipho-archive";
import { corpusProblems } from "@/lib/corpus-pilot";

const allowedTaskIds = new Set([
  ...iphoSubproblems.map((task) => task.id),
  ...corpusProblems.flatMap((problem) =>
    problem.parts.map((part) => `${problem.id}:${part.id}`),
  ),
]);
import { readSubmissionJson } from "@/lib/submission-request";
import {
  isSubmissionOrigin,
  submissionError,
  submissionUser,
} from "@/lib/submission-server";

const progressSchema = z.object({
  taskId: z.string().min(1).max(100),
  notes: z.string().max(12_000),
  answer: z.string().max(200),
  reviewed: z.boolean(),
});
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await submissionUser(request);
    if (!user) return submissionError("Sign in to view archive progress.", 401);
    const progress = await db
      .select({
        taskId: archiveProgress.taskId,
        notes: archiveProgress.notes,
        answer: archiveProgress.answer,
        reviewed: archiveProgress.reviewed,
      })
      .from(archiveProgress)
      .where(eq(archiveProgress.userId, user.id));
    return Response.json(
      { progress },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return submissionError(
      "Archive progress could not be loaded. Please retry.",
      503,
    );
  }
}
export async function POST(request: Request) {
  try {
    if (!isSubmissionOrigin(request))
      return submissionError("Request origin rejected.", 403);
    const user = await submissionUser(request);
    if (!user) return submissionError("Sign in to save archive progress.", 401);
    let body: unknown;
    try {
      body = await readSubmissionJson(request);
    } catch {
      return submissionError("Invalid or oversized archive progress.", 400);
    }
    const parsed = progressSchema.safeParse(body);
    if (!parsed.success || !allowedTaskIds.has(parsed.data.taskId))
      return submissionError("Check the archive task, answer and notes.", 400);
    await db
      .insert(archiveProgress)
      .values({ ...parsed.data, userId: user.id })
      .onConflictDoUpdate({
        target: [archiveProgress.userId, archiveProgress.taskId],
        set: {
          notes: parsed.data.notes,
          answer: parsed.data.answer,
          reviewed: parsed.data.reviewed,
          updatedAt: new Date(),
        },
      });
    return Response.json(
      { saved: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return submissionError(
      "Archive progress could not be saved. Your notes are unchanged; please retry.",
      503,
    );
  }
}
