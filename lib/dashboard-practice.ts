import "server-only";
import type { Pool } from "pg";
import { practiceChecksEnabled } from "./practice-check-route";

export function dashboardAccountMatches(request: Request, userId: string | null) {
  const expected = request.headers.get("x-practice-account");
  return expected === null || expected === (userId ?? "guest");
}

/** The caller supplies only the authenticated session ID. Missing schema is explicit. */
export async function dashboardPracticeCounts(pool: Pool, userId: string | null, enabled = practiceChecksEnabled) {
  if (!userId) return { practiceAttempts: 0, solvedProblems: 0, inProgressProblems: 0, practiceProgressAvailable: false };
  if (!enabled()) return { practiceAttempts: null, solvedProblems: null, inProgressProblems: null, practiceProgressAvailable: false };
  try {
    const [{ chargePracticeRead }, { readPracticeProgress }] = await Promise.all([import("./practice-check-api"), import("./practice-progress")]);
    await chargePracticeRead(pool, userId);
    const checked = await readPracticeProgress(pool, userId);
    return { practiceAttempts: checked.savedChecks, solvedProblems: checked.solvedProblems, inProgressProblems: checked.inProgressProblems, practiceProgressAvailable: true };
  } catch {
    return { practiceAttempts: null, solvedProblems: null, inProgressProblems: null, practiceProgressAvailable: false };
  }
}
