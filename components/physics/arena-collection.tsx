import * as React from "react";
import { filterProblemsByTag, getProblemTags } from "@/lib/problem-tags";
import { getEstimatedProblemElo } from "@/lib/problem-archive";
import { BookOpen, RotateCcw } from "lucide-react";
import arena from "@/lib/arena/index.json";
import { filterArena, type ArenaCatalogEntry } from "@/lib/arena-schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProblemCard } from "./problem-card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-labelledby="arena-heading"
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="arena-heading" className="text-lg font-medium tracking-tight">
            Physcratic Arena
          </h2>
          <Badge variant="secondary">
            {filterProblemsByTag(arena.problems, topic).length} full problems
          </Badge>
        </div>
        <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          Your Arena collection, typeset for the web. Complete statements,
          original diagrams and worked solutions—with selectable text and LaTeX
          equations, not PDF previews.
        </p>
      </header>
      {filtered.length ? (
        <ul className="flex min-w-0 flex-col gap-4">
          {filtered.map((problem) => (
            <li key={problem.id} className="min-w-0">
              <ProblemCard
                id={problem.id}
                title={problem.title}
                source="Physcratic Arena"
                statementLanguage="en"
                description={problem.summary}
                elo={getEstimatedProblemElo(problem.id)}
                tags={getProblemTags(problem)}
                href={`/dashboard/problems/${problem.id}`}
              />
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No Arena problems found</EmptyTitle>
            <EmptyDescription>
              Try a different search, tag or difficulty range.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={onReset}>
              <RotateCcw data-icon="inline-start" />
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
}
