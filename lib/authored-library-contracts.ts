import { z } from "zod";
import { publicAuthoredMetadataSchema } from "./problem-authoring";

export const authoredLibraryFiltersSchema = z.strictObject({
  q: z.string().trim().max(200).default(""),
  tag: z.string().trim().max(80).default(""),
  // Published difficulty labels preserve whitespace; exact filters must too.
  difficulty: z.string().max(80).default(""),
  provenance: z.enum(["", "original", "authorized"]).default(""),
  after: z
    .uuid()
    .transform((v) => v.toLowerCase())
    .optional(),
  // "rating" orders by the author's difficulty rating from low to high, problems without a rating last, then by id.
  // The default order is by id.
  sort: z.enum(["", "rating"]).default(""),
  // With sort=rating and `after`: the rating of the problem the page starts after, or "unrated" when it has none.
  afterRating: z.union([z.literal("unrated"), z.coerce.number().int().min(0).max(4000)]).optional(),
  // With sort=rating and no `after`: start at this rating. Problems without a rating still follow.
  minRating: z.coerce.number().int().min(0).max(4000).optional(),
});
export const authoredLibraryPageSchema = z.strictObject({
  problems: z
    .array(
      publicAuthoredMetadataSchema.extend({
        problemId: z.uuid(),
        revisionId: z.uuid(),
        // Only with sort=rating: the rating the order used, null when the label is not a rating.
        rating: z.number().int().min(0).max(4000).nullable().optional(),
      }),
    )
    .max(24),
  nextCursor: z.uuid().nullable(),
});
export type AuthoredLibraryPage = z.infer<typeof authoredLibraryPageSchema>;
export type AuthoredLibraryFilters = z.infer<
  typeof authoredLibraryFiltersSchema
>;
