"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/** Private responses and form state must not survive a change of account. */
export function ContestAccountBoundary({ children }: { children: ReactNode }) {
  const { data, isPending, error, refetch } = authClient.useSession();
  if (isPending) return <p role="status">Checking your account…</p>;
  if (error) return <div role="alert" className="space-y-3">
    <p>Your account could not be checked. Try again.</p>
    <Button variant="outline" onClick={() => void refetch()}>Retry account</Button>
  </div>;
  return <SWRConfig key={data?.user.id ?? "guest"} value={{ provider: () => new Map() }}>
    {children}
  </SWRConfig>;
}
