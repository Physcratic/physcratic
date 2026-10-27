"use client";

import type { Problem } from "@/lib/physics";
import { DashboardHighlights } from "./dashboard-highlights";
import { ProblemHistory } from "./problem-history";
import { RatingCard } from "./rating-card";

export function Overview({
  dailyProblem,
  onOpen,
}: {
  dailyProblem: Problem;
  onOpen: (problem: Problem) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex min-w-0 flex-col gap-5">
        <DashboardHighlights dailyProblem={dailyProblem} onOpen={onOpen} />
        <RatingCard horizontal />
      </div>
      <ProblemHistory onOpen={onOpen} />
    </div>
  );
}
