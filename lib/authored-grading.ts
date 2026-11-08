import "server-only";
import type { Pool } from "pg";
import { authoredKeySchema } from "./problem-authoring";
import {
  authoredGradeInputSchema,
  type AuthoredGradeResult,
  type GradeEvaluation,
  type GradeSelection,
} from "./authored-grading-contracts";
import { evaluateExpressionAnswer } from "./authored-symbolic-grading";
import { evaluateNumericAnswer } from "./authored-numeric-grading";

type Dependencies = {
  pool: Pick<Pool, "query">;
  // Trusted server-session adapter, never a field in the submitted answer.
  user: () => Promise<
    { id: string; emailVerified?: boolean } | null | undefined
  >;
};
export function createAuthoredGrader(deps: Dependencies) {
  return async function grade(input: unknown): Promise<AuthoredGradeResult> {
    let selection: GradeSelection | null = null;
    let engineVersion: AuthoredGradeResult["engineVersion"] = "numeric-v1";
    const result = (evaluation: GradeEvaluation): AuthoredGradeResult => ({
      ...evaluation,
      engineVersion,
      selection,
    });
    try {
      const parsed = authoredGradeInputSchema.safeParse(input);
      if (!parsed.success)
        return result({ status: "ungraded", reason: "invalid-input" });
      const { answer, ...ids } = parsed.data;
      selection = ids;
      const user = await deps.user();
      if (!user || user.emailVerified !== true)
        return result({ status: "ungraded", reason: "not-authorized" });
      // One indexed, bounded read: authorization and exact immutable key selection
      // share a PostgreSQL statement snapshot. Never fall back to draft/current keys.
      const query = {
        text: `SELECT r.schema_version,rp.answer_mode,k.answer_mode AS private_mode,
          k.data->>'partId' AS private_part_id,k.data->'key' AS key
          FROM authored_problem p
          JOIN authored_revision r ON r.problem_id=p.id AND r.id=$2
          JOIN authored_revision_part rp ON rp.revision_id=r.id AND rp.part_id=$3
          LEFT JOIN authored_revision_private_part k ON k.revision_id=rp.revision_id AND k.part_id=rp.part_id
          WHERE p.id=$1 AND (p.owner_id=$4 OR (p.state='published' AND p.published_revision_id IS NOT NULL)) LIMIT 1`,
        values: [ids.problemId, ids.revisionId, ids.partId, user.id],
        query_timeout: 5000,
      };
      const { rows } = await deps.pool.query(query);
      const row = rows[0];
      if (!row)
        return result({ status: "ungraded", reason: "revision-unavailable" });
      const key = authoredKeySchema.safeParse(row.key);
      if (
        row.schema_version !== 1 ||
        row.private_part_id !== ids.partId ||
        row.private_mode !== row.answer_mode ||
        !key.success ||
        key.data.kind !== row.answer_mode
      )
        return result({ status: "needs-review", reason: "key-unavailable" });
      if (key.data.kind === "manual")
        return result({ status: "ungraded", reason: "manual" });
      if (key.data.kind === "expression" && answer.kind === "expression") {
        engineVersion = "symbolic-v1";
        return result(evaluateExpressionAnswer(answer, key.data, `${ids.problemId}:${ids.partId}`));
      }
      if (key.data.kind !== "numeric" || answer.kind !== "numeric")
        return result({
          status: "needs-review",
          reason: "answer-mode-unsupported",
        });
      return result(evaluateNumericAnswer(answer, key.data));
    } catch {
      // Never forward DB/Zod messages, submitted text, private keys or tolerances.
      return result({ status: "needs-review", reason: "service-unavailable" });
    }
  };
}
