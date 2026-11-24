import "server-only";
import type { Pool } from "pg";
import { z } from "zod";
import arena from "./arena/index.json";
import {
  completionCursorSchema, completionHistorySchema, completionKeySchema, completionPageSize,
  completionPositionSchema, completionReply, completionStatusSchema, completionWriteSchema,
} from "./personal-completions-contracts";
import { problemHref, problemKey, type ProblemKey } from "./unified-arena";
import { readRequestBytes, RequestBodyTimeoutError } from "./submission-request";
import { openCompletionCursor, sealCompletionCursor } from "./opaque-completion-cursor";

type Dependencies = {
  pool: Pool;
  user: (request: Request) => Promise<{ id: string; emailVerified?: boolean } | null | undefined>;
  origin: (request: Request) => boolean;
  cursorSecret?: string;
};

class CompletionError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const arenaTitles = new Map(arena.problems.map(problem => [problemKey({ kind: "arena", id: problem.id }), problem.title]));
const currentRevision = "p.state='published' AND r.problem_id=p.id AND r.id=p.published_revision_id";
const publication = `FROM authored_problem p JOIN authored_revision r ON ${currentRevision}`;
const statusQuery = z.strictObject({ key: completionKeySchema });
const historyQuery = z.strictObject({ after: completionCursorSchema.optional() });

function completionStatus(key: ProblemKey, completedAt: Date | null) {
  return completionStatusSchema.parse({ key, completed: completedAt !== null, completedAt: completedAt?.toISOString() ?? null });
}

async function readStatus(pool: Pool, userId: string, key: ProblemKey) {
  const authored = key.startsWith("authored:");
  if (!authored && !arenaTitles.has(key)) throw new CompletionError(404, "Problem is unavailable.");
  const query = {
    text: `SELECT c.completed_at, ${authored ? `EXISTS (SELECT 1 ${publication} WHERE p.id=$3::uuid)` : "true"} AS available
      FROM "user" u LEFT JOIN personal_problem_completion c ON c.user_id=u.id AND c.problem_key=$2
      WHERE u.id=$1`,
    values: authored ? [userId, key, key.slice(9)] : [userId, key], query_timeout: 5000,
  };
  const { rows: [row] } = await pool.query<{ available: boolean; completed_at: Date | null }>(query);
  if (!row) throw new CompletionError(401, "Sign in again to read completions.");
  if (!row.available) throw new CompletionError(404, "Problem is unavailable.");
  return completionStatus(key, row.completed_at);
}

async function readHistory(pool: Pool, userId: string, cursorSecret?: string, after?: string) {
  const [at, key] = after === undefined ? [null, null] : completionPositionSchema.parse(
    openCompletionCursor(requireCursorSecret(cursorSecret), "ph1", [userId], after),
  );
  const query = {
    text: `WITH visible AS NOT MATERIALIZED (
      SELECT c.problem_key,c.completed_at,coalesce(a.title,r.content->>'title') AS title
      FROM personal_problem_completion c
      LEFT JOIN unnest($2::text[],$3::text[]) AS a(key,title) ON a.key=c.problem_key
      LEFT JOIN authored_problem p ON p.id=CASE WHEN c.problem_key LIKE 'authored:%' THEN substring(c.problem_key FROM 10)::uuid END
      LEFT JOIN authored_revision r ON ${currentRevision}
      WHERE c.user_id=$1 AND (a.key IS NOT NULL OR r.id IS NOT NULL)
    ), page AS (
      SELECT * FROM visible WHERE $4::timestamptz IS NULL OR (completed_at,problem_key)<($4::timestamptz,$5::text)
      ORDER BY completed_at DESC,problem_key DESC LIMIT $6
    )
    SELECT (SELECT count(*) FROM visible)::text AS count,page.*
    FROM "user" u LEFT JOIN page ON true WHERE u.id=$1
    ORDER BY page.completed_at DESC,page.problem_key DESC`,
    values: [userId, [...arenaTitles.keys()], [...arenaTitles.values()], at, key, completionPageSize + 1], query_timeout: 5000,
  };
  const { rows } = await pool.query<{ count: string; problem_key: ProblemKey | null; completed_at: Date | null; title: string | null }>(query);
  if (!rows.length) throw new CompletionError(401, "Sign in again to read completions.");
  const items = rows.slice(0, completionPageSize).flatMap(row => {
    if (!row.problem_key || !row.completed_at) return [];
    const kind = row.problem_key.startsWith("authored:") ? "authored" : "arena";
    return [{ key: row.problem_key, title: row.title, href: problemHref({ kind, id: row.problem_key.slice(kind.length + 1) }), completedAt: row.completed_at.toISOString() }];
  });
  const last = items.at(-1);
  const nextCursor = rows.length > completionPageSize && last
    ? sealCompletionCursor(requireCursorSecret(cursorSecret), "ph1", [userId], [last.completedAt, last.key]) : null;
  const history = completionHistorySchema.safeParse({ count: Number(rows[0].count), items, nextCursor });
  if (!history.success) throw Error("Invalid completion history projection");
  return history.data;
}

function requireCursorSecret(value?: string) {
  if (!value) throw Error("Personal completion cursor configuration is missing");
  return value;
}

async function writeCompletion(pool: Pool, userId: string, key: ProblemKey, completed: boolean) {
  // Charge separately so unavailable publications and database timeouts still consume quota.
  // Lock the account before the limiter row, matching the order used during erasure.
  const limitQuery = {
    text: `INSERT INTO personal_completion_write_limit(user_id,window_start,requests)
      SELECT u.id,date_trunc('minute',statement_timestamp()),1 FROM "user" u
      WHERE u.id=$1 AND u."emailVerified" IS TRUE FOR SHARE OF u
      ON CONFLICT (user_id) DO UPDATE SET window_start=greatest(personal_completion_write_limit.window_start,EXCLUDED.window_start),
        requests=CASE WHEN personal_completion_write_limit.window_start>=EXCLUDED.window_start
          THEN least(personal_completion_write_limit.requests+1,61) ELSE 1 END
      RETURNING requests`, values: [userId], query_timeout: 5000,
  };
  const { rows: [bucket] } = await pool.query<{ requests: number }>(limitQuery);
  if (!bucket) throw new CompletionError(401, "Sign in again with a verified account.");
  if (bucket.requests > 60) throw new CompletionError(429, "Completion write limit reached. Retry next minute.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN; SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='2s'");
    const { rows: [account] } = await client.query<{ verified: boolean }>(
      'SELECT "emailVerified" AS verified FROM "user" WHERE id=$1 FOR SHARE', [userId]);
    if (!account) throw new CompletionError(401, "Sign in again to update completions.");
    if (!account.verified) throw new CompletionError(403, "Verify your email before updating completions.");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`personal-completions:${userId}`]);

    let completedAt: Date | null = null;
    if (completed) {
      const available = key.startsWith("authored:")
        ? !!(await client.query(`SELECT p.id ${publication} WHERE p.id=$1::uuid FOR SHARE OF p`, [key.slice(9)])).rows[0]
        : arenaTitles.has(key);
      if (!available) throw new CompletionError(404, "Problem is unavailable.");
      const { rows: [inserted] } = await client.query<{ completed_at: Date }>(
        `INSERT INTO personal_problem_completion(user_id,problem_key) VALUES($1,$2)
          ON CONFLICT (user_id,problem_key) DO NOTHING RETURNING completed_at`, [userId, key]);
      completedAt = inserted?.completed_at ?? (await client.query<{ completed_at: Date }>(
        "SELECT completed_at FROM personal_problem_completion WHERE user_id=$1 AND problem_key=$2", [userId, key])).rows[0].completed_at;
    } else {
      await client.query("DELETE FROM personal_problem_completion WHERE user_id=$1 AND problem_key=$2", [userId, key]);
    }
    await client.query("COMMIT");
    return completionStatus(key, completedAt);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export function createPersonalCompletionsApi(deps: Dependencies) {
  return async (request: Request) => {
    try {
      if (request.method !== "GET" && request.method !== "PUT") throw new CompletionError(405, "Method not allowed.");
      const url = new URL(request.url);
      if (request.url.length > 4096 || [...url.searchParams.keys()].some(key => url.searchParams.getAll(key).length !== 1)) {
        throw new CompletionError(400, "Invalid completion request.");
      }
      const user = await deps.user(request);
      if (!user) throw new CompletionError(401, "Sign in to access completions.");
      if (request.headers.get("x-community-account") !== user.id) throw new CompletionError(409, "Your account changed. Reload before continuing.");

      if (request.method === "GET") {
        const params = Object.fromEntries(url.searchParams);
        if (url.searchParams.has("key")) return completionReply(await readStatus(deps.pool, user.id, statusQuery.parse(params).key));
        return completionReply(await readHistory(deps.pool, user.id, deps.cursorSecret, historyQuery.parse(params).after));
      }

      if (!user.emailVerified || !deps.origin(request)) throw new CompletionError(403, "Request not permitted.");
      if (url.search) throw new CompletionError(400, "Invalid completion request.");
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        throw new CompletionError(415, "Send JSON.");
      }
      const bytes = await readRequestBytes(request, 2048, 5000);
      const { key, completed } = completionWriteSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
      return completionReply(await writeCompletion(deps.pool, user.id, key, completed));
    } catch (error) {
      if (error instanceof CompletionError) {
        const response = completionReply({ error: error.message }, error.status);
        if (error.status === 429) response.headers.set("Retry-After", "60");
        return response;
      }
      if (error instanceof RangeError) return completionReply({ error: "Completion request is too large." }, 413);
      if (error instanceof RequestBodyTimeoutError) return completionReply({ error: "Completion request timed out." }, 408);
      if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return completionReply({ error: "Invalid completion request." }, 400);
      return completionReply({ error: "Personal completions are temporarily unavailable." }, 503);
    }
  };
}
