import { z } from "zod";

export const archiveAnswerLimit = 1024;
const problemId = z.string().regex(/^(?:[a-z]+(?:-[a-z]+)*|(?:ipho|apho|eupho)-\d{4}-t[1-9]\d*)$/).max(100);
const partId = z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/).max(100);
export const archiveMetadataSchema = z.strictObject({
  problemId,
  version: z.string().regex(/^[a-f0-9]{64}$/),
  parts: z.array(z.strictObject({
    id: partId,
    sourcePart: z.string(),
    label: z.string(),
    kind: z.enum(["numeric", "expression", "special", "self-review"]),
    unit: z.string(),
    symbols: z.array(z.string()),
    /** Declared conditions of the symbols that have any (positive, at most 5, and so on). Nothing from the key. */
    symbolConditions: z.array(z.strictObject({
      symbol: z.string(),
      assumptions: z.array(z.enum(["positive", "nonnegative", "nonzero"])).max(3),
      min: z.number().finite().optional(),
      max: z.number().finite().optional(),
    })).max(20),
    help: z.string(),
  })).min(1).max(64),
});
export const archiveGradeRequestSchema = z.strictObject({
  problemId,
  version: z.string().regex(/^[a-f0-9]{64}$/),
  answers: z.array(z.strictObject({ partId, latex: z.string().max(archiveAnswerLimit) })).max(64),
});
export const archiveGradeResponseSchema = z.strictObject({
  problemId,
  version: z.string(),
  results: z.array(z.strictObject({
    partId,
    status: z.enum(["correct", "incorrect", "invalid", "inconclusive", "self-review", "unanswered"]),
    message: z.string(),
  })),
});
export type ArchiveMetadata = z.infer<typeof archiveMetadataSchema>;
export type ArchiveGradeRequest = z.infer<typeof archiveGradeRequestSchema>;
export type ArchiveGradeResponse = z.infer<typeof archiveGradeResponseSchema>;
export type ArchivePartResult = ArchiveGradeResponse["results"][number];
