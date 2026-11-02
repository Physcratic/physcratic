import "server-only";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { AuthorStorage } from "./author-media-api";
import { authorMediaMaxBytes } from "./author-media";
import {
  StudentAccessError as AccessError,
  chargeStudentRequest,
} from "./authored-student-security";
import {
  readRequestBytes,
  RequestBodyTimeoutError,
} from "./submission-request";
import {
  solutionPermissionInputSchema,
  solutionSelectionSchema,
  workedSolutionSchema,
  solutionViewSchema,
  solutionMediaPath,
} from "./authored-solution-contracts";

type Deps = {
  pool: Pool;
  user: (
    r: Request,
  ) => Promise<{ id: string; emailVerified?: boolean } | null | undefined>;
  origin: (r: Request) => boolean;
  storage: Pick<AuthorStorage, "get">;
};
type Permission = {
  problem_id: string;
  revision_id: string;
  part_id: string;
  authorization_id: string;
  version: number;
  enabled: boolean;
  expires_at: Date | null;
};
type Media = {
  id: string;
  purpose: "solution-image" | "solution-pdf";
  media_type: "image/png" | "image/jpeg" | "image/webp" | "application/pdf";
};
const uuid = z.uuid().transform((v) => v.toLowerCase());
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
  "Referrer-Policy": "no-referrer",
};
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers });
function revisionQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  if (
    [...params.keys()].some((k) => k !== "revision") ||
    params.getAll("revision").length !== 1
  )
    throw new AccessError(400, "Specify one revision.");
  return uuid.parse(params.get("revision"));
}
async function json(request: Request) {
  if (new URL(request.url).searchParams.size)
    throw new AccessError(400, "Unexpected query fields.");
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AccessError(415, "Send JSON.");
  const bytes = await readRequestBytes(request, 20000, 5000);
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
async function solution(c: PoolClient, revision: string, part: string) {
  // Deliberately select worked solution only: never key, tolerances or hints.
  const { rows } = await c.query(
    "SELECT data->'solution' AS solution FROM authored_revision_private_part WHERE revision_id=$1 AND part_id=$2",
    [revision, part],
  );
  if (!rows[0]) throw new AccessError(404, "Solution unavailable.");
  const parsed = workedSolutionSchema.safeParse(rows[0].solution);
  if (!parsed.success) throw Error("Invalid stored worked solution");
  return parsed.data;
}
async function revisionMedia(
  c: PoolClient,
  problem: string,
  revision: string,
): Promise<Media[]> {
  const { rows } = await c.query<Media>(
    `SELECT m.id,m.purpose,m.media_type FROM author_revision_media rm JOIN author_media m ON m.id=rm.media_id AND m.problem_id=rm.problem_id AND m.purpose=rm.purpose WHERE rm.problem_id=$1 AND rm.revision_id=$2 AND rm.purpose IN ('solution-image','solution-pdf') AND m.state='ready' ORDER BY m.id`,
    [problem, revision],
  );
  return rows;
}
async function bindings(c: PoolClient, p: Permission) {
  return (
    await c.query<{ media_id: string }>(
      "SELECT media_id FROM authored_solution_permission_media WHERE revision_id=$1 AND part_id=$2 AND authorization_id=$3 ORDER BY media_id",
      [p.revision_id, p.part_id, p.authorization_id],
    )
  ).rows.map((r) => r.media_id);
}
async function currentPermission(
  c: PoolClient,
  problem: string,
  revision: string,
  part: string,
) {
  const { rows: p } = await c.query<{ published_revision_id: string }>(
    "SELECT published_revision_id FROM authored_problem WHERE id=$1 AND state='published' FOR SHARE",
    [problem],
  );
  if (!p[0]) throw new AccessError(404, "Solution unavailable.");
  if (p[0].published_revision_id !== revision)
    throw new AccessError(
      409,
      "Published revision changed. Reload before requesting a solution.",
    );
  const { rows } = await c.query<Permission>(
    "SELECT * FROM authored_solution_permission WHERE problem_id=$1 AND revision_id=$2 AND part_id=$3 AND enabled AND (expires_at IS NULL OR expires_at>clock_timestamp()) FOR SHARE",
    [problem, revision, part],
  );
  if (!rows[0]) throw new AccessError(404, "Solution unavailable.");
  return rows[0];
}
async function stillValid(c: PoolClient, p: Permission) {
  const { rows } = await c.query(
    "SELECT 1 FROM authored_solution_permission WHERE revision_id=$1 AND part_id=$2 AND authorization_id=$3 AND enabled AND (expires_at IS NULL OR expires_at>clock_timestamp())",
    [p.revision_id, p.part_id, p.authorization_id],
  );
  if (!rows[0]) throw new AccessError(404, "Solution unavailable.");
}
function validateApproval(
  blocks: z.infer<typeof workedSolutionSchema>,
  media: Media[],
  ids: string[],
) {
  const images = new Set(
    blocks.filter((b) => b.kind === "image").map((b) => b.mediaId),
  );
  if (
    ids.some(
      (id) =>
        !media.some(
          (m) =>
            m.id === id && (m.purpose === "solution-pdf" || images.has(id)),
        ),
    ) ||
    [...images].some((id) => !ids.includes(id))
  )
    return false;
  return (
    blocks.some(
      (b) =>
        b.kind === "image" ||
        (b.kind === "math" && b.latex.trim()) ||
        (b.kind === "text" &&
          b.spans.some((s) => (s.kind === "text" ? s.text : s.latex).trim())),
    ) ||
    ids.some((id) =>
      media.some((m) => m.id === id && m.purpose === "solution-pdf"),
    )
  );
}
// Bound the whole private storage read (including stream consumption), not just SDK headers.
async function mediaBytes(
  storage: Deps["storage"],
  path: string,
  expected: number,
) {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined,
    active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Error("Media deadline")), 4000);
  });
  try {
    const get = storage.get(path).then((body) => {
      if (!active) {
        if (body instanceof ReadableStream) void body.cancel().catch(() => {});
        return null;
      }
      return body;
    });
    const body = await Promise.race([get, timeout]);
    if (!body) throw new AccessError(404, "Solution media unavailable.");
    reader = new Response(body).body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const next = await Promise.race([reader.read(), timeout]);
      if (next.done) break;
      size += next.value.byteLength;
      if (size > authorMediaMaxBytes || size > expected)
        throw Error("Invalid media size");
      chunks.push(next.value);
    }
    if (size !== expected) throw Error("Invalid media size");
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  } finally {
    active = false;
    clearTimeout(timer);
    if (reader) void reader.cancel().catch(() => {});
  }
}
export function createAuthoredSolutionApi(deps: Deps) {
  return async function handle(
    action: "permission-read" | "permission-write" | "view" | "media",
    request: Request,
    rawProblem: string,
    rawPart: string,
    rawMedia?: string,
  ): Promise<Response> {
    let c: PoolClient | undefined,
      inTransaction = false,
      parsing = false;
    try {
      const user = await deps.user(request);
      if (!user)
        throw new AccessError(401, "Sign in to access worked solutions.");
      if (user.emailVerified !== true)
        throw new AccessError(
          403,
          "Verify your email to access worked solutions.",
        );
      const write = action === "permission-write" || action === "view";
      if (
        request.method !==
        (action === "permission-write"
          ? "PUT"
          : action === "view"
            ? "POST"
            : "GET")
      )
        throw new AccessError(405, "Method not allowed.");
      if (write && !deps.origin(request))
        throw new AccessError(403, "Request origin rejected.");
      if (action === "view" || action === "media")
        await chargeStudentRequest(deps.pool, user.id, false);
      if (action === "permission-write") {
        // Shared existing author bucket; no new author write allowance.
        const { rows } = await deps.pool.query(
          `INSERT INTO authored_write_limit(user_id,window_start,requests) VALUES($1,date_trunc('minute',clock_timestamp()),1) ON CONFLICT(user_id) DO UPDATE SET requests=CASE WHEN authored_write_limit.window_start=EXCLUDED.window_start THEN least(authored_write_limit.requests+1,61) ELSE 1 END,window_start=EXCLUDED.window_start RETURNING requests`,
          [user.id],
        );
        if (rows[0].requests > 60)
          throw new AccessError(
            429,
            "Author write limit reached. Retry next minute.",
            "60",
          );
      }
      parsing = true;
      const problem = uuid.parse(rawProblem),
        part = uuid.parse(rawPart),
        mediaId = action === "media" ? uuid.parse(rawMedia) : null;
      const input =
        action === "permission-write"
          ? solutionPermissionInputSchema.parse(await json(request))
          : action === "view"
            ? solutionSelectionSchema.parse(await json(request))
            : null;
      const revision = input?.revisionId ?? revisionQuery(request);
      parsing = false;
      c = await deps.pool.connect();
      await c.query("BEGIN");
      inTransaction = true;
      await c.query("SET LOCAL statement_timeout='5s'");
      await c.query("SET LOCAL lock_timeout='2s'");
      await c.query("SET LOCAL idle_in_transaction_session_timeout='10s'");
      let result: unknown,
        bytes: Uint8Array | undefined,
        mediaType: string | undefined;
      if (action.startsWith("permission-")) {
        const { rows: parents } = await c.query<{
          state: string;
          published_revision_id: string;
          now: Date;
        }>(
          `SELECT state,published_revision_id,clock_timestamp() AS now FROM authored_problem WHERE id=$1 AND owner_id=$2 FOR ${write ? "UPDATE" : "SHARE"}`,
          [problem, user.id],
        );
        if (!parents[0]) throw new AccessError(404, "Owned problem not found.");
        const { rows: parts } = await c.query(
          "SELECT 1 FROM authored_revision r JOIN authored_revision_part rp ON rp.revision_id=r.id WHERE r.problem_id=$1 AND r.id=$2 AND rp.part_id=$3",
          [problem, revision, part],
        );
        if (!parts[0]) throw new AccessError(404, "Revision part not found.");
        const blocks = await solution(c, revision, part),
          available = await revisionMedia(c, problem, revision);
        const { rows: permissions } = await c.query<Permission>(
          `SELECT * FROM authored_solution_permission WHERE revision_id=$1 AND part_id=$2 FOR ${write ? "UPDATE" : "SHARE"}`,
          [revision, part],
        );
        let p = permissions[0];
        if (action === "permission-write") {
          const data = solutionPermissionInputSchema.parse(input);
          if (data.version !== (p?.version ?? 0))
            throw new AccessError(
              409,
              "Permission changed. Reload before updating.",
            );
          if (data.enabled) {
            if (
              parents[0].state !== "published" ||
              parents[0].published_revision_id !== revision
            )
              throw new AccessError(
                409,
                "Only the current published solution can be authorized.",
              );
            if (data.expiresAt && new Date(data.expiresAt) <= parents[0].now)
              throw new AccessError(400, "Expiry must be in the future.");
            if (!validateApproval(blocks, available, data.mediaIds))
              throw new AccessError(
                400,
                "Explicitly approve every worked-solution image and only this solution's images or revision solution PDFs.",
              );
          }
          const { rows } = await c.query<Permission>(
            `INSERT INTO authored_solution_permission(problem_id,revision_id,part_id,approved_by,authorization_id,version,enabled,expires_at) VALUES($1,$2,$3,$4,$5,1,$6,$7) ON CONFLICT(revision_id,part_id) DO UPDATE SET authorization_id=EXCLUDED.authorization_id,version=authored_solution_permission.version+1,enabled=EXCLUDED.enabled,expires_at=EXCLUDED.expires_at RETURNING *`,
            [
              problem,
              revision,
              part,
              user.id,
              randomUUID(),
              data.enabled,
              data.expiresAt,
            ],
          );
          p = rows[0];
          await c.query(
            "DELETE FROM authored_solution_permission_media WHERE revision_id=$1 AND part_id=$2",
            [revision, part],
          );
          for (const id of data.mediaIds)
            await c.query(
              "INSERT INTO authored_solution_permission_media(revision_id,part_id,authorization_id,media_id) VALUES($1,$2,$3,$4)",
              [revision, part, p.authorization_id, id],
            );
        }
        result = {
          problemId: problem,
          revisionId: revision,
          partId: part,
          version: p?.version ?? 0,
          enabled: p?.enabled ?? false,
          expiresAt: p?.expires_at?.toISOString() ?? null,
          authorizationId: p?.authorization_id ?? null,
          mediaIds: p ? await bindings(c, p) : [],
          solutionImageIds: [
            ...new Set(
              blocks.filter((b) => b.kind === "image").map((b) => b.mediaId),
            ),
          ],
          solutionPdfIds: available
            .filter((m) => m.purpose === "solution-pdf")
            .map((m) => m.id),
        };
      } else {
        if (action === "view")
          await c.query(
            "SELECT pg_advisory_xact_lock(hashtextextended($1,6))",
            [`authored-student:${user.id}`],
          );
        const p = await currentPermission(c, problem, revision, part);
        const approved = await bindings(c, p);
        if (action === "view") {
          const blocks = await solution(c, revision, part),
            available = await revisionMedia(c, problem, revision);
          if (!validateApproval(blocks, available, approved))
            throw Error("Invalid stored permission bindings");
          const { rows: old } = await c.query<{ id: string; created_at: Date }>(
            "SELECT id,created_at FROM authored_solution_reveal WHERE user_id=$1 AND revision_id=$2 AND part_id=$3 AND authorization_id=$4",
            [user.id, revision, part, p.authorization_id],
          );
          let event = old[0];
          if (!event)
            event = (
              await c.query<{ id: string; created_at: Date }>(
                "INSERT INTO authored_solution_reveal(id,user_id,problem_id,revision_id,part_id,authorization_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,created_at",
                [
                  randomUUID(),
                  user.id,
                  problem,
                  revision,
                  part,
                  p.authorization_id,
                ],
              )
            ).rows[0];
          const parsed = solutionViewSchema.safeParse({
            problemId: problem,
            revisionId: revision,
            partId: part,
            reveal: {
              id: event.id,
              createdAt: event.created_at.toISOString(),
              replayed: !!old[0],
              policy: "explicit-solution-v1",
            },
            solution: blocks,
            media: available
              .filter((m) => approved.includes(m.id))
              .map((m) => ({
                id: m.id,
                purpose: m.purpose,
                mediaType: m.media_type,
                url: solutionMediaPath(problem, revision, part, m.id),
              })),
          });
          if (!parsed.success) throw Error("Invalid solution response");
          result = parsed.data;
        } else {
          // A permission alone is not a reveal: guessed URLs must not bypass explicit intent/ledger.
          const { rows: seen } = await c.query(
            "SELECT 1 FROM authored_solution_reveal WHERE user_id=$1 AND revision_id=$2 AND part_id=$3 AND authorization_id=$4",
            [user.id, revision, part, p.authorization_id],
          );
          if (!seen[0] || !approved.includes(mediaId!))
            throw new AccessError(404, "Solution media unavailable.");
          const { rows } = await c.query<{
            pathname: string;
            media_type: string;
            bytes: number;
          }>(
            `SELECT m.pathname,m.media_type,m.bytes FROM author_media m JOIN author_revision_media rm ON rm.media_id=m.id AND rm.problem_id=m.problem_id AND rm.purpose=m.purpose WHERE m.id=$1 AND m.problem_id=$2 AND rm.revision_id=$3 AND m.purpose IN ('solution-image','solution-pdf') AND m.state='ready'`,
            [mediaId, problem, revision],
          );
          if (!rows[0])
            throw new AccessError(404, "Solution media unavailable.");
          // Historical bindings retain the object; parent/permission locks serialize revoke/unpublish.
          bytes = await mediaBytes(
            deps.storage,
            rows[0].pathname,
            rows[0].bytes,
          );
          mediaType = rows[0].media_type;
        }
        await stillValid(c, p);
      }
      await c.query("COMMIT");
      inTransaction = false;
      if (bytes)
        return new Response(new Uint8Array(bytes), {
          headers: {
            ...headers,
            "Content-Type": mediaType!,
            "Content-Length": String(bytes.byteLength),
            "Content-Disposition":
              mediaType === "application/pdf"
                ? 'attachment; filename="worked-solution.pdf"'
                : "inline",
            "Content-Security-Policy": "sandbox; default-src 'none'",
            "Cross-Origin-Resource-Policy": "same-origin",
          },
        });
      return reply(result);
    } catch (error) {
      if (c && inTransaction) await c.query("ROLLBACK").catch(() => {});
      if (error instanceof AccessError) {
        const r = reply({ error: error.message }, error.status);
        if (error.retryAfter) r.headers.set("Retry-After", error.retryAfter);
        return r;
      }
      if (error instanceof RequestBodyTimeoutError)
        return reply({ error: "Solution request body timed out." }, 408);
      if (parsing && error instanceof RangeError)
        return reply({ error: "Solution request is too large." }, 413);
      if (
        parsing &&
        (error instanceof z.ZodError ||
          error instanceof SyntaxError ||
          error instanceof TypeError)
      )
        return reply({ error: "Invalid solution request." }, 400);
      return reply(
        { error: "Worked solutions are temporarily unavailable." },
        503,
      );
    } finally {
      c?.release();
    }
  };
}
