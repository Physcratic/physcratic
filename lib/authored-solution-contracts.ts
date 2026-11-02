import { z } from "zod";
import { authoredBlockSchema } from "./problem-authoring";
const id = z.uuid().transform((v) => v.toLowerCase());
export const solutionSelectionSchema = z.strictObject({ revisionId: id });
export const solutionPermissionInputSchema = z
  .strictObject({
    revisionId: id,
    version: z.number().int().min(0).max(2147483646),
    enabled: z.boolean(),
    mediaIds: z
      .array(id)
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "Duplicate media approval",
      )
      .default([]),
    expiresAt: z.iso.datetime().nullable().default(null),
  })
  .superRefine((value, ctx) => {
    if (!value.enabled && (value.mediaIds.length || value.expiresAt !== null))
      ctx.addIssue({
        code: "custom",
        message: "Revocation must clear media and expiry",
      });
  });
export const workedSolutionSchema = z.array(authoredBlockSchema).max(100);
export const solutionViewSchema = z.strictObject({
  problemId: id,
  revisionId: id,
  partId: id,
  reveal: z.strictObject({
    id,
    createdAt: z.iso.datetime(),
    replayed: z.boolean(),
    policy: z.literal("explicit-solution-v1"),
  }),
  solution: workedSolutionSchema,
  media: z
    .array(
      z.strictObject({
        id,
        purpose: z.enum(["solution-image", "solution-pdf"]),
        mediaType: z.enum([
          "image/png",
          "image/jpeg",
          "image/webp",
          "application/pdf",
        ]),
        url: z.string().startsWith("/api/authored-problems/").max(300),
      }),
    )
    .max(100),
});
export function solutionMediaPath(
  problemId: string,
  revisionId: string,
  partId: string,
  mediaId: string,
) {
  return `/api/authored-problems/${encodeURIComponent(problemId)}/solutions/${encodeURIComponent(partId)}/media/${encodeURIComponent(mediaId)}?revision=${encodeURIComponent(revisionId)}`;
}
