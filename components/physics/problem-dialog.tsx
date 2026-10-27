"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { problems, type Problem } from "@/lib/physics";
import { MathFormula } from "./math-formula";
import { useProblemHistory } from "@/hooks/use-problem-history";

export function ProblemDialog({
  problem,
  onClose,
  onNext,
}: {
  problem: Problem | null;
  onClose: () => void;
  onNext: (problem: Problem) => void;
}) {
  return (
    <Dialog
      open={Boolean(problem)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-xl p-6 sm:p-8">
        {problem && (
          <ProblemPractice key={problem.id} problem={problem} onNext={onNext} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProblemPractice({
  problem,
  onNext,
}: {
  problem: Problem;
  onNext: (problem: Problem) => void;
}) {
  const { recordResult } = useProblemHistory();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<
    "correct" | "incorrect" | "invalid" | null
  >(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const nextProblem =
    problems[
      (problems.findIndex((item) => item.id === problem.id) + 1) %
        problems.length
    ];

  function checkAnswer(event: React.FormEvent) {
    event.preventDefault();
    const numericAnswer = Number(answer.trim());
    if (!answer.trim() || !Number.isFinite(numericAnswer)) {
      setResult("invalid");
      return;
    }
    const correct =
      Math.abs(numericAnswer - problem.answer) <=
      Math.max(0.005, Math.abs(problem.answer) * 0.005);
    setResult(correct ? "correct" : "incorrect");
    recordResult(problem.id, correct);
    if (correct) setShowSolution(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader className="gap-3 text-left">
        <div className="flex flex-wrap items-center gap-2 pr-5">
          <Badge variant="secondary">{problem.topic}</Badge>
          <span className="text-sm text-muted-foreground">
            <span aria-label={`Difficulty rating ${problem.elo.toLocaleString("en-US")}`}>{problem.elo.toLocaleString("en-US")}</span> · {problem.minutes} min
          </span>
        </div>
        <DialogTitle className="text-balance text-2xl font-medium leading-snug tracking-tight">
          {problem.title}
        </DialogTitle>
        <DialogDescription>{problem.concept}</DialogDescription>
      </DialogHeader>
      <p className="text-pretty text-base leading-relaxed">{problem.prompt}</p>
      <form
        onSubmit={checkAnswer}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            (event.nativeEvent.isComposing || event.keyCode === 229)
          )
            event.preventDefault();
        }}
      >
        <FieldGroup>
          <Field data-invalid={result === "invalid" || result === "incorrect"}>
            <FieldLabel htmlFor="physics-answer">
              Your answer{" "}
              <span className="font-normal text-muted-foreground">
                ({problem.unit})
              </span>
            </FieldLabel>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="physics-answer"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Enter a numerical value"
                value={answer}
                aria-invalid={result === "invalid" || result === "incorrect"}
                aria-describedby={
                  result === "invalid" || result === "incorrect"
                    ? "answer-error"
                    : "answer-description"
                }
                onChange={(event) => {
                  setAnswer(event.target.value);
                  setResult(null);
                }}
              />
              <Button type="submit">
                Check answer
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
            <FieldDescription id="answer-description">
              Use the unit shown above. Answers within 0.5% are accepted.
            </FieldDescription>
            {result === "invalid" && (
              <FieldError id="answer-error">
                Enter a valid number to check your answer.
              </FieldError>
            )}
            {result === "incorrect" && (
              <FieldError id="answer-error">
                Not quite yet. Check your units, or take a look at the hint and
                try again.
              </FieldError>
            )}
          </Field>
        </FieldGroup>
      </form>
      {result === "correct" && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>That&apos;s it. Nicely worked out.</AlertTitle>
          <AlertDescription>
            Your answer is correct. Walk through the reasoning below to make it
            stick.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-3">
        <Button
          variant="outline"
          className="justify-between"
          onClick={() => setShowHint(!showHint)}
          aria-expanded={showHint}
          aria-controls="problem-hint"
        >
          <span className="flex items-center gap-2">
            <Lightbulb />A nudge in the right direction
          </span>
          {showHint ? <ChevronUp /> : <ChevronDown />}
        </Button>
        {showHint && (
          <p
            id="problem-hint"
            className="rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground"
          >
            {problem.hint}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          className="justify-between"
          onClick={() => setShowSolution(!showSolution)}
          aria-expanded={showSolution}
          aria-controls="worked-solution"
        >
          {showSolution ? "Hide worked solution" : "Show worked solution"}
          {showSolution ? <ChevronUp /> : <ChevronDown />}
        </Button>
        {showSolution && (
          <section
            id="worked-solution"
            aria-label="Worked solution"
            className="flex flex-col gap-6 rounded-lg border p-5"
          >
            {problem.solution.map((step, index) => (
              <div key={step.title} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">
                  {index + 1}. {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
                {step.formula && <MathFormula formula={step.formula} />}
              </div>
            ))}
          </section>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setAnswer("");
            setResult(null);
            setShowSolution(false);
            setShowHint(false);
          }}
        >
          <RotateCcw data-icon="inline-start" />
          Start over
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNext(nextProblem)}>
          Next problem
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
