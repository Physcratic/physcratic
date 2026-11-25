import { pool } from "@/lib/db";
import { privateAuthorStorage } from "@/lib/author-media-storage";
import { createCardImageApi } from "@/lib/authored-card-image-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const api = createCardImageApi({ pool, storage: privateAuthorStorage });

export async function GET(_request: Request, { params }: { params: Promise<{ problemId: string; revisionId: string }> }) {
  const { problemId, revisionId } = await params;
  return api(problemId, revisionId);
}
