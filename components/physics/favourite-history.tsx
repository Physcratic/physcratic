"use client";

import Link from "next/link";
import { useId, useRef, useState, useEffect } from "react";
import useSWR from "swr";
import { authClient } from "@/lib/auth-client";
import { ApiRequestError, fetchJson } from "@/lib/api-client";
import { favouritePageSchema } from "@/lib/favourite-history-contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FavouriteHistory() {
  const { data, isPending, isRefetching, error } = authClient.useSession();
  const account = !error && !isPending && !isRefetching ? data?.user.id : undefined;
  return <section id="problem-favourites" tabIndex={-1} aria-label="Your favourites" className="min-w-0 scroll-mt-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
    <Card className="min-w-0 shadow-none"><CardHeader><CardTitle><h2 className="text-base font-semibold">Your favourites</h2></CardTitle><CardDescription>Problems you have favourited. Only currently public problems appear.</CardDescription></CardHeader><CardContent>
      {error ? <p role="alert">Your account could not be checked. Reload to retry.</p>
        : isPending || isRefetching ? <p role="status">Checking your account.</p>
        : account ? <FavouriteList key={account} account={account} />
        : <Button asChild variant="outline"><Link href="/sign-in?returnTo=%2Fdashboard%23problem-favourites">Sign in to view favourites</Link></Button>}
    </CardContent></Card>
  </section>;
}

function FavouriteList({ account }: { account: string }) {
  const view = useId();
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [epoch, setEpoch] = useState(0);
  const heading = useRef<HTMLParagraphElement>(null);
  const focus = useRef(false);
  const after = cursors.at(-1);
  const { data, error, isLoading, mutate } = useSWR(
    ["/api/favourites", account, view, after, epoch],
    async () => favouritePageSchema.parse(await fetchJson("/api/favourites" + (after ? `?after=${encodeURIComponent(after)}` : ""), { headers: { "X-Community-Account": account } })),
    { shouldRetryOnError: false, keepPreviousData: false, revalidateOnMount: true },
  );
  useEffect(() => {
    const restored = (event: PageTransitionEvent) => { if (event.persisted) void mutate(); };
    window.addEventListener("pageshow", restored); return () => window.removeEventListener("pageshow", restored);
  }, [mutate]);
  useEffect(() => { if (!isLoading && (data || error) && focus.current) { heading.current?.focus(); focus.current = false; } }, [isLoading, data, error]);
  const accountChanged = error instanceof ApiRequestError && [401, 409].includes(error.status ?? 0);
  const change = (next: (string | undefined)[]) => { focus.current = true; setCursors(next); };
  return <div className="flex min-w-0 flex-col gap-3">
    <p ref={heading} tabIndex={-1} className="text-sm text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">Refresh to show favourites added in another tab.</p>
    {error ? <p role="alert">{accountChanged ? "Your account changed. Reload to view your favourites." : error instanceof ApiRequestError && error.status === 429 ? "Too many favourite requests. Wait a minute, then refresh." : "Your favourites could not be loaded. No list is available."}</p>
      : isLoading || !data ? <p role="status">Loading your favourites.</p>
      : data.items.length ? <ul className="divide-y">{data.items.map(item => <li key={item.key}><Link href={item.href} prefetch={false} className="flex min-h-11 min-w-0 items-center rounded-md py-2 font-medium underline underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.title}</Link></li>)}</ul>
      : <p role="status">No public favourites to show. Favourite a problem using its heart control.</p>}
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="outline" onClick={() => { if (accountChanged) { window.location.reload(); return; } focus.current = true; setCursors([undefined]); setEpoch(n => n + 1); }}>{accountChanged ? "Reload account" : "Refresh favourites"}</Button>
      <nav aria-label="Favourite pages" className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={cursors.length === 1} onClick={() => change(cursors.slice(0, -1))}>Previous page</Button>
        <Button type="button" variant="outline" disabled={Boolean(error) || isLoading || !data?.nextCursor} onClick={() => { if (data?.nextCursor) change([...cursors, data.nextCursor]); }}>Next page</Button>
      </nav>
    </div>
  </div>;
}
