import { createHash, randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { solutionEvidence } from "@/lib/db/schema";
import { submissionLimits } from "@/lib/solution-grading";
import { detectSubmissionMedia, validUploadSize } from "@/lib/submission-security";
import { isSubmissionOrigin, submissionError, submissionUser } from "@/lib/submission-server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isSubmissionOrigin(request)) return submissionError("Request origin rejected.", 403);
  const user = await submissionUser(request);
  if (!user) return submissionError("Sign in before uploading work.", 401);
  const length = Number(request.headers.get("content-length"));
  if (!length || length > submissionLimits.maxFileBytes + 65536) return submissionError("Upload one file at a time, up to 3 MiB.", 413);
  try {
    const [usage] = await db.select({ total: count() }).from(solutionEvidence).where(and(eq(solutionEvidence.userId, user.id), gte(solutionEvidence.createdAt, new Date(Date.now() - 86400000))));
    if (usage.total >= 30) return submissionError("Daily upload limit reached. Try again tomorrow.", 429);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !validUploadSize(file.size)) return submissionError("Choose a nonempty JPEG, PNG, WebP or PDF, up to 3 MiB.", 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    const mediaType = detectSubmissionMedia(bytes);
    if (!mediaType || mediaType !== file.type) return submissionError("File contents must match a supported JPEG, PNG, WebP or PDF type.", 400);
    const id = randomUUID();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[mediaType];
    const blob = await put(`solution-evidence/${user.id}/${id}.${extension}`, bytes, { access: "private", contentType: mediaType, addRandomSuffix: false });
    const filename = file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 160) || `solution.${extension}`;
    try {
      await db.insert(solutionEvidence).values({ id, userId: user.id, pathname: blob.pathname, filename, mediaType, bytes: bytes.length, sha256 });
    } catch (error) {
      await del(blob.pathname);
      throw error;
    }
    return Response.json({ id, filename, mediaType, bytes: bytes.length, sha256 }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Solution evidence upload failed", { type: error instanceof Error ? error.name : "Unknown error" });
    return submissionError("The file could not be stored privately. Your typed work is unchanged; please retry.", 503);
  }
}
