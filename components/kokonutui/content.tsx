"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { problems, viewTitles, type Problem, type View } from "@/lib/physics";
import { Overview } from "@/components/physics/overview";
import { ProblemLibrary } from "@/components/physics/problem-library";
import { LearningGuide } from "@/components/physics/learning-guide";
import { Contests } from "@/components/physics/contests";
import { Rankings } from "@/components/physics/rankings";

const subtitles: Record<View, string> = {
  overview: "Today's problem, your rating and recommended practice.",
  problems: "Browse practice problems and filter by topic.",
  contests: "Upcoming and past contests.",
  rankings: "Contestants ranked by rating.",
  guide: "How Physcratic works.",
};

export default function Content({
  view,
  topic,
  query,
  dailyProblem,
}: {
  view: View;
  topic?: string;
  query?: string;
  dailyProblem: Problem;
}) {
  const router = useRouter();
  const [rankingSearch, setRankingSearch] = useState("");
  function openProblem(problem: Problem) {
    router.push(`/dashboard/problems/${problem.id}`);
  }
  const choices = topic
    ? problems.filter((problem) => problem.topic === topic)
    : problems;
  function openRandomProblem() {
    if (!choices.length) return;
    openProblem(choices[Math.floor(Math.random() * choices.length)]);
  }

  return (
    <div className="workspace-enter flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-[-0.04em] sm:text-[27px]">
            {topic || viewTitles[view]}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {subtitles[view]}
          </p>
        </div>
        {view === "rankings" && (
          <Field className="w-full sm:w-72">
            <FieldLabel htmlFor="ranking-search" className="sr-only">
              Search contestants
            </FieldLabel>
            <Input
              id="ranking-search"
              type="search"
              value={rankingSearch}
              onChange={(event) => setRankingSearch(event.target.value)}
              placeholder="Search contestants…"
              aria-controls="rankings-table"
            />
          </Field>
        )}
        {view === "problems" && (
          <Button
            variant="outline"
            size="sm"
            onClick={openRandomProblem}
            disabled={!choices.length}
          >
            <Shuffle data-icon="inline-start" />
            Random quick practice
          </Button>
        )}
      </div>
      {view === "overview" && (
        <Overview dailyProblem={dailyProblem} onOpen={openProblem} />
      )}
      {view === "problems" && (
        <ProblemLibrary topic={topic} query={query} onOpen={openProblem} />
      )}
      {view === "contests" && <Contests />}
      {view === "rankings" && (
        <Rankings search={rankingSearch} onSearchChange={setRankingSearch} />
      )}
      {view === "guide" && <LearningGuide />}
    </div>
  );
}
