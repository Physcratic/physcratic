import { z } from "zod";
import type { ProblemKey } from "./unified-arena";

// Shape validation also accepts retired Arena keys so owners can remove old marks.
// Marking and status reads separately check the current public catalogue.
export const completionKeySchema = z.string().max(128).refine(key =>
  /^arena:arena-[a-z0-9]+(-[a-z0-9]+)*$/.test(key)
  || (key.startsWith("authored:") && z.uuid().safeParse(key.slice(9)).success)
).transform(key => key.toLowerCase() as ProblemKey);

export const completionWriteSchema = z.strictObject({ key: completionKeySchema, completed: z.boolean() });
export const completionStatusSchema = z.discriminatedUnion("completed", [
  z.strictObject({ key: completionKeySchema, completed: z.literal(true), completedAt: z.iso.datetime() }),
  z.strictObject({ key: completionKeySchema, completed: z.literal(false), completedAt: z.null() }),
]);
export const completionPageSize = 24;
export const completionCursorSchema = z.string().max(256).regex(/^[A-Za-z0-9_-]+$/);
export const completionPositionSchema = z.tuple([z.iso.datetime({ precision: 3 }), completionKeySchema]);
export const completionHistorySchema = z.strictObject({
  count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  items: z.array(z.strictObject({
    key: completionKeySchema, title: z.string().min(1).max(200), href: z.string(), completedAt: z.iso.datetime(),
  })).max(completionPageSize),
  nextCursor: completionCursorSchema.nullable(),
});

export function completionReply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store",
    Vary: "Cookie, X-Community-Account",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
  } });
}
