"use client";

import { useEffect, useId, useRef, useState } from "react";
import useSWRImmutable from "swr/immutable";
import Link from "next/link";
import { ArrowRight, Lightbulb, Loader2, RotateCcw } from "lucide-react";
import { archiveAnswerLimit, archiveMetadataSchema, archiveGradeResponseSchema, type ArchiveGradeResponse } from "@/lib/archive-grading-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MathWorkingEditor } from "./math-working-editor";
import { LatexAnswerPreview } from "./latex-answer-preview";
import { assignPartColors } from "@/lib/part-colors";
import { summariseCheck } from "@/lib/solve-feedback";
import { FeedbackBox, PartChip, ResultLine, StepHeading, partBorder, partStyle } from "./solve-ui";

async function loadMetadata(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The answer fields could not be loaded.");
  return archiveMetadataSchema.parse(await response.json());
}

/**
 * Steps 2 and 3 of a problem: type an answer for each part, then check it.
 * `onSeeHint` and `nextHref` are optional. Without them the matching buttons are left out, so a screen with
 * no hint or no next problem shows neither. Checking, the request and the grader are unchanged.
 */
export function ArchiveAnswerPanel({ problemId, onCorrect, onSeeHint, nextHref }: { problemId: string; onCorrect?: () => void; onSeeHint?: () => void; nextHref?: string }) {
  const { data, error: loadError, mutate } = useSWRImmutable(`/corpus/grading/${encodeURIComponent(problemId)}.json`, loadMetadata);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [working, setWorking] = useState("");
  const [result, setResult] = useState<ArchiveGradeResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const fieldPrefix = useId();
  useEffect(() => () => pending.current?.abort(), []);

  async function checkAnswers(event: React.FormEvent) {
    event.preventDefault();
    if (!data || data.problemId !== problemId || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/archive-grade", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        body: JSON.stringify({ problemId, version: data.version, answers: data.parts.filter((part) => part.kind !== "self-review" && answers[part.id]?.trim()).map((part) => ({ partId: part.id, latex: answers[part.id] })) }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 409) void mutate();
        throw new Error(typeof body.error === "string" ? body.error : "Could not check your answers. Please retry.");
      }
      const checked = archiveGradeResponseSchema.parse(body);
      if (checked.problemId !== problemId || checked.version !== data.version) throw new Error("The problem changed. Reload the answer fields and retry.");
      if (controller.signal.aborted) return;
      setResult(checked);
      if (checked.results.every((part) => part.status === "correct")) onCorrect?.();
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error && reason.name === "TimeoutError" ? "The check timed out. Please retry." : reason instanceof Error ? reason.message : "Could not check your answers. Please retry.");
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(false); }
    }
  }

  const summary = result ? summariseCheck(result.results) : null;
  const colors = data?.problemId === problemId ? assignPartColors(data.parts.map((part) => part.sourcePart)) : [];
  const tryAgain = () => {
    // Moves focus only. It keeps the typed answers and the result, and nothing is counted or reset.
    const target = data?.parts.find((part) => part.kind !== "self-review" && result?.results.find((item) => item.partId === part.id)?.status !== "correct");
    if (target) document.getElementById(`${fieldPrefix}-${target.id}`)?.focus();
  };
  const canCheck = Boolean(data?.parts.some((part) => part.kind !== "self-review" && answers[part.id]?.trim()));

  return <section id="step-answer" aria-labelledby="step-answer-title" className="flex min-w-0 scroll-mt-24 flex-col gap-6">
    <header className="flex flex-col gap-2">
      <StepHeading step={2} id="step-answer-title">Answer</StepHeading>
      <p className="text-sm leading-relaxed text-muted-foreground">Type your answer in each box. Checks are not saved and do not change your rating.</p>
    </header>
    {!data && !loadError && <p role="status" className="text-sm text-muted-foreground">Loading answer fields…</p>}
    {(loadError || (data && data.problemId !== problemId)) && <Alert variant="destructive"><AlertTitle>Answer fields unavailable</AlertTitle><AlertDescription><Button variant="outline" className="min-h-11" onClick={() => mutate()}>Retry loading fields</Button></AlertDescription></Alert>}
    {data?.problemId === problemId && <form onSubmit={checkAnswers} className="flex min-w-0 flex-col gap-6" onKeyDown={(event) => {
      if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
    }}>
      <FieldGroup>
        {data.parts.map((part, position) => {
          const id = `${fieldPrefix}-${part.id}`;
          const feedback = result?.results.find((item) => item.partId === part.id);
          const invalid = feedback?.status === "invalid" || feedback?.status === "incorrect";
          const card = `min-w-0 rounded-lg border bg-card p-4 text-card-foreground ${partBorder}`;
          if (part.kind === "self-review") return <div key={part.id} style={partStyle(colors[position])} className={card}><Alert><AlertTitle className="flex flex-wrap items-center gap-2"><PartChip index={colors[position]}>{part.sourcePart}</PartChip>{part.label}</AlertTitle><AlertDescription>Check this one yourself. {part.help} Compare your reasoning with the worked solution. It is not graded.</AlertDescription></Alert></div>;
          return <div key={part.id} style={partStyle(colors[position])} className={card}><Field data-invalid={invalid} data-disabled={busy}>
            <FieldLabel htmlFor={id} className="flex-wrap items-center"><PartChip index={colors[position]}>{part.sourcePart}</PartChip><span className="text-base font-medium">{part.label}{part.unit && <span className="font-normal text-muted-foreground"> ({part.unit})</span>}</span></FieldLabel>
            <Input id={id} className="h-11 font-mono" value={answers[part.id] ?? ""} maxLength={archiveAnswerLimit} autoComplete="off" spellCheck={false} disabled={busy} placeholder={part.kind === "numeric" ? "Number or LaTeX expression" : "LaTeX result (right-hand side only)"} aria-invalid={invalid} aria-describedby={`${id}-help${feedback ? ` ${id}-result` : ""}`} onChange={(event) => {
              setAnswers((current) => ({ ...current, [part.id]: event.target.value })); setResult(null); setError("");
            }} />
            <FieldDescription id={`${id}-help`}>{part.help}{part.symbols.length > 0 && <> Symbols: <code className="break-words font-mono">{part.symbols.join(", ")}</code>.</>}</FieldDescription>
            <LatexAnswerPreview value={answers[part.id] ?? ""} />
            {feedback && <ResultLine id={`${id}-result`} status={feedback.status} message={feedback.message} />}
          </Field></div>;
        })}
      </FieldGroup>
      <details className="min-w-0 rounded-lg border p-4"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">How to type an answer</summary><p className="pt-3 text-sm leading-relaxed text-muted-foreground">Type a number, or LaTeX without dollar signs, such as <code className="font-mono">{"\\frac{1}{2}"}</code> or <code className="font-mono">{"\\sqrt{13}"}</code>. Use the units shown. Units are not converted. Leave a part blank to check it later.</p></details>
      <details className="min-w-0 rounded-lg border p-4"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Optional working · not graded or saved</summary><div className="pt-4"><MathWorkingEditor id={`${fieldPrefix}-working`} mode="latex" value={working} onChange={setWorking} description="Working stays in this page only. It is not sent to the checker, graded, or saved. Navigating away or reloading clears it." /></div></details>
      <div className="flex min-w-0 flex-col gap-4">
        <StepHeading step={3} as="h3" id="step-check">Check</StepHeading>
        {error && <Alert variant="destructive"><AlertTitle>Could not check your answers</AlertTitle><AlertDescription>{error} Your input is unchanged.</AlertDescription></Alert>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" className="min-h-11 px-6" disabled={busy || !canCheck}>{busy && <Loader2 className="animate-spin" data-icon="inline-start" />}{busy ? "Checking…" : "Check answer"}</Button>
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => { setAnswers({}); setWorking(""); setResult(null); setError(""); }}><RotateCcw data-icon="inline-start" />Clear answers</Button>
        </div>
        {!canCheck && !result && <p className="text-sm text-muted-foreground">Type an answer above to turn on the Check answer button.</p>}
        <div aria-live="polite" aria-atomic="true" className="min-w-0">
          {summary && <FeedbackBox tone={summary.tone} title={summary.headline}>
            <p>{summary.detail}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {summary.needsAnotherTry && <Button type="button" variant="outline" className="min-h-11 bg-background" onClick={tryAgain}><RotateCcw data-icon="inline-start" />Try again</Button>}
              {summary.needsAnotherTry && onSeeHint && <Button type="button" variant="outline" className="min-h-11 bg-background" onClick={onSeeHint}><Lightbulb data-icon="inline-start" />See hint</Button>}
              {summary.allCorrect && nextHref && <Button asChild className="min-h-11"><Link href={nextHref}>Next problem<ArrowRight data-icon="inline-end" /></Link></Button>}
            </div>
          </FeedbackBox>}
        </div>
      </div>
    </form>}
  </section>;
}
