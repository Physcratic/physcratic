"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { viewTitles, type Problem, type View } from "@/lib/physics";
import { Overview } from "@/components/physics/overview";
import { ProblemLibrary } from "@/components/physics/problem-library";
import { LearningGuide } from "@/components/physics/learning-guide";
import { Contests } from "@/components/physics/contests";
import { Rankings } from "@/components/physics/rankings";
import { RANKINGS_SEARCH_MAX_LENGTH } from "@/lib/rankings";

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
  discovery,
}: {
  view: View;
  topic?: string;
  query?: string;
  discovery?: ReactNode;
}) {
  const router = useRouter();
  const [rankingSearch, setRankingSearch] = useState("");
  // A guided problem open in the library is the page, so its title is the h1 and this heading steps aside.
  const [reading, setReading] = useState(false);
  const PageTitle = reading ? "p" : "h1";
  function openProblem(problem: Problem) {
    router.push(`/dashboard/problems/${problem.id}`);
  }

  return (
    <div className="workspace-enter flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <PageTitle className="text-2xl font-medium tracking-[-0.04em] sm:text-[27px]">
            {topic || viewTitles[view]}
          </PageTitle>
          {discovery ?? <p className="text-sm leading-relaxed text-muted-foreground">
            {subtitles[view]}
          </p>}
        </div>
        {view === "rankings" && (
          <Field className="w-full sm:w-72">
            <FieldLabel htmlFor="ranking-search" className="sr-only">
              Search contestants
            </FieldLabel>
            <Input
              id="ranking-search"
              type="search"
              maxLength={RANKINGS_SEARCH_MAX_LENGTH}
              value={rankingSearch}
              onChange={(event) => setRankingSearch(event.target.value)}
              placeholder="Search contestants…"
              aria-controls="rankings-table"
            />
          </Field>
        )}
      </div>
      {view === "overview" && (
        <Overview onOpen={openProblem} />
      )}
      {view === "problems" && (
        <ProblemLibrary topic={topic} query={query} onOpen={openProblem} onReadingChange={setReading} />
      )}
      {view === "contests" && <Contests />}
      {view === "rankings" && (
        <Rankings search={rankingSearch} onSearchChange={setRankingSearch} />
      )}
      {view === "guide" && <LearningGuide />}
    </div>
  );
}
