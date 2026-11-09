"use client";

import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { LoadingLines } from "@/components/loading-lines";

async function loadRating([url]: readonly [string, string]): Promise<{ rating: number | null; ratedAttempts: number; initialRating: number; history: { problemId: string; rating: number; change: number; createdAt: string }[] }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Rating unavailable");
  return response.json();
}

export function IndividualRatingSummary({ userId }: { userId?: string }) {
  const { data, error, isLoading, mutate } = useSWR(userId ? ["/api/individual-rating", userId] as const : null, loadRating);
  if (!userId) return null;
  return <section aria-label="Individual problem rating" className="flex flex-col gap-2 rounded-md border p-4 text-sm leading-relaxed">
    <h3 className="font-medium">Individual problem ELO</h3>
    {isLoading ? <LoadingLines label="Loading your rating…" /> : error ? <div className="flex flex-wrap items-center gap-3"><p role="alert" className="text-muted-foreground">Your rating could not be loaded.</p><Button type="button" variant="outline" size="sm" onClick={() => mutate()}>Retry rating</Button></div> : data && <>
      <p>{data.rating === null ? "Not rated yet" : `${data.rating} ELO · ${data.ratedAttempts} rated problems`}</p>
      <p className="text-muted-foreground">{data.rating === null ? `The first eligible rated result starts from ${data.initialRating}. Unrated work does not change ELO.` : "One rated result per full problem, based on the first checked answer for every configured subpart. Contest ELO is separate."}</p>
      {data.history.length > 0 && <details><summary className="cursor-pointer">Rating history</summary><ol className="flex flex-col gap-2 pt-3">{data.history.map((event) => <li key={event.problemId} className="flex flex-wrap justify-between gap-2"><span>{event.problemId}</span><span className="font-mono">{event.rating} ({event.change >= 0 ? "+" : ""}{event.change})</span></li>)}</ol></details>}
    </>}
  </section>;
}
