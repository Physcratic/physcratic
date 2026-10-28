import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { solutionAttempts, solutionEvidence } from "@/lib/db/schema";
import { solutionSubmissionSchema } from "@/lib/solution-grading";
import { evidenceMatches } from "@/lib/submission-security";
import { getSubmissionSource } from "@/lib/submission-source";
import { readSubmissionJson } from "@/lib/submission-request";
import { isSubmissionOrigin, submissionError, submissionUser } from "@/lib/submission-server";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await submissionUser(request);
  if (!user) return submissionError("Sign in to view saved attempts.", 401);
  const attempts = await db.select({ id: solutionAttempts.id, problemId: solutionAttempts.problemId, partId: solutionAttempts.partId, payload: solutionAttempts.payload, status: solutionAttempts.status, createdAt: solutionAttempts.createdAt }).from(solutionAttempts).where(eq(solutionAttempts.userId, user.id)).orderBy(desc(solutionAttempts.createdAt)).limit(50);
  return Response.json({ attempts }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  if (!isSubmissionOrigin(request)) return submissionError("Request origin rejected.", 403);
  const user = await submissionUser(request);
  if (!user) return submissionError("Sign in to save your attempt.", 401);
  try {
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return submissionError("Send a JSON submission.", 415);
    const parsed = solutionSubmissionSchema.safeParse(await readSubmissionJson(request));
    if (!parsed.success) return submissionError(parsed.error.issues[0]?.message ?? "Invalid submission.", 400);
    const submission = parsed.data;
    const existing = await db.select().from(solutionAttempts).where(and(eq(solutionAttempts.userId, user.id), eq(solutionAttempts.idempotencyKey, submission.idempotencyKey))).limit(1);
    if (existing.length) {
      if (JSON.stringify(solutionSubmissionSchema.parse(existing[0].payload)) !== JSON.stringify(submission)) return submissionError("This submission key was already used for different work. Start a new attempt.", 409);
      return Response.json({ id: existing[0].id, status: existing[0].status }, { headers: { "Cache-Control": "no-store" } });
    }
    const source = await getSubmissionSource(submission.problemId);
    if (!source) return submissionError("Unknown archive problem.", 400);
    if (source.problemVersion !== submission.problemVersion) return submissionError("The source version changed. Reload the problem before saving.", 409);
    if (submission.evidence.length) {
      const files = await db.select().from(solutionEvidence).where(and(eq(solutionEvidence.userId, user.id), inArray(solutionEvidence.id, submission.evidence.map((item) => item.id))));
      if (files.length !== submission.evidence.length || submission.evidence.some((item) => !files.some((file) => evidenceMatches(item, file)))) return submissionError("An attachment does not belong to this account or its metadata changed.", 400);
    }
    const [usage] = await db.select({ total: count() }).from(solutionAttempts).where(and(eq(solutionAttempts.userId, user.id), gte(solutionAttempts.createdAt, new Date(Date.now() - 86400000))));
    if (usage.total >= 100) return submissionError("Daily submission limit reached. Try again tomorrow.", 429);
    const [created] = await db.insert(solutionAttempts).values({ id: randomUUID(), userId: user.id, problemId: submission.problemId, problemVersion: submission.problemVersion, partId: submission.partId, payload: submission, status: "awaiting-reference", idempotencyKey: submission.idempotencyKey }).onConflictDoNothing().returning({ id: solutionAttempts.id, status: solutionAttempts.status });
    if (!created) return submissionError("A simultaneous submission was saved. Retry to recover it.", 409);
    return Response.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RangeError) return submissionError("Submission is too large.", 413);
    if (error instanceof SyntaxError || error instanceof TypeError) return submissionError("Invalid submission JSON.", 400);
    const cause = error instanceof Error ? error.cause as { code?: string; constraint?: string; message?: string } | undefined : undefined;
    console.error("Solution submission failed", { code: cause?.code, constraint: cause?.constraint });
    return submissionError("Your attempt could not be saved. Your work is unchanged; please retry.", 503);
  }
}
