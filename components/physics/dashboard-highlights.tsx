"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  ListChecks,
  Sun,
  Trophy,
} from "lucide-react";
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
import { demoContests } from "@/lib/contest-demo";
import type { Problem } from "@/lib/physics";
import { MathFormula } from "./math-formula";

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
  const [registered, setRegistered] = useState(false);
  const contest = demoContests.find((item) => item.status === "upcoming");

  if (!contest) return null;

  return (
    <Card
      className="flex min-w-0 flex-col overflow-hidden shadow-none"
      aria-labelledby="dashboard-featured-contest"
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>
            <h2
              id="dashboard-featured-contest"
              className="flex items-center gap-2 text-sm font-medium text-primary"
            >
              <Trophy aria-hidden="true" className="size-4" strokeWidth={1.6} />
              Featured contest
            </h2>
          </CardTitle>
          <Badge variant="outline">Upcoming</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="text-balance text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-[32px]">
            {contest.name}
          </h3>
          <CardDescription className="max-w-md text-pretty leading-relaxed">
            {contest.description}
          </CardDescription>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
            {contest.date}
          </span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4" />
              {contest.durationMinutes} minutes
            </span>
            <span className="flex items-center gap-2">
              <ListChecks aria-hidden="true" className="size-4" />
              {contest.problemIds.length} problems
            </span>
            <span>{contest.rated ? "Rated" : "Unrated"} format</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            onClick={() => setRegistered((current) => !current)}
            aria-pressed={registered}
            variant={registered ? "outline" : "default"}
          >
            {registered ? <Check data-icon="inline-start" /> : null}
            {registered ? "Signed up · demo" : "Sign up"}
            {!registered && <ArrowRight data-icon="inline-end" />}
          </Button>
          <Link
            href="/dashboard?view=contests"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            All contests
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <p
          role="status"
          className="text-sm leading-relaxed text-muted-foreground"
        >
          {registered
            ? "You're on the demo list. Your signup resets when you leave."
            : "Demo signup only. Nothing is sent or saved."}
        </p>
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
            className="flex items-center gap-2 text-sm font-medium text-primary"
          >
            <Sun aria-hidden="true" className="size-4" strokeWidth={1.6} />
            Problem of the day
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
            {problem.concept} · {problem.elo.toLocaleString("en-US")} Elo
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
          Solve today&apos;s problem
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}
