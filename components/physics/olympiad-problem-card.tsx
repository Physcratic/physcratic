"use client";

import { ArrowUpRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CatalogProblem } from "@/lib/corpus-catalog";
import translationIndex from "@/lib/corpus/translation-index.json";

const competitionVariants = {
  IPhO: "ipho",
  APhO: "apho",
  EuPhO: "eupho",
} as const;

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
  return (
    <article
      className="problem-entry"
      data-competition={problem.competition}
      aria-labelledby={`${problem.id}-title`}
    >
      <header className="problem-entry-header flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={competitionVariants[problem.competition]}>
            {problem.competition}
          </Badge>
          <span className="text-sm font-medium">
            {problem.year} · {problem.code}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {problem.primaryTopic}
        </span>
      </header>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h4
            id={`${problem.id}-title`}
            lang={problem.titleLanguage}
            className="text-pretty text-lg font-semibold leading-relaxed"
          >
            {problem.title}
          </h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {problem.importLanguage === "ru"
              ? hasEnglishDraft
                ? "Russian statement · English draft available"
                : "Russian statement · English translation pending"
              : "English statement"}
            {problem.titleLanguage === "ru" && " · Source title in Russian"}
            {problem.titleOrigin === "problem-identifier" &&
              " · Original paper has no descriptive title"}
          </p>
        </div>
        <Button
          variant="outline-transparent"
          size="sm"
          onClick={() => onOpen(problem.id)}
          aria-label={`Exercise: ${problem.competition} ${problem.year} ${problem.code} — ${problem.title}`}
        >
          <BookOpen data-icon="inline-start" /> Exercise{" "}
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </div>
      <footer className="problem-entry-details flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">Concepts</span>
          {problem.tags.map((tag) => (
            <Badge key={tag} variant="concept">
              {tag}
            </Badge>
          ))}
        </div>
        <span
          className="text-sm"
          title="Practice and self-review only. This exercise does not award ELO."
        >
          Unrated · Self-review
        </span>
      </footer>
    </article>
  );
}
