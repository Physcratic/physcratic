import { publicProfileDisplayName, publicProfileEligible } from "./community/profile-publication";
import "server-only";
import type { Pool } from "pg";
import { authoredAttributionSelectionSchema, authoredAttributionSchema, attributionReply, type AuthoredAttributionSelection } from "./authored-attribution-contracts";
export function createAuthoredAttributionApi(pool: Pool, publicNamesEnabled: () => boolean = () => true) {
  return async (selection: AuthoredAttributionSelection) => {
    try {
      const parsed = authoredAttributionSelectionSchema.safeParse(selection);
      if (!parsed.success) return attributionReply({ error: "Invalid attribution selection." }, 400);
      const { problemId, revisionId } = parsed.data;
      // One current-publication snapshot for the opted-in public name and handle.
      // Never join Better Auth identity or serialize the internal owner/profile row.
      const namesEnabled = publicNamesEnabled();
      const query = { text: `SELECT p.owner_id='__physcratic_deleted_principal_v1__' AS deleted,
        ${namesEnabled ? 'cp.handle' : 'NULL'} AS handle,
        ${namesEnabled ? publicProfileDisplayName("cp") : 'NULL'} AS "displayName"
        FROM authored_problem p
        JOIN authored_revision r ON r.problem_id=p.id AND r.id=p.published_revision_id
        ${namesEnabled ? `LEFT JOIN community_profile cp ON cp.user_id=p.owner_id AND ${publicProfileEligible("cp")}` : ''}
        WHERE p.id=$1 AND p.state='published' AND r.id=$2 LIMIT 1`, values: [problemId, revisionId], query_timeout: 5000 };
      const { rows: [row] } = await pool.query<{ deleted: boolean; handle: string | null; displayName: string | null }>(query);
      if (!row) return attributionReply({ error: "Current publication not found." }, 404);
      const author = row.deleted ? { displayName: "Deleted user" }
        : row.handle ? { handle: row.handle, displayName: row.displayName?.trim() || row.handle } : null;
      return attributionReply(authoredAttributionSchema.parse({ problemId, revisionId, author }));
    } catch { return attributionReply({ error: "Public attribution is unavailable." }, 503); }
  };
}
