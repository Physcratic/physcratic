import "server-only";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { readRequestBytes, RequestBodyTimeoutError } from "../submission-request";
import { profileHandleSchema } from "./profile-contracts";
import { profileReply } from "./profile-api";
import { achievementEligible, showcaseSchema, achievementIdSchema, type BadgeId, type PublicMedal, type AchievementProgress } from "./achievements";

type Dependencies = {
  pool: Pool;
  medalsEnabled?:()=>boolean;
  user: (request: Request) => Promise<{ id: string; emailVerified?: boolean } | null | undefined>;
  origin: (request: Request) => boolean;
};
class AchievementError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Snapshot = { author: number; solver: number | null; badgeIds: BadgeId[]; profileExists: boolean };
const projection = `g.author_count AS author,g.solve_count AS solver,coalesce(s.badge_ids,'{}'::text[]) AS "badgeIds"`;

export function createCommunityAchievementsApi(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    let client: PoolClient | undefined;
    let transaction = false;
    try {
      const medalsOn=deps.medalsEnabled?.()===true;
      const url = new URL(request.url), handle = url.searchParams.get("handle");
      if ([...url.searchParams.keys()].some(key => key !== "handle") || url.searchParams.getAll("handle").length > 1)
        throw new AchievementError(400, "Invalid achievements request.");
      if (handle !== null && request.method !== "GET") throw new AchievementError(400, "Update your own showcase only.");
      const parsedHandle = handle === null ? null : profileHandleSchema.safeParse(handle);
      if (parsedHandle && !parsedHandle.success) throw new AchievementError(404, "Profile not found.");
      const user = handle === null ? await deps.user(request) : null;
      if (handle === null && !user) throw new AchievementError(401, "Sign in to access achievements.");
      if (request.method !== "GET" && request.method !== "PATCH") throw new AchievementError(405, "Method not allowed.");
      if (request.method === "PATCH") {
        if (user?.emailVerified !== true || !deps.origin(request)) throw new AchievementError(403, "Request not permitted.");
        // A shared, atomic per-account bucket; invalid attempts also consume quota.
        const limit = await deps.pool.query<{ requests: number }>(`INSERT INTO community_achievement_write_limit(user_id,window_start,requests)
          VALUES($1,date_trunc('minute',clock_timestamp()),1) ON CONFLICT(user_id) DO UPDATE SET
          requests=CASE WHEN community_achievement_write_limit.window_start=date_trunc('minute',clock_timestamp())
            THEN least(community_achievement_write_limit.requests+1,11) ELSE 1 END,
          window_start=date_trunc('minute',clock_timestamp()) RETURNING requests`, [user!.id]);
        if (limit.rows[0].requests > 10) {
          const response = profileReply({ error: "Showcase write limit reached. Retry next minute." }, 429);
          response.headers.set("Retry-After", "60"); return response;
        }
      }
      let selection: { selectedIds: BadgeId[] } | undefined;
      if (request.method === "PATCH") {
        if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
          throw new AchievementError(415, "Send JSON.");
        const bytes = await readRequestBytes(request, 2048, 5000);
        selection = showcaseSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
        if(!medalsOn&&selection.selectedIds.some(id=>!achievementIdSchema.safeParse(id).success))throw new AchievementError(400,"Medal showcase is disabled.");
      }
      client = await deps.pool.connect();
      await client.query("BEGIN"); transaction = true;
      await client.query("SET LOCAL statement_timeout='5s'");
      await client.query("SET LOCAL lock_timeout='2s'");
      if (handle !== null) {
        // Never return identity or progress publicly. Resolve visibility and current eligibility in one snapshot.
        const lookup = await client.query<{ badgeIds: BadgeId[] }>(`SELECT coalesce(s.badge_ids,'{}'::text[]) AS "badgeIds"
          FROM community_profile p LEFT JOIN community_badge_selection s ON s.user_id=p.user_id
          WHERE lower(p.handle)=$1 AND p.public_visibility=true`, [parsedHandle!.data]);
        if (!lookup.rows[0]) throw new AchievementError(404, "Profile not found.");
        let selectedIds: BadgeId[] = [];
        if (lookup.rows[0].badgeIds.length) {
          const result = await client.query<Snapshot>(`SELECT ${projection} FROM community_profile p
            JOIN community_badge_selection s ON s.user_id=p.user_id
            CROSS JOIN LATERAL community_achievement_progress(p.user_id) g
            WHERE lower(p.handle)=$1 AND p.public_visibility=true`, [parsedHandle!.data]);
          if (!result.rows[0]) throw new AchievementError(404, "Profile not found.");
          selectedIds = active(result.rows[0]);
        }
        let medals:PublicMedal[]=[];
        if(medalsOn){medals=(await client.query<PublicMedal>(`SELECT m.id,m.competition,m.award,m.year,m.country,m."competitionName" FROM community_approved_medal m JOIN community_profile p ON p.user_id=m.user_id JOIN community_badge_selection s ON s.user_id=p.user_id WHERE lower(p.handle)=$1 AND p.public_visibility=true AND m.id=ANY(s.badge_ids)`,[parsedHandle!.data])).rows;selectedIds=lookup.rows[0].badgeIds.filter(id=>selectedIds.includes(id)||medals.some(m=>m.id===id));}
        await client.query("COMMIT"); transaction = false;
        return profileReply({ selectedIds,...(medalsOn?{medals}: {}) });
      }
      if (selection) {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,9))", [`community-achievements:${user!.id}`]);
        const profile = await client.query("SELECT user_id FROM community_profile WHERE user_id=$1", [user!.id]);
        if (!profile.rows[0]) throw new AchievementError(409, "Save a profile before selecting badges.");
        // SQL guard independently verifies eligibility and array constraints, including direct runtime writes.
        await client.query(`INSERT INTO community_badge_selection(user_id,badge_ids) VALUES($1,$2)
          ON CONFLICT(user_id) DO UPDATE SET badge_ids=excluded.badge_ids`, [user!.id, selection.selectedIds]);
        await client.query("COMMIT"); transaction = false;
        return profileReply(selection);
      }
      const result = await client.query<Snapshot>(`SELECT ${projection},EXISTS(SELECT 1 FROM community_profile WHERE user_id=$1) AS "profileExists"
        FROM community_achievement_progress($1) g LEFT JOIN community_badge_selection s ON s.user_id=$1`, [user!.id]);
      const snapshot = result.rows[0];
      const medals:PublicMedal[]=medalsOn?(await client.query<PublicMedal>(`SELECT id,competition,award,year,country,"competitionName" FROM community_approved_medal WHERE user_id=$1 ORDER BY year DESC,id LIMIT 20`,[user!.id])).rows:[];
      const earned=active(snapshot),selectedIds=snapshot.badgeIds.filter(id=>earned.includes(id)||medals.some(m=>m.id===id));
      await client.query("COMMIT"); transaction = false;
      return profileReply({ progress: { author: snapshot.author, solver: snapshot.solver }, selectedIds,
        hiddenSelectionCount: snapshot.badgeIds.length - selectedIds.length, profileExists: snapshot.profileExists,...(medalsOn?{medals}: {}) });
    } catch (error) {
      if (client && transaction) await client.query("ROLLBACK").catch(() => {});
      if (error instanceof AchievementError) return profileReply({ error: error.message }, error.status);
      if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError)
        return profileReply({ error: "Invalid achievements request." }, 400);
      if (error instanceof RangeError) return profileReply({ error: "Achievements request too large." }, 413);
      if (error instanceof RequestBodyTimeoutError) return profileReply({ error: "Achievements request timed out." }, 408);
      if ((error as { code?: string }).code === "23514") return profileReply({ error: "Eligibility changed. Reload achievements before saving." }, 409);
      return profileReply({ error: "Achievements are temporarily unavailable." }, 503);
    } finally { client?.release(); }
  };
}
function active(snapshot: Snapshot): BadgeId[] {
  const progress: AchievementProgress = { author: snapshot.author, solver: snapshot.solver };
  return snapshot.badgeIds.filter(id => {const parsed=achievementIdSchema.safeParse(id);return parsed.success&&achievementEligible(parsed.data, progress);});
}
