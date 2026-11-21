import "server-only";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { readRequestBytes, RequestBodyTimeoutError } from "../submission-request";
import { profileHandleSchema, profileMutationSchema, profilePolicy, type CommunityProfile } from "./profile-contracts";

import { publicProfileDisplayName, publicProfileEligible } from "./profile-publication";

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
const savedColumns = `user_id AS "userId",handle,display_name AS "displayName",bio,
  education_level AS "educationLevel",favorite_topic_ids AS "favoriteTopicIds"`;
const ownerColumns = `${savedColumns},created_at AS "createdAt",updated_at AS "updatedAt",
  coalesce(${publicProfileEligible("cp")},false) AS "publicVisibility",
  CASE WHEN deactivated_at IS NOT NULL THEN 'deactivated'
    WHEN ${publicProfileEligible("cp")} THEN 'public'
    WHEN publication_basis IS NOT NULL THEN 'pending' ELSE 'private' END AS "publicationState"`;

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
        // Project only the five public fields. Verification is a predicate, never projected.
        const { rows } = await deps.pool.query(`SELECT handle,${publicProfileDisplayName("cp")} AS "displayName",bio,
          education_level AS "educationLevel",favorite_topic_ids AS "favoriteTopicIds"
          FROM community_profile cp WHERE lower(handle)=$1 AND ${publicProfileEligible("cp")}`, [parsed.data]);
        if (!rows[0]) throw new ProfileError(404, "Profile not found.");
        return reply({ profile: rows[0] });
      }
      const user = await deps.user(request);
      if (!user) throw new ProfileError(401, "Sign in to access your profile.");
      if (request.headers.get("x-community-account") !== user.id)
        throw new ProfileError(409, "Your account changed. Reload the page before continuing.", "ACCOUNT_CHANGED");
      if (new URL(request.url).search) throw new ProfileError(400, "Invalid profile request.");
      if (request.method === "GET") {
        const { rows } = await deps.pool.query<CommunityProfile>(`SELECT ${ownerColumns} FROM community_profile cp WHERE user_id=$1`, [user.id]);
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
      const patch = profileMutationSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
      client = await deps.pool.connect();
      await client.query("BEGIN"); transaction = true;
      await client.query("SET LOCAL statement_timeout='10s'");
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,7))", [`community-profile:${user.id}`]);
      const current = (await client.query<CommunityProfile>(`SELECT ${ownerColumns}
        FROM community_profile cp WHERE user_id=$1 FOR UPDATE`, [user.id])).rows.at(0);
      if ("acknowledge" in patch) {
        if (!current) throw new ProfileError(400, "Save your username before publishing.");
        if (current.publicationState === "deactivated")
          throw new ProfileError(409, "This profile has been deactivated.", "PROFILE_DEACTIVATED");
        if (current.publicationState === "private") {
          await client.query(`UPDATE community_profile
            SET publication_basis='legacy_acknowledgement',publication_policy_version=$2,publication_recorded_at=clock_timestamp()
            WHERE user_id=$1 AND publication_basis IS NULL AND deactivated_at IS NULL`, [user.id, patch.acknowledge]);
        }
      } else if ("deactivate" in patch) {
        if (!current || current.publicationState === "private")
          throw new ProfileError(400, "You have no public profile to deactivate.");
        await client.query(`UPDATE community_profile SET deactivated_at=clock_timestamp()
          WHERE user_id=$1 AND publication_basis IS NOT NULL AND deactivated_at IS NULL`, [user.id]);
      } else {
        if (!current && !patch.handle) throw new ProfileError(400, "Choose a username to create your profile.");
        if (current && patch.handle && patch.handle !== current.handle)
          throw new ProfileError(409, "Public usernames cannot be renamed.");
        const next = { displayName: "", bio: "", educationLevel: "prefer-not-to-say", favoriteTopicIds: [], ...current, ...patch };
        const values = [user.id, patch.handle ?? current?.handle, next.displayName, next.bio, next.educationLevel, next.favoriteTopicIds];
        if (current) {
          await client.query(`UPDATE community_profile SET display_name=$3,bio=$4,education_level=$5,
            favorite_topic_ids=$6 WHERE user_id=$1 AND handle=$2`, values);
        } else {
          await client.query(`INSERT INTO community_profile(user_id,handle,display_name,bio,education_level,favorite_topic_ids)
            VALUES($1,$2,$3,$4,$5,$6)`, values);
        }
      }
      const result = await client.query<CommunityProfile>(`SELECT ${ownerColumns} FROM community_profile cp WHERE user_id=$1`, [user.id]);
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
