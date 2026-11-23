/**
 * The My drafts list is ordered by last edited, newest first, with the draft id as the tiebreak.
 * The page cursor carries both values, so the next page continues exactly where the last one stopped
 * even when two drafts were saved at the same moment. The time keeps its microseconds, because a
 * millisecond timestamp could repeat or skip a draft at a page edge.
 */
export type DraftCursor = { updatedAt: string; problemId: string };

const cursorPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z)~([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function encodeDraftCursor({ updatedAt, problemId }: DraftCursor): string {
  return `${updatedAt}~${problemId}`;
}

/** The cursor from a page request, or null when the value is not one this list produced. */
export function parseDraftCursor(value: string): DraftCursor | null {
  const match = cursorPattern.exec(value);
  return match ? { updatedAt: match[1], problemId: match[2].toLowerCase() } : null;
}
