"use client";

import { useState } from "react";
import Link from "next/link";
import { useArchiveProgress } from "@/hooks/use-archive-progress";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  iphoExperimentCount,
  iphoPapers,
  iphoPdf,
  iphoSubproblems,
  iphoTheoryCount,
  type IphoPaperId,
} from "@/lib/ipho-archive";
import { IphoPaperPicker, IphoSubproblemNavigation } from "./ipho-navigation";
import { solveTokens } from "./solve-ui";
import { IphoProblem } from "./ipho-problem";

export function IphoContest({ onExit }: { onExit: () => void }) {
  const [activeId, setActiveId] = useState(iphoSubproblems[0].id);
  const [lastTaskByPaper, setLastTaskByPaper] = useState<
    Record<string, string>
  >({});
  const {
    session,
    progress,
    stored,
    saving,
    saveError,
    savedTask,
    setSavedTask,
    saveTask,
  } = useArchiveProgress();
  const [answerEdits, setAnswers] = useState<Record<string, string>>({});
  const [noteEdits, setNotes] = useState<Record<string, string>>({});
  const [reviewEdits, setReviewed] = useState<Record<string, boolean>>({});
  const [accepted, setAccepted] = useState<string[]>([]);
  const answers = Object.fromEntries(
    iphoSubproblems.map((entry) => [
      entry.id,
      answerEdits[entry.id] ?? stored[entry.id]?.answer ?? "",
    ]),
  );
  const notes = Object.fromEntries(
    iphoSubproblems.map((entry) => [
      entry.id,
      noteEdits[entry.id] ?? stored[entry.id]?.notes ?? "",
    ]),
  );
  const reviewed = iphoSubproblems
    .filter(
      (entry) => reviewEdits[entry.id] ?? stored[entry.id]?.reviewed ?? false,
    )
    .map((entry) => entry.id);
  async function saveProgress() {
    if (saving || !session.data?.user) return;
    const taskId = activeId;
    const input = {
      taskId,
      answer: answers[taskId],
      notes: notes[taskId],
      reviewed: reviewed.includes(taskId),
    };
    await saveTask(input);
  }
  const index = iphoSubproblems.findIndex((task) => task.id === activeId);
  const task = iphoSubproblems[index];
  const paper = iphoPapers.find((item) => item.id === task.paperId)!;
  const paperTasks = iphoSubproblems.filter(
    (item) => item.paperId === paper.id,
  );
  const paperReviewed = paperTasks.filter((item) =>
    reviewed.includes(item.id),
  ).length;

  function selectTask(id: string) {
    const selected = iphoSubproblems.find((item) => item.id === id);
    if (!selected) return;
    setActiveId(id);
    setLastTaskByPaper((current) => ({ ...current, [selected.paperId]: id }));
  }

  function selectPaper(id: IphoPaperId) {
    selectTask(
      lastTaskByPaper[id] ||
        iphoSubproblems.find((item) => item.paperId === id)!.id,
    );
  }

  return (
    <section
      className={`flex min-w-0 flex-col gap-6 ${solveTokens}`}
      aria-labelledby="ipho-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Past-paper practice</Badge>
            <Badge variant="outline">France · 2025 · Unrated</Badge>
          </div>
          <h2
            id="ipho-title"
            className="text-balance text-2xl font-medium tracking-tight"
          >
            The IPhO 2025 collection
          </h2>
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            Every numbered subproblem from the three theory and two experimental
            papers. {iphoTheoryCount} theory, {iphoExperimentCount} experimental
            with original figures, complete papers, and official solutions
            included.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onExit}>
          <ArrowLeft data-icon="inline-start" />
          Back to contests
        </Button>
      </div>

      <IphoPaperPicker activePaper={paper.id} onSelect={selectPaper} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span>
            {reviewed.length} of {iphoSubproblems.length} subproblems reviewed
          </span>
          <span className="text-muted-foreground">
            Self-paced · Save each subproblem to keep changes
          </span>
        </div>
        <Progress
          value={(reviewed.length / iphoSubproblems.length) * 100}
          aria-label="IPhO self-reviewed subproblems"
          className="h-1.5"
        />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 border-t pt-5">
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="text-balance text-lg font-medium tracking-tight">
            {paper.code} · {paper.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {paper.topic} · 10 points · {paperReviewed}/{paperTasks.length}{" "}
            reviewed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={iphoPdf(paper.id, "questions")}
              target="_blank"
              rel="noopener noreferrer"
            >
              Full paper
              <ArrowUpRight data-icon="inline-end" />
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={iphoPdf(paper.id, "answer-sheet")}
              target="_blank"
              rel="noopener noreferrer"
            >
              Answer sheet
              <ArrowUpRight data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-5 min-[1150px]:grid-cols-[240px_minmax(0,1fr)]">
        <IphoSubproblemNavigation
          paper={paper}
          activeId={activeId}
          reviewed={reviewed}
          onSelect={selectTask}
        />
        <div className="flex min-w-0 flex-col gap-4">
          {(session.isPending || progress.isLoading) && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading your saved archive progress…
            </p>
          )}
          {(session.error || progress.error) && (
            <div className="flex flex-col items-start gap-3">
              <p role="alert" className="text-sm text-destructive">
                Your saved progress could not be loaded. Retry before editing to
                avoid overwriting saved work.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  void session.refetch();
                  void progress.mutate();
                }}
              >
                Retry saved progress
              </Button>
            </div>
          )}
          {!session.isPending && !session.error && !session.data?.user && (
            <p className="text-sm text-muted-foreground">
              <Link
                href="/sign-in?returnTo=%2Fdashboard%3Fview%3Dcontests"
                className="underline underline-offset-4"
              >
                Sign in
              </Link>{" "}
              before working to save archive notes and review marks. Guest edits
              are not saved.
            </p>
          )}
          <fieldset
            disabled={
              saving ||
              session.isPending ||
              progress.isLoading ||
              !!progress.error ||
              !!session.error
            }
            className="min-w-0"
          >
            <IphoProblem
              key={task.id}
              task={task}
              paper={paper}
              answer={answers[task.id] || ""}
              accepted={accepted.includes(task.id)}
              notes={notes[task.id] || ""}
              reviewed={reviewed.includes(task.id)}
              onNotesChange={(value) => {
                setSavedTask(null);
                setNotes((current) => ({ ...current, [task.id]: value }));
              }}
              onReviewToggle={() => {
                setSavedTask(null);
                setReviewed((current) => ({
                  ...current,
                  [task.id]: !reviewed.includes(task.id),
                }));
              }}
              onAnswerChange={(value) => {
                setSavedTask(null);
                setAnswers((current) => ({ ...current, [task.id]: value }));
              }}
              onAccepted={() =>
                setAccepted((current) =>
                  current.includes(task.id) ? current : [...current, task.id],
                )
              }
              onNext={
                index < iphoSubproblems.length - 1
                  ? () => {
                      selectTask(iphoSubproblems[index + 1].id);
                      requestAnimationFrame(() => document.getElementById("ipho-subproblem-title")?.focus());
                    }
                  : undefined
              }
            />
          </fieldset>
          {session.data?.user && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status" className="text-sm text-muted-foreground">
                {savedTask === task.id
                  ? "Notes, expression and review mark saved privately."
                  : "Save this subproblem to keep your changes across devices."}
              </p>
              <Button
                onClick={saveProgress}
                disabled={
                  saving ||
                  progress.isLoading ||
                  !!progress.error ||
                  !!session.error
                }
              >
                {saving ? "Saving…" : "Save subproblem progress"}
              </Button>
            </div>
          )}
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={index === 0}
              onClick={() => selectTask(iphoSubproblems[index - 1].id)}
            >
              <ArrowLeft data-icon="inline-start" />
              Previous
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              {index + 1} of {iphoSubproblems.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={index === iphoSubproblems.length - 1}
              onClick={() => selectTask(iphoSubproblems[index + 1].id)}
            >
              Next
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Independent, unofficial archive of the five competition papers. The
        unused backup paper is excluded. Questions are paraphrased. The original
        English pages are authoritative. Official solutions:{" "}
        <a
          href="https://www.sciencesalecole.org/ipho-annales-epreuves/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Sciences à l’École
        </a>
        . Review marks are self-assessed, not scores. The three adapted
        calculator checks run in your browser and do not grade full subproblems.
        Use Save subproblem progress to store notes, expressions and self-review
        marks in your private account. Unsaved edits are lost when you leave or
        refresh.
      </p>
    </section>
  );
}
