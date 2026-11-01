"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Download,
  Info,
  RotateCcw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { catalogProblems, filterCatalog } from "@/lib/corpus-catalog";
import { OlympiadProblemCard } from "./olympiad-problem-card";
import { ImportedProblemReader } from "./imported-problem-reader";
import translationIndex from "@/lib/corpus/translation-index.json";
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
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page =
    pagination.key === filterKey ? Math.min(pagination.page, pageCount) : 1;
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function changePage(next: number) {
    setPagination({ key: filterKey, page: next });
    document
      .getElementById("catalog-results-heading")
      ?.focus({ preventScroll: true });
    document
      .getElementById("catalog-results")
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }

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
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-labelledby="catalog-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="catalog-heading"
              className="text-lg font-medium tracking-tight"
            >
              The olympiad library
            </h2>
            <Badge variant="secondary">
              {topicProblems.length} full problems
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Original-source statements and diagrams across six topics, from 2004
            to 2025. Choose an exercise to open the statement and available
            solution.
          </p>
          <div
            className="flex flex-wrap gap-2"
            aria-label="Competition colour key"
          >
            <Badge variant="ipho">IPhO · {topicProblems.filter((problem) => problem.competition === "IPhO").length}</Badge>
            <Badge variant="apho">APhO · {topicProblems.filter((problem) => problem.competition === "APhO").length}</Badge>
            <Badge variant="eupho">EuPhO · {topicProblems.filter((problem) => problem.competition === "EuPhO").length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            All exercises are unrated and intended for self-review.
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <a
            href="/api/corpus?collection=catalog"
            download="physcratic-100-imported-problems.json"
          >
            <Download data-icon="inline-start" /> Download full corpus JSON
          </a>
        </Button>
      </header>
      <details className="rounded-lg border border-border bg-card p-4 text-card-foreground">
        <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          About sources, translations & solutions
        </summary>
        <div className="pt-4">
          <Alert>
            <Info />
            <AlertTitle>
              100 statements imported · solution review required
            </AlertTitle>
            <AlertDescription>
              {translationIndex.translated} of{" "}
              {translationIndex.russianSourceCount} Russian-source problems have
              English drafts.{" "}
              {
                translationIndex.audit.filter(
                  (record) => record.solutionStatus === "missing-derivation",
                ).length
              }{" "}
              imported mirror solution pages repeat questions without a
              derivation and cannot be grading references. All problems remain
              unrated. Physics, rubric and republication reviews are pending.
            </AlertDescription>
          </Alert>
        </div>
      </details>
      <Card
        id="catalog-results"
        className="min-w-0 scroll-mt-6 overflow-hidden shadow-none"
      >
        <CardHeader>
          <CardTitle>
            <h3
              id="catalog-results-heading"
              tabIndex={-1}
              className="text-base font-medium outline-none"
            >
              Full theory problems
            </h3>
          </CardTitle>
          <CardDescription aria-live="polite">
            {filtered.length} of {topicProblems.length} problems
            {filtered.length > 0 &&
              ` · Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}`}{" "}
            · Self-review only
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {visible.length ? (
            <ul className="flex flex-col gap-4 px-4 pb-5 sm:px-6">
              {visible.map((problem) => (
                <li key={problem.id}>
                  <OlympiadProblemCard
                    problem={problem}
                    onOpen={setActiveProblemId}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpen />
                </EmptyMedia>
                <EmptyTitle>No catalog problems match</EmptyTitle>
                <EmptyDescription>
                  {difficulty !== "all" && difficulty !== "unrated"
                    ? "Catalog problems have no calibrated ELO. Select Unrated or All ratings."
                    : "Try another competition, year, concept or topic."}
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={onReset}>
                <RotateCcw data-icon="inline-start" /> Clear filters
              </Button>
            </Empty>
          )}
        </CardContent>
        {filtered.length > 0 && (
          <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <span className="text-sm text-muted-foreground" aria-live="polite">
              Page {page} of {pageCount}
            </span>
            <nav className="flex items-center gap-2" aria-label="Catalog pages">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => changePage(page - 1)}
              >
                <ArrowLeft data-icon="inline-start" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pageCount}
                onClick={() => changePage(page + 1)}
              >
                Next <ArrowRight data-icon="inline-end" />
              </Button>
            </nav>
          </CardFooter>
        )}
      </Card>
    </section>
  );
}
