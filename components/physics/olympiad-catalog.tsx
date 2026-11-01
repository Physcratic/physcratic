"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Download, RotateCcw } from "lucide-react";
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
import { filterProblemsByTag } from "@/lib/problem-tags";

function CatalogPagination({
  page,
  pageCount,
  onPageChange,
  placement,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  placement: "top" | "bottom";
}) {
  const controls = (
    <>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {pageCount}
      </span>
      <nav
        className="flex items-center gap-2"
        aria-label={`Catalog pages (${placement})`}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ArrowLeft data-icon="inline-start" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ArrowRight data-icon="inline-end" />
        </Button>
      </nav>
    </>
  );

  return placement === "top" ? (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
      {controls}
    </div>
  ) : (
    <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      {controls}
    </CardFooter>
  );
}

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
      aria-labelledby="catalog-results-heading"
    >
      <header className="flex justify-end">
        <Button size="sm" variant="outline" asChild>
          <a
            href="/api/corpus?collection=catalog"
            download="physcratic-100-imported-problems.json"
          >
            <Download data-icon="inline-start" /> Download full corpus JSON
          </a>
        </Button>
      </header>
      <Card
        id="catalog-results"
        className="min-w-0 scroll-mt-6 overflow-hidden shadow-none"
      >
        {filtered.length > 0 && (
          <CatalogPagination
            page={page}
            pageCount={pageCount}
            onPageChange={changePage}
            placement="top"
          />
        )}
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
                  Try another competition, year, concept, topic or difficulty range.
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={onReset}>
                <RotateCcw data-icon="inline-start" /> Clear filters
              </Button>
            </Empty>
          )}
        </CardContent>
        {filtered.length > 0 && (
          <CatalogPagination
            page={page}
            pageCount={pageCount}
            onPageChange={changePage}
            placement="bottom"
          />
        )}
      </Card>
    </section>
  );
}
