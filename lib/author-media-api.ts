import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Pool, PoolClient } from "pg";
import {
  authorMediaMaxBytes,
  authorMediaPurpose,
  type AuthorMediaInfo,
} from "./author-media";
import { detectAuthorMedia } from "./author-media-validation";
import {
  readSubmissionForm,
  readSubmissionJson,
  RequestBodyTimeoutError,
} from "./submission-request";
export type AuthorStorage = {
  put: (path: string, bytes: Uint8Array, mediaType: string) => Promise<void>;
  get: (path: string) => Promise<BodyInit | null>;
  del: (path: string) => Promise<void>;
};
type Deps = {
  pool: Pool;
  storage: AuthorStorage;
  user: (
    r: Request,
  ) => Promise<{ id: string; emailVerified?: boolean } | null | undefined>;
  origin: (r: Request) => boolean;
};
type Row = {
  id: string;
  problem_id: string;
  purpose: AuthorMediaInfo["purpose"];
  pathname: string;
  filename: string;
  media_type: string;
  bytes: number;
  state: string;
  created_at: Date;
  owner_id: string;
  state_publication?: string;
  published_revision_id?: string | null;
};
class MediaError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const uuid = z.uuid().transform((v) => v.toLowerCase());
const reply = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
const info = (r: Row) => ({
  id: r.id,
  problemId: r.problem_id,
  purpose: r.purpose,
  filename: r.filename,
  mediaType: r.media_type,
  bytes: r.bytes,
});
async function transaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL statement_timeout='10s'");
    await c.query("SET LOCAL lock_timeout='5s'");
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
async function ownProblem(c: PoolClient, problemId: string, owner: string) {
  const { rows } = await c.query(
    "SELECT id FROM authored_problem WHERE id=$1 AND owner_id=$2 FOR UPDATE",
    [problemId, owner],
  );
  if (!rows[0]) throw new MediaError(404, "Problem not found.");
}
async function charge(pool: Pool, owner: string, upload: boolean) {
  const { rows } = await pool.query<{ requests: number }>(
    `INSERT INTO authored_write_limit(user_id,window_start,requests) VALUES($1,date_trunc('minute',clock_timestamp()),1)
 ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN authored_write_limit.window_start=date_trunc('minute',clock_timestamp()) THEN least(authored_write_limit.requests+1,61) ELSE 1 END,window_start=date_trunc('minute',clock_timestamp()) RETURNING requests`,
    [owner],
  );
  if (rows[0].requests > 60)
    throw new MediaError(
      429,
      "Authoring write limit reached. Retry next minute.",
    );
  if (upload) {
    const usage = await pool.query<{ attempts: number }>(
      `INSERT INTO author_media_usage(user_id,day,attempts) VALUES($1,current_date,1)
 ON CONFLICT(user_id) DO UPDATE SET attempts=CASE WHEN author_media_usage.day=current_date THEN least(author_media_usage.attempts+1,31) ELSE 1 END,day=current_date RETURNING attempts`,
      [owner],
    );
    if (usage.rows[0].attempts > 30)
      throw new MediaError(
        429,
        "Daily upload limit reached. Try again tomorrow.",
      );
  }
}
// Mark first, delete storage second, remove registry last. Failed/ambiguous storage
// operations retain a tombstone for safe retries; no reference can race a retired row.
async function retire(deps: Deps, id: string, owner: string) {
  const candidate = await deps.pool.query<Row>(
    "SELECT m.*,p.owner_id FROM author_media m JOIN authored_problem p ON p.id=m.problem_id WHERE m.id=$1 AND p.owner_id=$2",
    [id, owner],
  );
  if (!candidate.rows[0]) throw new MediaError(404, "File not found.");
  const row = await transaction(deps.pool, async (c) => {
    await ownProblem(c, candidate.rows[0].problem_id, owner);
    const { rows } = await c.query<Row>(
      "SELECT * FROM author_media WHERE id=$1 FOR UPDATE",
      [id],
    );
    if (!rows[0]) throw new MediaError(404, "File not found.");
    const refs = await c.query(
      "SELECT 1 FROM author_draft_media WHERE media_id=$1 UNION ALL SELECT 1 FROM author_revision_media WHERE media_id=$1 LIMIT 1",
      [id],
    );
    if (refs.rows.length)
      throw new MediaError(
        409,
        "This file is retained by a saved draft or published revision. Remove draft references and save first; historical files cannot be deleted.",
      );
    await c.query("UPDATE author_media SET state='deleting' WHERE id=$1", [id]);
    return rows[0];
  });
  await deps.storage.del(row.pathname);
  // Ambiguous failed PUTs may complete after an immediate DELETE. Keep their
  // tombstone for at least an hour and repeat deletion before forgetting the path.
  if (
    row.state === "ready" ||
    Date.now() - new Date(row.created_at).getTime() >= 3_600_000
  )
    await transaction(deps.pool, async (c) => {
      await ownProblem(c, row.problem_id, owner);
      await c.query(
        "DELETE FROM author_media WHERE id=$1 AND state='deleting'",
        [id],
      );
      await c.query(
        `DELETE FROM authored_problem p WHERE id=$1
    AND NOT EXISTS(SELECT 1 FROM authored_draft d WHERE d.problem_id=p.id)
    AND NOT EXISTS(SELECT 1 FROM authored_revision r WHERE r.problem_id=p.id)
    AND NOT EXISTS(SELECT 1 FROM author_media m WHERE m.problem_id=p.id)`,
        [row.problem_id],
      );
    });
}
export function createAuthorMediaApi(deps: Deps) {
  return async function handle(
    action: "upload" | "list" | "read" | "delete" | "cleanup",
    request: Request,
    rawProblemId?: string,
    rawMediaId?: string,
  ) {
    let reserved: { id: string; owner: string } | undefined;
    try {
      const user = await deps.user(request);
      const owner = user?.emailVerified === true ? user.id : null;
      if (action !== "read" && !user)
        throw new MediaError(401, "Sign in before managing author files.");
      if (action !== "read" && !owner)
        throw new MediaError(
          403,
          "Verify your email before managing author files.",
        );
      const problemId = rawProblemId ? uuid.parse(rawProblemId) : undefined,
        mediaId = rawMediaId ? uuid.parse(rawMediaId) : undefined;
      if (["upload", "delete", "cleanup"].includes(action)) {
        if (!deps.origin(request))
          throw new MediaError(403, "Request origin rejected.");
        await charge(deps.pool, owner!, action === "upload");
      }
      if (action === "read") {
        const { rows } = await deps.pool.query<Row>(
          `SELECT m.*,p.owner_id,p.state AS state_publication,p.published_revision_id FROM author_media m JOIN authored_problem p ON p.id=m.problem_id WHERE m.id=$1 AND m.problem_id=$2 AND m.state='ready'`,
          [mediaId, problemId],
        );
        const row = rows[0];
        if (!row) throw new MediaError(404, "File not found.");
        if (row.owner_id !== owner) {
          const rawRevision = new URL(request.url).searchParams.get("revision");
          const revision = rawRevision
            ? uuid.parse(rawRevision)
            : row.published_revision_id;
          if (
            row.state_publication !== "published" ||
            !row.purpose.startsWith("statement-") ||
            !revision
          )
            throw new MediaError(404, "File not found.");
          const refs = await deps.pool.query(
            "SELECT 1 FROM author_revision_media WHERE revision_id=$1 AND problem_id=$2 AND media_id=$3 AND purpose=$4",
            [revision, problemId, mediaId, row.purpose],
          );
          if (!refs.rows[0]) throw new MediaError(404, "File not found.");
        }
        const body = await deps.storage.get(row.pathname);
        if (!body) throw new MediaError(404, "File not available.");
        return new Response(body, {
          headers: {
            "Content-Type": row.media_type,
            "Content-Length": String(row.bytes),
            "Content-Disposition": `${row.media_type === "application/pdf" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox; default-src 'none'",
            "Cross-Origin-Resource-Policy": "same-origin",
            "Referrer-Policy": "no-referrer",
          },
        });
      }
      if (action === "list") {
        const rows = await deps.pool.query<
          Row & { in_draft: boolean; in_history: boolean }
        >(
          `SELECT m.*,p.owner_id,EXISTS(SELECT 1 FROM author_draft_media WHERE media_id=m.id) AS in_draft,EXISTS(SELECT 1 FROM author_revision_media WHERE media_id=m.id) AS in_history
    FROM author_media m JOIN authored_problem p ON p.id=m.problem_id WHERE p.id=$1 AND p.owner_id=$2 AND m.state='ready' ORDER BY m.created_at,m.id LIMIT 100`,
          [problemId, owner],
        );
        const exists = await deps.pool.query(
          "SELECT 1 FROM authored_problem WHERE id=$1 AND owner_id=$2",
          [problemId, owner],
        );
        if (!exists.rows[0]) throw new MediaError(404, "Problem not found.");
        return reply({
          files: rows.rows.map((r) => ({
            ...info(r),
            inDraft: r.in_draft,
            inHistory: r.in_history,
          })),
        });
      }
      if (action === "delete" || action === "cleanup") {
        if (
          request.headers.get("content-type")?.split(";")[0].trim() !==
          "application/json"
        )
          throw new MediaError(415, "Send JSON.");
        z.strictObject({}).parse(await readSubmissionJson(request, 1024));
        if (action === "delete") {
          const match = await deps.pool.query(
            "SELECT 1 FROM author_media m JOIN authored_problem p ON p.id=m.problem_id WHERE m.id=$1 AND m.problem_id=$2 AND p.owner_id=$3 AND m.state IN ('ready','deleting')",
            [mediaId, problemId, owner],
          );
          if (!match.rows[0]) throw new MediaError(404, "File not found.");
          await retire(deps, mediaId!, owner!);
          return reply({ deleted: true });
        }
        const candidates = await deps.pool.query<{ id: string }>(
          `SELECT m.id FROM author_media m JOIN authored_problem p ON p.id=m.problem_id WHERE p.owner_id=$1
      AND ((m.state='ready' AND m.created_at<now()-interval '24 hours') OR (m.state='pending' AND m.created_at<now()-interval '1 hour') OR (m.state='deleting' AND m.created_at<now()-interval '1 hour'))
      AND NOT EXISTS(SELECT 1 FROM author_draft_media WHERE media_id=m.id) AND NOT EXISTS(SELECT 1 FROM author_revision_media WHERE media_id=m.id) ORDER BY m.created_at LIMIT 5`,
          [owner],
        );
        const results = await Promise.allSettled(
          candidates.rows.map((r) => retire(deps, r.id, owner!)),
        );
        return reply({
          deleted: results.filter((r) => r.status === "fulfilled").length,
          retry: results.filter((r) => r.status === "rejected").length,
        });
      }
      // Verify ownership before reading potentially expensive upload bytes.
      const owned = await deps.pool.query(
        "SELECT 1 FROM authored_problem p JOIN authored_draft d ON d.problem_id=p.id WHERE p.id=$1 AND p.owner_id=$2",
        [problemId, owner],
      );
      if (!owned.rows[0]) throw new MediaError(404, "Draft not found.");
      if (
        !/^multipart\/form-data(?:;|$)/i.test(
          request.headers.get("content-type") ?? "",
        )
      )
        throw new MediaError(415, "Send a multipart file upload.");
      const form = await readSubmissionForm(
        request,
        authorMediaMaxBytes + 65536,
      );
      if (
        form.getAll("file").length !== 1 ||
        form.getAll("purpose").length !== 1 ||
        [...form.keys()].some((k) => !["file", "purpose"].includes(k))
      )
        throw new MediaError(400, "Send exactly one file and its purpose.");
      const purpose = authorMediaPurpose.parse(form.get("purpose")),
        file = form.get("file");
      if (
        !(file instanceof File) ||
        file.size <= 0 ||
        file.size > authorMediaMaxBytes
      )
        throw new MediaError(413, "Choose a nonempty file up to 3 MiB.");
      const bytes = new Uint8Array(await file.arrayBuffer()),
        type = detectAuthorMedia(bytes);
      if (
        !type ||
        type !== file.type ||
        purpose.endsWith("pdf") !== (type === "application/pdf")
      )
        throw new MediaError(
          400,
          "File contents, MIME type and purpose must match a supported PNG, JPEG, WebP or PDF.",
        );
      const id = randomUUID(),
        ext =
          type === "application/pdf"
            ? "pdf"
            : type === "image/jpeg"
              ? "jpg"
              : type === "image/png"
                ? "png"
                : "webp";
      const pathname = `author-media/${problemId}/${randomUUID()}/${id}.${ext}`;
      const stem =
        file.name
          .replace(/[\x00-\x1f\x7f/\\\u202a-\u202e\u2066-\u2069]/g, "_")
          .slice(0, 150)
          .replace(/\.[^.]*$/, "") || "attachment";
      const filename = `${stem}.${ext}`;
      const row = await transaction(deps.pool, async (c) => {
        await ownProblem(c, problemId!, owner!);
        await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,2))", [
          `author-media:${owner}`,
        ]);
        const usage = await c.query<{ total: number; bytes: string }>(
          "SELECT count(*)::integer AS total,coalesce(sum(m.bytes),0)::text AS bytes FROM author_media m JOIN authored_problem p ON p.id=m.problem_id WHERE p.owner_id=$1",
          [owner],
        );
        if (
          usage.rows[0].total >= 100 ||
          Number(usage.rows[0].bytes) + bytes.length > 100 * 1024 * 1024
        )
          throw new MediaError(
            429,
            "Author storage quota reached. Clean up unused uploads.",
          );
        const result = await c.query<Row>(
          "INSERT INTO author_media(id,problem_id,purpose,pathname,filename,media_type,bytes,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
          [
            id,
            problemId,
            purpose,
            pathname,
            filename,
            type,
            bytes.length,
            createHash("sha256").update(bytes).digest("hex"),
          ],
        );
        return result.rows[0];
      });
      reserved = { id, owner: owner! };
      await deps.storage.put(pathname, bytes, type);
      await transaction(deps.pool, async (c) => {
        await ownProblem(c, problemId!, owner!);
        const changed = await c.query(
          "UPDATE author_media SET state='ready' WHERE id=$1 AND state='pending' RETURNING id",
          [id],
        );
        if (!changed.rows[0])
          throw new MediaError(
            409,
            "Upload is no longer available. Retry with a new file.",
          );
      });
      reserved = undefined;
      return reply(info(row), 201);
    } catch (error) {
      if (reserved)
        await retire(deps, reserved.id, reserved.owner).catch(() => {});
      if (error instanceof MediaError)
        return reply({ error: error.message }, error.status);
      if (
        error instanceof z.ZodError ||
        error instanceof SyntaxError ||
        error instanceof TypeError
      )
        return reply({ error: "Invalid media request." }, 400);
      if (error instanceof RangeError)
        return reply(
          { error: "Upload is too large. Use a file up to 3 MiB." },
          413,
        );
      if (error instanceof RequestBodyTimeoutError)
        return reply(
          { error: "Upload timed out. Your existing document is unchanged." },
          408,
        );
      return reply(
        {
          error:
            "File storage is temporarily unavailable. Retry; your existing document is unchanged.",
        },
        503,
      );
    }
  };
}
