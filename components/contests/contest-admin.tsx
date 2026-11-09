"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { ArrowLeft, ArrowUpRight, Pencil, Send } from "lucide-react";
import { fetchJson } from "@/lib/api-client";
import {
  contestEnd,
  formatContestDuration,
  type ContestAdminData,
  type ContestSummary,
} from "@/lib/contest-contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ContestDraftForm } from "./contest-draft-form";
import { ContestAccountBoundary } from "./contest-account-boundary";

function utc(value: string) {
  return (
    new Date(value).toLocaleString("en-GB", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " UTC"
  );
}
export function ContestAdmin() {
  return <ContestAccountBoundary><ContestAdminWorkspace /></ContestAccountBoundary>;
}
function ContestAdminWorkspace() {
  const { data, error, isLoading, mutate } = useSWR<ContestAdminData>(
    "/api/contests/admin",
    fetchJson,
    { revalidateOnFocus: false },
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<ContestSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [publishError, setPublishError] = useState("");
  const editing = data?.contests.find(
    (contest) => contest.id === editingId && !contest.published,
  );
  async function publish() {
    if (!publishing || busy) return;
    setBusy(true);
    setPublishError("");
    setNotice("");
    try {
      const response = await fetchJson<{ contest: ContestSummary }>(
        `/api/contests/admin/${publishing.id}/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: publishing.version,
            confirmed: true,
          }),
        },
      );
      setPublishing(null);
      setNotice(
        `Published. Opens ${utc(response.contest.startsAt)}. Closes ${utc(contestEnd(response.contest.startsAt, response.contest.durationMinutes))}.`,
      );
      if (editingId === response.contest.id) setEditingId(null);
      await mutate();
    } catch (reason) {
      setPublishError(
        reason instanceof Error
          ? reason.message
          : "Publication failed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col items-start gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard?view=contests">
            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
            All contests
          </Link>
        </Button>
        <div className="flex flex-col gap-2">
          <h1 className="text-balance text-3xl font-medium tracking-tight">
            Manage contests
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Create a draft, select archive problems, then confirm publication.
          </p>
        </div>
      </header>
      {isLoading ? (
        <p role="status">Checking contest access…</p>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Contest management unavailable</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col items-start gap-3">
              <p>{error instanceof Error ? error.message : "Please retry."}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={() => mutate()}>
                  Retry
                </Button>
                <Link
                  href="/sign-in?returnTo=%2Fdashboard%2Fcontests%2Fmanage"
                  className="underline underline-offset-4"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : data ? (
        <>
          <Alert>
            <AlertTitle>Unrated archive test</AlertTitle>
            <AlertDescription>
              Archive solutions are already public. These contests test
              submission and scoring only. They do not change ELO. Published
              dates, problems and answer keys are locked.
            </AlertDescription>
          </Alert>
          <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>{editing ? "Edit draft" : "New contest"}</CardTitle>
                <CardDescription>
                  {editing
                    ? "Changes stay private until publication."
                    : "The first draft starts with the proposed seven-day test."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContestDraftForm
                  key={editing ? `${editing.id}-${editing.version}` : "new"}
                  contest={editing}
                  problems={data.problems}
                  onSaved={() => mutate()}
                  onCancel={() => setEditingId(null)}
                />
              </CardContent>
            </Card>
            <section
              aria-labelledby="your-contests"
              className="flex min-w-0 flex-col gap-4"
            >
              <h2 id="your-contests" className="text-xl font-medium">
                Your contests
              </h2>
              {notice && (
                <p role="status" className="text-sm text-muted-foreground">
                  {notice}
                </p>
              )}
              {data.contests.length ? (
                data.contests.map((contest) => (
                  <Card key={contest.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Badge
                          variant={contest.published ? "secondary" : "outline"}
                        >
                          {contest.published ? "Published" : "Draft"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatContestDuration(contest.durationMinutes)}
                        </span>
                      </div>
                      <CardTitle>{contest.name}</CardTitle>
                      <CardDescription>{contest.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground">
                        {contest.problemIds.length} problems.{" "}
                        {contest.published || !contest.launchOnPublish
                          ? `Opens ${utc(contest.startsAt)}`
                          : "Starts when published."}
                      </p>
                      {contest.published ? (
                        <Button asChild variant="outline">
                          <Link href={`/dashboard/contests/${contest.id}`}>
                            Open contest
                            <ArrowUpRight
                              aria-hidden="true"
                              data-icon="inline-end"
                            />
                          </Link>
                        </Button>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setEditingId(contest.id)}
                          >
                            <Pencil
                              aria-hidden="true"
                              data-icon="inline-start"
                            />
                            Edit draft
                          </Button>
                          <Button
                            onClick={() => {
                              setPublishError("");
                              setPublishing(contest);
                            }}
                          >
                            <Send aria-hidden="true" data-icon="inline-start" />
                            Publish
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No drafts yet</EmptyTitle>
                    <EmptyDescription>
                      Save a draft to review its schedule and problem selection
                      before publishing.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </section>
          </div>
        </>
      ) : null}
      <AlertDialog
        open={Boolean(publishing)}
        onOpenChange={(open) => {
          if (!open && !busy) setPublishing(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish {publishing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {publishing?.launchOnPublish
                ? `This starts the timer immediately. The contest lasts ${formatContestDuration(publishing.durationMinutes)}.`
                : publishing
                  ? `This opens registration now and starts the contest on ${utc(publishing.startsAt)}.`
                  : ""}{" "}
              The schedule and answer keys cannot be edited after publication.
              This event is unrated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {publishing && (
            <ol className="flex list-inside list-decimal flex-col gap-2 text-sm">
              {publishing.problemIds.map((id) => (
                <li key={id}>
                  {data?.problems.find((problem) => problem.id === id)?.title ??
                    id}
                </li>
              ))}
            </ol>
          )}
          {publishError && (
            <p role="alert" className="text-sm text-destructive">
              {publishError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep draft</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void publish();
              }}
            >
              {busy ? "Publishing…" : "Confirm publication"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
