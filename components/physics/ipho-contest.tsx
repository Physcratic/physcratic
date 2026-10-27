"use client";

import { useState } from "react";
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
import { IphoProblem } from "./ipho-problem";

export function IphoContest({ onExit }: { onExit: () => void }) {
  const [activeId, setActiveId] = useState(iphoSubproblems[0].id);
  const [lastTaskByPaper, setLastTaskByPaper] = useState<
    Record<string, string>
  >({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState<string[]>([]);
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
      className="flex min-w-0 flex-col gap-6"
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
            — original figures, complete papers, and official solutions
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
            Self-paced · Progress stays in this session only
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
          <IphoProblem
            key={task.id}
            task={task}
            paper={paper}
            answer={answers[task.id] || ""}
            accepted={accepted.includes(task.id)}
            notes={notes[task.id] || ""}
            reviewed={reviewed.includes(task.id)}
            onNotesChange={(value) =>
              setNotes((current) => ({ ...current, [task.id]: value }))
            }
            onReviewToggle={() =>
              setReviewed((current) =>
                current.includes(task.id)
                  ? current.filter((id) => id !== task.id)
                  : [...current, task.id],
              )
            }
            onAnswerChange={(value) =>
              setAnswers((current) => ({ ...current, [task.id]: value }))
            }
            onAccepted={() =>
              setAccepted((current) =>
                current.includes(task.id) ? current : [...current, task.id],
              )
            }
          />
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
        Independent, unofficial archive of the five competition papers; the
        unused backup paper is excluded. Questions are paraphrased; the original
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
        Notes, expressions, and progress reset when you leave this collection or
        refresh.
      </p>
    </section>
  );
}
