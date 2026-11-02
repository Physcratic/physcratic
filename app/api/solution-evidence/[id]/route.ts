import { get } from "@vercel/blob";
import { authoringPreviewBlobCredentials } from "@/lib/author-media-storage";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { solutionEvidence } from "@/lib/db/schema";
import { submissionError, submissionUser } from "@/lib/submission-server";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await submissionUser(request);
    if (!user) return submissionError("Sign in to access your work.", 401);
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return submissionError("File not found.", 404);
    const [file] = await db.select().from(solutionEvidence).where(and(eq(solutionEvidence.id, id), eq(solutionEvidence.userId, user.id))).limit(1);
    if (!file) return submissionError("File not found.", 404);
    const result = await get(file.pathname, { ...await authoringPreviewBlobCredentials(file.pathname), access: "private", abortSignal: AbortSignal.timeout(10000) });
    if (!result || result.statusCode !== 200) return submissionError("File not available.", 404);
    return new Response(result.stream, { headers: { "Content-Type": file.mediaType, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return submissionError("File download is temporarily unavailable.", 503);
  }
}
