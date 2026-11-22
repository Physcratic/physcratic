import { z } from "zod";
import { profileHandleSchema, profilePatchSchema } from "./community/profile-contracts";
const uuid = z.uuid().transform(value => value.toLowerCase());
export const authoredAttributionSelectionSchema = z.strictObject({ problemId: uuid, revisionId: uuid });
export const authoredAttributionSchema = authoredAttributionSelectionSchema.extend({
  author: z.union([
    z.strictObject({ displayName: profilePatchSchema.shape.displayName.unwrap(), handle: profileHandleSchema }),
    z.strictObject({ displayName: z.literal("Deleted user") }),
  ]).nullable(),
});
export type AuthoredAttributionSelection = z.infer<typeof authoredAttributionSelectionSchema>;
export const authoredAttributionHeaders = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };
export const attributionReply = (body: unknown, status = 200) => Response.json(body, { status, headers: authoredAttributionHeaders });
