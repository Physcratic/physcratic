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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  catalogCoverage,
  catalogProblems,
  competitions,
  filterCatalog,
  type CatalogProblem,
} from "@/lib/corpus-catalog";
import { ImportedProblemReader } from "./imported-problem-reader";
import translationIndex from "@/lib/corpus/translation-index.json";

function SourceActions({
  problem,
  onOpen,
}: {
  problem: CatalogProblem;
  onOpen: (id: string) => void;
}) {
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => onOpen(problem.id)}
      aria-label={`Read ${problem.title} in the app`}
    >
      <BookOpen data-icon="inline-start" /> Read problem
    </Button>
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
              {catalogProblems.length} full problems
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            40 IPhO · 35 APhO · 25 EuPhO. Complete statements and diagrams
            imported across six topics, from 2004 to 2025. Solution completeness
            and English translation progress are tracked separately.
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <a
            href="/corpus/collection.json"
            download="physcratic-100-imported-problems.json"
          >
            <Download data-icon="inline-start" /> Download full corpus JSON
          </a>
        </Button>
      </header>
      <Alert>
        <Info />
        <AlertTitle>
          100 statements imported · solution review required
        </AlertTitle>
        <AlertDescription>
          {translationIndex.translated} of {translationIndex.russianSourceCount} Russian-source
          problems have English drafts. {translationIndex.audit.filter((record) => record.solutionStatus === "missing-derivation").length} imported
          mirror solution pages repeat questions without a derivation and cannot
          be grading references. All problems remain unrated. Physics, rubric and
          republication reviews are pending.
        </AlertDescription>
      </Alert>
      <details className="rounded-lg border border-border px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Topic coverage & source audit
        </summary>
        <div className="flex flex-col gap-3 pt-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Each problem counts under one editorial primary topic. Concept tags
            remain searchable. Actual coverage is shown against the proposed
            targets, not disguised as a completed quota.
          </p>
          <Table>
            <TableCaption>
              Source and solution URLs checked 28 October 2026. Accessibility
              checks do not establish authorship, full content fidelity or reuse
              permission.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Primary topic</TableHead>
                {competitions.map((name) => (
                  <TableHead key={name} scope="col" className="text-right">
                    {name}
                  </TableHead>
                ))}
                <TableHead scope="col" className="text-right">
                  Actual / target
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogCoverage.map((row) => (
                <TableRow key={row.topic}>
                  <TableCell className="font-medium">{row.topic}</TableCell>
                  {competitions.map((name) => (
                    <TableCell key={name} className="text-right tabular-nums">
                      {row.byCompetition[name]}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">
                    {row.count} / {row.target}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Original PDF layouts are preserved, including shared year papers
            where needed. Every imported problem includes selectable source text
            and locally stored figures. Russian mirror imports are labeled;
            pho.rs is a source host, not a fourth competition. The original five
            pilot problems also retain their structured subpart guides.
          </p>
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
            {filtered.length} of {catalogProblems.length} problems
            {filtered.length > 0 &&
              ` · Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}`}{" "}
            · Self-review only
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {visible.length ? (
            <ul className="divide-y divide-border">
              {visible.map((problem) => (
                <li
                  key={problem.id}
                  className="flex flex-col gap-4 px-6 py-5 xl:flex-row xl:items-center xl:justify-between"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {problem.competition} {problem.year} · {problem.code}
                      </span>
                      <Badge variant="outline">Imported</Badge>
                    </div>
                    <h4 className="text-pretty text-base font-medium">
                      {problem.title}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{problem.primaryTopic}</Badge>
                      {problem.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {problem.importLanguage === "ru"
                        ? translationIndex.records.some((record) => record.id === problem.id)
                          ? "English draft available · Russian original retained · local text & diagrams"
                          : "Russian source · English translation pending · local text & diagrams"
                        : "English source · local PDFs & diagrams"}{" "}
                      · Unrated
                    </p>
                  </div>
                  <SourceActions
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
                    ? "Catalog problems have no calibrated Elo. Select Unrated or All ratings."
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
