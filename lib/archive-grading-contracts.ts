import { z } from "zod";

export const archiveAnswerLimit = 1024;
const problemId = z.string().regex(/^[a-z]+(?:-[a-z]+)*$/).max(100);
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
