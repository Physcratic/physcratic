"use client";

import type { Problem } from "@/lib/physics";
import { CoachingCard } from "./coaching-card";
import { DashboardHighlights } from "./dashboard-highlights";
import { ProblemHistory } from "./problem-history";
import { RatingCard } from "./rating-card";

export function Overview({ onOpen }: { onOpen: (problem: Problem) => void }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex min-w-0 flex-col gap-5">
        <DashboardHighlights />
        <RatingCard horizontal />
        <CoachingCard />
      </div>
      <ProblemHistory onOpen={onOpen} />
    </div>
  );
}
