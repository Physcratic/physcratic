"use client";

import { useState } from "react";
import { useArchiveProgress } from "@/hooks/use-archive-progress";
import { BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { getEstimatedProblemElo } from "@/lib/problem-archive";
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
                    source={problem.competition}
                    competition={problem.competition}
                    reference={`${problem.year} · ${problem.code}`}
                    statementLanguage="en"
                    elo={getEstimatedProblemElo(problem.id)}
                    description={problem.summary}
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
                  Try another year, topic, title, concept or difficulty range.
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={onReset}>
                <RotateCcw data-icon="inline-start" />
                Clear filters
              </Button>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
