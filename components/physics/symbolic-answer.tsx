"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { IphoTask } from "@/lib/ipho-checks";
import { parseAnswer } from "@/lib/symbolic-math";
import { MathFormula } from "./math-formula";
import { FeedbackBox, StepHeading } from "./solve-ui";

type Feedback = { kind: "accepted" | "unverified" | "invalid"; message?: string };

/**
 * Steps 2 and 3 for an IPhO expression: type the expression, then check it. `onNext` is optional and is only
 * given when there is a next subproblem in the existing order. Checking and the worker are unchanged.
 */
export function SymbolicAnswer({ task, answer, accepted, onAnswerChange, onAccepted, onNext }: {
  onNext?: () => void;
  task: IphoTask;
  answer: string;
  accepted: boolean;
  onAnswerChange: (value: string) => void;
  onAccepted: () => void;
}) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const worker = useRef<Worker | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const variables = task.variables.map((variable) => variable.name);
  let preview = "";
  let parseError = "";
  if (answer.trim()) {
    try { preview = parseAnswer(answer, variables).toTex({ parenthesis: "auto", implicit: "show" }); }
    catch (error) { parseError = error instanceof Error ? error.message : "Could not read this expression."; }
  }

  useEffect(() => () => {
    worker.current?.terminate();
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  function finish() {
    worker.current?.terminate();
    worker.current = null;
    if (timeout.current) clearTimeout(timeout.current);
    setPending(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || accepted) return;
    if (!answer.trim() || parseError) {
      setFeedback({ kind: "invalid", message: parseError || "Enter an expression first." });
      return;
    }
    setFeedback(null);
    setPending(true);
    try {
      const checker = new Worker(new URL("../../lib/symbolic-worker.ts", import.meta.url));
      worker.current = checker;
      checker.onmessage = (event: MessageEvent<Feedback>) => {
        finish();
        setFeedback(event.data);
        if (event.data.kind === "accepted") onAccepted();
      };
      checker.onerror = () => {
        finish();
        setFeedback({ kind: "invalid", message: "The preview checker could not start. Your answer is still here. Try again." });
      };
      timeout.current = setTimeout(() => {
        finish();
        setFeedback({ kind: "unverified", message: "The check took too long. Simplify your expression and try again. No penalty was applied." });
      }, 8000);
      checker.postMessage({ input: answer, expected: task.expected, variables });
    } catch {
      finish();
      setFeedback({ kind: "invalid", message: "The preview checker is unavailable. Your answer has not been lost." });
    }
  }

  const invalid = feedback?.kind === "invalid" || Boolean(parseError);
  // Try again only moves focus. The answer and the result stay as they are.
  const tryAgain = () => input.current?.focus();
  const problem = feedback?.kind === "invalid" || feedback?.kind === "unverified";
  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submit} className="flex flex-col gap-5" onKeyDown={(event) => {
        if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
      }}>
        <StepHeading step={2} as="h3">Answer</StepHeading>
        <FieldGroup>
          <Field data-invalid={invalid} data-disabled={pending || accepted}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FieldLabel htmlFor="symbolic-answer">Your expression</FieldLabel>
              <Badge variant="outline">Plain-text math · beta</Badge>
            </div>
            <Input
              ref={input}
              id="symbolic-answer"
              className="h-11 font-mono"
              placeholder="Type an expression, not LaTeX"
              value={answer}
              maxLength={180}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={invalid}
              aria-describedby="symbolic-help symbolic-parse-error"
              disabled={pending || accepted}
              onChange={(event) => { setFeedback(null); onAnswerChange(event.target.value); }}
            />
            <FieldDescription id="symbolic-help">Expression only. Result is in {task.unit}. Variables are case-sensitive and positive. No units or equals sign.</FieldDescription>
          </Field>
        </FieldGroup>
        <div className="flex min-h-28 flex-col justify-center rounded-lg border bg-muted/30 px-5 py-4">
          <span className="text-sm text-muted-foreground">How we read your answer</span>
          {preview ? <MathFormula formula={`$$${preview}$$`} /> : <p className="py-3 text-sm text-muted-foreground">Your typeset expression will appear here as you type.</p>}
        </div>
        <StepHeading step={3} as="h3">Check</StepHeading>
        <div>
          <Button type="submit" className="min-h-11 px-6" disabled={pending || accepted}>
            {pending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : accepted ? <CheckCircle2 data-icon="inline-start" /> : null}
            {pending ? "Checking…" : accepted ? "Matched" : "Check answer"}
            {!pending && !accepted && <ArrowRight data-icon="inline-end" />}
          </Button>
        </div>
        <div id="symbolic-parse-error" role="status" aria-live="polite" aria-atomic="true">
          {parseError && !feedback && <FeedbackBox tone="error" title="Could not read this expression"><p>{parseError}</p></FeedbackBox>}
          {accepted && <FeedbackBox tone="success" title="Correct">
            <p>Your expression matches the reference answer. This checks the final expression, not your derivation or units.</p>
            {onNext && <div className="pt-2"><Button type="button" className="min-h-11" onClick={onNext}>Next problem<ArrowRight data-icon="inline-end" /></Button></div>}
          </FeedbackBox>}
          {!accepted && feedback?.kind === "invalid" && <FeedbackBox tone="error" title="Could not read this expression"><p>{feedback.message}</p></FeedbackBox>}
          {!accepted && feedback?.kind === "unverified" && <FeedbackBox tone="warning" title="Could not check this expression"><p>{feedback.message || "The checker could not establish equivalence. Check your algebra or try a simpler form. This does not prove your answer is wrong. No penalty was applied."}</p></FeedbackBox>}
          {!accepted && problem && <div className="flex flex-wrap gap-2 pt-3"><Button type="button" variant="outline" className="min-h-11" onClick={tryAgain}><RotateCcw data-icon="inline-start" />Try again</Button></div>}
        </div>
      </form>
      <details className="rounded-lg border p-4 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">Syntax guide, no LaTeX needed</summary>
        <div className="flex flex-col gap-4 pt-4">
          <p className="leading-relaxed text-muted-foreground">Use calculator-style notation. Parentheses control grouping. The preview lets you check what the parser understood.</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
            <dt><code>a*b</code></dt><dd>Multiply</dd>
            <dt><code>a/b</code></dt><dd>Divide</dd>
            <dt><code>x^2</code></dt><dd>Raise to a power</dd>
            <dt><code>sqrt(x)</code></dt><dd>Square root</dd>
            <dt><code>(a+b)/c</code></dt><dd>Group the numerator</dd>
            <dt><code>pi</code></dt><dd>The circle constant</dd>
          </dl>
          <p className="leading-relaxed text-muted-foreground">Examples use generic variable names. Your task only accepts the symbols listed above. Equivalent algebraic forms can match. Unsupported functions and unproven identities are left unverified.</p>
        </div>
      </details>
    </div>
  );
}
