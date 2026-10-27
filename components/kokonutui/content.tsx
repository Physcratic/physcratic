"use client";

import { useState } from "react";
import { ArrowUpRight, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { problems, viewTitles, type Problem, type View } from "@/lib/physics";
import { Overview } from "@/components/physics/overview";
import { ProblemLibrary } from "@/components/physics/problem-library";
import { ProblemDialog } from "@/components/physics/problem-dialog";
import { FormulaSheet } from "@/components/physics/formula-sheet";
import { LearningGuide } from "@/components/physics/learning-guide";

const subtitles: Record<View, string> = {
  overview: "Less memorizing. More understanding.",
  problems: "Good questions lead to great discoveries. Find your next one.",
  formulas: "The essentials, with the meaning behind the math.",
  guide: "A few small steps to your first breakthrough.",
};

export default function Content({
  view,
  topic,
  query,
}: {
  view: View;
  topic?: string;
  query?: string;
}) {
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null);
  function openRandomProblem() {
    const choices = topic
      ? problems.filter((problem) => problem.topic === topic)
      : problems;
    setActiveProblem(choices[Math.floor(Math.random() * choices.length)]);
  }

  return (
    <div className="workspace-enter flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-[-0.04em] sm:text-[27px]">
            {view === "overview"
              ? "Your physics workspace"
              : topic || viewTitles[view]}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {subtitles[view]}
          </p>
        </div>
        {view !== "guide" && (
          <Button variant="outline" size="sm" onClick={openRandomProblem}>
            {view === "overview" ? (
              <ArrowUpRight data-icon="inline-start" />
            ) : (
              <Shuffle data-icon="inline-start" />
            )}
            {view === "overview" ? "Quick practice" : "Surprise me"}
          </Button>
        )}
      </div>
      {view === "overview" && <Overview onOpen={setActiveProblem} />}
      {view === "problems" && (
        <ProblemLibrary topic={topic} query={query} onOpen={setActiveProblem} />
      )}
      {view === "formulas" && <FormulaSheet />}
      {view === "guide" && <LearningGuide />}
      <ProblemDialog
        problem={activeProblem}
        onClose={() => setActiveProblem(null)}
        onNext={setActiveProblem}
      />
    </div>
  );
}
