"use client";

import type { Problem } from "@/lib/physics";
import { getProblemTags } from "@/lib/problem-tags";
import { ProblemCard } from "./problem-card";

export function ProblemList({
  items,
  onOpen,
}: {
  items: Problem[];
  onOpen: (problem: Problem) => void;
}) {
  return (
    <ul className="flex min-w-0 flex-col gap-4 px-4 pb-5 sm:px-6">
      {items.map((problem) => (
        <li key={problem.id} className="min-w-0">
          <ProblemCard
            id={problem.id}
            title={problem.title}
            source="Quick practice"
            description={problem.prompt}
            details={[`${problem.minutes} min`, "Hint + worked solution", "Practice only"]}
            tags={getProblemTags(problem)}
            elo={problem.elo}
            onOpen={() => onOpen(problem)}
          />
        </li>
      ))}
    </ul>
  );
}
