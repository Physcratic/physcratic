"use client";

import { useState } from "react";
import { ArrowRight, BookOpen, Download, Info, RotateCcw } from "lucide-react";
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
import { corpusProblems, filterCorpus } from "@/lib/corpus-pilot";
import type { CorpusProblem } from "@/lib/corpus-schema";
import { CorpusProblemReader } from "./corpus-problem-reader";

export function CorpusCollection({
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
  const [active, setActive] = useState<CorpusProblem | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const filtered = filterCorpus({ query, topic, difficulty });

  if (active)
    return (
      <CorpusProblemReader
        key={active.id}
        problem={active}
        notes={notes}
        reviewed={reviewed}
        onBack={() => setActive(null)}
        onNotesChange={(id, value) =>
          setNotes((current) => ({ ...current, [id]: value }))
        }
        onReviewToggle={(id) =>
          setReviewed((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
      />
    );

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium tracking-tight">
              The import pilot
            </h2>
            <Badge variant="secondary">
              {corpusProblems.length} complete papers
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            IPhO 2011, 2015 & 2025. Original statements and solutions, with a
            structured subpart index. Five full problems, not a collection of
            isolated answer fragments.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/corpus" download="physcratic-corpus-pilot.json">
            <Download data-icon="inline-start" />
            Export pilot JSON
          </a>
        </Button>
      </div>
      <Alert>
        <Info />
        <AlertTitle>Source-fidelity pilot · review pending</AlertTitle>
        <AlertDescription>
          Native text is an editorial guide; original pages are authoritative.
          All five are unrated. Independent physics review and reuse clearance
          are still pending.
        </AlertDescription>
      </Alert>
      <Card className="min-w-0 overflow-hidden shadow-none">
        <CardHeader>
          <CardTitle>
            <h3 className="text-base font-medium">
              Official-source theory problems
            </h3>
          </CardTitle>
          <CardDescription aria-live="polite">
            {filtered.length} of {corpusProblems.length} problems ·{" "}
            {filtered.reduce((sum, problem) => sum + problem.parts.length, 0)}{" "}
            scored subparts · Self-review only
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {filtered.length ? (
            <ul className="divide-y divide-border">
              {filtered.map((problem) => (
                <li key={problem.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => setActive(problem)}
                    aria-label={`Open ${problem.title}, IPhO ${problem.year} ${problem.code}`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          IPhO {problem.year} · {problem.code}
                        </span>
                        <Badge variant="outline">Unrated</Badge>
                      </div>
                      <span className="text-pretty text-base font-medium">
                        {problem.title}
                      </span>
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        {problem.tags.slice(0, 3).join(" · ")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {problem.parts.length} scored subparts · {problem.pages}{" "}
                        original pages · Official solution
                      </span>
                    </div>
                    <ArrowRight
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpen />
                </EmptyMedia>
                <EmptyTitle>No pilot problems match</EmptyTitle>
                <EmptyDescription>
                  {difficulty !== "all" && difficulty !== "unrated"
                    ? "These source problems have no calibrated Elo yet. Select Unrated or All ratings."
                    : "Try another year, topic, title, or concept."}
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={onReset}>
                <RotateCcw data-icon="inline-start" />
                Clear filters
              </Button>
            </Empty>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {corpusProblems.reduce(
              (sum, problem) => sum + problem.parts.length,
              0,
            )}{" "}
            scored subparts across the batch. Grouped requests such as 2011 task
            1.2 retain their nested questions; subparts are not counted as
            separate archive problems.
          </p>
        </CardFooter>
      </Card>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Portable JSON includes provenance, attribution, native reading notes,
        subpart mappings, local PDF/image paths, review status, and SHA-256
        checksums. Files stay in the project; no database or background importer
        is connected.
      </p>
    </div>
  );
}
