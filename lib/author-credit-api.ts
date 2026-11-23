import "server-only";
import type { Pool, PoolClient } from "pg";
import { AUTHOR_CREDIT_POLICY_VERSION, authorCreditReply, authorCreditStatusSchema, authorCreditWriteSchema } from "./author-credit-contracts";
import { profilePolicy } from "./community/profile-contracts";
import { readRequestBytes, RequestBodyTimeoutError } from "./submission-request";

type Dependencies = {
  pool: Pool;
  user: (request: Request) => Promise<{ id: string; emailVerified: boolean } | null | undefined>;
  origin: (request: Request) => boolean;
};

const columns = `handle,
  CASE
    WHEN author_credit_policy_version IS NULL OR author_credit_withdrawn_at IS NOT NULL THEN 'inactive'
    WHEN author_credit_policy_version = '${AUTHOR_CREDIT_POLICY_VERSION}' THEN 'active'
    ELSE 'review-required'
  END AS credit,
  extract(epoch FROM coalesce(author_credit_withdrawn_at, author_credit_acknowledged_at))::text AS revision`;
const empty = { handle: null, credit: "inactive", revision: null };
const nextTimestamp = `greatest(clock_timestamp(),
  coalesce(author_credit_withdrawn_at, author_credit_acknowledged_at) + interval '1 microsecond')`;

class CreditError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}

async function readWrite(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    throw new CreditError("Send JSON.", 415);
  try {
    const bytes = await readRequestBytes(request, 1024, 5000);
    const input = authorCreditWriteSchema.safeParse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
    if (input.success) return input.data;
  } catch (error) {
    if (error instanceof RequestBodyTimeoutError) throw new CreditError("The request timed out.", 408);
    if (error instanceof RangeError) throw new CreditError("The request is too large.", 413);
  }
  throw new CreditError("Check your details and reload Problem Studio to see the current disclosure.", 400);
}

async function applyCreditWrite(client: PoolClient, userId: string, write: Awaited<ReturnType<typeof readWrite>>) {
  // Use the same lock as the existing profile editor, including before a handle exists.
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,7))", [`community-profile:${userId}`]);
  const { rows: [row] } = await client.query(`
    SELECT ${columns} FROM community_profile WHERE user_id=$1 FOR UPDATE`, [userId]);
  const current = authorCreditStatusSchema.parse(row ?? empty);

  if (write.action === "claim") {
    if (current.handle === write.handle) return current;
    if (current.handle) throw new CreditError("Your claimed username is permanent.", 409, "HANDLE_IMMUTABLE");
    const result = await client.query(`
      INSERT INTO community_profile(user_id, handle) VALUES ($1,$2)
      RETURNING ${columns}`, [userId, write.handle]);
    return authorCreditStatusSchema.parse(result.rows[0]);
  }
  if (write.revision !== current.revision)
    throw new CreditError("Author credit changed. Reload its status before continuing.", 409, "CREDIT_CHANGED");
  if (write.action === "acknowledge") {
    if (current.handle !== write.handle)
      throw new CreditError("Claim and confirm your username before agreeing to author credit.", 409, "HANDLE_REQUIRED");
    if (current.credit === "active") return current;
    const result = await client.query(`
      UPDATE community_profile SET author_credit_policy_version=$2,
        author_credit_acknowledged_at=${nextTimestamp}, author_credit_withdrawn_at=NULL
      WHERE user_id=$1 RETURNING ${columns}`, [userId, write.policyVersion]);
    return authorCreditStatusSchema.parse(result.rows[0]);
  }
  if (current.credit === "inactive") return current;
  const result = await client.query(`
    UPDATE community_profile SET author_credit_withdrawn_at=${nextTimestamp}
    WHERE user_id=$1 RETURNING ${columns}`, [userId]);
  return authorCreditStatusSchema.parse(result.rows[0]);
}

export function createAuthorCreditApi({ pool, user, origin }: Dependencies) {
  return async (request: Request) => {
    try {
      if (request.method !== "GET" && request.method !== "PATCH")
        throw new CreditError("Use GET or PATCH for author credit.", 405);
      if (request.url.length > 4096 || new URL(request.url).search) throw new CreditError("Invalid author credit request.", 400);
      if (request.method === "PATCH" && !origin(request)) throw new CreditError("Request origin rejected.", 403);

      const account = await user(request);
      if (!account) throw new CreditError("Sign in again to manage author credit.", 401);
      if (request.headers.get("x-community-account") !== account.id)
        throw new CreditError("Your account changed. Reload Problem Studio.", 409, "ACCOUNT_CHANGED");
      if (account.emailVerified !== true) throw new CreditError("Verify your email to manage author credit.", 403);

      if (request.method === "GET") {
        const { rows } = await pool.query(`SELECT ${columns} FROM community_profile WHERE user_id=$1`, [account.id]);
        return authorCreditReply(authorCreditStatusSchema.parse(rows[0] ?? empty));
      }

      const write = await readWrite(request);
      // Keep the charge even when a request conflicts or its transaction rolls back.
      // A delayed request from the previous minute cannot reset a newer bucket.
      const { rows: [limit] } = await pool.query<{ requests: number }>(`
        INSERT INTO community_profile_write_limit(user_id,window_start,requests)
        VALUES ($1,date_trunc('minute',statement_timestamp()),1)
        ON CONFLICT (user_id) DO UPDATE SET
          requests=CASE WHEN community_profile_write_limit.window_start>=excluded.window_start
            THEN least(community_profile_write_limit.requests+1,$2+1) ELSE 1 END,
          window_start=greatest(community_profile_write_limit.window_start,excluded.window_start)
        RETURNING requests`, [account.id, profilePolicy.writesPerMinute]);
      if (limit.requests > profilePolicy.writesPerMinute) {
        const response = authorCreditReply({ error: "Too many changes. Wait a minute and try again." }, 429);
        response.headers.set("Retry-After", "60");
        return response;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='5s'");
        const result = await applyCreditWrite(client, account.id, write);
        await client.query("COMMIT");
        return authorCreditReply(result);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof CreditError)
        return authorCreditReply({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status);
      if ((error as { code?: string } | null)?.code === "23505")
        return authorCreditReply({ error: "That username is unavailable.", code: "HANDLE_TAKEN" }, 409);
      return authorCreditReply({ error: "Author credit is temporarily unavailable." }, 503);
    }
  };
}
