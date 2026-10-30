"use client";

import { useState } from "react";
import { ArrowUpRight, Check, FlaskConical } from "lucide-react";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  iphoPdf,
  type IphoPaper,
  type IphoSubproblem,
} from "@/lib/ipho-archive";
import { iphoTasks } from "@/lib/ipho-checks";
import { IphoPageReader } from "./ipho-page-reader";
import { MathFormula } from "./math-formula";
import { SymbolicAnswer } from "./symbolic-answer";

export function IphoProblem({
  task,
  paper,
  answer,
  accepted,
  notes,
  reviewed,
  onNotesChange,
  onReviewToggle,
  onAnswerChange,
  onAccepted,
}: {
  task: IphoSubproblem;
  paper: IphoPaper;
  answer: string;
  accepted: boolean;
  notes: string;
  reviewed: boolean;
  onNotesChange: (value: string) => void;
  onReviewToggle: () => void;
  onAnswerChange: (value: string) => void;
  onAccepted: () => void;
}) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const adaptedTask = iphoTasks.find((item) => item.id === task.symbolicTaskId);
  const section = paper.sections.find((item) => item.letter === task.part[0])!;

  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {paper.code} · {task.part}
          </Badge>
          <Badge variant="outline">
            {task.points.toFixed(1)} {task.points === 1 ? "point" : "points"}
          </Badge>
          {reviewed && (
            <Badge variant="outline">Reviewed · self-assessed</Badge>
          )}
        </div>
        <CardTitle>
          <h4 className="text-balance text-xl font-medium leading-snug tracking-tight">
            {task.title}
          </h4>
        </CardTitle>
        <CardDescription>
          Part {section.letter} · {section.title}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-6">
        <p className="text-pretty text-base leading-relaxed">{task.prompt}</p>
        {task.model && <MathFormula formula={task.model} />}

        <details
          className="rounded-lg border p-4"
          onToggle={(event) => setSourceOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-medium">
            Original statement, figures & shared setup · page {task.page}
          </summary>
          {sourceOpen && (
            <div className="flex min-w-0 flex-col gap-4 pt-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {paper.introduction}
              </p>
              <IphoPageReader paper={paper} initialPage={task.page} />
            </div>
          )}
        </details>

        {paper.kind === "Experiment" && (
          <Alert>
            <FlaskConical />
            <AlertTitle>Experimental practice</AlertTitle>
            <AlertDescription>
              Measurement questions require the apparatus or your own data. You
              can work through the theory and plan your protocol here. The
              official solution contains reference measurements, not simulated
              results.
            </AlertDescription>
          </Alert>
        )}

        {adaptedTask && (
          <section
            aria-label="Optional calculator-style practice"
            className="flex min-w-0 flex-col gap-5 border-t pt-5"
          >
            <div className="flex flex-col gap-2">
              <h5 className="text-base font-medium">
                Optional calculator-style practice
              </h5>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {adaptedTask.adaptation} Matching this expression does not
                complete every requirement of the original subproblem.
              </p>
            </div>
            <p className="text-pretty text-sm leading-relaxed">
              {adaptedTask.prompt}
            </p>
            <dl className="flex flex-wrap gap-x-6 gap-y-3 rounded-lg bg-muted/40 p-4 text-sm">
              {adaptedTask.variables.map((variable) => (
                <div key={variable.name} className="flex items-baseline gap-2">
                  <dt className="font-medium">{variable.name}</dt>
                  <dd className="text-muted-foreground">{variable.meaning}</dd>
                </div>
              ))}
            </dl>
            <SymbolicAnswer
              task={adaptedTask}
              answer={answer}
              accepted={accepted}
              onAnswerChange={onAnswerChange}
              onAccepted={onAccepted}
            />
          </section>
        )}

        <Field>
          <FieldLabel htmlFor="ipho-working">Your working & notes</FieldLabel>
          <Textarea
            id="ipho-working"
            value={notes}
            maxLength={10000}
            rows={5}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder={
              paper.kind === "Experiment"
                ? "Plan your protocol, record your own measurements, or work through the analysis…"
                : "Outline your reasoning, calculations, and units…"
            }
            aria-describedby="ipho-working-help"
          />
          <FieldDescription id="ipho-working-help">
            Not graded. Use Save subproblem progress below to save notes to your
            private account. Unsaved edits remain while switching subproblems,
            but are lost on leaving or refresh.
          </FieldDescription>
        </Field>

        <details
          className="rounded-lg border p-4"
          onToggle={(event) => setSolutionOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-medium">
            Reveal official solution · {paper.code} {task.part}
          </summary>
          {solutionOpen && (
            <div className="flex min-w-0 flex-col gap-5 pt-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Compare your full reasoning, numerical results, plots, and units
                with the official solution. Pages can contain neighbouring
                subparts. Use the reader controls to follow a derivation.
                Opening a solution does not mark it as reviewed.
              </p>
              <IphoPageReader
                paper={paper}
                initialPage={task.solutionPage}
                kind="solutions"
              />
              {adaptedTask && (
                <details className="rounded-lg border p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Worked summary for the adapted expression
                  </summary>
                  <div className="flex flex-col gap-5 pt-4">
                    <MathFormula formula={adaptedTask.answerTex} />
                    <ol className="flex list-decimal flex-col gap-5 pl-5">
                      {adaptedTask.solution.map((step) => (
                        <li
                          key={step.title}
                          className="text-sm leading-relaxed"
                        >
                          <h5 className="font-medium">{step.title}</h5>
                          <p className="text-muted-foreground">{step.text}</p>
                          <MathFormula formula={step.formula} />
                        </li>
                      ))}
                    </ol>
                  </div>
                </details>
              )}
            </div>
          )}
        </details>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 border-t pt-5">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Button
            variant={reviewed ? "secondary" : "outline"}
            size="sm"
            onClick={onReviewToggle}
            aria-pressed={reviewed}
          >
            {reviewed && <Check data-icon="inline-start" />}
            {reviewed ? "Reviewed · undo" : "Mark as reviewed"}
          </Button>
          <a
            href={iphoPdf(paper.id, "solutions", task.solutionPage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Official solution PDF
            <ArrowUpRight className="size-4" />
          </a>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Original question: IPhO 2025, {paper.code} {task.part}, page{" "}
          {task.page}.{" "}
          <a
            href="https://www.ipho2025.fr/sujets-officiels-ipho-france-2025"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Official source
          </a>
          . This is self-review, not an automatically graded submission.
        </p>
      </CardFooter>
    </Card>
  );
}
