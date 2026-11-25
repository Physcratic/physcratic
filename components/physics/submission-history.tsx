"use client";

import Link from "next/link";
import useSWR from "swr";
import { useEffect } from "react";
import { dashboardReadSWRConfig, fetchJson } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { initialHistoryForAccount, type SubmissionHistoryData } from "@/lib/submission-history-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { LoadingLines } from "@/components/loading-lines";

export function SubmissionHistory({ accountId, initialData }: { accountId?: string; initialData?: SubmissionHistoryData } = {}) {
  const { data: session, isPending, error: sessionError } = authClient.useSession();
  const account = !isPending && !sessionError ? session?.user.id : undefined;
  const serverData = initialHistoryForAccount(account, accountId, initialData);
  const { data, error, mutate, isLoading } = useSWR<SubmissionHistoryData>(
    account ? ["/api/submissions", account] : null,
    ([url]) => fetchJson<SubmissionHistoryData>(url),
    { ...dashboardReadSWRConfig, fallbackData: serverData, revalidateOnMount: !serverData },
  );
  useEffect(() => {
    if (serverData) void mutate(serverData, { revalidate: false });
  }, [serverData, mutate]);
  if (isPending || (!data && isLoading)) return <LoadingLines label="Loading your private attempts…" />;
  if (!account) return <Alert><AlertTitle>Sign in to continue</AlertTitle><AlertDescription><Link href="/sign-in" className="underline underline-offset-4">Your saved attempts require an active session.</Link></AlertDescription></Alert>;
  if (error) return <Alert variant="destructive"><AlertTitle>Could not load your attempts</AlertTitle><AlertDescription><Button variant="outline" onClick={() => mutate()}>Retry</Button></AlertDescription></Alert>;
  if (!data?.attempts.length) return <Empty><EmptyHeader><EmptyTitle>Your first solution starts here.</EmptyTitle><EmptyDescription>Open an imported problem, select Your solution, and save your reasoning or handwritten work.</EmptyDescription></EmptyHeader><Button asChild><Link href="/dashboard?view=problems">Browse problems</Link></Button></Empty>;
  return <div className="flex flex-col gap-5"><p className="text-sm text-muted-foreground">Most recent {data.attempts.length} attempts, private to your account</p>{data.attempts.map((attempt) => <Card key={attempt.id}>
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{attempt.title ?? attempt.problemId}</CardTitle><Badge variant="outline">{attempt.check ? "Final expression checked" : "Awaiting reference, Ungraded"}</Badge></div><CardDescription>{attempt.problemId.toUpperCase()}, Student subpart: {attempt.partId}, {new Date(attempt.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "UTC" })}</CardDescription></CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-4"><p className="text-sm leading-relaxed text-muted-foreground">{attempt.check ? `Final-answer points: ${attempt.check.awardedPoints}/${attempt.check.maxPoints}. ${attempt.check.matched ? "Expression matched the reviewed answer." : "No expression match established. Method and units were not assessed."} ${attempt.ratingEvent ? `Individual ELO: ${attempt.ratingEvent.rating} (${attempt.ratingEvent.change >= 0 ? "+" : ""}${attempt.ratingEvent.change}).` : "No ELO update on this attempt."}` : "Saved, not queued for automatic grading. No marks or ELO have been assigned."}</p><details><summary className="cursor-pointer text-sm font-medium">View submitted working</summary><div className="flex min-w-0 flex-col gap-4 pt-4">{attempt.payload.working && <section aria-label="Submitted reasoning"><h3 className="text-sm font-medium">Working</h3><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{attempt.payload.working}</pre></section>}{attempt.payload.finalAnswer && <section aria-label="Submitted final answer"><h3 className="text-sm font-medium">Final Answer</h3><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{attempt.payload.finalAnswer}</pre></section>}{attempt.payload.transcription && <section aria-label="Confirmed attachment transcription"><h3 className="text-sm font-medium">Confirmed Transcription</h3><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{attempt.payload.transcription.text}</pre></section>}{attempt.payload.evidence.map((file, index) => <a key={file.id} href={`/api/solution-evidence/${file.id}`} className="w-fit text-sm underline underline-offset-4">Download private attachment {index + 1}</a>)}<p className="break-all text-sm text-muted-foreground">Source version: {attempt.payload.problemVersion}</p></div></details></CardContent>
  </Card>)}</div>;
}
