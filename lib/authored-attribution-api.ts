import "server-only";
import type { Pool } from "pg";
import { authoredAttributionSelectionSchema, authoredAttributionSchema, attributionReply, type AuthoredAttributionSelection } from "./authored-attribution-contracts";
export function createAuthoredAttributionApi(pool: Pool) {
  return async (selection: AuthoredAttributionSelection) => {
    try {
      const parsed = authoredAttributionSelectionSchema.safeParse(selection);
      if (!parsed.success) return attributionReply({ error: "Invalid attribution selection." }, 400);
      const { problemId, revisionId } = parsed.data;
      // One current-publication snapshot. Only the opted-in public name is selected.
      // Never join Better Auth identity or serialize the internal owner/profile row.
      const query = { text: `SELECT cp.display_name AS "displayName" FROM authored_problem p
        JOIN authored_revision r ON r.problem_id=p.id AND r.id=p.published_revision_id
        LEFT JOIN community_profile cp ON cp.user_id=p.owner_id AND cp.public_visibility=true
        WHERE p.id=$1 AND p.state='published' AND r.id=$2 LIMIT 1`, values: [problemId, revisionId], query_timeout: 5000 };
      const { rows } = await pool.query<{ displayName: string | null }>(query);
      if (!rows[0]) return attributionReply({ error: "Current publication not found." }, 404);
      const name = rows[0].displayName?.trim();
      return attributionReply(authoredAttributionSchema.parse({ problemId, revisionId, author: name ? { displayName: name } : null }));
    } catch { return attributionReply({ error: "Public attribution is unavailable." }, 503); }
  };
}
