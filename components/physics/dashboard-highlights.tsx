"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Shuffle, Sun, Trophy } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { contestStatus } from "@/lib/dashboard-data";
import { getEstimatedProblemElo } from "@/lib/problem-archive";
import { ratingBand } from "@/lib/rating-bands";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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
import arena from "@/lib/arena/index.json";
import { pickProblem } from "./solved-problems";
import { PublishedContestCard } from "./published-contest-card";
import { LoadingLines } from "@/components/loading-lines";

const arenaProblems = arena.problems;
const arenaIds = arenaProblems.map((item) => item.id);

export function DashboardHighlights() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 min-[1100px]:grid-cols-[1.65fr_1fr]">
      <FeaturedContest />
      <ProblemToCheckOut />
    </div>
  );
}

function FeaturedContest() {
  const { data, error, isLoading, mutate } = useDashboard();
  const contest = data?.contests.find((item) => contestStatus(item) !== "past");
  if (contest && !error)
    return <PublishedContestCard contest={contest} featured />;
  return (
    <Card className="featured-contest-card flex min-w-0 flex-col shadow-none">
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2 text-base font-medium">
            <Trophy className="size-4" aria-hidden="true" />
            Featured contest
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        {isLoading ? (
          <LoadingLines label="Loading published contests…" />
        ) : error ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-destructive">
              Contests could not be loaded.
            </p>
            <Button variant="outline" onClick={() => mutate()}>
              Retry contests
            </Button>
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No upcoming contests yet</EmptyTitle>
              <EmptyDescription>
                Published rounds will appear here. Browse the problem archive in
                the meantime.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
          <Link href="/dashboard?view=contests">
            View contests
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ProblemToCheckOut() {
  // A stable Arena choice makes the primary link usable in HTML and matches the first client render.
  // Random discovery uses no account progress or shared-browser solving history.
  const [id, setId] = useState<string | null>(arenaIds[0] ?? null);
  useEffect(() => {
    setId(pickProblem(arenaIds, new Set()) ?? null);
  }, []);
  const problem = arenaProblems.find((item) => item.id === id);
  const rating = problem ? getEstimatedProblemElo(problem.id) : null;
  const band = rating === null ? null : ratingBand(rating);
  return (
    <Card
      className="flex min-w-0 flex-col shadow-none"
      aria-labelledby="daily-problem-heading"
      data-tour="problem-card"
    >
      <CardHeader className="pb-4">
        <CardTitle>
          <h2
            id="daily-problem-heading"
            className="flex items-center gap-2 text-sm font-medium text-accent-foreground"
          >
            <Sun aria-hidden="true" className="size-4" strokeWidth={1.6} />
            Random Arena problem
          </h2>
        </CardTitle>
        <CardDescription>Chosen at random, without using your saved attempts or personal marks.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {problem ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{problem.topic}</Badge>
              {rating !== null && band && (
                <Badge
                  variant={band.variant}
                  aria-label={`Rating ${rating.toLocaleString("en-US")}, ${band.name}`}
                  title={`${band.name}, ${band.range}`}
                  className="shrink-0 gap-2 rounded-md"
                >
                  <span className="text-sm tabular-nums">{rating.toLocaleString("en-US")}</span>
                  <span className="text-sm">{band.name}</span>
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">Physcratic Arena</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-balance text-xl font-medium leading-snug tracking-tight">
                {problem.title}
              </h3>
              <CardDescription className="leading-relaxed">
                {problem.summary}
              </CardDescription>
            </div>
          </>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            Choosing a problem…
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        {problem ? (
          <Button asChild className="min-h-11 flex-1">
            <Link href={`/dashboard/problems/${problem.id}`}>
              Solve problem
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        ) : (
          <Button className="min-h-11 flex-1" disabled>
            Solve problem
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={!problem}
          onClick={() => setId((current) => pickProblem(arenaIds, new Set(), current ?? undefined) ?? current)}
        >
          <Shuffle data-icon="inline-start" />
          Another problem
        </Button>
      </CardFooter>
    </Card>
  );
}
