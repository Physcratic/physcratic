import * as React from "react";
import { filterProblemsByTag, getProblemTags } from "@/lib/problem-tags";
import { getEstimatedProblemElo } from "@/lib/problem-archive";
import arena from "@/lib/arena/index.json";
import { filterArena, type ArenaCatalogEntry } from "@/lib/arena-schema";
import { arenaCardImage } from "@/lib/arena/card-image";
import { ProblemCard } from "./problem-card";
import { ProblemCollection } from "./problem-collection";

export function ArenaCollection({
  query,
  topic,
  difficulty,
  onReset,
}: {
  query: string;
  topic: string;
  difficulty: string;
  onReset: () => void;
}) {
  const filtered = filterArena(arena.problems as ArenaCatalogEntry[], {
    query,
    topic,
    difficulty,
  });
  return (
    <ProblemCollection
      id="arena-results"
      title="Physcratic Arena"
      paginationLabel="Arena"
      items={filtered}
      totalCount={filterProblemsByTag(arena.problems, topic).length}
      filterKey={JSON.stringify([query, topic, difficulty])}
      renderProblem={(problem) => (
        <ProblemCard
          id={problem.id}
          title={problem.title}
          headingLevel={4}
          source="Physcratic Arena"
          statementLanguage="en"
          description={problem.summary}
          elo={getEstimatedProblemElo(problem.id)}
          tags={getProblemTags(problem)}
          image={arenaCardImage(problem.id)}
          href={`/dashboard/problems/${problem.id}`}
        />
      )}
      emptyMessage="No Arena problems match these filters."
      onReset={onReset}
    />
  );
}
