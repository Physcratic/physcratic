"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { authClient } from "@/lib/auth-client";
import { PracticeCheckJournal, practiceSessionStorage } from "@/lib/practice-check-client";
import { practiceCheckInputSchema, practiceCheckReceiptSchema, type PracticeCheckRequest } from "@/lib/practice-check-contracts";
import { PendingSaveRetrier, parseRetryAfter, type RetryStatus, type SaveOutcome } from "@/lib/pending-save-retry";
import useSWRImmutable from "swr/immutable";
import Link from "next/link";
import { ArrowRight, Lightbulb, Loader2, RotateCcw } from "lucide-react";
import { archiveAnswerLimit, archiveMetadataSchema, archiveGradeResponseSchema, type ArchiveGradeResponse, type ArchiveMetadata } from "@/lib/archive-grading-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { bareLabel } from "@/lib/part-colors";
import { summariseCheck, summariseSavedCheck } from "@/lib/solve-feedback";
import { FeedbackBox, PartChip, ResultLine, StepHeading, answerCardClass, invalidFieldText } from "./solve-ui";
import { PartProgressBar, SolvedBanner, useJustSolved } from "./part-progress";
import { MathAnswerField } from "./math-answer-field";
import { conditionPhrases, type PaletteItem } from "./answer-palette";
import { ConditionsLine } from "./inline-math";
import { markSolved } from "./solved-problems";
import { Skeleton } from "@/components/ui/skeleton";

/** The server said it will not save this check. The same request would be refused again, so it is not retried on a timer. */
class SaveRejected extends Error {}

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
type PanelProps = { problemId: string; onCorrect?: () => void; onSeeHint?: () => void; nextHref?: string; resetToken?: number; saveProgress?: boolean };
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
  const saveAccount = props.saveProgress !== false && !session.isPending && !session.error && session.data?.user.emailVerified ? account : undefined;
  if (!data && !error) return <div role="status" className="flex min-w-0 flex-col gap-4"><span className="sr-only">Loading answer fields…</span><Skeleton className="h-11 w-full" /></div>;
  if (error || !data || data.problemId !== props.problemId) return <Alert variant="destructive"><AlertTitle>Answer fields unavailable</AlertTitle><AlertDescription><Button variant="outline" className="min-h-11" onClick={() => mutate()}>Retry loading fields</Button></AlertDescription></Alert>;
  return <ArchiveAnswerWorkspace key={`${boundary.current.epoch}:${data.problemId}:${data.version}`} {...props} data={data} account={account} saveAccount={saveAccount} resolving={session.isPending} refreshMetadata={() => { void mutate(); }} />;
}

function ArchiveAnswerWorkspace({ problemId, onCorrect, onSeeHint, nextHref, resetToken, saveProgress, data, account, saveAccount, resolving, refreshMetadata }: PanelProps & { data: ArchiveMetadata; account: string; saveAccount?: string; resolving: boolean; refreshMetadata: () => void }) {
  const [journal, setJournal] = useState(() => new PracticeCheckJournal(account, problemId, data.version, practiceSessionStorage()));
  const [answers, setAnswers] = useState<Record<string, string>>(() => journal.book.answers);
  const currentAnswers = useRef(answers);
  /** Answers a check marked correct. They stay on screen, but are not kept for a reload. */
  const correctAnswers = useRef<Record<string, string>>({});
  /** The grader's message for each part in `correctAnswers`, so a correct part keeps saying why while other parts are edited. */
  const correctMessages = useRef<Record<string, string>>({});
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
  /** A quiet retry of the pending save. It never disables the answer boxes. */
  const syncing = useRef<AbortController | null>(null);
  const [syncStatus, setSyncStatus] = useState<RetryStatus>("idle");
  const retrierRef = useRef<PendingSaveRetrier | null>(null);
  const syncRef = useRef<() => Promise<SaveOutcome>>(async () => "skipped");
  /** What a 429 on a save asked for with Retry-After. The retrier takes it once when it sets the next timer. */
  const retryAfter = useRef<number | undefined>(undefined);
  const live = useRef({ journal, account, saveAccount, conflict });
  live.current = { journal, account, saveAccount, conflict };
  const fieldPrefix = useId();
  const previousReset = useRef(resetToken);
  useEffect(() => () => { pending.current?.abort(); syncing.current?.abort(); }, []);
  useEffect(() => {
    if (journal.account === account) return;
    pending.current?.abort(); pending.current = null; syncing.current?.abort(); syncing.current = null; setBusy(false); setResult(null); setError(""); setSaveMessage(""); correctAnswers.current = {}; correctMessages.current = {};
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
    pending.current?.abort(); pending.current = null; syncing.current?.abort(); syncing.current = null; setBusy(false);
    currentAnswers.current = {}; correctAnswers.current = {}; correctMessages.current = {}; if (!conflict) journal.edit({}); setAnswers({}); setResult(null); setError(""); setSaveMessage(""); redraw(n => n + 1);
  }, [resetToken, journal, conflict]);

  /** One POST and its checks. `request` is the journal's snapshot when the check is saved, and null for a check without saving. Null back means it was cancelled. */
  async function postCheck(request: PracticeCheckRequest | null, answersToCheck: { partId: string; latex: string }[], controller: AbortController) {
    if (request) retryAfter.current = undefined;
    const response = await fetch(request ? "/api/practice-checks" : "/api/archive-grade", {
      method: "POST", headers: { "Content-Type": "application/json", ...(request ? { "X-Practice-Account": account } : {}) }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      cache: "no-store", credentials: "same-origin", body: request ? JSON.stringify(request) : JSON.stringify({ problemId, version: data.version, answers: answersToCheck }),
    });
    // Read before the body, so a 429 with a body that is not JSON still counts. A network error leaves nothing stale either.
    if (request) retryAfter.current = response.status === 429 ? parseRetryAfter(response.headers.get("Retry-After")) : undefined;
    const body = await response.json();
    if (controller.signal.aborted) return null;
    if (!response.ok) {
      const message = typeof body.error === "string" ? body.error : "Could not check your answers. Please retry.";
      throw request && body.saveState === "rejected" ? new SaveRejected(message) : new Error(message);
    }
    const receipt = request ? practiceCheckReceiptSchema.parse(body) : null;
    const checked = archiveGradeResponseSchema.parse(receipt ? { problemId: receipt.attempt.problemId, version: receipt.attempt.version, results: receipt.attempt.results } : body);
    if (checked.problemId !== problemId || checked.version !== data.version || checked.results.length !== data.parts.length || new Set(checked.results.map(p => p.partId)).size !== data.parts.length || checked.results.some(p => !data.parts.some(part => part.id === p.partId))) throw new Error("The problem changed. Reload the answer fields and retry.");
    return { receipt, checked };
  }

  /** What happens once the server answered, for a normal check and for a quiet retry alike. Typed answers are never replaced here. */
  function finishCheck(checked: ArchiveGradeResponse, receipt: ReturnType<typeof practiceCheckReceiptSchema.parse> | null, checkedInput: { partId: string; latex: string }[]) {
    if (receipt) {
      journal.accept(receipt);
      setSaveMessage(journal.book.pending ? "Saved to your account. Local retry cleanup failed. Retrying the same check is safe." : "Saved to your account. Your dashboard will update.");
      void mutate(key => Array.isArray(key) && key[1] === account && ["/api/practice-progress", "/api/problem-progress", "/api/dashboard"].includes(key[0]));
    } else setSaveMessage("Checked without saving. This result does not update account progress.");
    const gradedAnswers = receipt?.attempt.answers ?? checkedInput;
    const visible = data.parts.filter(part => part.kind !== "self-review" && currentAnswers.current[part.id]?.trim()).map(part => ({ partId: part.id, latex: currentAnswers.current[part.id] }));
    if (gradedAnswers.length !== visible.length || gradedAnswers.some(answer => !visible.some(current => current.partId === answer.partId && current.latex === answer.latex))) {
      setResult(null);
      setSaveMessage(receipt ? "The original pending check is saved. Your current answers have not been checked." : "The earlier answers were checked without saving. Your current answers have not been checked.");
      return;
    }
    setResultSaved(Boolean(receipt));
    setResult(checked);
    for (const item of checked.results) if (item.status === "correct" && currentAnswers.current[item.partId]) { correctAnswers.current[item.partId] = currentAnswers.current[item.partId]; correctMessages.current[item.partId] = item.message; }
    if (!conflict && journal.account === account) journal.edit(worthKeeping(currentAnswers.current));
    if (checked.results.every(part => part.status === "correct")) onCorrect?.();
    if (account === "guest" && checked.results.some(part => part.status === "correct") && checked.results.every(part => part.status === "correct" || part.status === "self-review")) markSolved(problemId);
  }

  async function checkAnswers(event?: React.FormEvent, withoutSaving = false) {
    event?.preventDefault();
    if (pending.current || syncing.current) return;
    const input = { problemId, version: data.version, answers: data.parts.filter(part => part.kind !== "self-review" && answers[part.id]?.trim()).map(part => ({ partId: part.id, latex: answers[part.id] })) };
    const shouldSave = !withoutSaving && Boolean(saveAccount);
    if (shouldSave && (conflict || journal.account !== account)) { setError("Choose which draft to use before saving."); return; }
    let request: PracticeCheckRequest | null = null;
    if (!input.answers.length) { setError("Type an answer first."); return; }
    if (!practiceCheckInputSchema.safeParse(input).success) { setError("Type a supported answer within the input limit first."); return; }
    try {
      if (shouldSave) request = journal.begin(input);
      if (shouldSave && !request) { setError("Recovery could not prepare a safe retry. Use Check without saving and keep your answers before leaving."); redraw(n => n + 1); return; }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not prepare the check."); return; }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError(""); setResult(null); setSaveMessage(""); redraw(n => n + 1);
    try {
      const sent = await postCheck(request, input.answers, controller);
      if (!sent) return;
      finishCheck(sent.checked, sent.receipt, input.answers);
    } catch (reason) {
      if (!controller.signal.aborted) setError((reason instanceof Error ? reason.message : "Could not check your answers.") + (shouldSave ? " The save is unconfirmed. Your answer stays on this device and is sent again automatically, or you can check without saving." : ""));
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(false); redraw(n => n + 1); }
    }
  }

  /**
   * One quiet attempt to send the pending saved check again. It never disables the answer boxes, never clears what is
   * on screen and never touches typed answers. The request is the journal's own snapshot with its idempotency key.
   */
  async function syncPending(): Promise<SaveOutcome> {
    const now = live.current;
    const request = now.journal.retry();
    if (!request || !now.saveAccount || now.conflict || now.journal.account !== now.account || pending.current || syncing.current) return "skipped";
    const controller = new AbortController();
    syncing.current = controller;
    try {
      const sent = await postCheck(request, [], controller);
      if (!sent) return "skipped";
      finishCheck(sent.checked, sent.receipt, []);
      redraw(n => n + 1);
      return "saved";
    } catch (reason) {
      if (controller.signal.aborted) return "skipped";
      if (reason instanceof SaveRejected) { setError(reason.message); return "rejected"; }
      return "failed";
    } finally {
      if (syncing.current === controller) syncing.current = null;
    }
  }
  syncRef.current = syncPending;
  const pendingNow = Boolean(journal.book.pending);
  useEffect(() => {
    const retrier = new PendingSaveRetrier({
      hasPending: () => { const now = live.current; return Boolean(now.journal.book.pending && now.saveAccount && !now.conflict && now.journal.account === now.account); },
      attempt: () => syncRef.current(),
      setTimer: (run, ms) => window.setTimeout(run, ms),
      clearTimer: (handle) => window.clearTimeout(handle as number),
      now: () => Date.now(),
      onStatus: setSyncStatus,
      takeRetryAfter: () => { const asked = retryAfter.current; retryAfter.current = undefined; return asked; },
    });
    retrierRef.current = retrier;
    const detach = retrier.attach(window, document);
    retrier.arm();
    return () => { detach(); retrier.dispose(); retrierRef.current = null; };
  }, []);
  useEffect(() => { retrierRef.current?.arm(); }, [pendingNow, saveAccount, conflict, journal]);

  const summary = result ? (resultSaved ? summariseSavedCheck(result.results) : summariseCheck(result.results)) : null;
  // A part is correct while its answer is the one a check marked correct. The bar, the cards and the Solved note all read this.
  const gradable = data.parts.filter((part) => part.kind !== "self-review");
  const isCorrect = (partId: string) => correctAnswers.current[partId] !== undefined && correctAnswers.current[partId] === answers[partId];
  const barParts = gradable.map((part) => ({ id: part.id, correct: isCorrect(part.id) }));
  const solved = gradable.length > 0 && gradable.every((part) => isCorrect(part.id));
  const justSolved = useJustSolved(solved);
  /** The first part still empty, outlined. Only when there is more than one part to choose from. */
  const nextPartId = gradable.length > 1 ? gradable.find((part) => !answers[part.id]?.trim())?.id : undefined;
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
      <PartProgressBar parts={barParts} />
    </header>
    {data?.problemId === problemId && <form onSubmit={(event) => {
      // A pending save is sent again first. Typed answers are checked on the next press once it is saved.
      if (journal.book.pending && saveAccount && !conflict && journal.account === account) { event.preventDefault(); void retrierRef.current?.trigger("check"); return; }
      void checkAnswers(event);
    }} className="flex min-w-0 flex-col gap-6" onKeyDown={(event) => {
      if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
    }}>
      <FieldGroup>
        {data.parts.map((part, position) => {
          const id = `${fieldPrefix}-${part.id}`;
          const feedback = result?.results.find((item) => item.partId === part.id) ?? (isCorrect(part.id) ? { partId: part.id, status: "correct" as const, message: correctMessages.current[part.id] ?? "" } : undefined);
          const invalid = feedback?.status === "invalid" || feedback?.status === "incorrect";
          const card = answerCardClass(part.id === nextPartId);
          if (part.kind === "self-review") return <div key={part.id} className={card}><Alert><AlertTitle className="flex flex-wrap items-center gap-2"><PartChip>{bareLabel(part.sourcePart)}</PartChip>{part.label}</AlertTitle><AlertDescription>Check this one yourself. {part.help} Compare your reasoning with the worked solution. It is not graded.</AlertDescription></Alert>{saveProgress === false && <Field className="mt-4"><FieldLabel htmlFor={id}>Your reasoning for {bareLabel(part.sourcePart)}</FieldLabel><textarea id={id} className="min-h-28 w-full rounded-md border border-input bg-background p-3 text-base" value={answers[part.id] ?? ""} maxLength={archiveAnswerLimit} onChange={event => set(part.id, event.target.value)} disabled={busy} /></Field>}</div>;
          const conditions = conditionPhrases(part.symbolConditions);
          return <div key={part.id} data-tour={position === 0 ? "answer-box" : undefined} className={card}><Field data-invalid={invalid} data-disabled={busy} className={invalidFieldText}>
            <FieldLabel id={`${id}-label`} htmlFor={id} className="flex-wrap items-center"><PartChip>{bareLabel(part.sourcePart)}</PartChip><span className="text-base font-medium">{part.label}{part.unit && <span className="font-normal text-muted-foreground"> ({part.unit})</span>}</span></FieldLabel>
            <ConditionsLine phrases={conditions} />
            {part.kind === "numeric"
              ? <>
                <div className="flex min-w-0 items-center gap-2">
                  <Input id={id} className="h-11 min-w-0 flex-1" inputMode="decimal" value={answers[part.id] ?? ""} maxLength={archiveAnswerLimit} autoComplete="off" spellCheck={false} disabled={busy} placeholder="Number" aria-invalid={invalid} aria-describedby={`${id}-help ${id}-result`} onChange={(event) => set(part.id, event.target.value)} />
                  {part.unit && <span aria-hidden="true" className="shrink-0 text-sm text-muted-foreground">{part.unit}</span>}
                </div>
                {part.help.length <= shortHelp && <FieldDescription id={`${id}-help`}>{part.help}</FieldDescription>}
              </>
              : <MathAnswerField id={id} labelId={`${id}-label`} value={answers[part.id] ?? ""} onChange={(latex) => set(part.id, latex)} symbols={part.symbols} extraItems={part.kind === "special" ? [infinity] : undefined} upgradeOnBlur disabled={busy} invalid={invalid} describedBy={`${id}-result`} maxLength={archiveAnswerLimit} />}
            {feedback && <ResultLine id={`${id}-result`} status={feedback.status} message={feedback.message} />}
          </Field></div>;
        })}
      </FieldGroup>
      {notes.length > 0 && <details className="min-w-0 rounded-lg border p-4"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Notes for each part</summary><ul className="flex flex-col gap-2 pt-3 text-sm leading-relaxed text-muted-foreground">{notes.map((part) => <li key={part.id}><strong className="font-medium text-foreground">{bareLabel(part.sourcePart)} {part.label}.</strong> {part.help}</li>)}</ul></details>}
      <div className="flex min-w-0 flex-col gap-4">
        <StepHeading step={3} as="h3" id="step-check">Check</StepHeading>
        <p className="text-sm text-muted-foreground">Only final answers are checked. Review your reasoning and any self-review parts with the worked solution.</p>
        {conflict && <Alert><AlertTitle>Choose your draft</AlertTitle><AlertDescription>Another recovery entry exists for this account. Choose the answer fields to keep. Pending saves stay unchanged. Until you choose, copy new edits before leaving or reloading.
          <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" className="min-h-11" onClick={() => { journal.edit(currentAnswers.current); setConflict(false); redraw(n => n + 1); }}>Keep current draft</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => { currentAnswers.current = journal.book.answers; setAnswers(journal.book.answers); setConflict(false); setResult(null); }}>Restore account draft</Button></div>
        </AlertDescription></Alert>}
        {journal.warning && <p role="status" className="text-sm text-destructive">{journal.warning}</p>}
        {journal.book.pending && <Alert><AlertTitle>Pending save</AlertTitle><AlertDescription>Editing or clearing fields does not change the check that is waiting to be saved.</AlertDescription></Alert>}
        {saveMessage && <p role="status" className="text-sm">{saveMessage}</p>}
        {error && <Alert variant="destructive"><AlertTitle>Could not check your answers</AlertTitle><AlertDescription>{error} Your input is unchanged. Copy your answers before refreshing if the problem changed. <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={refreshMetadata}>Refresh answer fields</Button></AlertDescription></Alert>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" data-tour="check-button" className="min-h-11 px-6" disabled={busy || Boolean(saveAccount && (conflict || journal.account !== account))}>{busy && <Loader2 className="animate-spin" data-icon="inline-start" />}{busy ? "Checking…" : "Check answer"}</Button>
          {journal.book.pending && saveAccount && !conflict && <p role="status" aria-live="polite" className="flex min-h-11 w-full items-center text-sm text-muted-foreground">{busy || syncStatus === "saving" ? "Saving your answer…" : syncStatus === "stalled" ? "Your answer is still saved on this device. Press Check to send it again." : "Your answer is saved on this device and will sync when you are back online."}</p>}
          {saveAccount && (journal.book.pending || journal.warning || error || conflict) && <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => { void checkAnswers(undefined, true); }}>Check without saving</Button>}
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => { currentAnswers.current = {}; correctAnswers.current = {}; correctMessages.current = {}; setAnswers({}); if (!conflict) journal.edit({}); redraw(n => n + 1); setResult(null); setError(""); }}><RotateCcw data-icon="inline-start" />Clear answers</Button>
        </div>
        {justSolved && <SolvedBanner />}
        <div aria-live="polite" aria-atomic="true" className="min-w-0">
          {summary && <FeedbackBox tone={summary.tone} title={summary.headline}>
            <p>{summary.detail}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {summary.needsAnotherTry && <Button type="button" variant="outline" className="min-h-11 bg-background" onClick={tryAgain}><RotateCcw data-icon="inline-start" />Try again</Button>}
              {summary.needsAnotherTry && onSeeHint && <Button type="button" variant="outline" className="min-h-11 bg-background" onClick={onSeeHint}><Lightbulb data-icon="inline-start" className="text-amber" />See hint</Button>}
              {summary.allCorrect && nextHref && <Button asChild className="min-h-11"><Link href={nextHref}>Next problem<ArrowRight data-icon="inline-end" /></Link></Button>}
            </div>
          </FeedbackBox>}
        </div>
      </div>
    </form>}
  </section>;
}
