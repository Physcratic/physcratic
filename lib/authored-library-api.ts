import "server-only";
import type { Pool } from "pg";
import {
  authoredLibraryFiltersSchema,
  authoredLibraryPageSchema,
} from "./authored-library-contracts";
import { publicAuthoredMetadata } from "./problem-authoring";
import { authoredLibraryTagPredicate } from "./authored-library-tags";

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
export async function authoredRating(pool: Pool, problemId: string): Promise<{ found: boolean; rating: number | null }> {
  const query = {
    text: `SELECT ${authoredRatingSql} AS rating FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id
      WHERE p.id=$1::uuid AND p.state='published'`,
    values: [problemId],
    query_timeout: 5000,
  };
  const { rows } = await pool.query<{ rating: number | null }>(query);
  return rows.length ? { found: true, rating: rows[0].rating } : { found: false, rating: null };
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
      const { q, tag, difficulty, provenance, after, sort, afterRating, minRating } = parsed.data;
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
      if (byRating && after && afterRating === "unrated")
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
      if (provenance)
        where.push(
          `r.content @> ${bind(JSON.stringify({ provenance: { kind: provenance } }))}::jsonb`,
        );
      // One MVCC snapshot, exact current same-problem pointer. Never join drafts,
      // private parts, permission/reveal/attempt tables, or project full documents.
      const query = {
        text: `SELECT p.id AS "problemId",r.id AS "revisionId",${byRating ? `${authoredRatingSql} AS rating,` : ""}
        jsonb_build_object('title',r.content->'title','topicTags',r.content->'topicTags',
          'methodTags',r.content->'methodTags','estimatedDifficulty',r.content->'estimatedDifficulty',
          'provenance',r.content->'provenance') AS metadata
        FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id
        WHERE ${where.join(" AND ")} ORDER BY ${byRating ? `${authoredRatingSql} ASC NULLS LAST,` : ""}p.id ASC LIMIT 25`,
        values,
        query_timeout: 5000,
      };
      const { rows } = await pool.query(query);
      const problems = rows.slice(0, 24).map((row) => ({
        problemId: row.problemId,
        revisionId: row.revisionId,
        ...publicAuthoredMetadata(row.metadata),
        ...(byRating ? { rating: row.rating as number | null } : {}),
      }));
      return Response.json(
        authoredLibraryPageSchema.parse({
          problems,
          nextCursor: rows.length > 24 ? problems.at(-1)!.problemId : null,
        }),
        { headers },
      );
    } catch {
      return Response.json(
        { error: "The problem library is temporarily unavailable." },
        { status: 503, headers },
      );
    }
  };
}
