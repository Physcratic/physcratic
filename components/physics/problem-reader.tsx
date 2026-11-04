"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, ChevronDown, ChevronUp, Lightbulb, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { getProblemTags } from "@/lib/problem-tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { problems, type Problem } from "@/lib/physics";
import { MathFormula } from "./math-formula";
import { ArchiveAnswerPanel } from "./archive-answer-panel";
import { SolveSteps, StepHeading, proseWidth, solveTokens } from "./solve-ui";

export function ProblemReader({ problem }: { problem: Problem }) {
  return <PracticeProblem key={problem.id} problem={problem} />;
}

function PracticeProblem({ problem }: { problem: Problem }) {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [reset, setReset] = useState(0);
  // The existing order only: the next entry in the problem list. Left out when there is no other problem.
  const nextProblem = problems[(problems.findIndex((item) => item.id === problem.id) + 1) % problems.length];
  const hasNext = nextProblem.id !== problem.id;
  const seeHint = () => {
    setShowHint(true);
    requestAnimationFrame(() => document.getElementById("problem-hint")?.focus());
  };
  return <section className={`flex min-w-0 flex-col gap-6 ${solveTokens}`} aria-labelledby="practice-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" size="sm" className="min-h-11" asChild><Link href="/dashboard?view=problems&collection=practice"><ArrowLeft data-icon="inline-start" />Back to collection</Link></Button>
      <Badge variant="outline">Quick practice · {problem.minutes} min</Badge>
    </div>
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Difficulty {problem.elo.toLocaleString("en-US")} · Illustrative estimate</p>
      <h1 id="practice-title" className="text-balance text-2xl font-medium tracking-tight">{problem.title}</h1>
      <div className="flex flex-wrap gap-2" aria-label="Problem tags">{getProblemTags(problem).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
    </div>
    <SolveSteps hrefs={{ 1: "#step-read", 2: "#step-answer", 3: "#step-check", 4: "#step-solution" }} />
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
      <Card id="step-read" className="min-w-0 scroll-mt-24 shadow-none">
        <CardHeader className="gap-4">
          <StepHeading step={1}>Read the problem</StepHeading>
          <div className={`flex flex-col gap-3 ${proseWidth}`}>{problem.prompt.split(/(?<=[.!?])\s+(?=[A-Z])/u).map((sentence, index) => <p key={index} className="text-pretty text-base leading-relaxed text-foreground">{sentence.endsWith("?") ? <strong className="text-lg font-semibold leading-relaxed">{sentence}</strong> : sentence}</p>)}</div>
        </CardHeader>
      </Card>
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="min-w-0 shadow-none"><CardContent className="pt-6"><ArchiveAnswerPanel key={reset} problemId={problem.id} onCorrect={() => setShowSolution(true)} onSeeHint={seeHint} nextHref={hasNext ? `/dashboard/problems/${nextProblem.id}` : undefined} /></CardContent></Card>
        <div className="flex flex-col gap-3">
          <Button variant="outline" className="min-h-11 justify-between" onClick={() => setShowHint(!showHint)} aria-expanded={showHint} aria-controls="problem-hint"><span className="flex items-center gap-2"><Lightbulb data-icon="inline-start" />{showHint ? "Hide hint" : "Need a hint?"}</span>{showHint ? <ChevronUp /> : <ChevronDown />}</Button>
          {showHint && <p id="problem-hint" tabIndex={-1} className={`rounded-lg border bg-muted/50 p-4 text-base leading-relaxed text-foreground ${proseWidth}`}>{problem.hint}</p>}
        </div>
      </div>
      <Card id="step-solution" className="min-w-0 scroll-mt-24 shadow-none xl:col-span-2">
        <CardHeader className="gap-4">
          <StepHeading step={4}>Solution</StepHeading>
          <p className="text-sm text-muted-foreground">Try the problem first. The solution shows every step.</p>
          <Button variant="outline" className="min-h-11 w-fit justify-between gap-3" onClick={() => setShowSolution(!showSolution)} aria-expanded={showSolution} aria-controls="worked-solution">{showSolution ? "Hide solution" : "Show solution"}{showSolution ? <ChevronUp /> : <ChevronDown />}</Button>
        </CardHeader>
        {showSolution && <CardContent><section id="worked-solution" aria-label="Worked solution" className={`flex flex-col gap-6 rounded-lg border p-5 ${proseWidth}`}>{problem.solution.map((step, index) => <div key={step.title} className="flex min-w-0 flex-col gap-2"><h3 className="text-base font-medium">{index + 1}. {step.title}</h3><p className="text-base leading-relaxed text-foreground">{step.text}</p>{step.formula && <MathFormula formula={step.formula} />}</div>)}</section></CardContent>}
      </Card>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
      <Button variant="ghost" className="min-h-11" onClick={() => { setReset((value) => value + 1); setShowSolution(false); setShowHint(false); }}><RotateCcw data-icon="inline-start" />Start over</Button>
      {hasNext && <Button variant="outline" className="min-h-11" asChild><Link href={`/dashboard/problems/${nextProblem.id}`}>Next problem<ArrowRight data-icon="inline-end" /></Link></Button>}
    </div>
  </section>;
}
