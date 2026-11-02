import "server-only";
import type { Pool } from "pg";
import {
  authoredLibraryFiltersSchema,
  authoredLibraryPageSchema,
} from "./authored-library-contracts";
import { publicAuthoredMetadata } from "./problem-authoring";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};
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
      const { q, tag, difficulty, provenance, after } = parsed.data;
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
      if (after) where.push(`p.id > ${bind(after)}::uuid`);
      if (q)
        where.push(
          `authored_discovery_terms(r.content) @@ websearch_to_tsquery('simple'::regconfig, ${bind(q)})`,
        );
      if (tag) {
        const topic = bind(JSON.stringify({ topicTags: [tag] }));
        const method = bind(JSON.stringify({ methodTags: [tag] }));
        where.push(
          `(r.content @> ${topic}::jsonb OR r.content @> ${method}::jsonb)`,
        );
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
        text: `SELECT p.id AS "problemId",r.id AS "revisionId",
        jsonb_build_object('title',r.content->'title','topicTags',r.content->'topicTags',
          'methodTags',r.content->'methodTags','estimatedDifficulty',r.content->'estimatedDifficulty',
          'provenance',r.content->'provenance') AS metadata
        FROM authored_problem p JOIN authored_revision r ON r.id=p.published_revision_id
        WHERE ${where.join(" AND ")} ORDER BY p.id ASC LIMIT 25`,
        values,
        query_timeout: 5000,
      };
      const { rows } = await pool.query(query);
      const problems = rows.slice(0, 24).map((row) => ({
        problemId: row.problemId,
        revisionId: row.revisionId,
        ...publicAuthoredMetadata(row.metadata),
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
