"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Trophy,
  Users,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { fetchJson } from "@/lib/api-client";
import { contestStatus, type PublishedContest } from "@/lib/dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContestCountdown } from "./contest-countdown";

export function PublishedContestCard({
  contest,
  featured = false,
}: {
  contest: PublishedContest;
  featured?: boolean;
}) {
  const { data, mutate } = useDashboard();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const status = contestStatus(contest);
  const registrationOpen = contest.registrationOpen && status === "upcoming";

  async function register() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fetchJson("/api/contests/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contestId: contest.id,
          registered: !contest.registered,
        }),
      });
      setNotice(
        contest.registered
          ? "Registration cancelled."
          : "Your registration is saved.",
      );
      await mutate();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Registration could not be saved. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      className={
        featured
          ? "featured-contest-card flex min-w-0 flex-col shadow-none"
          : "flex min-w-0 flex-col shadow-none"
      }
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-primary">
            <Trophy className="size-4" aria-hidden="true" />
            {featured
              ? "Featured contest"
              : status === "upcoming"
                ? "Upcoming contest"
                : status === "live"
                  ? "In progress"
                  : "Past contest"}
          </span>
          <Badge variant="outline">{contest.rated ? "Rated" : "Unrated"}</Badge>
        </div>
        <CardTitle>
          <h2 className="text-balance text-2xl font-medium tracking-tight">
            {contest.name}
          </h2>
        </CardTitle>
        <CardDescription>{contest.description}</CardDescription>
        {contest.creators.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Created by {contest.creators.join(", ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4" aria-hidden="true" />
            {new Date(contest.startsAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "UTC",
            })}{" "}
            UTC
          </span>
          <span className="flex items-center gap-2">
            <Clock3 className="size-4" aria-hidden="true" />
            {contest.durationMinutes} minutes
          </span>
          <span className="flex items-center gap-2">
            <Users className="size-4" aria-hidden="true" />
            {contest.participants} registered
          </span>
        </div>
        {status === "upcoming" && (
          <ContestCountdown
            startsAt={contest.startsAt}
            durationMinutes={contest.durationMinutes}
          />
        )}
        {status === "past" && contest.problemIds.length > 0 && (
          <details>
            <summary className="cursor-pointer text-sm font-medium">
              Practice {contest.problemIds.length} problems
            </summary>
            <ul className="flex flex-col gap-2 pt-3">
              {contest.problemIds.map((id, index) => (
                <li key={id}>
                  <Link
                    href={`/dashboard/problems/${encodeURIComponent(id)}`}
                    className="text-sm underline underline-offset-4"
                  >
                    Problem {index + 1}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-3">
        {registrationOpen ? (
          data?.user ? (
            <Button
              onClick={register}
              disabled={busy}
              variant={contest.registered ? "outline" : "default"}
            >
              {busy ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : contest.registered ? (
                <Check data-icon="inline-start" />
              ) : null}
              {contest.registered ? "Cancel registration" : "Sign up"}
            </Button>
          ) : (
            <Button asChild>
              <Link href="/sign-in?returnTo=%2Fdashboard%3Fview%3Dcontests">
                Sign in to register
              </Link>
            </Button>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            {contest.registered
              ? "You are registered."
              : status === "past"
                ? "This contest has ended."
                : "Registration is closed."}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-muted-foreground">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
