import type { PoolClient } from "pg";
import type { AuthoredDocument, PrivatePart } from "./problem-authoring";
import { collectAuthorMedia } from "./author-media";
export class MediaReferenceError extends Error {}
export async function replaceDraftMedia(
  client: PoolClient,
  problemId: string,
  ownerId: string,
  content: AuthoredDocument,
  keys: PrivatePart[],
) {
  let refs;
  try {
    refs = collectAuthorMedia(content, keys);
  } catch {
    throw new MediaReferenceError(
      "A file cannot be shared between private and statement scopes.",
    );
  }
  if (refs.length) {
    const { rows } = await client.query<{
      id: string;
      purpose: string;
      state: string;
    }>(
      `SELECT m.id,m.purpose,m.state FROM author_media m JOIN authored_problem p ON p.id=m.problem_id
      WHERE m.problem_id=$1 AND p.owner_id=$2 AND m.id=ANY($3::uuid[]) ORDER BY m.id FOR UPDATE OF m`,
      [problemId, ownerId, refs.map((r) => r.id)],
    );
    if (
      rows.length !== refs.length ||
      refs.some(
        (ref) =>
          !rows.some(
            (row) =>
              row.id === ref.id &&
              row.purpose === ref.purpose &&
              row.state === "ready",
          ),
      )
    )
      throw new MediaReferenceError(
        "A file is unavailable, belongs to another problem, or has the wrong visibility purpose.",
      );
  }
  await client.query("DELETE FROM author_draft_media WHERE problem_id=$1", [
    problemId,
  ]);
  for (const ref of refs)
    await client.query(
      "INSERT INTO author_draft_media(problem_id,media_id,purpose) VALUES($1,$2,$3)",
      [problemId, ref.id, ref.purpose],
    );
  return refs;
}
