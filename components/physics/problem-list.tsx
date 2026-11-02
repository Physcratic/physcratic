"use client";

import type { Problem } from "@/lib/physics";
import { getProblemTags } from "@/lib/problem-tags";
import { ProblemCard } from "./problem-card";

export function PracticeProblemCard({
  problem,
  headingLevel = 3,
  onOpen,
}: {
  problem: Problem;
  headingLevel?: 3 | 4;
  onOpen: (problem: Problem) => void;
}) {
  return (
    <ProblemCard
      id={problem.id}
      title={problem.title}
      headingLevel={headingLevel}
      source="Quick practice"
      details={[`${problem.minutes} min`, "Hint + worked solution", "Practice only"]}
      tags={getProblemTags(problem)}
      elo={problem.elo}
      onOpen={() => onOpen(problem)}
    />
  );
}

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
          <PracticeProblemCard problem={problem} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
