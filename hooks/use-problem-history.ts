"use client";

import useSWR from "swr";
import { authClient } from "@/lib/auth-client";
import { apiReadSWRConfig, fetchJson } from "@/lib/api-client";
import { practiceProgressSchema, type PracticeProgress } from "@/lib/practice-check-contracts";

export function useProblemHistory() {
  const session = authClient.useSession();
  const account = !session.isPending && !session.error ? session.data?.user.id : undefined;
  const result = useSWR<PracticeProgress>(
    account ? ["/api/practice-progress", account] : null,
    async ([url, actor]: [string, string]) => practiceProgressSchema.parse(await fetchJson(url, { headers: { "X-Practice-Account": actor } })),
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
