import { z } from "zod";
import { workedSolutionSchema } from "./authored-solution-contracts";
import { publicSolutionPolicy } from "./authored-solution-policy";
const id = z.uuid();
export function publicSolutionPath(problem: string, revision: string, media?: string) {
  return `/api/authored-problems/${encodeURIComponent(problem)}/public-solution${media ? `/media/${encodeURIComponent(media)}` : ""}?revision=${encodeURIComponent(revision)}`;
}
export const publicSolutionSchema = z.strictObject({
  problemId: id, revisionId: id, policy: z.literal(publicSolutionPolicy),
  parts: z.array(z.strictObject({ partId: id, label: z.string().max(80), solution: workedSolutionSchema })).max(1500),
  media: z.array(z.strictObject({ id, purpose: z.enum(["solution-image", "solution-pdf"]), mediaType: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]), url: z.string().max(300) })).max(150000),
});
export type PublicSolution = z.infer<typeof publicSolutionSchema>;
