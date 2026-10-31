"use client";

import type { CatalogProblem } from "@/lib/corpus-catalog";
import { getProblemTags } from "@/lib/problem-tags";
import { ProblemCard } from "./problem-card";

export function OlympiadProblemCard({
  problem,
  onOpen,
}: {
  problem: CatalogProblem;
  onOpen: (id: string) => void;
}) {
  const description = [
    problem.titleLanguage === "ru" && "Source title in Russian",
    problem.titleOrigin === "problem-identifier" &&
      "Original paper has no descriptive title",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ProblemCard
      id={problem.id}
      title={problem.title}
      titleLanguage={problem.titleLanguage}
      headingLevel={4}
      source={problem.competition}
      competition={problem.competition}
      reference={`${problem.year} · ${problem.code}`}
      statementLanguage={problem.importLanguage}
      description={description}
      tags={getProblemTags(problem)}
      onOpen={() => onOpen(problem.id)}
    />
  );
}
