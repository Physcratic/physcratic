import "server-only";
import type { Pool } from "pg";
import { z } from "zod";
import arena from "./arena/index.json";
import { favouriteCursorSchema, favouritePageSchema, favouritePageSize, favouriteReply } from "./favourite-history-contracts";
import { openCompletionCursor, sealCompletionCursor } from "./opaque-completion-cursor";
import { problemHref, problemKeySchema } from "./unified-arena";

type Dependencies = { pool: Pool; user: (request: Request) => Promise<{ id: string } | null | undefined>; cursorSecret?: string };
const querySchema = z.strictObject({ after: favouriteCursorSchema.optional() });
const positionSchema = z.tuple([problemKeySchema]);
const titles = new Map(arena.problems.map(p => [`arena:${p.id}`, p.title]));

export function createFavouriteHistoryApi(deps: Dependencies) {
  return async (request: Request) => {
    try {
      if (request.method !== "GET") return favouriteReply({ error: "Method not allowed." }, 405);
      const user = await deps.user(request);
      if (!user) return favouriteReply({ error: "Sign in to view your favourites." }, 401);
      if (request.headers.get("x-community-account") !== user.id)
        return favouriteReply({ error: "Your account changed. Reload before continuing." }, 409);
      const url = new URL(request.url);
      if (request.url.length > 1024 || [...url.searchParams.keys()].some(key => url.searchParams.getAll(key).length !== 1))
        return favouriteReply({ error: "Invalid favourites request." }, 400);
      const { after } = querySchema.parse(Object.fromEntries(url.searchParams));
      if (!deps.cursorSecret) throw Error("Favourite cursor configuration is missing");
      // The existing opaque envelope has a distinct favourite/account scope, so completion cursors cannot be replayed here.
      const key = after ? positionSchema.parse(openCompletionCursor(deps.cursorSecret, "ph1", ["favourites-v1", user.id], after))[0] : null;
      // Share the existing persistent 60/minute favourite bucket with desired-state writes. No new table or grant.
      const limitQuery = {
        text: `INSERT INTO community_favourite_limit(user_id,window_start,requests)
          SELECT u.id,date_trunc('minute',statement_timestamp()),1 FROM "user" u WHERE u.id=$1 FOR SHARE OF u
          ON CONFLICT(user_id) DO UPDATE SET window_start=greatest(community_favourite_limit.window_start,EXCLUDED.window_start),
            requests=CASE WHEN community_favourite_limit.window_start>=EXCLUDED.window_start
              THEN least(community_favourite_limit.requests+1,61) ELSE 1 END RETURNING requests`,
        values: [user.id], query_timeout: 5000,
      };
      const { rows: [bucket] } = await deps.pool.query<{ requests: number }>(limitQuery);
      if (!bucket) return favouriteReply({ error: "Sign in again to view favourites." }, 401);
      if (bucket.requests > 60) {
        const response = favouriteReply({ error: "Favourite request limit reached. Retry next minute." }, 429);
        response.headers.set("Retry-After", "60"); return response;
      }
      const client = await deps.pool.connect();
      try {
        await client.query("BEGIN READ ONLY; SET LOCAL statement_timeout='4s'; SET LOCAL lock_timeout='2s'");
        const pageQuery = {
          text: `SELECT f.problem_key,f.title
            FROM "user" u LEFT JOIN LATERAL (
              SELECT c.problem_key,coalesce(a.title,r.content->>'title') AS title FROM community_favourite c
              LEFT JOIN unnest($2::text[],$5::text[]) AS a(key,title) ON a.key=c.problem_key
              LEFT JOIN authored_problem p ON p.id=CASE WHEN c.problem_key LIKE 'authored:%' THEN substring(c.problem_key FROM 10)::uuid END
              LEFT JOIN authored_revision r ON p.state='published' AND r.id=p.published_revision_id AND r.problem_id=p.id AND r.schema_version=1
              WHERE c.user_id=u.id AND (a.key IS NOT NULL OR r.id IS NOT NULL) AND ($3::text IS NULL OR c.problem_key>$3)
              ORDER BY c.problem_key LIMIT $4
            ) f ON true
            WHERE u.id=$1 ORDER BY f.problem_key`,
          values: [user.id, [...titles.keys()], key, favouritePageSize + 1, [...titles.values()]], query_timeout: 5000,
        };
        const { rows } = await client.query<{ problem_key: string | null; title: string | null }>(pageQuery);
        if (!rows.length) { await client.query("COMMIT"); return favouriteReply({ error: "Sign in again to view favourites." }, 401); }
        const available = rows.filter(row => row.problem_key !== null);
        const items = available.slice(0, favouritePageSize).map(row => {
          const kind = row.problem_key!.startsWith("arena:") ? "arena" : "authored";
          return { key: row.problem_key!, title: row.title, href: problemHref({ kind, id: row.problem_key!.slice(kind.length + 1) }) };
        });
        const last = items.at(-1);
        const nextCursor = available.length > favouritePageSize && last
          ? sealCompletionCursor(deps.cursorSecret, "ph1", ["favourites-v1", user.id], [last.key]) : null;
        const result = favouritePageSchema.safeParse({ items, nextCursor });
        if (!result.success) throw Error("Invalid favourite projection");
        await client.query("COMMIT"); return favouriteReply(result.data);
      } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
      finally { client.release(); }
    } catch (error) {
      if (error instanceof z.ZodError) return favouriteReply({ error: "Invalid favourites cursor or request. Refresh your favourites." }, 400);
      return favouriteReply({ error: "Your favourites are temporarily unavailable." }, 503);
    }
  };
}
