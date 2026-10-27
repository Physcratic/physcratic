"use client";

import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
} from "lucide-react";
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
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ContestProblem, ProblemResult } from "@/lib/contest-demo";
import { cn } from "@/lib/utils";
import { MathFormula } from "./math-formula";

export type ContestFeedback = {
  kind: "accepted" | "wrong" | "invalid";
  text: string;
};

export function ContestProblemPanel({
  items,
  activeId,
  results,
  flaggedIds,
  answer,
  feedback,
  finished,
  onSelect,
  onToggleFlag,
  onAnswerChange,
  onSubmit,
}: {
  items: ContestProblem[];
  activeId: string;
  results: ProblemResult[];
  flaggedIds: string[];
  answer: string;
  feedback?: ContestFeedback;
  finished: boolean;
  onSelect: (id: string) => void;
  onToggleFlag: (id: string) => void;
  onAnswerChange: (answer: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const activeIndex = Math.max(
    0,
    items.findIndex((problem) => problem.id === activeId),
  );
  const active = items[activeIndex];
  const result = results.find((entry) => entry.problemId === active.id);
  const solved = result?.status === "accepted";
  const invalid = feedback?.kind === "wrong" || feedback?.kind === "invalid";
  const flagged = flaggedIds.includes(active.id);

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-5 min-[1150px]:grid-cols-[200px_1fr]">
      <nav
        aria-label="Contest problems"
        className="flex min-w-0 flex-col gap-3"
      >
        <div className="flex items-center justify-between text-sm">
          <h3 className="font-medium">Problem set</h3>
          <span className="text-muted-foreground">{items.length} problems</span>
        </div>
        <ToggleGroup
          type="single"
          value={active.id}
          onValueChange={(value) => {
            if (value) onSelect(value);
          }}
          aria-label="Choose a contest problem"
          className="flex-wrap items-stretch justify-start min-[1150px]:flex-col"
        >
          {items.map((problem) => {
            const status = results.find(
              (entry) => entry.problemId === problem.id,
            )?.status;
            return (
              <ToggleGroupItem
                key={problem.id}
                value={problem.id}
                aria-label={`Problem ${problem.letter}: ${problem.title}${status === "accepted" ? ", solved" : ""}${flaggedIds.includes(problem.id) ? ", bookmarked" : ""}`}
                className="h-auto min-w-12 flex-1 justify-between px-3 py-3 min-[1150px]:flex-none"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md border",
                      status === "accepted" &&
                        "bg-primary text-primary-foreground",
                    )}
                  >
                      {problem.letter}
                  </span>
                  <span className="hidden text-left text-sm font-normal min-[1150px]:inline">
                    {problem.topic}
                    <br />
                    <span className="text-muted-foreground">
                      {problem.points} pts{status === "wrong" ? " · Retry" : ""}
                    </span>
                  </span>
                </span>
                {flaggedIds.includes(problem.id) && (
                  <Bookmark
                    aria-hidden="true"
                    className="size-4 shrink-0 text-primary"
                  />
                )}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
        <p className="hidden text-sm leading-relaxed text-muted-foreground min-[1150px]:block">
          Any order. Your answers stay here as you move between problems.
        </p>
      </nav>
      <Card className="min-w-0 shadow-none">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{active.topic}</Badge>
              <span className="text-sm text-muted-foreground">
                {active.points} points
              </span>
              {solved && <Badge variant="outline">Accepted</Badge>}
            </div>
            {!finished && (
              <Button
                size="sm"
                variant="ghost"
                aria-pressed={flagged}
                onClick={() => onToggleFlag(active.id)}
              >
                <Bookmark
                  data-icon="inline-start"
                  fill={flagged ? "currentColor" : "none"}
                />
                {flagged ? "Bookmarked" : "Save for later"}
              </Button>
            )}
          </div>
          <CardTitle>
            <h3 className="text-xl font-medium leading-snug tracking-tight">
              {active.letter}. {active.title}
            </h3>
          </CardTitle>
          <CardDescription>{active.concept}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-pretty text-base leading-relaxed">
            {active.prompt}
          </p>
          {!finished && (
            <form
              onSubmit={onSubmit}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  (event.nativeEvent.isComposing || event.keyCode === 229)
                )
                  event.preventDefault();
              }}
            >
              <FieldGroup>
                <Field data-disabled={solved} data-invalid={invalid}>
                  <FieldLabel htmlFor="contest-answer">
                    Your answer ({active.unit})
                  </FieldLabel>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      id="contest-answer"
                      autoComplete="off"
                      inputMode="decimal"
                      placeholder="Enter a numerical value"
                      value={answer}
                      disabled={solved}
                      aria-invalid={invalid}
                      aria-describedby={
                        feedback ? "contest-feedback" : "contest-answer-help"
                      }
                      onChange={(event) => onAnswerChange(event.target.value)}
                    />
                    <Button type="submit" disabled={solved}>
                      {solved ? "Accepted" : "Submit answer"}
                      {solved ? (
                        <Check data-icon="inline-end" />
                      ) : (
                        <ArrowRight data-icon="inline-end" />
                      )}
                    </Button>
                  </div>
                  <FieldDescription id="contest-answer-help">
                    Numerical answers within 0.5% are accepted. No hints during
                    a round.
                  </FieldDescription>
                  {feedback && invalid && (
                    <FieldError id="contest-feedback">
                      {feedback.text}
                    </FieldError>
                  )}
                </Field>
              </FieldGroup>
            </form>
          )}
          {!finished && feedback?.kind === "accepted" && (
            <Alert id="contest-feedback">
              <CheckCircle2 />
              <AlertTitle>Nicely done.</AlertTitle>
              <AlertDescription>{feedback.text}</AlertDescription>
            </Alert>
          )}
          {finished && (
            <div className="flex flex-col gap-4 rounded-lg border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium">Post-round review</h4>
                <Badge variant={solved ? "secondary" : "outline"}>
                  {solved
                    ? "Solved"
                    : result?.attempts
                      ? "Attempted"
                      : "Not attempted"}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Expected answer:{" "}
                <strong className="font-medium text-foreground">
                  {active.answer} {active.unit}
                </strong>
                {answer ? ` · Your last answer: ${answer} ${active.unit}` : ""}
              </p>
              <details className="group">
                <summary className="cursor-pointer rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  View worked solution
                </summary>
                <ol className="flex list-decimal flex-col gap-5 pl-5 pt-5">
                  {active.solution.map((step) => (
                    <li key={step.title} className="text-sm leading-relaxed">
                      <h5 className="font-medium">{step.title}</h5>
                      <p className="text-muted-foreground">{step.text}</p>
                      {step.formula && <MathFormula formula={step.formula} />}
                    </li>
                  ))}
                </ol>
              </details>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-3 border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous problem"
            disabled={activeIndex === 0}
            onClick={() => onSelect(items[activeIndex - 1].id)}
          >
            <ArrowLeft data-icon="inline-start" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="text-sm text-muted-foreground">
            Problem {activeIndex + 1} of {items.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Next problem"
            disabled={activeIndex === items.length - 1}
            onClick={() => onSelect(items[activeIndex + 1].id)}
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
