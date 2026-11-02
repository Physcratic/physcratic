"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, ChevronDown, ChevronUp, Lightbulb, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { getProblemTags } from "@/lib/problem-tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { problems, type Problem } from "@/lib/physics";
import { MathFormula } from "./math-formula";
import { ArchiveAnswerPanel } from "./archive-answer-panel";

export function ProblemReader({ problem }: { problem: Problem }) {
  return <PracticeProblem key={problem.id} problem={problem} />;
}

function PracticeProblem({ problem }: { problem: Problem }) {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [reset, setReset] = useState(0);
  const nextProblem = problems[(problems.findIndex((item) => item.id === problem.id) + 1) % problems.length];
  return <section className="flex min-w-0 flex-col gap-6" aria-labelledby="practice-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" size="sm" asChild><Link href="/dashboard?view=problems&collection=practice"><ArrowLeft data-icon="inline-start" />Back to collection</Link></Button>
      <Badge variant="outline">Quick practice · {problem.minutes} min</Badge>
    </div>
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Difficulty {problem.elo.toLocaleString("en-US")} · Illustrative estimate</p>
      <h1 id="practice-title" className="text-balance text-2xl font-medium tracking-tight">{problem.title}</h1>
      <div className="flex flex-wrap gap-2" aria-label="Problem tags">{getProblemTags(problem).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
    </div>
    <Card className="min-w-0 shadow-none">
      <CardHeader>
        <CardTitle><h2 className="text-xl font-medium tracking-tight">Problem statement</h2></CardTitle>
        <div className="flex flex-col gap-3">{problem.prompt.split(/(?<=[.!?])\s+(?=[A-Z])/u).map((sentence, index) => <p key={index} className="text-pretty text-base leading-relaxed text-muted-foreground">{sentence.endsWith("?") ? <strong className="text-lg font-semibold leading-relaxed text-foreground">{sentence}</strong> : sentence}</p>)}</div>
      </CardHeader>
      <Separator />
      <CardContent className="flex min-w-0 flex-col gap-6 pt-6">
        <ArchiveAnswerPanel key={reset} problemId={problem.id} onCorrect={() => setShowSolution(true)} />
        <div className="flex flex-col gap-3">
          <Button variant="outline" className="justify-between" onClick={() => setShowHint(!showHint)} aria-expanded={showHint} aria-controls="problem-hint"><span className="flex items-center gap-2"><Lightbulb data-icon="inline-start" />Hint</span>{showHint ? <ChevronUp /> : <ChevronDown />}</Button>
          {showHint && <p id="problem-hint" className="rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">{problem.hint}</p>}
        </div>
        <div className="flex flex-col gap-4">
          <Button variant="outline" className="justify-between" onClick={() => setShowSolution(!showSolution)} aria-expanded={showSolution} aria-controls="worked-solution">Solution{showSolution ? <ChevronUp /> : <ChevronDown />}</Button>
          {showSolution && <section id="worked-solution" aria-label="Worked solution" className="flex flex-col gap-6 rounded-lg border p-5">{problem.solution.map((step, index) => <div key={step.title} className="flex flex-col gap-2"><h3 className="text-sm font-medium">{index + 1}. {step.title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>{step.formula && <MathFormula formula={step.formula} />}</div>)}</section>}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <Button variant="ghost" size="sm" onClick={() => { setReset((value) => value + 1); setShowSolution(false); setShowHint(false); }}><RotateCcw data-icon="inline-start" />Start over</Button>
        <Button variant="outline" size="sm" asChild><Link href={`/dashboard/problems/${nextProblem.id}`}>Next problem<ArrowRight data-icon="inline-end" /></Link></Button>
      </CardFooter>
    </Card>
  </section>;
}
