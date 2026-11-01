"use client";

import type { CatalogProblem } from "@/lib/corpus-catalog";
import { getProblemTags } from "@/lib/problem-tags";
import translationIndex from "@/lib/corpus/translation-index.json";
import { ProblemCard } from "./problem-card";

export function OlympiadProblemCard({
  problem,
  onOpen,
}: {
  problem: CatalogProblem;
  onOpen: (id: string) => void;
}) {
  const hasEnglishDraft = translationIndex.records.some(
    (record) => record.id === problem.id,
  );
  const description = [
    problem.importLanguage === "ru"
      ? hasEnglishDraft
        ? "Russian statement · English draft available"
        : "Russian statement · English translation pending"
      : "English statement",
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
      description={description}
      details={["Full theory problem", "Self-review · No ELO awarded"]}
      tags={getProblemTags(problem)}
      onOpen={() => onOpen(problem.id)}
    />
  );
}
