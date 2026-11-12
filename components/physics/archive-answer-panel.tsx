"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { authClient } from "@/lib/auth-client";
import { PracticeCheckJournal, practiceSessionStorage } from "@/lib/practice-check-client";
import { practiceCheckInputSchema, practiceCheckReceiptSchema } from "@/lib/practice-check-contracts";
import useSWRImmutable from "swr/immutable";
import Link from "next/link";
import { ArrowRight, Lightbulb, Loader2, RotateCcw } from "lucide-react";
import { archiveAnswerLimit, archiveMetadataSchema, archiveGradeResponseSchema, type ArchiveGradeResponse, type ArchiveMetadata } from "@/lib/archive-grading-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { assignPartColors } from "@/lib/part-colors";
import { summariseCheck, summariseSavedCheck } from "@/lib/solve-feedback";
import { FeedbackBox, PartChip, ResultLine, StepHeading, partBorder, partStyle } from "./solve-ui";
import { MathAnswerField } from "./math-answer-field";
import { formatConditions, type PaletteItem } from "./answer-palette";
import { markSolved } from "./solved-problems";
import { Skeleton } from "@/components/ui/skeleton";

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
 * no hint or no next problem shows neither. Saved checks use the same trusted grader as guest checks.
 * An expression is typed in one maths field with a palette under it. A number is a plain box. A problem counts as
 * solved in this browser when every part with an answer box is correct.
 */
type PanelProps = { problemId: string; onCorrect?: () => void; onSeeHint?: () => void; nextHref?: string; resetToken?: number };
export function ArchiveAnswerPanel(props: PanelProps) {
  const { data, error, mutate } = useSWRImmutable(`/corpus/grading/${encodeURIComponent(props.problemId)}.json`, loadMetadata);
  const session = authClient.useSession();
  const boundary = useRef({ ready: false, account: "guest", epoch: 0 });
  const account = session.error ? "guest" : session.data?.user.id ?? "guest";
  if (boundary.current.ready && boundary.current.account !== account) {
    boundary.current.epoch++; boundary.current.account = account;
  }
  if (!session.isPending || account !== "guest") {
    boundary.current.ready = true; boundary.current.account = account;
  }
  const saveAccount = !session.isPending && !session.error && session.data?.user.emailVerified ? account : undefined;
  if (!data && !error) return <div role="status" className="flex min-w-0 flex-col gap-4"><span className="sr-only">Loading answer fields…</span><Skeleton className="h-11 w-full" /></div>;
  if (error || !data || data.problemId !== props.problemId) return <Alert variant="destructive"><AlertTitle>Answer fields unavailable</AlertTitle><AlertDescription><Button variant="outline" className="min-h-11" onClick={() => mutate()}>Retry loading fields</Button></AlertDescription></Alert>;
  return <ArchiveAnswerWorkspace key={`${boundary.current.epoch}:${data.problemId}:${data.version}`} {...props} data={data} account={account} saveAccount={saveAccount} resolving={session.isPending} refreshMetadata={() => { void mutate(); }} />;
}

function ArchiveAnswerWorkspace({ problemId, onCorrect, onSeeHint, nextHref, resetToken, data, account, saveAccount, resolving, refreshMetadata }: PanelProps & { data: ArchiveMetadata; account: string; saveAccount?: string; resolving: boolean; refreshMetadata: () => void }) {
  const [journal, setJournal] = useState(() => new PracticeCheckJournal(account, problemId, data.version, practiceSessionStorage()));
  const [answers, setAnswers] = useState<Record<string, string>>(() => journal.book.answers);
  const currentAnswers = useRef(answers);
  /** Answers a check marked correct. They stay on screen, but are not kept for a reload. */
  const correctAnswers = useRef<Record<string, string>>({});
  const worthKeeping = (all: Record<string, string>) => Object.fromEntries(Object.entries(all).filter(([id, latex]) => correctAnswers.current[id] !== latex));
  const typedWhileResolving = useRef(false);
  const [conflict, setConflict] = useState(false);
  const [result, setResult] = useState<ArchiveGradeResponse | null>(null);
  const [error, setError] = useState("");
  const [resultSaved, setResultSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [, redraw] = useState(0);
  const { mutate } = useSWRConfig();
  const pending = useRef<AbortController | null>(null);
  const fieldPrefix = useId();
  const previousReset = useRef(resetToken);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (journal.account === account) return;
    pending.current?.abort(); pending.current = null; setBusy(false); setResult(null); setError(""); setSaveMessage(""); correctAnswers.current = {};
    const next = new PracticeCheckJournal(account, problemId, data.version, practiceSessionStorage());
    setJournal(next);
    if (journal.account === "guest" && typedWhileResolving.current && Object.keys(currentAnswers.current).length) {
      if (next.book.pending || Object.keys(next.book.answers).length || next.warning) setConflict(true);
      else next.edit(currentAnswers.current);
    } else { currentAnswers.current = next.book.answers; setAnswers(next.book.answers); }
    typedWhileResolving.current = false;
  }, [account, journal, problemId, data.version]);
  useLayoutEffect(() => {
    if (previousReset.current === resetToken) return;
    previousReset.current = resetToken;
    pending.current?.abort(); pending.current = null; setBusy(false);
    currentAnswers.current = {}; correctAnswers.current = {}; if (!conflict) journal.edit({}); setAnswers({}); setResult(null); setError(""); setSaveMessage(""); redraw(n => n + 1);
  }, [resetToken, journal, conflict]);

  async function checkAnswers(event?: React.FormEvent, withoutSaving = false, retry = false) {
    event?.preventDefault();
    if (pending.current) return;
    const input = { problemId, version: data.version, answers: data.parts.filter(part => part.kind !== "self-review" && answers[part.id]?.trim()).map(part => ({ partId: part.id, latex: answers[part.id] })) };
    const shouldSave = !withoutSaving && Boolean(saveAccount);
    if (shouldSave && (conflict || journal.account !== account)) { setError("Choose which draft to use before saving."); return; }
    let request = retry ? journal.retry() : null;
    if (retry && (!request || !saveAccount)) { setError("Sign in to the original account to retry this save."); return; }
    if (!retry && !practiceCheckInputSchema.safeParse(input).success) { setError("Type a supported answer within the input limit first."); return; }
    try {
      if (shouldSave && !retry) request = journal.begin(input);
      if (shouldSave && !request) { setError("Recovery could not prepare a safe retry. Use Check without saving and keep your answers before leaving."); redraw(n => n + 1); return; }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not prepare the check."); return; }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError(""); setResult(null); setSaveMessage(""); redraw(n => n + 1);
    try {
      const response = await fetch(shouldSave ? "/api/practice-checks" : "/api/archive-grade", {
        method: "POST", headers: { "Content-Type": "application/json", ...(shouldSave ? { "X-Practice-Account": account } : {}) }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        cache: "no-store", credentials: "same-origin", body: shouldSave ? JSON.stringify(request) : JSON.stringify({ problemId, version: data.version, answers: input.answers }),
      });
      const body = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Could not check your answers. Please retry.");
      }
      const receipt = shouldSave ? practiceCheckReceiptSchema.parse(body) : null;
      const checked = archiveGradeResponseSchema.parse(receipt ? { problemId: receipt.attempt.problemId, version: receipt.attempt.version, results: receipt.attempt.results } : body);
      if (checked.problemId !== problemId || checked.version !== data.version || checked.results.length !== data.parts.length || new Set(checked.results.map(p => p.partId)).size !== data.parts.length || checked.results.some(p => !data.parts.some(part => part.id === p.partId))) throw new Error("The problem changed. Reload the answer fields and retry.");
      if (receipt) {
        journal.accept(receipt);
        setSaveMessage(journal.book.pending ? "Saved to your account. Local retry cleanup failed. Retrying the same check is safe." : "Saved to your account. Your dashboard will update.");
        void mutate(key => Array.isArray(key) && key[1] === account && ["/api/practice-progress", "/api/problem-progress", "/api/dashboard"].includes(key[0]));
      } else setSaveMessage("Checked without saving. This result does not update account progress.");
      const gradedAnswers = receipt?.attempt.answers ?? input.answers;
      const visible = data.parts.filter(part => part.kind !== "self-review" && currentAnswers.current[part.id]?.trim()).map(part => ({ partId: part.id, latex: currentAnswers.current[part.id] }));
      if (gradedAnswers.length !== visible.length || gradedAnswers.some(answer => !visible.some(current => current.partId === answer.partId && current.latex === answer.latex))) {
        setResult(null);
        setSaveMessage(receipt ? "The original pending check is saved. Your current answers have not been checked." : "The earlier answers were checked without saving. Your current answers have not been checked.");
        return;
      }
      setResultSaved(Boolean(receipt));
      setResult(checked);
      for (const item of checked.results) if (item.status === "correct" && currentAnswers.current[item.partId]) correctAnswers.current[item.partId] = currentAnswers.current[item.partId];
      if (!conflict && journal.account === account) journal.edit(worthKeeping(currentAnswers.current));
      if (checked.results.every(part => part.status === "correct")) onCorrect?.();
      if (account === "guest" && checked.results.some(part => part.status === "correct") && checked.results.every(part => part.status === "correct" || part.status === "self-review")) markSolved(problemId);
    } catch (reason) {
      if (!controller.signal.aborted) setError((reason instanceof Error ? reason.message : "Could not check your answers.") + (shouldSave ? " The save is unconfirmed. Retry the original check, or check without saving." : ""));
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(false); redraw(n => n + 1); }
    }
  }

  const summary = result ? (resultSaved ? summariseSavedCheck(result.results) : summariseCheck(result.results)) : null;
  const colors = data?.problemId === problemId ? assignPartColors(data.parts.map((part) => part.sourcePart)) : [];
  const tryAgain = () => {
    // Moves focus only. It keeps the typed answers and the result, and nothing is counted or reset.
    const target = data?.parts.find((part) => part.kind !== "self-review" && result?.results.find((item) => item.partId === part.id)?.status !== "correct");
    if (target) document.getElementById(`${fieldPrefix}-${target.id}`)?.focus();
  };
  const set = (partId: string, value: string) => { const next = { ...currentAnswers.current, [partId]: value }; currentAnswers.current = next; if (resolving) typedWhileResolving.current = true; setAnswers(next); if (!conflict) journal.edit(worthKeeping(next)); redraw(n => n + 1); setResult(null); setError(""); setSaveMessage(""); };
  const notes = data?.parts.filter((part) => part.kind !== "self-review" && part.help && !(part.kind === "numeric" && part.help.length <= shortHelp)) ?? [];

  return <section id="step-answer" aria-labelledby="step-answer-title" className="flex min-w-0 scroll-mt-24 flex-col gap-6">
    <header className="flex flex-col gap-2">
      <StepHeading step={2} id="step-answer-title">Answer</StepHeading>
      <p className="text-sm leading-relaxed text-muted-foreground">{saveAccount ? "When saving is available, checked answers are saved privately to your account. A confirmation appears after saving. Checks do not change your rating." : "Checks are not saved and do not change your rating."}</p>
    </header>
    {data?.problemId === problemId && <form onSubmit={(event) => { void checkAnswers(event); }} className="flex min-w-0 flex-col gap-6" onKeyDown={(event) => {
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
        {conflict && <Alert><AlertTitle>Choose your draft</AlertTitle><AlertDescription>Another recovery entry exists for this account. Choose the answer fields to keep. Pending saves stay unchanged. Until you choose, copy new edits before leaving or reloading.
          <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" className="min-h-11" onClick={() => { journal.edit(currentAnswers.current); setConflict(false); redraw(n => n + 1); }}>Keep current draft</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => { currentAnswers.current = journal.book.answers; setAnswers(journal.book.answers); setConflict(false); setResult(null); }}>Restore account draft</Button></div>
        </AlertDescription></Alert>}
        {journal.warning && <p role="status" className="text-sm text-destructive">{journal.warning}</p>}
        {journal.book.pending && <Alert><AlertTitle>Pending save</AlertTitle><AlertDescription>The original check is kept for retry. Reload does not send it again. Editing or clearing fields does not change it.</AlertDescription></Alert>}
        {saveMessage && <p role="status" className="text-sm">{saveMessage}</p>}
        {error && <Alert variant="destructive"><AlertTitle>Could not check your answers</AlertTitle><AlertDescription>{error} Your input is unchanged. Copy your answers before refreshing if the problem changed. <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={refreshMetadata}>Refresh answer fields</Button></AlertDescription></Alert>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" data-tour="check-button" className="min-h-11 px-6" disabled={busy || Boolean(saveAccount && (journal.book.pending || conflict || journal.account !== account))}>{busy && <Loader2 className="animate-spin" data-icon="inline-start" />}{busy ? "Checking…" : "Check answer"}</Button>
          {journal.book.pending && <Button type="button" variant="outline" className="min-h-11" disabled={busy || !saveAccount || conflict} onClick={() => { void checkAnswers(undefined, false, true); }}>Retry pending save</Button>}
          {saveAccount && (journal.book.pending || journal.warning || error || conflict) && <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => { void checkAnswers(undefined, true); }}>Check without saving</Button>}
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => { currentAnswers.current = {}; setAnswers({}); if (!conflict) journal.edit({}); redraw(n => n + 1); setResult(null); setError(""); }}><RotateCcw data-icon="inline-start" />Clear answers</Button>
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
