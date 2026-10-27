"use client";

import { ArrowUpRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { IphoTask } from "@/lib/ipho-demo";
import { MathFormula } from "./math-formula";
import { SymbolicAnswer } from "./symbolic-answer";

export function IphoProblem({ task, answer, accepted, onAnswerChange, onAccepted }: {
  task: IphoTask;
  answer: string;
  accepted: boolean;
  onAnswerChange: (value: string) => void;
  onAccepted: () => void;
}) {
  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">IPhO {task.year}</Badge><Badge variant="outline">{task.topic}</Badge></div>
        <CardTitle><h3 className="text-xl font-medium leading-snug tracking-tight">{task.letter}. {task.title}</h3></CardTitle>
        <CardDescription>{task.originalPart}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-pretty text-base leading-relaxed">{task.prompt}</p>
        <dl className="flex flex-wrap gap-x-6 gap-y-3 rounded-lg bg-muted/40 p-4 text-sm">
          {task.variables.map((variable) => <div key={variable.name} className="flex items-baseline gap-2"><dt className="font-medium">{variable.name}</dt><dd className="text-muted-foreground">{variable.meaning}</dd></div>)}
        </dl>
        <SymbolicAnswer task={task} answer={answer} accepted={accepted} onAnswerChange={onAnswerChange} onAccepted={onAccepted} />
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium">Reveal answer & worked solution</summary>
          <div className="flex flex-col gap-5 pt-4">
            <p className="text-sm leading-relaxed text-muted-foreground">This is open practice. Revealing a solution does not mark the task as solved.</p>
            <MathFormula formula={task.answerTex} />
            <ol className="flex list-decimal flex-col gap-5 pl-5">
              {task.solution.map((step) => <li key={step.title} className="text-sm leading-relaxed"><h4 className="font-medium">{step.title}</h4><p className="text-muted-foreground">{step.text}</p><MathFormula formula={step.formula} /></li>)}
            </ol>
            <Button variant="outline" size="sm" className="self-start" asChild><a href={`/ipho/${task.year}-t${task.paper}-solutions.pdf`} target="_blank" rel="noopener noreferrer">Official solution PDF<ArrowUpRight data-icon="inline-end" /></a></Button>
          </div>
        </details>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3 border-t pt-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{task.adaptation}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild><a href={`/ipho/${task.year}-t${task.paper}-questions.pdf`} target="_blank" rel="noopener noreferrer"><BookOpen data-icon="inline-start" />Original question PDF<ArrowUpRight data-icon="inline-end" /></a></Button>
          <a className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground" href={task.source} target="_blank" rel="noopener noreferrer">Official IPhO 2025 source</a>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">Original paper: IPhO 2025, France. Official English solutions sourced from <a href="https://www.sciencesalecole.org/ipho-annales-epreuves/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">Sciences à l’École</a>. Worked summaries above are adapted for this preview.</p>
      </CardFooter>
    </Card>
  );
}
