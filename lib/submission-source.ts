import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { problemRatings } from "@/lib/db/schema";
import { problemAnswerChecksSchema } from "@/lib/individual-elo";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { catalogProblems } from "@/lib/corpus-catalog";

export async function getSubmissionSource(problemId: string) {
  const problem = catalogProblems.find((item) => item.id === problemId);
  if (!problem) return null;
  const source = await readFile(path.join(process.cwd(), "public", problem.importPath));
  const problemVersion = createHash("sha256").update(source).digest("hex");
  const [configuration] = await db.select().from(problemRatings).where(eq(problemRatings.problemId, problemId)).limit(1);
  const checks = problemAnswerChecksSchema.safeParse(configuration?.checks);
  const gradingEnabled = Boolean(configuration?.reviewedBy && configuration.sourceVersion === problemVersion && checks.success);
  return { problemId, problemVersion, gradingEnabled, ratedEnabled: gradingEnabled && configuration?.ratedEnabled === true, rating: configuration?.sourceVersion === problemVersion ? configuration.rating : null, parts: gradingEnabled && checks.success ? checks.data.map(({ partId, maxPoints }) => ({ partId, maxPoints })) : [] };
}
