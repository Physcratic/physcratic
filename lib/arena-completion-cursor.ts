import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { personalizedArenaCursorSchema, problemKeySchema, type ArenaFilters } from "./unified-arena";

const positionSchema = z.strictObject({
  key: problemKeySchema, rating: z.number().int().min(0).max(4000).nullable(),
  completed: z.boolean(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});
type Position = z.infer<typeof positionSchema>;
type Scope = { secret: string; account: string; filters: ArenaFilters };

export function protectCompletionFingerprint(scope: Scope, fingerprint: string) {
  return createHmac("sha256", scope.secret)
    .update(JSON.stringify(["arena-completion-set-v1", scope.account, fingerprint])).digest("hex");
}

function sign(scope: Scope, payload: string) {
  const { q, tag, difficulty, source } = scope.filters;
  return createHmac("sha256", scope.secret)
    .update(JSON.stringify(["arena-completions-v1", scope.account, q, tag, difficulty, source, payload]))
    .digest("base64url");
}

export function encodeArenaCompletionCursor(scope: Scope, position: Position) {
  const payload = Buffer.from(JSON.stringify(positionSchema.parse(position))).toString("base64url");
  return `pc1.${payload}.${sign(scope, payload)}`;
}

export function decodeArenaCompletionCursor(scope: Scope, cursor: string): Position | null {
  if (!personalizedArenaCursorSchema.safeParse(cursor).success) return null;
  const [, payload, signature] = cursor.split(".");
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(sign(scope, payload)))) return null;
  try {
    return positionSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}
