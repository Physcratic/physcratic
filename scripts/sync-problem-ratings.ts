import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { problemRatings } from "../lib/db/schema";
import { catalogProblems } from "../lib/corpus-catalog";

async function main() {
  for (const problem of catalogProblems) {
    const source = await readFile(`public${problem.importPath}`);
    const sourceVersion = createHash("sha256").update(source).digest("hex");
    await db.insert(problemRatings).values({ problemId: problem.id, sourceVersion }).onConflictDoNothing();
    await db.update(problemRatings).set({ sourceVersion, ratingVersion: sql`${problemRatings.ratingVersion} + 1`, rating: null, ratedEnabled: false, checks: [], reviewedBy: null, updatedAt: new Date() }).where(and(eq(problemRatings.problemId, problem.id), ne(problemRatings.sourceVersion, sourceVersion)));
  }
  console.log(`Synchronized ${catalogProblems.length} real problem sources. Ratings remain unset until supplied and reviewed.`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Problem synchronization failed"); process.exitCode = 1; }).finally(() => pool.end());
