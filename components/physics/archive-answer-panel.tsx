"use client";

import { useEffect, useId, useRef, useState } from "react";
import useSWRImmutable from "swr/immutable";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { archiveAnswerLimit, archiveMetadataSchema, archiveGradeResponseSchema, type ArchiveGradeResponse } from "@/lib/archive-grading-contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MathWorkingEditor } from "./math-working-editor";
import { LatexAnswerPreview } from "./latex-answer-preview";

async function loadMetadata(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The answer fields could not be loaded.");
  return archiveMetadataSchema.parse(await response.json());
}

export function ArchiveAnswerPanel({ problemId, onCorrect }: { problemId: string; onCorrect?: () => void }) {
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

  return <section aria-label="Practice answer checker" className="flex min-w-0 flex-col gap-6">
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-medium">Check your answers</h2><Badge variant="outline">LaTeX · prototype</Badge></div>
      <p className="text-sm leading-relaxed text-muted-foreground">Final answers only, not derivation marks. Checks and working are not saved and do not affect ratings or historical progress.</p>
    </header>
    {!data && !loadError && <p role="status" className="text-sm text-muted-foreground">Loading answer fields…</p>}
    {(loadError || (data && data.problemId !== problemId)) && <Alert variant="destructive"><AlertTitle>Answer fields unavailable</AlertTitle><AlertDescription><Button variant="outline" onClick={() => mutate()}>Retry loading fields</Button></AlertDescription></Alert>}
    {data?.problemId === problemId && <form onSubmit={checkAnswers} className="flex min-w-0 flex-col gap-6" onKeyDown={(event) => {
      if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
    }}>
      <p className="text-sm leading-relaxed text-muted-foreground">Type raw LaTeX without dollar signs: <code className="font-mono">{"\\frac{1}{2}"}</code>, <code className="font-mono">{"\\sqrt{13}"}</code>, or a number. Use the displayed units. Unit conversion is not automatic. Leave parts blank to check them later.</p>
      <FieldGroup>
        {data.parts.map((part) => {
          const id = `${fieldPrefix}-${part.id}`;
          const feedback = result?.results.find((item) => item.partId === part.id);
          const invalid = feedback?.status === "invalid" || feedback?.status === "incorrect";
          if (part.kind === "self-review") return <Alert key={part.id}><AlertTitle>{part.sourcePart} · {part.label}</AlertTitle><AlertDescription>Self-review: {part.help} Compare your reasoning with the worked solution. This part is not automatically graded.</AlertDescription></Alert>;
          return <Field key={part.id} data-invalid={invalid} data-disabled={busy}>
            <FieldLabel htmlFor={id}>{part.sourcePart} · {part.label}{part.unit && <span className="font-normal text-muted-foreground"> ({part.unit})</span>}</FieldLabel>
            <Input id={id} className="font-mono" value={answers[part.id] ?? ""} maxLength={archiveAnswerLimit} autoComplete="off" spellCheck={false} disabled={busy} placeholder={part.kind === "numeric" ? "Number or LaTeX expression" : "LaTeX result (right-hand side only)"} aria-invalid={invalid} aria-describedby={`${id}-help${feedback ? ` ${id}-result` : ""}`} onChange={(event) => {
              setAnswers((current) => ({ ...current, [part.id]: event.target.value })); setResult(null); setError("");
            }} />
            <FieldDescription id={`${id}-help`}>{part.help}{part.symbols.length > 0 && <> Symbols: <code className="break-words font-mono">{part.symbols.join(", ")}</code>.</>}</FieldDescription>
            <LatexAnswerPreview value={answers[part.id] ?? ""} />
            {feedback && (invalid ? <FieldError id={`${id}-result`}>{feedback.message}</FieldError> : <p id={`${id}-result`} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">{feedback.status === "correct" && <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}{feedback.message}</p>)}
          </Field>;
        })}
      </FieldGroup>
      <details className="min-w-0 rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">Optional working · not graded or saved</summary><div className="pt-4"><MathWorkingEditor id={`${fieldPrefix}-working`} mode="latex" value={working} onChange={setWorking} description="Working stays in this page only. It is not sent to the checker, graded, or saved. Navigating away or reloading clears it." /></div></details>
      {error && <Alert variant="destructive"><AlertTitle>Could not check your answers</AlertTitle><AlertDescription>{error} Your input is unchanged.</AlertDescription></Alert>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy || !data.parts.some((part) => part.kind !== "self-review" && answers[part.id]?.trim())}>{busy && <Loader2 className="animate-spin" data-icon="inline-start" />}{busy ? "Checking…" : "Check answers"}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => { setAnswers({}); setWorking(""); setResult(null); setError(""); }}><RotateCcw data-icon="inline-start" />Clear answers</Button>
      </div>
      {result && <p role="status" className="text-sm leading-relaxed text-muted-foreground">{result.results.filter((part) => part.status === "correct").length} correct · {result.results.filter((part) => ["incorrect", "invalid", "inconclusive"].includes(part.status)).length} to revisit · {result.results.filter((part) => part.status === "unanswered").length} unanswered · {result.results.filter((part) => part.status === "self-review").length} self-review. Not saved.</p>}
    </form>}
  </section>;
}
