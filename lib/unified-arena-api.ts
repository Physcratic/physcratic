import "server-only";
import type { Pool } from "pg";
import { approvedMedalSource } from "./community/external-medals";
import arena from "./arena/index.json";
import { authoredRating, readAuthoredLibrary } from "./authored-library-api";
import { authoredLibraryFiltersSchema } from "./authored-library-contracts";
import { decodeArenaCompletionCursor, encodeArenaCompletionCursor, protectCompletionFingerprint } from "./arena-completion-cursor";
import { arenaFiltersSchema, compareArenaOrder, personalArenaFiltersSchema, staticArenaEntries, unifiedArenaPageSchema,
  type ArenaFilters, type CollectionCursor, type CollectionEntry } from "./unified-arena";
import { getEstimatedProblemElo } from "./problem-archive";
import { bandRange } from "./rating-bands";
import { publicProfileDisplayName, publicProfileEligible } from "./community/profile-publication";
import { achievementEligible, achievementIdSchema, type PublicMedal } from "./community/achievements";

const headers = {"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff"};
const staticKeys = arena.problems.map(problem => `arena:${problem.id}`);
type Flags = { authors: boolean; badges: boolean; medals: boolean; externalMedals?: boolean; stats?: boolean };
type SessionGate = { enabled: () => boolean; secret: () => string | undefined; user: (request: Request) => Promise<{ id: string } | null | undefined> };

function libraryFilters(filters: ArenaFilters, cursor?: CollectionCursor) {
  const range = bandRange(filters.difficulty);
  return authoredLibraryFiltersSchema.parse({
    q: filters.q, tag: filters.tag, sort: "rating",
    ...(filters.difficulty === "unrated" ? { unrated: "1" } : {}),
    ...(range ? { ratingFrom: Math.min(range[0],4000),
      ...(Number.isFinite(range[1]) ? { ratingBelow: Math.min(range[1],4001) } : {}) } : {}),
    ...(cursor?.kind === "authored" ? { after: cursor.id, afterRating: cursor.rating ?? "unrated" }
      : cursor?.rating != null ? { minRating: cursor.rating } : {}),
  });
}

type AuthoredPage = Awaited<ReturnType<typeof readAuthoredLibrary>>;
function combine(statics: CollectionEntry[], authored?: AuthoredPage) {
  const rows: { entry: CollectionEntry; rank: CollectionCursor }[] = statics.map(entry => ({
    entry, rank: { kind: "arena", id: entry.id, rating: entry.elo ?? null, completed: entry.completed },
  }));
  for (const v of authored?.problems ?? []) {
    const entry: CollectionEntry = {
      key: `authored:${v.problemId}`, kind: "authored", id: v.problemId, title: v.title,
      tags: [...new Set([...v.topicTags,...v.methodTags])], summary: "Published community problem",
      estimatedDifficulty: v.estimatedDifficulty, provenance: v.provenance, author: null,
      ...(v.image ? { image: v.image } : {}), ...(v.completed ? { completed: true } : {}),
    };
    rows.push({ entry, rank: { kind: "authored", id: v.problemId, rating: v.rating ?? null, completed: v.completed } });
  }
  rows.sort((a,b) => compareArenaOrder(a.rank,b.rank));
  const page = rows.slice(0,24);
  return { problems: page.map(row => row.entry), next: rows.length > 24 || authored?.nextCursor ? page.at(-1) : undefined };
}

async function ordinaryPage(pool: Pool, f: ArenaFilters, includeAuthored: boolean) {
  let cursor: CollectionCursor | undefined;
  if (f.after?.startsWith("arena:")) {
    const id = f.after.slice(6);
    cursor = { kind: "arena", id, rating: getEstimatedProblemElo(id) };
  } else if (f.after) {
    const id = f.after.slice(9).toLowerCase();
    try {
      cursor = { kind: "authored", id, rating: (await authoredRating(pool,id)).rating };
    } catch {
      return { problems: [], nextCursor: null, authoredUnavailable: includeAuthored };
    }
  }

  let authored: AuthoredPage | undefined;
  if (includeAuthored) {
    try {
      authored = await readAuthoredLibrary(pool,libraryFilters(f,cursor));
    } catch { /* Existing public browsing can continue with the static source. */ }
  }
  const { problems, next } = combine(staticArenaEntries(f,cursor),authored);
  return { problems, nextCursor: next?.entry.key ?? null, authoredUnavailable: includeAuthored && !authored };
}

async function personalizedPage(pool: Pool, scope: Parameters<typeof encodeArenaCompletionCursor>[0],
  cursor: ReturnType<typeof decodeArenaCompletionCursor>, includeAuthored: boolean) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='5s'");
    // Only the account's index range contributes to the digest. The returned membership array is bounded by the static catalogue.
    const membership = {
      text: `SELECT membership.* FROM "user" u CROSS JOIN (
        SELECT encode(sha256(convert_to(coalesce(string_agg(problem_key,',' ORDER BY problem_key COLLATE "C"),''),'UTF8')),'hex') AS fingerprint,
          coalesce(array_agg(problem_key) FILTER (WHERE problem_key=ANY($2::text[])), '{}') AS statics
        FROM personal_problem_completion WHERE user_id=$1
      ) membership WHERE u.id=$1`,
      values: [scope.account, staticKeys], query_timeout: 5000,
    };
    const { rows: [owner] } = await client.query<{ fingerprint: string; statics: string[] }>(membership);
    if (!owner) return { error: "ACCOUNT_CHANGED" } as const;
    const fingerprint = protectCompletionFingerprint(scope,owner.fingerprint);
    const f = scope.filters;
    if ((f.after && !cursor) || (cursor && cursor.fingerprint !== fingerprint))
      return { error: "COMPLETION_ORDER_CHANGED" } as const;

    let after: CollectionCursor | undefined;
    if (cursor?.key.startsWith("arena:")) {
      const id = cursor.key.slice(6);
      if (getEstimatedProblemElo(id) !== cursor.rating) return { error: "COMPLETION_ORDER_CHANGED" } as const;
      after = { kind: "arena", id, rating: cursor.rating, completed: cursor.completed };
    } else if (cursor) {
      const id = cursor.key.slice(9);
      const anchor = await authoredRating(client,id);
      if (!anchor.found || anchor.rating !== cursor.rating) return { error: "COMPLETION_ORDER_CHANGED" } as const;
      after = { kind: "authored", id, rating: cursor.rating, completed: cursor.completed };
    }
    const statics = staticArenaEntries(f,after,new Set(owner.statics));
    const authored = includeAuthored ? await readAuthoredLibrary(client,libraryFilters(f),{account:scope.account,cursor:after}) : undefined;
    const { problems,next } = combine(statics,authored);
    return { problems, nextCursor: next ? encodeArenaCompletionCursor(scope,{
      key: next.entry.key, rating: next.rank.rating, completed: next.rank.completed === true, fingerprint,
    }) : null, authoredUnavailable: false };
  } finally {
    // Every statement is read-only, including successful pages. Rollback also clears failed optional image checks.
    try { await client.query("ROLLBACK"); client.release(); }
    catch { client.release(true); }
  }
}

async function enrichAuthors(pool: Pool, problems: CollectionEntry[], enabled: Flags) {
 const entries = problems.filter(e=>e.kind==="authored");
  if (enabled.authors && entries.length) {
   try{
    // At most 24 publications, one batched snapshot. Never expose Better Auth identity.
    // MATERIALIZED deduplicates authors before bounded achievement progress work.
    const medalSource=approvedMedalSource(enabled.medals,enabled.externalMedals===true);
    const authorQuery={text:`WITH visible AS MATERIALIZED (
      SELECT p.id,cp.user_id,cp.handle,${publicProfileDisplayName("cp")} AS display_name FROM authored_problem p
      JOIN community_profile cp ON cp.user_id=p.owner_id AND ${publicProfileEligible("cp")}
      WHERE p.id=ANY($1::uuid[]) AND p.state='published'
    ), authors AS MATERIALIZED (SELECT DISTINCT user_id,handle,display_name FROM visible),
    badges AS MATERIALIZED (SELECT a.user_id,${enabled.badges||medalSource?"coalesce(s.badge_ids,'{}'::text[])":"'{}'::text[]"} AS ids,
     ${enabled.badges?"g.author_count,g.solve_count":"0 AS author_count,NULL::integer AS solve_count"}
     FROM authors a ${enabled.badges||medalSource?"LEFT JOIN community_badge_selection s ON s.user_id=a.user_id":""}
     ${enabled.badges?"LEFT JOIN LATERAL community_achievement_progress(a.user_id) g ON cardinality(s.badge_ids)>0":""})
    SELECT v.id,v.handle,v.display_name AS "displayName",b.ids,b.author_count AS author,b.solve_count AS solver,
    ${medalSource?`coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'competition',m.competition,'award',m.award,'year',m.year,'country',m.country,'competitionName',m."competitionName")) FROM ${medalSource} m WHERE m.user_id=v.user_id AND m.id=ANY(b.ids)),'[]'::jsonb)`:"'[]'::jsonb"} AS medals
    FROM visible v JOIN badges b ON b.user_id=v.user_id`,values:[entries.map(e=>e.id)],query_timeout:5000};
    const {rows}=await pool.query<{id:string;handle:string;displayName:string;ids:string[];author:number;solver:number|null;medals:PublicMedal[]}>(authorQuery);
    const byId=new Map(rows.map(r=>[r.id,r]));
    for(const entry of entries){const a=byId.get(entry.id);if(a){const medals:PublicMedal[]=a.medals;entry.author={handle:a.handle,displayName:a.displayName,selectedIds:a.ids.filter((id:string)=>{const earned=achievementIdSchema.safeParse(id);return earned.success?enabled.badges&&achievementEligible(earned.data,{author:a.author??0,solver:a.solver}):medals.some(m=>m.id===id);}),medals};}}
   }catch{return false;}
  }
 return true;
}

export function createUnifiedArenaApi(pool: Pool, flags: () => Flags = () => ({ authors:false,badges:false,medals:false }), gate?: SessionGate) {
  return async (request: Request) => {
    const enabled = gate?.enabled() === true;
    const responseHeaders = enabled ? { ...headers, Vary:"Cookie, X-Community-Account" } : headers;
    const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: responseHeaders });
    try {
      const params = new URL(request.url).searchParams;
      if (request.url.length > 4096 || [...params.keys()].some(k => params.getAll(k).length !== 1))
        return reply({error:"Invalid collection filters."},400);
      const parsed = (enabled ? personalArenaFiltersSchema : arenaFiltersSchema).safeParse(Object.fromEntries(params));
      if (!parsed.success) return reply({error:"Invalid collection filters."},400);
      const f = parsed.data;
      const includeAuthored = f.source !== "arena" && (f.difficulty === "all" || f.difficulty === "unrated" || bandRange(f.difficulty) !== null);
      const account = enabled ? request.headers.get("x-community-account") : null;
      const privateCursor = f.after?.startsWith("pc1.") === true;
      let personalization: "active" | "unavailable" | undefined;
      let page: Awaited<ReturnType<typeof ordinaryPage>> | undefined;
      if (account !== null && gate) {
        const session = await gate.user(request);
        if (!session || session.id !== account) return reply({code:"ACCOUNT_CHANGED"},409);
        const secret = gate.secret();
        if (secret) {
          const scope = { account: session.id, filters: f, secret };
          const cursor = privateCursor ? decodeArenaCompletionCursor(scope,f.after!) : null;
          if (privateCursor && !cursor) return reply({error:"Invalid collection cursor."},400);
          let ordered;
          try { ordered = await personalizedPage(pool,scope,cursor,includeAuthored); }
          catch { /* Reuse ordinary browsing with an explicit unavailable state. */ }
          if (ordered && "error" in ordered) return reply({code:ordered.error},409);
          if (ordered) { page = ordered; personalization = "active"; }
        }
        if (!page) {
          if (privateCursor) return reply({code:"COMPLETION_ORDER_CHANGED"},409);
          personalization = "unavailable";
        }
      } else if (privateCursor) {
        return reply({error:"Invalid collection cursor."},400);
      }
      page ??= await ordinaryPage(pool,f,includeAuthored);
      const presentation = flags();
      const attributionUnavailable = !await enrichAuthors(pool,page.problems,presentation);
      return reply(unifiedArenaPageSchema.parse({ ...page, attributionUnavailable,
        ...(presentation.stats ? {statsEnabled:true} : {}), ...(personalization ? {personalization} : {}),
      }));
    } catch {
      return reply({error:"The collection is temporarily unavailable."},503);
    }
  };
}
