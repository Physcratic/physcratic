import { createHash, randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { solutionEvidence } from "@/lib/db/schema";
import { submissionLimits } from "@/lib/solution-grading";
import { detectSubmissionMedia, validUploadSize } from "@/lib/submission-security";
import { readSubmissionForm, RequestBodyTimeoutError } from "@/lib/submission-request";
import { isSubmissionOrigin, submissionError, submissionUser } from "@/lib/submission-server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let reserved: { id: string; userId: string; pathname: string } | undefined;
  try {
    if (!isSubmissionOrigin(request)) return submissionError("Request origin rejected.", 403);
    const user = await submissionUser(request);
    if (!user) return submissionError("Sign in before uploading work.", 401);
    if (!/^multipart\/form-data(?:;|$)/i.test(request.headers.get("content-type") ?? "")) return submissionError("Send a multipart file upload.", 415);
    let form: FormData;
    try {
      form = await readSubmissionForm(request, submissionLimits.maxFileBytes + 65536);
    } catch (error) {
      if (error instanceof RangeError) return submissionError("Upload one file at a time, up to 3 MiB.", 413);
      if (error instanceof RequestBodyTimeoutError) return submissionError("File upload timed out.", 408);
      return submissionError("Invalid multipart upload.", 400);
    }
    if (form.getAll("file").length !== 1 || [...form.keys()].some((key) => key !== "file")) return submissionError("Upload exactly one file without extra fields.", 400);
    const file = form.get("file");
    if (!(file instanceof File) || !validUploadSize(file.size)) return submissionError("Choose a nonempty JPEG, PNG, WebP or PDF, up to 3 MiB.", 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    const mediaType = detectSubmissionMedia(bytes);
    if (!mediaType || mediaType !== file.type) return submissionError("File contents must match a supported JPEG, PNG, WebP or PDF type.", 400);
    const id = randomUUID();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[mediaType];
    const pathname = `solution-evidence/${user.id}/${id}.${extension}`;
    const filename = file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 160) || `solution.${extension}`;
    const reservation = await db.transaction(async (transaction) => {
      const lock = await transaction.execute<{ acquired: boolean }>(sql`select pg_try_advisory_xact_lock(hashtextextended(${`uploads:${user.id}`}, 0)) as acquired`);
      if (!lock.rows[0]?.acquired) return submissionError("Another file is being uploaded. Please retry.", 429);
      const [usage] = await transaction.select({ total: count() }).from(solutionEvidence).where(and(eq(solutionEvidence.userId, user.id), gte(solutionEvidence.createdAt, new Date(Date.now() - 86400000))));
      if (usage.total >= 30) return submissionError("Daily upload limit reached. Try again tomorrow.", 429);
      await transaction.insert(solutionEvidence).values({ id, userId: user.id, pathname, filename, mediaType, bytes: bytes.length, sha256 });
      return { id, userId: user.id, pathname };
    });
    if (reservation instanceof Response) return reservation;
    reserved = reservation;
    await put(pathname, bytes, { access: "private", contentType: mediaType, addRandomSuffix: false, abortSignal: AbortSignal.timeout(10000) });
    return Response.json({ id, filename, mediaType, bytes: bytes.length, sha256 }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (reserved) {
      const cleanup = await Promise.allSettled([
        db.delete(solutionEvidence).where(and(eq(solutionEvidence.id, reserved.id), eq(solutionEvidence.userId, reserved.userId))),
        del(reserved.pathname),
      ]);
      if (cleanup.some((result) => result.status === "rejected")) console.error("Evidence cleanup requires retry");
    }
    console.error("Solution evidence upload failed", { type: error instanceof Error ? error.name : "Unknown error" });
    return submissionError("The file could not be stored privately. Your typed work is unchanged; please retry.", 503);
  }
}
