import type { SolutionSubmission } from "./solution-grading";
export type SavedAttempt = { id: string; title?: string; problemId: string; partId: string; status: string; createdAt: string; payload: SolutionSubmission; check: { matched: boolean; awardedPoints: number; maxPoints: number } | null; ratingEvent: { rating: number; change: number } | null };
export type SubmissionHistoryData = { attempts: SavedAttempt[] };

export function initialHistoryForAccount(account: string | undefined, owner: string | undefined, data: SubmissionHistoryData | undefined) {
  return account && account === owner ? data : undefined;
}
