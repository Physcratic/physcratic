"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ArrowLeft, Clock3 } from "lucide-react";
import { fetchJson } from "@/lib/api-client";
import {
  contestPhase,
  formatContestDuration,
  type ContestRoomData,
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
import { Progress } from "@/components/ui/progress";
import { ArenaDocument } from "@/components/physics/arena-document";
import { ContestAnswerForm } from "./contest-answer-form";

function utc(value: string) {
  return (
    new Date(value).toLocaleString("en-GB", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " UTC"
  );
}
function remaining(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(seconds / 86400),
    hours = Math.floor((seconds % 86400) / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m ${seconds % 60}s`;
}
export function ContestRoom({ id }: { id: string }) {
  const { data, error, isLoading, mutate } = useSWR<ContestRoomData>(
    `/api/contests/${id}`,
    fetchJson,
    { refreshInterval: 30000 },
  );
  const { mutate: mutateShared } = useSWRConfig();
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const serverNow = data?.serverNow;
  const serverPhase = data?.phase;
  useEffect(() => {
    if (!serverNow) return;
    const received = performance.now(),
      server = Date.parse(serverNow);
    setNow(server);
    const timer = window.setInterval(
      () => setNow(server + performance.now() - received),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [serverNow]);
  const phase = data
    ? contestPhase(
        data.contest.startsAt,
        data.contest.durationMinutes,
        now ?? Date.parse(data.serverNow),
      )
    : null;
  useEffect(() => {
    if (serverPhase && phase !== serverPhase) void mutate();
  }, [phase, serverPhase, mutate]);
  async function join() {
    if (busy) return;
    setBusy(true);
    setJoinError("");
    try {
      await fetchJson("/api/contests/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestId: id, registered: true }),
      });
      await mutate();
      await mutateShared("/api/dashboard");
    } catch (reason) {
      setJoinError(
        reason instanceof Error
          ? reason.message
          : "Could not join this contest.",
      );
    } finally {
      setBusy(false);
    }
  }
  const earned = new Set(data?.earnedParts ?? []);
  return (
    <div className="flex flex-col gap-7">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard?view=contests">
            <ArrowLeft aria-hidden="true" data-icon="inline-start" />
            All contests
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <p role="status">Loading contest…</p>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Contest unavailable</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Please retry."}
            <Button variant="outline" onClick={() => mutate()}>
              Retry contest
            </Button>
          </AlertDescription>
        </Alert>
      ) : data ? (
        <>
          <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={phase === "live" ? "default" : "outline"}>
                {phase === "live"
                  ? "Live"
                  : phase === "upcoming"
                    ? "Upcoming"
                    : "Ended"}
              </Badge>
              <Badge variant="outline">Unrated archive test</Badge>
              <span className="text-sm text-muted-foreground">
                {formatContestDuration(data.contest.durationMinutes)}
              </span>
            </div>
            <h1 className="text-balance text-3xl font-medium tracking-tight sm:text-4xl">
              {data.contest.name}
            </h1>
            <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">
              {data.contest.description}
            </p>
          </header>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {phase === "ended"
                    ? "Contest ended"
                    : phase === "upcoming"
                      ? "Starts in"
                      : "Time remaining"}
                </CardTitle>
                <CardDescription>
                  Opens {utc(data.contest.startsAt)}. Closes {utc(data.endsAt)}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Clock3
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <time
                    className="font-mono text-2xl tabular-nums"
                    dateTime={
                      phase === "upcoming" ? data.contest.startsAt : data.endsAt
                    }
                  >
                    {now === null
                      ? "…"
                      : phase === "ended"
                        ? "Submissions closed"
                        : remaining(
                            Date.parse(
                              phase === "upcoming"
                                ? data.contest.startsAt
                                : data.endsAt,
                            ) - now,
                          )}
                  </time>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Your score</CardTitle>
                <CardDescription>
                  One point per correct final answer. Your best result for each
                  part counts.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="font-mono text-2xl tabular-nums">
                  {data.score} / {data.maxScore}
                </p>
                <Progress
                  value={data.maxScore ? (100 * data.score) / data.maxScore : 0}
                  aria-label="Correct final answer parts"
                />
              </CardContent>
            </Card>
          </div>
          <Alert>
            <AlertTitle>About this test</AlertTitle>
            <AlertDescription>
              These problems and their solutions already exist in the public
              archive. No ELO changes, penalties or public leaderboard apply.
              Saved answers are private to your account. You can retry while the
              contest is live.
            </AlertDescription>
          </Alert>
          {!data.registered && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {phase === "ended"
                    ? "Registration closed"
                    : "Join this contest"}
                </CardTitle>
                <CardDescription>
                  {phase === "ended"
                    ? "This event has ended. Existing participants can still review their saved answers."
                    : "Register to open the problem statements when the contest starts."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {phase !== "ended" &&
                  (!data.signedIn ? (
                    <Button asChild>
                      <Link
                        href={`/sign-in?returnTo=${encodeURIComponent(`/dashboard/contests/${id}`)}`}
                      >
                        Sign in to join
                      </Link>
                    </Button>
                  ) : !data.emailVerified ? (
                    <p role="status" className="text-sm text-muted-foreground">
                      Verify your email before joining this contest.
                    </p>
                  ) : (
                    <Button disabled={busy || !data.canJoin} onClick={join}>
                      {busy
                        ? "Joining…"
                        : data.canJoin
                          ? "Join contest"
                          : "Registration closed"}
                    </Button>
                  ))}
                {joinError && (
                  <p role="alert" className="text-sm text-destructive">
                    {joinError}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {data.registered && phase === "upcoming" && (
            <p role="status" className="text-sm text-muted-foreground">
              You are registered. The problems will appear here at the start
              time.
            </p>
          )}
          {data.problems.length > 0 && (
            <nav aria-label="Contest problems" className="flex flex-wrap gap-2">
              {data.problems.map((problem, index) => (
                <Button key={problem.id} asChild variant="outline" size="sm">
                  <a href={`#problem-${problem.id}`}>
                    {index + 1}. {problem.title}
                  </a>
                </Button>
              ))}
            </nav>
          )}
          {data.problems.map((problem, index) => (
            <Card
              id={`problem-${problem.id}`}
              key={`${problem.id}-${problem.metadata.version}`}
              className="min-w-0 scroll-mt-6"
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    Problem {index + 1}, {problem.topic}
                  </span>
                  <Badge variant="outline">
                    {problem.metadata.parts.length}{" "}
                    {problem.metadata.parts.length === 1 ? "point" : "points"}
                  </Badge>
                </div>
                <CardTitle>
                  <h2 className="text-balance text-2xl font-medium">
                    {problem.title}
                  </h2>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex min-w-0 flex-col gap-8">
                <ArenaDocument content={problem.statement} />
                <ContestAnswerForm
                  contestId={id}
                  problem={problem}
                  latest={data.attempts.find(
                    (attempt) => attempt.problemId === problem.id,
                  )}
                  disabled={phase !== "live" || !data.emailVerified}
                  earned={earned}
                  onSaved={() => mutate()}
                />
              </CardContent>
            </Card>
          ))}
          {data.registered && (
            <details className="rounded-lg border border-border p-5">
              <summary className="cursor-pointer text-sm font-medium">
                Saved submissions ({data.submissionCount})
              </summary>
              <ol className="flex flex-col gap-3 pt-4">
                {data.attempts.slice(0, 50).map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex flex-wrap justify-between gap-2 text-sm"
                  >
                    <span>
                      {data.problems.find(
                        (problem) => problem.id === attempt.problemId,
                      )?.title ?? attempt.problemId}
                    </span>
                    <span className="text-muted-foreground">
                      {
                        attempt.results.filter(
                          (part) => part.status === "correct",
                        ).length
                      }{" "}
                      correct. {utc(attempt.createdAt)}
                    </span>
                  </li>
                ))}
                {!data.attempts.length && (
                  <li className="text-sm text-muted-foreground">
                    No answers submitted yet.
                  </li>
                )}
                {data.submissionCount > 50 && (
                  <li className="text-sm text-muted-foreground">
                    Showing the latest 50 submissions. Your score includes all
                    saved submissions.
                  </li>
                )}
              </ol>
            </details>
          )}
        </>
      ) : null}
    </div>
  );
}
