"use client";

import useSWR from "swr";
import { authClient } from "@/lib/auth-client";
import { fetchJson } from "@/lib/api-client";
import type { ProblemHistoryEntry } from "@/lib/problem-history";

export function useProblemHistory() {
  const session = authClient.useSession();
  const { data, error, isLoading, mutate } = useSWR<{
    history: ProblemHistoryEntry[];
  }>(
    session.data?.user ? ["/api/progress", session.data.user.id] : null,
    ([url]: [string, string]) =>
      fetchJson<{ history: ProblemHistoryEntry[] }>(url),
  );
  return {
    history: data?.history ?? [],
    error: session.error ?? error,
    isLoading: session.isPending || isLoading,
    signedIn: !!session.data?.user,
    mutate,
  };
}
