export interface ProblemHistoryEntry {
  problemId: string;
  correct: boolean;
  attemptedAt: number;
}

export function recordProblemResult(
  history: ProblemHistoryEntry[],
  problemId: string,
  correct: boolean,
  attemptedAt: number,
): ProblemHistoryEntry[] {
  const previous = history.find((entry) => entry.problemId === problemId);
  return [
    { problemId, correct: correct || Boolean(previous?.correct), attemptedAt },
    ...history.filter((entry) => entry.problemId !== problemId),
  ];
}
