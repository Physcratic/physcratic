"use client";

import useSWR, { useSWRConfig } from "swr";
import { authClient } from "@/lib/auth-client";
import { fetchJson } from "@/lib/api-client";
import { checkPracticeAnswer } from "@/lib/practice";
import type { ProblemHistoryEntry } from "@/lib/problem-history";

export function useProblemHistory() {
  const session = authClient.useSession();
  const { mutate: mutateAll } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR<{
    history: ProblemHistoryEntry[];
  }>(
    session.data?.user ? ["/api/progress", session.data.user.id] : null,
    ([url]: [string, string]) =>
      fetchJson<{ history: ProblemHistoryEntry[] }>(url),
  );
  async function recordResult(
    problemId: string,
    answer: number,
    working: string,
    idempotencyKey: string,
  ) {
    if (session.isPending || session.error)
      throw new Error("Your account is still being checked. Please retry.");
    if (!session.data?.user)
      return { correct: checkPracticeAnswer(problemId, answer), saved: false };
    const result = await fetchJson<{ correct: boolean }>("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId, answer, working, idempotencyKey }),
    });
    await Promise.all([
      mutate(),
      mutateAll(
        (key) =>
          Array.isArray(key) &&
          key[0] === "/api/dashboard" &&
          key[1] === session.data?.user.id,
      ),
    ]);
    return { correct: result.correct, saved: true };
  }
  return {
    history: data?.history ?? [],
    recordResult,
    error: session.error ?? error,
    isLoading: session.isPending || isLoading,
    signedIn: !!session.data?.user,
    mutate,
  };
}
