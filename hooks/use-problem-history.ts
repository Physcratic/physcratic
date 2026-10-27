"use client";

import useSWR from "swr";
import { recordProblemResult, type ProblemHistoryEntry } from "@/lib/problem-history";

const emptyHistory: ProblemHistoryEntry[] = [];

export function useProblemHistory() {
  const { data: history = emptyHistory, mutate } = useSWR<ProblemHistoryEntry[]>(
    "session-problem-history",
    null,
    { fallbackData: emptyHistory },
  );

  function recordResult(problemId: string, correct: boolean) {
    void mutate(
      (current = emptyHistory) => recordProblemResult(current, problemId, correct, Date.now()),
      { revalidate: false },
    );
  }

  return { history, recordResult };
}
