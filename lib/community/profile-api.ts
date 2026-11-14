import "server-only";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { readRequestBytes, RequestBodyTimeoutError } from "../submission-request";
import { profileHandleSchema, profilePatchSchema, profilePolicy, type CommunityProfile } from "./profile-contracts";

export const profileHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Vary": "Cookie",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};
export const profileReply = (body: unknown, status = 200) => Response.json(body, { status, headers: profileHeaders });
export type ProfileAction = "own" | "public";
type Dependencies = {
  pool: Pool;
  user: (request: Request) => Promise<{ id: string; emailVerified?: boolean } | null | undefined>;
  origin: (request: Request) => boolean;
};
class ProfileError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}
const columns = `user_id AS "userId",handle,display_name AS "displayName",bio,
  education_level AS "educationLevel",favorite_topic_ids AS "favoriteTopicIds",
  public_visibility AS "publicVisibility",created_at AS "createdAt",updated_at AS "updatedAt"`;

export function createCommunityProfileApi(deps: Dependencies) {
  return async (action: ProfileAction, request: Request, handle?: string): Promise<Response> => {
    let client: PoolClient | undefined;
    let transaction = false;
    const reply = (body: unknown, status = 200) => {
      const response = profileReply(body, status);
      if (action === "own") response.headers.set("Vary", "Cookie, X-Community-Account");
      return response;
    };
    try {
      if (action === "public") {
        const parsed = profileHandleSchema.safeParse(handle);
        if (!parsed.success || new URL(request.url).search)
          throw new ProfileError(404, "Profile not found.");
        // Select only fields intentionally published by the profile owner. No identity joins.
        const { rows } = await deps.pool.query(`SELECT handle,display_name AS "displayName",bio,
          education_level AS "educationLevel",favorite_topic_ids AS "favoriteTopicIds"
          FROM community_profile WHERE lower(handle)=$1 AND public_visibility=true`, [parsed.data]);
        if (!rows[0]) throw new ProfileError(404, "Profile not found.");
        return reply({ profile: rows[0] });
      }
      const user = await deps.user(request);
      if (!user) throw new ProfileError(401, "Sign in to access your profile.");
      if (request.headers.get("x-community-account") !== user.id)
        throw new ProfileError(409, "Your account changed. Reload the page before continuing.", "ACCOUNT_CHANGED");
      if (new URL(request.url).search) throw new ProfileError(400, "Invalid profile request.");
      if (request.method === "GET") {
        const { rows } = await deps.pool.query<CommunityProfile>(`SELECT ${columns} FROM community_profile WHERE user_id=$1`, [user.id]);
        return reply({ profile: rows[0] ?? null });
      }
      if (request.method !== "PATCH") throw new ProfileError(405, "Method not allowed.");
      if (user.emailVerified !== true) throw new ProfileError(403, "Verify your email before editing your profile.");
      if (!deps.origin(request)) throw new ProfileError(403, "Request origin rejected.");
      // Persist outside the profile transaction so conflicts/validation failures still consume quota.
      // Atomic upsert, one bounded bucket per account, shared by all application instances.
      const limit = await deps.pool.query<{ requests: number }>(`INSERT INTO community_profile_write_limit(user_id,window_start,requests)
        VALUES($1,date_trunc('minute',clock_timestamp()),1) ON CONFLICT(user_id) DO UPDATE SET
        requests=CASE WHEN community_profile_write_limit.window_start=date_trunc('minute',clock_timestamp())
          THEN least(community_profile_write_limit.requests+1,11) ELSE 1 END,
        window_start=date_trunc('minute',clock_timestamp()) RETURNING requests`, [user.id]);
      if (limit.rows[0].requests > profilePolicy.writesPerMinute) {
        const response = reply({ error: "Profile write limit reached. Retry next minute." }, 429);
        response.headers.set("Retry-After", "60");
        return response;
      }
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
        throw new ProfileError(415, "Send JSON.");
      const bytes = await readRequestBytes(request, profilePolicy.maxBodyBytes, 5000);
      const patch = profilePatchSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
      client = await deps.pool.connect();
      await client.query("BEGIN"); transaction = true;
      await client.query("SET LOCAL statement_timeout='10s'");
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,7))", [`community-profile:${user.id}`]);
      const current = (await client.query<CommunityProfile>(`SELECT ${columns} FROM community_profile WHERE user_id=$1 FOR UPDATE`, [user.id])).rows.at(0);
      if (!current && !patch.handle) throw new ProfileError(400, "Choose a handle to create your profile.");
      if (current && patch.handle && patch.handle !== current.handle)
        throw new ProfileError(409, "Public handles cannot be renamed yet.");
      const next = { displayName: "", bio: "", educationLevel: "prefer-not-to-say", favoriteTopicIds: [], publicVisibility: false, ...current, ...patch };
      const values = [user.id, patch.handle ?? current?.handle, next.displayName, next.bio, next.educationLevel, next.favoriteTopicIds, next.publicVisibility];
      const result = current
        ? await client.query<CommunityProfile>(`UPDATE community_profile SET display_name=$3,bio=$4,education_level=$5,
          favorite_topic_ids=$6,public_visibility=$7 WHERE user_id=$1 AND handle=$2 RETURNING ${columns}`, values)
        : await client.query<CommunityProfile>(`INSERT INTO community_profile(user_id,handle,display_name,bio,education_level,favorite_topic_ids,public_visibility)
          VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING ${columns}`, values);
      await client.query("COMMIT"); transaction = false;
      return reply({ profile: result.rows[0] }, current ? 200 : 201);
    } catch (error) {
      if (client && transaction) await client.query("ROLLBACK").catch(() => {});
      if (error instanceof ProfileError) return reply({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status);
      if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError)
        return reply({ error: "Invalid profile request." }, 400);
      if (error instanceof RangeError) return reply({ error: "Profile request too large." }, 413);
      if (error instanceof RequestBodyTimeoutError) return reply({ error: "Profile request timed out." }, 408);
      if ((error as { code?: string }).code === "23505") return reply({ error: "Handle unavailable." }, 409);
      return reply({ error: "Profiles are temporarily unavailable." }, 503);
    } finally { client?.release(); }
  };
}
