"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/hooks/use-dashboard";
import { useProblemHistory } from "@/hooks/use-problem-history";
import { LoadingLines } from "@/components/loading-lines";
import type { Problem } from "@/lib/physics";

// Keep the caller signature compatible. Typed canonical links also cover Arena IDs.
export function ProblemHistory({}: { onOpen: (problem: Problem) => void }) {
  const dashboard = useDashboard();
  const { progress, error, isLoading, signedIn, mutate } = useProblemHistory();
  return <section aria-label="Your problem history" className="flex min-w-0 flex-col gap-4">
    {isLoading ? <LoadingLines label="Loading your saved progress…" /> : error ? <div className="flex flex-col items-start gap-3">
      <p role="alert" className="text-sm text-destructive">Your progress could not be loaded. No completion count is available.</p>
      <Button variant="outline" className="min-h-11" onClick={() => mutate()}>Retry progress</Button>
    </div> : !signedIn ? <Card className="shadow-none"><CardHeader><CardTitle><h2 className="text-base font-medium">Not signed in</h2></CardTitle><CardDescription>Sign in and verify your email to save checked answers. Your history stays private.</CardDescription></CardHeader><CardContent><Button asChild variant="outline" className="min-h-11"><Link href="/sign-in?returnTo=%2Fdashboard">Sign in to save progress</Link></Button></CardContent></Card> : progress ? <>
      <p className="text-sm text-muted-foreground">{progress.savedChecks} saved checks across available collections. Completion below uses the current version of each problem. Checks do not change your rating.</p>
      {(!progress.sources.practice || !progress.sources.authored) && <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><p>{!progress.sources.practice ? "Practice and Arena progress is unavailable." : "Community progress is unavailable."} The lists show available saved results.</p><Button variant="outline" className="min-h-11" onClick={() => mutate()}>Retry progress</Button></div>}
      <div className="grid min-w-0 grid-cols-1 gap-5 min-[1100px]:grid-cols-2">
        {(["solved", "in-progress", "not-graded"] as const).map(status => {
          const items = progress.progress.filter(entry => entry.status === status);
          const heading = status === "solved" ? "Solved correctly" : status === "in-progress" ? "Not yet solved" : "Not graded";
          const description = status === "solved" ? "All required checkable parts have been correct on this version." : status === "in-progress" ? "Some required parts still need a correct check." : "Saved checks are invalid, inconclusive or for self-review.";
          return <Card key={status} className="min-w-0 shadow-none"><CardHeader><CardTitle><h2 className="text-base font-medium">{heading} <span className="font-normal text-muted-foreground">{items.length}</span></h2></CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>
            {items.length ? <ul className="flex min-w-0 flex-col gap-3">{items.map(entry => <li key={`${entry.kind}:${entry.problemId}`} className="min-w-0"><Link href={entry.href} className="flex min-h-11 min-w-0 flex-col gap-1 rounded-md p-2 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"><span className="break-words font-medium">{entry.title}</span><span className="text-sm text-muted-foreground">{entry.kind === "authored" ? "Community" : entry.kind === "arena" ? "Arena" : "Practice"} · {entry.correctParts}/{entry.requiredParts} required parts correct</span></Link></li>)}</ul> : <p className="text-sm text-muted-foreground">No problems in this list yet.</p>}
          </CardContent></Card>;
        })}
      </div>
      <p className="text-sm text-muted-foreground">Earlier checks from this browser are not added to account progress. Earlier practice records are kept separately.</p>
      <Button variant="outline" className="min-h-11 w-fit" asChild><Link href="/dashboard/submissions">View my solution attempts</Link></Button>
      {dashboard.data?.user && !dashboard.error && <p className="text-sm text-muted-foreground">{dashboard.data.savedAttempts} saved solution attempts · {dashboard.data.archiveReviewed} archive subproblems reviewed · {dashboard.data.legacyPracticeAttempts ?? 0} earlier practice checks kept separately.</p>}
    </> : null}
  </section>;
}
