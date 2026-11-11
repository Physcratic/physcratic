import "server-only";
import type { Pool } from "pg";
import { problemProgressEntrySchema } from "./problem-progress-contracts";

/** Only the signed-in student's attempts and currently published titles. No private keys or withdrawn content. */
export async function readAuthoredProgress(pool: Pick<Pool, "query">, userId: string) {
  const query = { text: `WITH mine AS MATERIALIZED (
    SELECT problem_id,revision_id,part_id,bool_or(status='correct') AS correct,
      bool_or(status='incorrect') AS incorrect,max(created_at) AS latest,count(*) AS checks
    FROM authored_attempt WHERE user_id=$1 GROUP BY problem_id,revision_id,part_id
  ), current AS (
    SELECT p.id,r.id AS revision_id,r.content->>'title' AS title,
      count(*) FILTER (WHERE rp.answer_mode<>'manual')::int AS required,
      count(*) FILTER (WHERE rp.answer_mode<>'manual' AND m.correct)::int AS correct,
      count(*) FILTER (WHERE rp.answer_mode<>'manual' AND NOT m.correct AND m.incorrect)::int AS incorrect,
      max(m.latest) AS latest
    FROM authored_problem p JOIN authored_revision r ON r.problem_id=p.id AND r.id=p.published_revision_id
    JOIN authored_revision_part rp ON rp.revision_id=r.id
    LEFT JOIN mine m ON m.problem_id=p.id AND m.revision_id=r.id AND m.part_id=rp.part_id
    WHERE p.state='published' AND r.schema_version=1
    GROUP BY p.id,r.id HAVING max(m.latest) IS NOT NULL
    ORDER BY max(m.latest) DESC,p.id LIMIT 1001
  ) SELECT c.*, (SELECT coalesce(sum(checks),0)::text FROM mine) AS saved_checks
    FROM (SELECT 1) seed LEFT JOIN current c ON true`, values: [userId], query_timeout: 5000 };
  const { rows } = await pool.query<{ id: string | null; revision_id: string; title: string; required: number; correct: number; incorrect: number; latest: Date; saved_checks: string }>(query);
  if (rows.filter(r => r.id).length > 1000) throw Error("Community progress exceeds its bound");
  const progress = rows.filter(r => r.id).map(r => problemProgressEntrySchema.parse({
    kind: "authored", problemId: r.id, version: r.revision_id, title: r.title, href: `/dashboard/authored/${r.id}`,
    status: r.required > 0 && r.correct === r.required ? "solved" : r.correct + r.incorrect > 0 ? "in-progress" : "not-graded",
    correctParts: r.correct, requiredParts: r.required, incorrectParts: r.incorrect, lastCheckedAt: r.latest.toISOString(),
  }));
  return { progress, savedChecks: Number(rows[0]?.saved_checks ?? 0) };
}
