"use client";

import Link from "next/link";
import { useId, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { completionHistoryKey, readCompletionHistory } from "@/lib/personal-completions-client";

export function CompletionHistory({ account, active }: { account: string; active: boolean }) {
  const [cursors, setCursors] = useState<string[]>([]);
  // A reselected account must not attach to its old in-flight history request.
  const view = useId();
  const { data, error } = useSWR(active ? completionHistoryKey(account, cursors.at(-1), view) : null, readCompletionHistory, {
    shouldRetryOnError: false,
    revalidateOnMount: true,
  });
  if (!active) return null;
  const next = error ? null : data?.nextCursor;

  return <section aria-labelledby="completed-problems-heading" className="space-y-2 border-t pt-4">
    <h3 id="completed-problems-heading" className="font-semibold">Completed problems</h3>
    {error ? <p role="alert" className="text-sm text-destructive">Could not load completed problems.</p>
      : !data ? <p role="status" className="text-sm text-muted-foreground">Loading completed problems…</p>
      : <>
        <p role="status" className="text-sm text-muted-foreground">{data.count} completed</p>
        {data.items.length > 0 && <ul className="divide-y">
          {data.items.map(item => <li key={item.key}>
            <Link href={item.href} prefetch={false}
              className="flex min-h-11 items-center rounded-sm py-2 text-sm font-medium underline underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {item.title}
            </Link>
          </li>)}
        </ul>}
      </>}
    {(cursors.length > 0 || next) && <nav aria-label="Completion history pages" className="flex flex-wrap gap-2">
      {cursors.length > 0 && <Button type="button" size="sm" variant="outline" onClick={() => setCursors(cursors.slice(0, -1))}>Previous page</Button>}
      <Button type="button" size="sm" variant="outline" aria-disabled={!next} onClick={() => { if (next) setCursors([...cursors, next]); }}>Next page</Button>
    </nav>}
  </section>;
}
