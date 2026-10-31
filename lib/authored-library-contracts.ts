import { z } from "zod";
import { publicAuthoredMetadataSchema } from "./problem-authoring";

export const authoredLibraryFiltersSchema = z.strictObject({
  q: z.string().trim().max(200).default(""),
  tag: z.string().trim().max(80).default(""),
  difficulty: z.string().trim().max(80).default(""),
  provenance: z.enum(["", "original", "authorized"]).default(""),
  after: z
    .uuid()
    .transform((v) => v.toLowerCase())
    .optional(),
});
export const authoredLibraryPageSchema = z.strictObject({
  problems: z
    .array(
      publicAuthoredMetadataSchema.extend({
        problemId: z.uuid(),
        revisionId: z.uuid(),
      }),
    )
    .max(24),
  nextCursor: z.uuid().nullable(),
});
export type AuthoredLibraryPage = z.infer<typeof authoredLibraryPageSchema>;
export type AuthoredLibraryFilters = z.infer<
  typeof authoredLibraryFiltersSchema
>;
