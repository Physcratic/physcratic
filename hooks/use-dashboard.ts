"use client";

import useSWR from "swr";
import { authClient } from "@/lib/auth-client";
import { fetchJson } from "@/lib/api-client";
import type { DashboardData } from "@/lib/dashboard-data";

export function useDashboard() {
  const session = authClient.useSession();
  const result = useSWR<DashboardData>(
    session.isPending || session.error
      ? null
      : ["/api/dashboard", session.data?.user.id ?? "guest"],
    ([url]: [string, string]) => fetchJson<DashboardData>(url),
    { refreshInterval: 60_000, keepPreviousData: false },
  );
  return {
    ...result,
    error: session.error ?? result.error,
    isLoading: session.isPending || result.isLoading,
  };
}
