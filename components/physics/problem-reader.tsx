"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { getProblemTags } from "@/lib/problem-tags";
import { MathWorkingEditor } from "./math-working-editor";
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

export function ProblemReader({ problem }: { problem: Problem }) {
  const { recordResult } = useProblemHistory();
  const [answer, setAnswer] = useState("");
  const [working, setWorking] = useState("");
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

  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const retry = useRef<{ signature: string; key: string } | null>(null);

  async function checkAnswer(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const numericAnswer = Number(answer.trim());
    if (!answer.trim() || !Number.isFinite(numericAnswer)) {
      setResult("invalid");
      return;
    }
    const signature = JSON.stringify([problem.id, numericAnswer, working]);
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    setSaveError("");
    setResult(null);
    setSaved(false);
    try {
      const checked = await recordResult(
        problem.id,
        numericAnswer,
        working,
        retry.current.key,
      );
      setResult(checked.correct ? "correct" : "incorrect");
      setSaved(checked.saved);
      if (checked.correct) setShowSolution(true);
    } catch (reason) {
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "Your answer could not be saved. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="flex min-w-0 flex-col gap-6"
      aria-labelledby="practice-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard?view=problems&collection=practice">
            <ArrowLeft data-icon="inline-start" />
            Back to collection
          </Link>
        </Button>
        <Badge variant="outline">Quick practice · {problem.minutes} min</Badge>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Difficulty {problem.elo.toLocaleString("en-US")} · Illustrative
          estimate
        </p>
        <h1
          id="practice-title"
          className="text-balance text-2xl font-medium tracking-tight"
        >
          {problem.title}
        </h1>
        <div className="flex flex-wrap gap-2" aria-label="Problem tags">
          {getProblemTags(problem).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <Card className="min-w-0 shadow-none">
        <CardHeader>
          <CardTitle>
            <h2 className="text-xl font-medium tracking-tight">
              Problem statement
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-6">
          <p className="text-pretty text-base leading-relaxed">
            {problem.prompt}
          </p>
          <MathWorkingEditor
            id="practice-working"
            value={working}
            onChange={setWorking}
            description="Working is saved with each checked answer when you are signed in. Unchecked edits are not saved. Your derivation is not graded. Check your numerical final answer below."
          />
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
              <Field
                data-invalid={result === "invalid" || result === "incorrect"}
              >
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
                    disabled={busy}
                    aria-invalid={
                      result === "invalid" || result === "incorrect"
                    }
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
                  <Button type="submit" disabled={busy}>
                    {busy ? "Checking & saving…" : "Check answer"}
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
                    Not quite yet. Check your units, or take a look at the hint
                    and try again.
                  </FieldError>
                )}
              </Field>
            </FieldGroup>
          </form>
          {saveError && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Could not check your answer</AlertTitle>
              <AlertDescription>
                {saveError} Your working is unchanged.
              </AlertDescription>
            </Alert>
          )}
          {(result === "correct" || result === "incorrect") && (
            <p role="status" className="text-sm text-muted-foreground">
              {saved
                ? "Answer and working saved to your private progress."
                : "Answer checked, but not saved. Sign in to keep your progress."}
              {!saved && (
                <>
                  {" "}
                  <Link
                    href={`/sign-in?returnTo=${encodeURIComponent(`/dashboard/problems/${problem.id}`)}`}
                    className="underline underline-offset-4"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </p>
          )}
          {result === "correct" && (
            <Alert>
              <CheckCircle2 className="size-4" />
              <AlertTitle>That&apos;s it. Nicely worked out.</AlertTitle>
              <AlertDescription>
                Your answer is correct. Walk through the reasoning below to make
                it stick.
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
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAnswer("");
              setWorking("");
              setResult(null);
              setShowSolution(false);
              setShowHint(false);
              setSaveError("");
              setSaved(false);
              retry.current = null;
            }}
            disabled={busy}
          >
            <RotateCcw data-icon="inline-start" />
            Start over
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/problems/${nextProblem.id}`}>
              Next problem
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
