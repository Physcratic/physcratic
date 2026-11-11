"use client";

import useSWR from "swr";
import { authClient } from "@/lib/auth-client";
import { apiReadSWRConfig, fetchJson } from "@/lib/api-client";
import { problemProgressSchema, type ProblemProgress } from "@/lib/problem-progress-contracts";

export function useProblemHistory() {
  const session = authClient.useSession();
  const account = !session.isPending && !session.error ? session.data?.user.id : undefined;
  const result = useSWR<ProblemProgress>(
    account ? ["/api/problem-progress", account] : null,
    async ([url, actor]: [string, string]) => problemProgressSchema.parse(await fetchJson(url, { headers: { "X-Practice-Account": actor } })),
    { ...apiReadSWRConfig, keepPreviousData: false },
  );
  return {
    progress: account && !result.error ? result.data : undefined,
    error: session.error ?? result.error,
    isLoading: session.isPending || result.isLoading,
    signedIn: Boolean(account),
    mutate: result.mutate,
  };
}
