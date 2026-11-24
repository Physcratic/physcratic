import "server-only";
import type { Pool } from "pg";
import {
  authoredLibraryFiltersSchema,
  authoredLibraryPageSchema,
  type AuthoredLibraryFilters,
  type AuthoredLibraryPage,
} from "./authored-library-contracts";
import { publicAuthoredMetadata } from "./problem-authoring";
import { authoredCardImage } from "./authored-card-image";
import { authoredLibraryTagPredicate } from "./authored-library-tags";
import type { CollectionCursor } from "./unified-arena";

type Queryable = Pick<Pool, "query">;
type PersonalOrder = { account: string; cursor?: CollectionCursor };
type LibraryProblem = AuthoredLibraryPage["problems"][number] & { completed?: true };

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};
// The author's difficulty rating as a number, or NULL when the label is not a whole number from 0 to 4000. It reads the
// label the way parseRating in lib/rating-bands.ts does: commas and spaces are dropped and a leading "~" is allowed.
// The nested CASE keeps the cast behind the digits test.
const ratingLabel = `regexp_replace(regexp_replace(coalesce(r.content->>'estimatedDifficulty',''),'[,[:space:]]','','g'),'^~','')`;
export const authoredRatingSql = `(CASE WHEN ${ratingLabel} ~ '^[0-9]{1,4}$' THEN CASE WHEN (${ratingLabel})::int <= 4000 THEN (${ratingLabel})::int END END)`;
/** The rating of one published problem, for placing a page cursor. `found` is false when it is not published. */
export async function authoredRating(pool: Queryable, problemId: string): Promise<{ found: boolean; rating: number | null }> {
  const query = {
    text: `SELECT ${authoredRatingSql} AS rating FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id
      WHERE p.id=$1::uuid AND r.problem_id=p.id AND p.state='published'`,
    values: [problemId],
    query_timeout: 5000,
  };
  const { rows } = await pool.query<{ rating: number | null }>(query);
  return rows.length ? { found: true, rating: rows[0].rating } : { found: false, rating: null };
}

/**
 * Which of these published problems may show an image. A problem removed by staff, or by an author who is restricted
 * (a banned author keeps their published problems), shows none. The restriction table may be missing or unreadable on an
 * older deployment, and then nothing can be checked, so no image is shown and the list itself still works.
 */
export async function imageAllowed(pool: Queryable, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  try {
    const query = {
      text: `SELECT p.id AS "problemId" FROM authored_problem p WHERE p.id=ANY($1::uuid[]) AND NOT EXISTS(
        SELECT 1 FROM community_restriction c WHERE c.restricted AND ((c.kind='problem' AND c.problem_id=p.id) OR (c.kind='user' AND c.user_id=p.owner_id)))`,
      values: [ids],
      query_timeout: 5000,
    };
    const { rows } = await pool.query<{ problemId: string }>(query);
    return new Set(rows.map((row) => row.problemId));
  } catch {
    return new Set();
  }
}

export async function readAuthoredLibrary(pool: Queryable, filters: AuthoredLibraryFilters, personal?: PersonalOrder) {
  const { q, tag, difficulty, provenance, after, sort, afterRating, minRating, ratingFrom, ratingBelow, unrated } = filters;
  const byRating = sort === "rating";
  const values: unknown[] = [];
  const bind = (v: unknown) => {
    values.push(v);
    return `$${values.length}`;
  };
  const where = [
    "p.state='published'",
    "r.problem_id=p.id",
    "r.id=p.published_revision_id",
  ];
  const completed = "(completion.problem_key IS NOT NULL)";
  const completionJoin = personal ? `LEFT JOIN personal_problem_completion completion
    ON completion.user_id=${bind(personal.account)} AND completion.problem_key='authored:'||p.id::text` : "";
  if (personal?.cursor) {
    const edge = personal.cursor;
    // 4001 encodes NULLS LAST. UUID order matches canonical lower-case ID order.
    where.push(`(${completed},coalesce(${authoredRatingSql},4001),1,p.id) >
      (${bind(edge.completed === true)}::boolean,${bind(edge.rating ?? 4001)}::int,
       ${bind(edge.kind === "arena" ? 0 : 1)}::int,${bind(edge.kind === "authored" ? edge.id : "00000000-0000-0000-0000-000000000000")}::uuid)`);
  } else if (byRating && after && afterRating === "unrated")
    where.push(`${authoredRatingSql} IS NULL AND p.id > ${bind(after)}::uuid`);
  else if (byRating && after && afterRating !== undefined) {
    const rating = bind(afterRating);
    where.push(`(${authoredRatingSql} > ${rating}::int OR (${authoredRatingSql} = ${rating}::int AND p.id > ${bind(after)}::uuid) OR ${authoredRatingSql} IS NULL)`);
  } else if (byRating && !after && minRating !== undefined)
    where.push(`(${authoredRatingSql} >= ${bind(minRating)}::int OR ${authoredRatingSql} IS NULL)`);
  else if (after) where.push(`p.id > ${bind(after)}::uuid`);
  if (q)
    where.push(
      `authored_discovery_terms(r.content) @@ websearch_to_tsquery('simple'::regconfig, ${bind(q)})`,
    );
  if (tag) {
    where.push(authoredLibraryTagPredicate(tag, bind));
  }
  if (difficulty)
    where.push(`r.content->>'estimatedDifficulty' = ${bind(difficulty)}`);
  if (unrated) where.push(`${authoredRatingSql} IS NULL`);
  if (ratingFrom !== undefined) where.push(`${authoredRatingSql} >= ${bind(ratingFrom)}::int`);
  if (ratingBelow !== undefined) where.push(`${authoredRatingSql} < ${bind(ratingBelow)}::int`);
  if (provenance)
    where.push(
      `r.content @> ${bind(JSON.stringify({ provenance: { kind: provenance } }))}::jsonb`,
    );
  // One MVCC snapshot, exact current same-problem pointer. Never join drafts,
  // private parts, permission/reveal/attempt tables, or project full documents.
  const whereSql = where.join(" AND ");
  // With personalized ordering, choose at most 25 current publications before projecting images or metadata.
  const bounded = personal ? `WITH chosen AS MATERIALIZED (
    SELECT p.id,r.id AS revision_id,${authoredRatingSql} AS rating,${completed} AS completed
    FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id
    ${completionJoin}
    WHERE ${whereSql} ORDER BY completed,rating ASC NULLS LAST,p.id LIMIT 25
  )` : "";
  const query = {
    text: `${bounded} SELECT p.id AS "problemId",r.id AS "revisionId",${personal ? "p.rating,p.completed," : byRating ? `${authoredRatingSql} AS rating,` : ""}
    jsonb_build_object('title',r.content->'title','topicTags',r.content->'topicTags',
      'methodTags',r.content->'methodTags','estimatedDifficulty',r.content->'estimatedDifficulty',
      'provenance',r.content->'provenance') AS metadata
    ,img.alt AS "imageAlt",
    (img.media_id IS NOT NULL AND EXISTS(SELECT 1 FROM author_revision_media rm
      JOIN author_media m ON m.id=rm.media_id AND m.problem_id=rm.problem_id AND m.purpose=rm.purpose
      WHERE rm.revision_id=r.id AND rm.problem_id=p.id AND rm.purpose='statement-image' AND m.state='ready'
      AND rm.media_id::text=lower(img.media_id))) AS "imageLinked"
    FROM ${personal ? "chosen p JOIN authored_revision r ON r.id=p.revision_id" :
      "authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id"}
    LEFT JOIN LATERAL (
      -- The first image block of this published revision's public content, in reading order: the context, then each
      -- section's blocks, then each part's blocks. Private parts, hints and solutions are not part of r.content.
      SELECT k.blk->>'mediaId' AS media_id,btrim(k.blk->>'alt') AS alt FROM (
        SELECT ARRAY[0,0,0,c.ord::int] AS ord,c.blk FROM jsonb_array_elements(coalesce(r.content->'context','[]'::jsonb)) WITH ORDINALITY c(blk,ord)
        UNION ALL
        SELECT ARRAY[1,s.ord::int,0,b.ord::int],b.blk FROM jsonb_array_elements(coalesce(r.content->'sections','[]'::jsonb)) WITH ORDINALITY s(sec,ord)
          CROSS JOIN LATERAL jsonb_array_elements(coalesce(s.sec->'blocks','[]'::jsonb)) WITH ORDINALITY b(blk,ord)
        UNION ALL
        SELECT ARRAY[1,s.ord::int,q.ord::int,b.ord::int],b.blk FROM jsonb_array_elements(coalesce(r.content->'sections','[]'::jsonb)) WITH ORDINALITY s(sec,ord)
          CROSS JOIN LATERAL jsonb_array_elements(coalesce(s.sec->'parts','[]'::jsonb)) WITH ORDINALITY q(part,ord)
          CROSS JOIN LATERAL jsonb_array_elements(coalesce(q.part->'blocks','[]'::jsonb)) WITH ORDINALITY b(blk,ord)
      ) k WHERE k.blk->>'kind'='image' ORDER BY k.ord LIMIT 1
    ) img ON true
    ${personal ? "ORDER BY p.completed,p.rating ASC NULLS LAST,p.id" :
      `WHERE ${whereSql} ORDER BY ${byRating ? `${authoredRatingSql} ASC NULLS LAST,` : ""}p.id ASC LIMIT 25`}`,
    values,
    query_timeout: 5000,
  };
  const { rows } = await pool.query(query);
  const page = rows.slice(0, 24);
  const withImage = await imageAllowed(pool, page.filter((row) => row.imageLinked && row.imageAlt?.trim()).map((row) => row.problemId));
  const problems: LibraryProblem[] = page.map((row) => {
    const image = withImage.has(row.problemId) ? authoredCardImage(row.problemId, row.revisionId, row.imageAlt) : undefined;
    return {
      problemId: row.problemId,
      revisionId: row.revisionId,
      ...publicAuthoredMetadata(row.metadata),
      ...(byRating ? { rating: row.rating as number | null } : {}),
      ...(image ? { image } : {}),
      ...(row.completed === true ? { completed: true as const } : {}),
    };
  });
  return { problems, nextCursor: rows.length > 24 ? problems.at(-1)!.problemId : null };
}

export function createAuthoredLibraryApi(pool: Pool) {
  return async (request: Request): Promise<Response> => {
    try {
      const params = new URL(request.url).searchParams;
      if (
        request.url.length > 4096 ||
        [...params.keys()].some((k) => params.getAll(k).length !== 1)
      )
        return Response.json(
          { error: "Invalid library filters." },
          { status: 400, headers },
        );
      const parsed = authoredLibraryFiltersSchema.safeParse(
        Object.fromEntries(params),
      );
      if (!parsed.success)
        return Response.json(
          { error: "Invalid library filters." },
          { status: 400, headers },
        );
      const page = await readAuthoredLibrary(pool, parsed.data);
      return Response.json(authoredLibraryPageSchema.parse(page), { headers });
    } catch {
      return Response.json(
        { error: "The problem library is temporarily unavailable." },
        { status: 503, headers },
      );
    }
  };
}
