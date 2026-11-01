"use client";

import { useState } from "react";
import { ProblemCollection } from "./problem-collection";
import { catalogProblems, filterCatalog } from "@/lib/corpus-catalog";
import { OlympiadProblemCard } from "./olympiad-problem-card";
import { ImportedProblemReader } from "./imported-problem-reader";
import { filterProblemsByTag } from "@/lib/problem-tags";

export function OlympiadCatalog({
  query,
  topic,
  competition,
  difficulty,
  onReset,
  onOpenImported,
}: {
  query: string;
  topic: string;
  competition: string;
  difficulty: string;
  onReset: () => void;
  onOpenImported: (id: string) => void;
}) {
  const topicProblems = filterProblemsByTag(catalogProblems, topic);
  const filtered = filterCatalog({
    query,
    topic,
    competition,
    difficulty,
  }).toSorted(
    (a, b) =>
      b.year - a.year ||
      a.competition.localeCompare(b.competition) ||
      a.code.localeCompare(b.code),
  );
  const filterKey = JSON.stringify([query, topic, competition, difficulty]);
  const [pagination, setPagination] = useState({ key: filterKey, page: 1 });
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
  const activeProblem = catalogProblems.find(
    (problem) => problem.id === activeProblemId,
  );
  if (activeProblem)
    return (
      <ImportedProblemReader
        key={activeProblem.id}
        problem={activeProblem}
        onBack={() => setActiveProblemId(null)}
        onOpenPilot={onOpenImported}
      />
    );

  return (
    <ProblemCollection
      id="catalog-results"
      title="Full theory problems"
      paginationLabel="Catalog"
      items={filtered}
      totalCount={topicProblems.length}
      filterKey={filterKey}
      pagination={{ ...pagination, onChange: setPagination }}
      status="Self-review only"
      renderProblem={(problem) => (
        <OlympiadProblemCard problem={problem} onOpen={setActiveProblemId} />
      )}
      emptyTitle="No catalog problems match"
      emptyDescription="Try another competition, year, concept, topic or difficulty range."
      onReset={onReset}
    />
  );
}
