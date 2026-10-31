"use client";

import { useState } from "react";
import { useArchiveProgress } from "@/hooks/use-archive-progress";
import { BookOpen, Download, Info, RotateCcw } from "lucide-react";
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
import { getProblemTags } from "@/lib/problem-tags";
import { CorpusProblemReader } from "./corpus-problem-reader";
import { ProblemCard } from "./problem-card";

export function CorpusCollection({
  query,
  topic,
  difficulty,
  onReset,
  activeProblemId,
  onActiveProblemChange,
}: {
  query: string;
  topic: string;
  difficulty: string;
  onReset: () => void;
  activeProblemId?: string;
  onActiveProblemChange: (id: string | undefined) => void;
}) {
  const active = corpusProblems.find(
    (problem) => problem.id === activeProblemId,
  );
  const saved = useArchiveProgress();
  const [noteEdits, setNotes] = useState<Record<string, string>>({});
  const [reviewEdits, setReviewed] = useState<Record<string, boolean>>({});
  const notes = {
    ...Object.fromEntries(
      Object.values(saved.stored).map((entry) => [entry.taskId, entry.notes]),
    ),
    ...noteEdits,
  };
  const reviewed = new Set(
    Object.entries({
      ...Object.fromEntries(
        Object.values(saved.stored).map((entry) => [
          entry.taskId,
          entry.reviewed,
        ]),
      ),
      ...reviewEdits,
    })
      .filter(([, value]) => value)
      .map(([id]) => id),
  );
  const disabled =
    saved.saving ||
    saved.session.isPending ||
    saved.progress.isLoading ||
    !!saved.session.error ||
    !!saved.progress.error;
  const filtered = filterCorpus({ query, topic, difficulty });

  if (active)
    return (
      <div className="flex flex-col gap-4">
        {(saved.session.isPending || saved.progress.isLoading) && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading your saved archive notes…
          </p>
        )}
        {(saved.session.error || saved.progress.error) && (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-destructive">
              Could not load saved progress. Retry before editing.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                void saved.session.refetch();
                void saved.progress.mutate();
              }}
            >
              Retry progress
            </Button>
          </div>
        )}
        <fieldset disabled={disabled} className="min-w-0">
          <CorpusProblemReader
            key={active.id}
            problem={active}
            notes={notes}
            reviewed={reviewed}
            onBack={() => onActiveProblemChange(undefined)}
            onNotesChange={(id, value) => {
              saved.setSavedTask(null);
              setNotes((current) => ({ ...current, [id]: value }));
            }}
            onReviewToggle={(id) => {
              saved.setSavedTask(null);
              setReviewed((current) => ({
                ...current,
                [id]: !reviewed.has(id),
              }));
            }}
            onSaveProgress={(id) =>
              saved.saveTask({
                taskId: id,
                notes: notes[id] ?? "",
                answer: "",
                reviewed: reviewed.has(id),
              })
            }
            signedIn={!!saved.session.data?.user}
            savedTask={saved.savedTask}
            saving={saved.saving}
          />
        </fieldset>
        {saved.saveError && (
          <p role="alert" className="text-sm text-destructive">
            {saved.saveError}
          </p>
        )}
      </div>
    );

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-destructive p-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium tracking-tight">
              Guided olympiad exercises
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
      <Alert className="border-destructive">
        <Info />
        <AlertTitle>Source-fidelity pilot · review pending</AlertTitle>
        <AlertDescription>
          Native text is an editorial guide, original pages are authoritative.
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
            <ul className="flex flex-col gap-4 px-4 pb-5 sm:px-6">
              {filtered.map((problem) => (
                <li key={problem.id} className="min-w-0">
                  <ProblemCard
                    id={problem.id}
                    title={problem.title}
                    headingLevel={4}
                    highlightTitleRow={problem.id === "ipho-2025-t3"}
                    source={problem.competition}
                    competition={problem.competition}
                    reference={`${problem.year} · ${problem.code}`}
                    statementLanguage="en"
                    description={problem.summary}
                    details={[
                      `${problem.parts.length} scored subparts`,
                      `${problem.pages} original pages`,
                      "Official solution · Self-review",
                    ]}
                    tags={getProblemTags(problem)}
                    onOpen={() => onActiveProblemChange(problem.id)}
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
                <EmptyTitle>No pilot problems match</EmptyTitle>
                <EmptyDescription>
                  {difficulty !== "all" && difficulty !== "unrated"
                    ? "These source problems have no calibrated ELO yet. Select Unrated or All ratings."
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
          <p className="rounded-lg border border-destructive p-3 text-sm leading-relaxed text-muted-foreground">
            {corpusProblems.reduce(
              (sum, problem) => sum + problem.parts.length,
              0,
            )}{" "}
            scored subparts across the batch. Grouped requests such as 2011 task
            1.2 retain their nested questions, subparts are not counted as
            separate archive problems.
          </p>
        </CardFooter>
      </Card>
      <p className="rounded-lg border border-destructive p-3 text-sm leading-relaxed text-muted-foreground">
        Portable JSON includes provenance, attribution, native reading notes,
        subpart mappings, local PDF/image paths, review status, and SHA-256
        checksums. Files stay in the project, no database or background importer
        is connected.
      </p>
    </div>
  );
}
