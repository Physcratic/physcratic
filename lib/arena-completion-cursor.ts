import "server-only";
import { z } from "zod";
import { openCompletionCursor, sealCompletionCursor } from "./opaque-completion-cursor";
import { personalizedArenaCursorSchema, problemKeySchema, type ArenaFilters } from "./unified-arena";

const positionSchema = z.strictObject({
  key: problemKeySchema, rating: z.number().int().min(0).max(4000).nullable(),
  completed: z.boolean(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});
type Position = z.infer<typeof positionSchema>;
type Scope = { secret: string; account: string; filters: ArenaFilters };

function binding({ account, filters: { q, tag, difficulty, source } }: Scope) {
  return [account, q, tag, difficulty, source];
}

export function encodeArenaCompletionCursor(scope: Scope, position: Position) {
  return sealCompletionCursor(scope.secret, "pc2", binding(scope), positionSchema.parse(position));
}

export function decodeArenaCompletionCursor(scope: Scope, cursor: string): Position | null {
  if (!personalizedArenaCursorSchema.safeParse(cursor).success) return null;
  const position = positionSchema.safeParse(openCompletionCursor(scope.secret, "pc2", binding(scope), cursor));
  return position.success ? position.data : null;
}
