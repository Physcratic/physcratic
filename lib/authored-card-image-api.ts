import "server-only";
import type { Pool } from "pg";
import sharp from "sharp";
import { z } from "zod";
import { authorMediaMaxBytes } from "./author-media";
import type { AuthorStorage } from "./author-media-api";
import { clampCardAlt } from "./authored-card-image";
import { firstImageBlock } from "./authored-first-image";
import { imageAllowed } from "./authored-library-api";

// The public thumbnail of the first image of a published community problem. Everything is checked on every call and any
// failure is the same empty 404, so nothing says why. Nothing is written. A cache in front only sees the answers.
export const cardImageWidth = 480;
export const cardImageQuality = 72;
// The upload check already refuses anything over 40 megapixels, so a larger header is not an upload of ours.
export const cardImageMaxPixels = 40_000_000;
const raster = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const decodable = new Set(["jpeg", "png", "webp", "gif"]);
const id = z.uuid();

const base = { "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };
const notFound = () => new Response(null, { status: 404, headers: { ...base, "Cache-Control": "no-store" } });

async function readCapped(body: BodyInit): Promise<Uint8Array | null> {
  const stream = new Response(body).body;
  if (!stream) return null;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > authorMediaMaxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export function createCardImageApi(deps: { pool: Pool; storage: AuthorStorage }) {
  return async (rawProblemId: string, rawRevisionId: string): Promise<Response> => {
    try {
      const problemId = id.safeParse(rawProblemId), revisionId = id.safeParse(rawRevisionId);
      if (!problemId.success || !revisionId.success) return notFound();
      // Published, and this exact revision is the current one. Drafts and archived problems have no pointer.
      const revision = await deps.pool.query<{ content: unknown }>(
        `SELECT r.content FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id
         WHERE p.id=$1 AND p.state='published' AND r.id=$2 AND r.problem_id=p.id`,
        [problemId.data, revisionId.data],
      );
      const block = revision.rows[0] ? firstImageBlock(revision.rows[0].content) : null;
      const mediaId = id.safeParse(block?.mediaId);
      if (!block || !mediaId.success || !clampCardAlt(block.alt)) return notFound();
      // Recheck the public pointer in the same read as the statement media lookup.
      const media = await deps.pool.query<{ pathname: string; media_type: string; bytes: number }>(
        `SELECT m.pathname,m.media_type,m.bytes FROM author_revision_media rm
         JOIN author_media m ON m.id=rm.media_id AND m.problem_id=rm.problem_id AND m.purpose=rm.purpose
         JOIN authored_problem p ON p.id=rm.problem_id AND p.published_revision_id=rm.revision_id
         WHERE rm.revision_id=$1 AND rm.problem_id=$2 AND rm.media_id=$3 AND rm.purpose='statement-image' AND m.state='ready' AND p.state='published'`,
        [revisionId.data, problemId.data, mediaId.data],
      );
      const file = media.rows[0];
      if (!file || !raster.has(file.media_type) || file.bytes > authorMediaMaxBytes) return notFound();
      // A removed problem or a restricted author shows nothing, and so does a restriction that cannot be read.
      if (!(await imageAllowed(deps.pool, [problemId.data])).has(problemId.data)) return notFound();
      const body = await deps.storage.get(file.pathname);
      const bytes = body ? await readCapped(body) : null;
      if (!bytes) return notFound();
      const input = sharp(bytes, { limitInputPixels: cardImageMaxPixels, failOn: "error" });
      const format = (await input.metadata()).format;
      if (!format || !decodable.has(format)) return notFound();
      // No metadata is kept: sharp drops EXIF (including GPS), ICC, XMP and comments unless asked to keep them.
      const webp = await input.timeout({ seconds: 8 }).rotate().resize({ width: cardImageWidth, withoutEnlargement: true }).webp({ quality: cardImageQuality }).toBuffer();
      return new Response(new Uint8Array(webp), {
        status: 200,
        headers: { ...base, "Content-Type": "image/webp", "Cache-Control": "private, no-store" },
      });
    } catch {
      return notFound();
    }
  };
}
