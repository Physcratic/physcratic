import { pool } from "@/lib/db";
import { privateAuthorStorage } from "@/lib/author-media-storage";
import { createCardImageApi } from "@/lib/authored-card-image-api";

// Outside /api on purpose: next.config.ts sets Cache-Control private, no-store for every /api route, which would
// override the short public cache this thumbnail needs. The handler sets its own headers.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const api = createCardImageApi({ pool, storage: privateAuthorStorage });

export async function GET(_request: Request, { params }: { params: Promise<{ problemId: string; revisionId: string }> }) {
  const { problemId, revisionId } = await params;
  return api(problemId, revisionId);
}
