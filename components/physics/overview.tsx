"use client";

import type { Problem } from "@/lib/physics";
import dynamic from "next/dynamic";
import { CoachingCard } from "./coaching-card";
import { DashboardHighlights } from "./dashboard-highlights";
import { ProblemHistory } from "./problem-history";
import { RatingCard } from "./rating-card";

const FavouriteHistory = dynamic(() => import("./favourite-history").then(m => m.FavouriteHistory));

export function Overview({ onOpen, favouritesEnabled = false }: { onOpen: (problem: Problem) => void; favouritesEnabled?: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex min-w-0 flex-col gap-5">
        <DashboardHighlights />
        <RatingCard horizontal />
        <CoachingCard />
      </div>
      <ProblemHistory onOpen={onOpen} />
      {favouritesEnabled && <FavouriteHistory />}
    </div>
  );
}
