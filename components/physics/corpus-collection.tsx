"use client";

import { useState } from "react";
import { useArchiveProgress } from "@/hooks/use-archive-progress";
import { Button } from "@/components/ui/button";
import { ProblemCollection } from "./problem-collection";
import { corpusProblems, filterCorpus } from "@/lib/corpus-pilot";
import { filterProblemsByTag, getProblemTags } from "@/lib/problem-tags";
import { getEstimatedProblemElo } from "@/lib/problem-archive";
import { CorpusProblemReader } from "./corpus-problem-reader";
import { ProblemCard } from "./problem-card";
import { LoadingLines } from "@/components/loading-lines";

export function CorpusCollection({
  query,
  topic,
  difficulty,
  onReset,
  activeProblemId,
  onActiveProblemChange,
  titleAs,
}: {
  query: string;
  topic: string;
  difficulty: string;
  onReset: () => void;
  activeProblemId?: string;
  onActiveProblemChange: (id: string | undefined) => void;
  /** The level of the open problem's title. It is the page heading when a problem is open. */
  titleAs?: "h1" | "h2";
}) {
  const active = corpusProblems.find(
    (problem) => problem.id === activeProblemId,
  );
  const saved = useArchiveProgress();
  const [noteEdits, setNotes] = useState<Record<string, string>>({});
  const [reviewEdits, setReviewed] = useState<Record<string, boolean>>({});
  // Discard unsaved edits before rendering a different account after a session refresh.
  const accountId = saved.session.data?.user.id ?? null;
  const [editOwner, setEditOwner] = useState(accountId);
  if (editOwner !== accountId) {
    setEditOwner(accountId);
    setNotes({});
    setReviewed({});
  }
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
  const filterKey = JSON.stringify([query, topic, difficulty]);
  const [pagination, setPagination] = useState({ key: filterKey, page: 1 });

  if (active)
    return (
      <div className="flex flex-col gap-4">
        {(saved.session.isPending || saved.progress.isLoading) && (
          <LoadingLines label="Loading your saved archive notes…" />
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
        <div className="min-w-0">
          <CorpusProblemReader
            key={active.id}
            titleAs={titleAs}
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
            sessionPending={saved.session.isPending}
            disabled={disabled}
            savedTask={saved.savedTask}
            saving={saved.saving}
          />
        </div>
        {saved.saveError && (
          <p role="alert" className="text-sm text-destructive">
            {saved.saveError}
          </p>
        )}
      </div>
    );

  return (
    <ProblemCollection
      id="guided-results"
      title="Official-source theory problems"
      paginationLabel="Guided exercise"
      items={filtered}
      totalCount={filterProblemsByTag(corpusProblems, topic).length}
      filterKey={filterKey}
      pagination={{ ...pagination, onChange: setPagination }}
      status="Self-review only"
      renderProblem={(problem) => (
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
      )}
      emptyTitle="No pilot problems match"
      emptyDescription="Try another year, topic, title, concept or difficulty range."
      onReset={onReset}
    />
  );
}
