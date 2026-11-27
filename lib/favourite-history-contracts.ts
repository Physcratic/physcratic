import { z } from "zod";
import { problemHref, problemKeySchema } from "./unified-arena";

export const favouritePageSize = 24;
export const favouriteCursorSchema = z.string().max(320).regex(/^ph1\.[A-Za-z0-9_-]+$/);
export const favouritePageSchema = z.strictObject({
  items: z.array(z.strictObject({
    key: problemKeySchema,
    title: z.string().min(1).max(200),
    href: z.string(),
  }).refine(item => {
    const kind = item.key.startsWith("arena:") ? "arena" : "authored";
    return item.href === problemHref({ kind, id: item.key.slice(kind.length + 1) });
  })).max(favouritePageSize),
  nextCursor: favouriteCursorSchema.nullable(),
});
export type FavouritePage = z.infer<typeof favouritePageSchema>;

export function favouriteReply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store", Vary: "Cookie, X-Community-Account",
    "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow",
  } });
}
