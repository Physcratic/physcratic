"use client";

import { useEffect, useId, useRef, useState } from "react";
import useSWRImmutable from "swr/immutable";
import Link from "next/link";
import { ArrowRight, Lightbulb, Loader2, RotateCcw } from "lucide-react";
import { archiveAnswerLimit, archiveMetadataSchema, archiveGradeResponseSchema, type ArchiveGradeResponse } from "@/lib/archive-grading-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { assignPartColors } from "@/lib/part-colors";
import { summariseCheck } from "@/lib/solve-feedback";
import { FeedbackBox, PartChip, ResultLine, StepHeading, partBorder, partStyle } from "./solve-ui";
import { MathAnswerField } from "./math-answer-field";
import { formatConditions, type PaletteItem } from "./answer-palette";
import { markSolved } from "./solved-problems";

async function loadMetadata(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The answer fields could not be loaded.");
  return archiveMetadataSchema.parse(await response.json());
}

const infinity: PaletteItem = { id: "infinity-part", label: "∞", name: "∞ infinity", insert: "\\infty", group: "other", readable: true };
/** A help line this short is shown under its box. Longer help goes into the notes at the end. */
const shortHelp = 60;

/**
 * Steps 2 and 3 of a problem: type an answer for each part, then check it.
 * `onSeeHint` and `nextHref` are optional. Without them the matching buttons are left out, so a screen with
 * no hint or no next problem shows neither. Checking, the request and the grader are unchanged.
 * An expression is typed in one maths field with a palette under it. A number is a plain box. A problem counts as
 * solved in this browser when every part with an answer box is correct.
 */
export function ArchiveAnswerPanel({ problemId, onCorrect, onSeeHint, nextHref }: { problemId: string; onCorrect?: () => void; onSeeHint?: () => void; nextHref?: string }) {
  const { data, error: loadError, mutate } = useSWRImmutable(`/corpus/grading/${encodeURIComponent(problemId)}.json`, loadMetadata);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ArchiveGradeResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const fieldPrefix = useId();
  useEffect(() => () => pending.current?.abort(), []);

  async function checkAnswers(event: React.FormEvent) {
    event.preventDefault();
    if (!data || data.problemId !== problemId || pending.current) return;
    if (!canCheck) { setError("Type an answer first."); return; }
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
      // Solved in this browser: every part that has an answer box is correct. Parts to check yourself do not count.
      if (checked.results.some((part) => part.status === "correct") && checked.results.every((part) => part.status === "correct" || part.status === "self-review")) markSolved(problemId);
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
  const set = (partId: string, value: string) => { setAnswers((current) => ({ ...current, [partId]: value })); setResult(null); setError(""); };
  const notes = data?.parts.filter((part) => part.kind !== "self-review" && part.help && !(part.kind === "numeric" && part.help.length <= shortHelp)) ?? [];

  return <section id="step-answer" aria-labelledby="step-answer-title" className="flex min-w-0 scroll-mt-24 flex-col gap-6">
    <header className="flex flex-col gap-2">
      <StepHeading step={2} id="step-answer-title">Answer</StepHeading>
      <p className="text-sm leading-relaxed text-muted-foreground">Checks are not saved and do not change your rating.</p>
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
          const conditions = formatConditions(part.symbolConditions);
          return <div key={part.id} data-tour={position === 0 ? "answer-box" : undefined} style={partStyle(colors[position])} className={card}><Field data-invalid={invalid} data-disabled={busy}>
            <FieldLabel id={`${id}-label`} htmlFor={id} className="flex-wrap items-center"><PartChip index={colors[position]}>{part.sourcePart}</PartChip><span className="text-base font-medium">{part.label}{part.unit && <span className="font-normal text-muted-foreground"> ({part.unit})</span>}</span></FieldLabel>
            {conditions.length > 0 && <p className="text-sm text-muted-foreground">Conditions: {conditions.join(", ")}.</p>}
            {part.kind === "numeric"
              ? <>
                <div className="flex min-w-0 items-center gap-2">
                  <Input id={id} className="h-11 min-w-0 flex-1 font-mono" inputMode="decimal" value={answers[part.id] ?? ""} maxLength={archiveAnswerLimit} autoComplete="off" spellCheck={false} disabled={busy} placeholder="Number" aria-invalid={invalid} aria-describedby={`${id}-help ${id}-result`} onChange={(event) => set(part.id, event.target.value)} />
                  {part.unit && <span aria-hidden="true" className="shrink-0 text-sm text-muted-foreground">{part.unit}</span>}
                </div>
                {part.help.length <= shortHelp && <FieldDescription id={`${id}-help`}>{part.help}</FieldDescription>}
              </>
              : <MathAnswerField id={id} labelId={`${id}-label`} value={answers[part.id] ?? ""} onChange={(latex) => set(part.id, latex)} symbols={part.symbols} extraItems={part.kind === "special" ? [infinity] : undefined} disabled={busy} invalid={invalid} describedBy={`${id}-result`} maxLength={archiveAnswerLimit} />}
            {feedback && <ResultLine id={`${id}-result`} status={feedback.status} message={feedback.message} />}
          </Field></div>;
        })}
      </FieldGroup>
      {notes.length > 0 && <details className="min-w-0 rounded-lg border p-4"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Notes for each part</summary><ul className="flex flex-col gap-2 pt-3 text-sm leading-relaxed text-muted-foreground">{notes.map((part) => <li key={part.id}><strong className="font-medium text-foreground">{part.sourcePart} {part.label}.</strong> {part.help}</li>)}</ul></details>}
      <div className="flex min-w-0 flex-col gap-4">
        <StepHeading step={3} as="h3" id="step-check">Check</StepHeading>
        {error && <Alert variant="destructive"><AlertTitle>Could not check your answers</AlertTitle><AlertDescription>{error} Your input is unchanged.</AlertDescription></Alert>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" data-tour="check-button" className="min-h-11 px-6" disabled={busy}>{busy && <Loader2 className="animate-spin" data-icon="inline-start" />}{busy ? "Checking…" : "Check answer"}</Button>
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => { setAnswers({}); setResult(null); setError(""); }}><RotateCcw data-icon="inline-start" />Clear answers</Button>
        </div>
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
