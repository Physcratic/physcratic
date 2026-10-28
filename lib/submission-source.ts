import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { catalogProblems } from "@/lib/corpus-catalog";

export async function getSubmissionSource(problemId: string) {
  const problem = catalogProblems.find((item) => item.id === problemId);
  if (!problem) return null;
  const source = await readFile(path.join(process.cwd(), "public", problem.importPath));
  return { problemId, problemVersion: createHash("sha256").update(source).digest("hex"), gradingEnabled: false as const };
}
