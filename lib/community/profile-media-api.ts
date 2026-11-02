import "server-only";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { readRequestBytes, RequestBodyTimeoutError } from "../submission-request";
import { profileHandleSchema } from "./profile-contracts";
import { profileHeaders, profileReply } from "./profile-api";
import { encodeProfileImage, InvalidProfileImage } from "./profile-image";
import { profileMediaPolicy as policy, profileMediaKinds, type ProfileMediaSet, type ProfileMediaKind } from "./profile-media-contracts";
import type { ProfileMediaStorage } from "./profile-media-storage";

export type ProfileMediaAction = "metadata" | "image" | "upload" | "remove" | "cleanup";
type Dependencies = { pool: Pool; storage: ProfileMediaStorage;
  user: (r: Request) => Promise<{ id: string; emailVerified?: boolean } | null | undefined>;
  origin: (r: Request) => boolean };
class MediaError extends Error { constructor(public status: number, message: string) { super(message); } }
const kindSchema = z.enum(profileMediaKinds);

export function createProfileMediaApi(deps: Dependencies) {
  async function media(userId: string): Promise<ProfileMediaSet> {
    const { rows } = await deps.pool.query<{ id: string; kind: ProfileMediaKind }>(
      "SELECT id,kind FROM community_profile_media WHERE user_id=$1 AND state='active'", [userId]);
    const result: ProfileMediaSet = { avatar: null, banner: null };
    for (const row of rows) result[row.kind] = { id: row.id, url: `/api/community/profile-media/image/${row.id}` };
    return result;
  }
  async function ownResult(userId: string) {
    const [images, pending] = await Promise.all([media(userId), deps.pool.query(
      "SELECT 1 FROM community_profile_media WHERE user_id=$1 AND state<>'active' LIMIT 1", [userId])]);
    return { media: images, cleanupPending: Boolean(pending.rowCount) };
  }
  // Claim bounded work in the registry, then perform network I/O outside database locks.
  // Pending/ambiguous writes wait an hour so a late PUT cannot recreate an untracked object.
  async function cleanup(userId: string) {
    for (let i = 0; i < 3; i++) {
      let row: { id: string; pathname: string } | undefined;
      const client = await deps.pool.connect();
      try {
        await client.query("BEGIN");
        const candidates = await client.query<{ id: string; pathname: string }>(`SELECT id,pathname FROM community_profile_media
          WHERE user_id=$1 AND ((state IN ('pending','retired') AND delete_after<=clock_timestamp())
          OR (state='deleting' AND updated_at<clock_timestamp()-interval '1 hour'))
          ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`, [userId]);
        row = candidates.rows.at(0);
        if (row) {
          // A stale deletion is retried by its existing tombstone; no state mutation needed.
          await client.query("UPDATE community_profile_media SET state='deleting' WHERE id=$1 AND state IN ('pending','retired')", [row.id]);
        }
        await client.query("COMMIT");
      } catch (e) { await client.query("ROLLBACK").catch(() => {}); throw e; }
      finally { client.release(); }
      if (!row) break;
      try {
        await deps.storage.del(row.pathname);
        await deps.pool.query("DELETE FROM community_profile_media WHERE id=$1 AND user_id=$2 AND state='deleting'", [row.id, userId]);
      } catch {
        await deps.pool.query("UPDATE community_profile_media SET state='retired',delete_after=clock_timestamp()+interval '1 minute' WHERE id=$1 AND state='deleting'", [row.id]).catch(() => {});
        break;
      }
    }
  }
  async function transaction<T>(userId: string, action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await deps.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout='10s'");
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,8))", [`community-profile-media:${userId}`]);
      const result = await action(client);
      await client.query("COMMIT"); return result;
    } catch (e) { await client.query("ROLLBACK").catch(() => {}); throw e; }
    finally { client.release(); }
  }
  return async (action: ProfileMediaAction, request: Request, value?: string): Promise<Response> => {
    try {
      if (action === "metadata") {
        const params = new URL(request.url).searchParams;
        if (params.has("handle")) {
          if ([...params.keys()].length !== 1 || params.getAll("handle").length !== 1) throw new MediaError(404, "Profile not found.");
          const handle = profileHandleSchema.safeParse(params.get("handle"));
          if (!handle.success) throw new MediaError(404, "Profile not found.");
          const profile = await deps.pool.query("SELECT user_id FROM community_profile WHERE lower(handle)=$1 AND public_visibility=true", [handle.data]);
          if (!profile.rows[0]) throw new MediaError(404, "Profile not found.");
          return profileReply({ media: await media(profile.rows[0].user_id) });
        }
        if (params.size) throw new MediaError(400, "Invalid image request.");
      }
      const user = await deps.user(request);
      if (action === "image") {
        const id = z.uuid().safeParse(value);
        if (!id.success) throw new MediaError(404, "Image not found.");
        const { rows } = await deps.pool.query(`SELECT m.pathname FROM community_profile_media m
          JOIN community_profile p ON p.user_id=m.user_id WHERE m.id=$1 AND m.state='active'
          AND (p.public_visibility=true OR m.user_id=$2)`, [id.data, user?.id ?? null]);
        if (!rows[0]) throw new MediaError(404, "Image not found.");
        const body = await deps.storage.get(rows[0].pathname);
        if (!body) throw new MediaError(404, "Image not found.");
        return new Response(body, { headers: { ...profileHeaders, "Content-Type": "image/webp",
          "Content-Disposition": "inline; filename=profile.webp", "Cross-Origin-Resource-Policy": "same-origin",
          "Content-Security-Policy": "default-src 'none'; sandbox" } });
      }
      if (!user) throw new MediaError(401, "Sign in to manage profile images.");
      if (action === "metadata") return profileReply(await ownResult(user.id));
      if (user.emailVerified !== true) throw new MediaError(403, "Verify your email before changing profile images.");
      if (!deps.origin(request)) throw new MediaError(403, "Request origin rejected.");
      const kind = action === "cleanup" ? undefined : kindSchema.parse(value);
      const limit = await deps.pool.query<{ requests: number; uploads: number }>(`INSERT INTO community_profile_media_limit(user_id,minute_start,requests,day_start,uploads)
        VALUES($1,date_trunc('minute',clock_timestamp()),1,date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',$2)
        ON CONFLICT(user_id) DO UPDATE SET
        requests=CASE WHEN community_profile_media_limit.minute_start=date_trunc('minute',clock_timestamp()) THEN least(community_profile_media_limit.requests+1,6) ELSE 1 END,
        minute_start=date_trunc('minute',clock_timestamp()),
        uploads=CASE WHEN community_profile_media_limit.day_start=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
          THEN least(community_profile_media_limit.uploads+$2,21) ELSE $2 END,
        day_start=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' RETURNING requests,uploads`, [user.id, action === "upload" ? 1 : 0]);
      if (limit.rows[0].requests > policy.writesPerMinute || (action === "upload" && limit.rows[0].uploads > policy.uploadsPerDay)) {
        const r = profileReply({ error: "Profile image limit reached. Try again later." }, 429);
        r.headers.set("Retry-After", limit.rows[0].requests > policy.writesPerMinute ? "60" : "86400"); return r;
      }
      if (action === "cleanup") { await cleanup(user.id); return profileReply(await ownResult(user.id)); }
      if (action === "remove") {
        await transaction(user.id, async client => {
          // Cancel already-reserved uploads too. A late PUT must not resurrect a removed image.
          // Keep their original grace period because the storage operation may still finish.
          await client.query("UPDATE community_profile_media SET state='retired' WHERE user_id=$1 AND kind=$2 AND state='pending'", [user.id, kind]);
          await client.query("UPDATE community_profile_media SET state='retired',delete_after=clock_timestamp() WHERE user_id=$1 AND kind=$2 AND state='active'", [user.id, kind]);
        });
        await cleanup(user.id).catch(() => {});
        return profileReply(await ownResult(user.id));
      }
      const bytes = await readRequestBytes(request, policy[kind!].inputBytes, 5000);
      const output = await encodeProfileImage(bytes, kind!);
      await cleanup(user.id).catch(() => {});
      const id = randomUUID(), path = `community-profile-media/${id}.webp`;
      await transaction(user.id, async client => {
        if (!(await client.query("SELECT 1 FROM community_profile WHERE user_id=$1 FOR SHARE", [user.id])).rowCount)
          throw new MediaError(409, "Save your profile before adding images.");
        const count = await client.query("SELECT count(*)::int n FROM community_profile_media WHERE user_id=$1", [user.id]);
        if (count.rows[0].n >= policy.maxObjects) throw new MediaError(429, "Old images need cleanup before another upload.");
        await client.query("INSERT INTO community_profile_media(id,user_id,kind,pathname,bytes) VALUES($1,$2,$3,$4,$5)", [id, user.id, kind, path, output.byteLength]);
      });
      try { await deps.storage.put(path, output); }
      catch {
        // Retain a tombstone even if the SDK reports an ambiguous PUT failure.
        await deps.pool.query("UPDATE community_profile_media SET state='retired' WHERE id=$1 AND state='pending'", [id]).catch(() => {});
        throw new MediaError(503, "Profile images are temporarily unavailable. Your saved profile is unchanged.");
      }
      await transaction(user.id, async client => {
        const pending = await client.query("SELECT 1 FROM community_profile_media WHERE id=$1 AND user_id=$2 AND state='pending' FOR UPDATE", [id, user.id]);
        if (!pending.rowCount) throw new MediaError(409, "Image changed. Reload your profile images.");
        await client.query("UPDATE community_profile_media SET state='retired',delete_after=clock_timestamp() WHERE user_id=$1 AND kind=$2 AND state='active'", [user.id, kind]);
        await client.query("UPDATE community_profile_media SET state='active' WHERE id=$1 AND state='pending'", [id]);
      });
      await cleanup(user.id).catch(() => {});
      return profileReply(await ownResult(user.id), 201);
    } catch (e) {
      if (e instanceof MediaError) return profileReply({ error: e.message }, e.status);
      if (e instanceof z.ZodError || e instanceof InvalidProfileImage || e instanceof SyntaxError || e instanceof TypeError)
        return profileReply({ error: "Use a valid, single-frame PNG, JPEG or WebP image within the size and dimension limits." }, 400);
      if (e instanceof RangeError) return profileReply({ error: "Image exceeds the upload size limit." }, 413);
      if (e instanceof RequestBodyTimeoutError) return profileReply({ error: "Image upload timed out." }, 408);
      return profileReply({ error: "Profile images are temporarily unavailable." }, 503);
    }
  };
}
