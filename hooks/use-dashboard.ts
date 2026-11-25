"use client";

import useSWR from "swr";
import { useEffect, useState } from "react";
import { readDashboardCache, writeDashboardCache } from "@/lib/dashboard-cache";
import { authClient } from "@/lib/auth-client";
import { dashboardReadSWRConfig, fetchJson } from "@/lib/api-client";
import type { DashboardData } from "@/lib/dashboard-data";

export function useDashboard() {
  const session = authClient.useSession();
  const ready = !session.isPending && !session.error;
  const account = ready ? session.data?.user.id ?? "guest" : undefined;
  const [cached, setCached] = useState<{ account: string; data: DashboardData }>();
  useEffect(() => {
    if (!account) { setCached(undefined); return; }
    const data = readDashboardCache(account);
    setCached(data ? { account, data } : undefined);
  }, [account]);
  const fallbackData = cached?.account === account ? cached?.data : undefined;
  const result = useSWR<DashboardData>(
    session.isPending || session.error
      ? null
      : ["/api/dashboard", session.data?.user.id ?? "guest"],
    async ([url, actor]: [string, string]) => {
      const data = await fetchJson<DashboardData>(url, { headers: { "X-Practice-Account": actor } });
      writeDashboardCache(actor, data);
      return data;
    },
    { ...dashboardReadSWRConfig, fallbackData, refreshInterval: process.env.NODE_ENV === "development" ? 0 : 60_000 },
  );
  const data = ready ? result.data ?? fallbackData : undefined;
  return {
    ...result,
    data,
    error: session.error ?? (data ? undefined : result.error),
    refreshError: data ? result.error : undefined,
    isLoading: !data && (session.isPending || result.isLoading),
  };
}
