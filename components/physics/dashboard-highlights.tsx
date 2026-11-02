"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sun, Trophy } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { contestStatus } from "@/lib/dashboard-data";
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
import type { Problem } from "@/lib/physics";
import { MathFormula } from "./math-formula";
import { PublishedContestCard } from "./published-contest-card";

export function DashboardHighlights({
  dailyProblem,
  onOpen,
}: {
  dailyProblem: Problem;
  onOpen: (problem: Problem) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 min-[1100px]:grid-cols-[1.65fr_1fr]">
      <FeaturedContest />
      <DailyProblem problem={dailyProblem} onOpen={onOpen} />
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
          <p role="status" className="text-sm text-muted-foreground">
            Loading published contests…
          </p>
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

function DailyProblem({
  problem,
  onOpen,
}: {
  problem: Problem;
  onOpen: (problem: Problem) => void;
}) {
  return (
    <Card
      className="flex min-w-0 flex-col shadow-none"
      aria-labelledby="daily-problem-heading"
    >
      <CardHeader className="pb-4">
        <CardTitle>
          <h2
            id="daily-problem-heading"
            className="flex items-center gap-2 text-sm font-medium text-accent-foreground"
          >
            <Sun aria-hidden="true" className="size-4" strokeWidth={1.6} />
            Recommended problem
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{problem.topic}</Badge>
          <span className="text-sm text-muted-foreground">
            {problem.minutes} min
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-balance text-xl font-medium leading-snug tracking-tight">
            {problem.title}
          </h3>
          <CardDescription className="leading-relaxed">
            {problem.concept} ·{" "}
            <span
              aria-label={`Difficulty rating ${problem.elo.toLocaleString("en-US")}`}
            >
              {problem.elo.toLocaleString("en-US")}
            </span>
          </CardDescription>
        </div>
        <div className="rounded-lg bg-muted/60 px-4 py-1 text-muted-foreground">
          <MathFormula formula={problem.formula} />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onOpen(problem)}
        >
          Solve problem
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}
