import { z } from "zod";
import { profileHandleSchema } from "./community/profile-contracts";

export const AUTHOR_CREDIT_POLICY_VERSION = "author-credit-v1";

const revision = z.string().regex(/^\d{1,20}(?:\.\d{1,6})?$/).nullable();

export const authorCreditStatusSchema = z.strictObject({
  handle: profileHandleSchema.nullable(),
  credit: z.enum(["inactive", "active", "review-required"]),
  revision,
});

export type AuthorCreditStatus = z.infer<typeof authorCreditStatusSchema>;

export const authorCreditWriteSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("claim"), handle: profileHandleSchema }),
  z.strictObject({
    action: z.literal("acknowledge"),
    handle: profileHandleSchema,
    policyVersion: z.literal(AUTHOR_CREDIT_POLICY_VERSION),
    revision,
  }),
  z.strictObject({ action: z.literal("withdraw"), revision }),
]);

export function authorCreditReply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "private, no-store",
    "Vary": "Cookie, X-Community-Account",
    "X-Robots-Tag": "noindex",
    "X-Content-Type-Options": "nosniff",
  } });
}
