"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import useSWR, { useSWRConfig } from "swr";
import { FileUp, Loader2, Save, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { submissionLimits, type SubmissionEvidence, type SolutionSubmission } from "@/lib/solution-grading";
import { SolutionRecovery, type SolutionDraft } from "@/lib/solution-recovery";
import { practiceSessionStorage } from "@/lib/practice-check-client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MathWorkingEditor } from "./math-working-editor";
import { IndividualRatingSummary } from "./individual-rating-summary";
import { PlainMathCheck } from "./plain-math-check";

type UploadedEvidence = SubmissionEvidence & { filename: string };
type Source = { problemVersion: string; gradingEnabled: boolean; ratedEnabled: boolean; rating: number | null; parts: { partId: string; maxPoints: number }[] };
async function loadInfo([url, account]: readonly [string, string]): Promise<Source> {
  const response = await fetch(url, { cache: "no-store", headers: { "X-Practice-Account": account } });
  if (!response.ok) throw new Error("Could not verify the problem version.");
  return response.json();
}

export function SolutionSubmissionForm({ problemId }: { problemId: string }) {
  const { data: session, isPending, error: sessionError } = authClient.useSession();
  const account = !isPending && !sessionError ? session?.user.id : undefined;
  const { data: source, error: sourceError, mutate: retrySource } = useSWR(account ? [`/api/submission-info/${problemId}`, account] as const : null, loadInfo, { keepPreviousData: false });
  if (isPending) return <SolutionGate><p role="status">Checking your account.</p></SolutionGate>;
  if (sessionError) return <SolutionGate><Alert variant="destructive"><AlertTitle>Account unavailable</AlertTitle><AlertDescription>Reload to retry. Work recovered in this tab stays private to the account that wrote it.</AlertDescription></Alert></SolutionGate>;
  if (!account) return <SolutionGate><div className="flex flex-col items-start gap-3"><p>Sign in to save typed solutions and upload private files.</p><Button asChild><Link href={`/sign-in?returnTo=${encodeURIComponent(`/dashboard/problems/${problemId}`)}`}>Sign in to submit</Link></Button></div></SolutionGate>;
  if (!source) return <SolutionGate>{sourceError ? <Alert variant="destructive"><AlertTitle>Source verification failed</AlertTitle><AlertDescription><Button variant="outline" onClick={() => void retrySource()}>Retry verification</Button></AlertDescription></Alert> : <p role="status">Loading the problem version.</p>}</SolutionGate>;
  return <SolutionEditor key={`${account}:${problemId}`} account={account} problemId={problemId} source={source} sourceError={Boolean(sourceError)} retrySource={() => void retrySource()} />;
}

/** Public calculator access must not depend on a successful account or source lookup. */
function SolutionGate({ children }: { children: ReactNode }) {
  return <Card className="shadow-none"><CardHeader><CardTitle>Your solution</CardTitle><CardDescription>Submit one subpart at a time. Write reasoning and calculator-style equations in plain text. No LaTeX required. You can also attach a photo or PDF of your working.</CardDescription></CardHeader><CardContent className="flex min-w-0 flex-col gap-6"><PlainMathCheck />{children}</CardContent></Card>;
}

function SolutionEditor({ account, problemId, source, sourceError, retrySource }: { account: string; problemId: string; source: Source; sourceError: boolean; retrySource: () => void }) {
  const { mutate } = useSWRConfig();
  const [journal, setJournal] = useState<SolutionRecovery | null>(null);
  const [, refresh] = useState(0);
  const [version] = useState(source.problemVersion);
  const active = useRef(false);
  const flight = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    setJournal(new SolutionRecovery(account, problemId, version, practiceSessionStorage()));
    return () => { active.current = false; flight.current?.abort(); };
  }, [account, problemId, version]);
  const [evidence, setEvidence] = useState<UploadedEvidence[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changedVersion = version !== source.problemVersion;
  const draft = journal?.book.draft;
  const { partId = "", working = "", finalAnswer = "", transcription = "" } = draft ?? {};
  const saved = journal?.book.receipt?.id;
  const assessment = journal?.book.receipt;
  const pending = journal?.book.pending;
  function edit(change: Partial<SolutionDraft>) {
    if (!journal || pending || changedVersion) return;
    journal.edit({ ...journal.book.draft, ...change });
    refresh(n => n + 1);
  }
  function download() {
    if (!journal) return;
    const url = URL.createObjectURL(new Blob([journal.exportText()], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${problemId}-working.txt`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (journal && !journal.book.receipt && (journal.book.pending || Object.values(journal.book.draft).some(Boolean) || evidence.length)) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [journal, evidence.length]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || pending || changedVersion || flight.current) return;
    setError("");
    if (files.length + evidence.length > submissionLimits.maxFiles || files.some((file) => !file.size || file.size > submissionLimits.maxFileBytes) || [...files, ...evidence].reduce((sum, file) => sum + ("size" in file ? file.size : file.bytes), 0) > submissionLimits.maxTotalBytes) {
      setError("Attach at most 5 files, 3 MiB each and 8 MiB total. Empty files are not supported.");
      return;
    }
    setUploading(true);
    setConfirmed(false);
    const controller = new AbortController(); flight.current = controller;
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/solution-evidence", { method: "POST", headers: { "X-Practice-Account": account }, body: form, signal: controller.signal });
        const result = await response.json();
        if (!active.current || controller.signal.aborted) return;
        if (!response.ok) throw new Error(result.error ?? "Upload failed. Please retry.");
        setEvidence((current) => [...current, result]);
      }
    } catch (reason) { if (active.current && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Upload failed. Please retry."); } finally { if (active.current && flight.current === controller) { flight.current = null; setUploading(false); } }
  }
  async function send(request: SolutionSubmission) {
    if (!active.current || flight.current || !journal) return;
    setError("");
    const controller = new AbortController(); flight.current = controller;
    setSaving(true);
    try {
      const response = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json", "X-Practice-Account": account }, body: JSON.stringify(request), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) });
      const result = await response.json();
      if (!active.current || controller.signal.aborted) return;
      if (!response.ok) { journal.reject(response.status); throw new Error(result.error ?? "Saving failed. Please retry."); }
      journal.accept(result);
      void mutate((key) => Array.isArray(key) && ["/api/submissions", "/api/dashboard", "/api/individual-rating"].includes(key[0]) && key[1] === account);
    } catch (reason) { if (active.current && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "The save could not be confirmed. Retry the original save."); } finally { if (active.current && flight.current === controller) { flight.current = null; setSaving(false); refresh(n => n + 1); } }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!journal || saving || uploading || flight.current || changedVersion || sourceError) return;
    try {
      const request = journal.begin({
        problemId, problemVersion: version, partId, working, finalAnswer,
        evidence: evidence.map(({ id, mediaType, bytes, sha256 }) => ({ id, mediaType, bytes, sha256 })),
        ...(evidence.length ? { transcription: { text: transcription, confirmed: confirmed as true } } : {}),
      });
      refresh(n => n + 1);
      void send(request);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Check your submission."); refresh(n => n + 1); }
  }
  if (!journal) return <p role="status">Recovering working from this tab.</p>;
  return <Card className="shadow-none">
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Your solution</CardTitle><Badge variant="outline">{source?.ratedEnabled ? `Private, ${source.rating} ELO problem` : "Private, Unrated"}</Badge></div><CardDescription>Submit one subpart at a time. Write reasoning and calculator-style equations in plain text. No LaTeX required. You can also attach a photo or PDF of your working.</CardDescription></CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-6">
      <PlainMathCheck />
      <IndividualRatingSummary userId={account} />
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">Text recovery is limited to this browser tab. Download your working before closing it. Attach unsubmitted files again after reloading.</p>
        <Button type="button" variant="outline" onClick={download}>Download working</Button>
      </div>
      {journal.warning && <p role="alert" className="text-sm text-destructive">{journal.warning}</p>}
      {transcription && !evidence.length && !pending && !saved && <p role="status" className="text-sm text-muted-foreground">Your attachment transcription was recovered. Attach the files again to include it in a new attempt.</p>}
      {changedVersion && <Alert><AlertTitle>Problem version changed</AlertTitle><AlertDescription>Download your working before reloading. A pending save can still be retried using its original version.</AlertDescription></Alert>}
      {pending && <Alert><AlertTitle>Save not yet confirmed</AlertTitle><AlertDescription><p>Retry sends the original working and attachments. Editing is paused until that save is confirmed.</p><Button type="button" variant="outline" disabled={saving || uploading} onClick={() => { const request = journal.retry(); if (request) void send(request); }}>{saving ? "Retrying save." : "Retry original save"}</Button><Button asChild type="button" variant="link"><Link href="/dashboard/submissions">View my attempts</Link></Button></AlertDescription></Alert>}
      <Alert><AlertTitle>{source?.gradingEnabled ? "Reviewed final-answer checks available" : "Save now. Grading comes after reference review."}</AlertTitle><AlertDescription>{source?.gradingEnabled ? `Use the exact subpart labels: ${source.parts.map((part) => part.partId).join(", ")}. Only the final expression is checked, not reasoning or units. ${source.ratedEnabled ? "The first checked result for every configured subpart determines one full-problem ELO update." : "This problem is unrated. No ELO is awarded."}` : "No marks or ELO are awarded yet. Attempts are stored against the original source version. Grading needs reviewed, subpart-specific answer checks. Problem ratings will be added when supplied."}</AlertDescription></Alert>
      {saved ? <div className="flex flex-col items-start gap-4" role="status"><Alert><AlertTitle>{assessment?.check ? "Attempt saved, final expression checked" : "Attempt saved, awaiting reference"}</AlertTitle><AlertDescription>{assessment?.check ? `${assessment.check.matched ? "The expression matches the reviewed answer." : "The checker did not establish an answer match. This is not a review of your method."} Final-answer points: ${assessment.check.awardedPoints}/${assessment.check.maxPoints}. ${assessment.ratingEvent ? `Individual ELO: ${assessment.ratingEvent.rating} (${assessment.ratingEvent.change >= 0 ? "+" : ""}${assessment.ratingEvent.change}).` : "No ELO update on this attempt."}` : "Your working and attachment references are stored privately. No grade or rating has been assigned."}</AlertDescription></Alert><div className="flex flex-wrap gap-3"><Button asChild><Link href="/dashboard/submissions">View my attempts</Link></Button><Button variant="outline" onClick={() => { if (journal.startAnother()) { setEvidence([]); setConfirmed(false); setError(""); } refresh(n => n + 1); }}>Start another attempt</Button></div></div> : <form onSubmit={submit}>
        <fieldset disabled={saving || uploading || Boolean(pending) || changedVersion}><FieldGroup>
          <Field><FieldLabel htmlFor={`${problemId}-part`}>Subpart label</FieldLabel><Input id={`${problemId}-part`} value={partId} onChange={(event) => edit({ partId: event.target.value })} required maxLength={32} placeholder="e.g. A.1 or 1(a)" /><FieldDescription>Copy the label from the statement. This label is student-entered, not yet verified against a marking scheme.</FieldDescription></Field>
          <MathWorkingEditor id={`${problemId}-working`} value={working} onChange={value => edit({ working: value })} description="Include assumptions, units and intermediate steps. A final expression alone may not earn method marks when grading becomes available." />
          <Field><FieldLabel htmlFor={`${problemId}-answer`}>Final answer <span className="text-muted-foreground">(optional)</span></FieldLabel><Textarea id={`${problemId}-answer`} value={finalAnswer} onChange={(event) => edit({ finalAnswer: event.target.value })} maxLength={1000} rows={2} placeholder="Your final expression, including units" /></Field>
          <Field><FieldLabel htmlFor={`${problemId}-files`}><FileUp className="size-4" /> Photos or PDF <span className="text-muted-foreground">(optional)</span></FieldLabel><Input id={`${problemId}-files`} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={upload} disabled={evidence.length >= submissionLimits.maxFiles} /><FieldDescription>JPEG, PNG, WebP or PDF. Up to 5 files, 3 MiB each, 8 MiB total. Files upload privately when selected. Only attach work you are comfortable storing.</FieldDescription></Field>
          {evidence.length > 0 && <><ul className="flex flex-col gap-2" aria-label="Attached work">{evidence.map((file) => <li key={file.id} className="flex min-w-0 items-center justify-between gap-2 rounded-md border px-3 py-2"><span className="min-w-0 truncate text-sm">{file.filename}, {(file.bytes / 1024).toFixed(0)} KiB</span><Button size="icon" variant="ghost" type="button" aria-label={`Remove ${file.filename} from this attempt`} onClick={() => { setEvidence((current) => current.filter((item) => item.id !== file.id)); setConfirmed(false); }}><X /></Button></li>)}</ul><Field><FieldLabel htmlFor={`${problemId}-transcript`}>Transcribe your attached working</FieldLabel><Textarea id={`${problemId}-transcript`} value={transcription} onChange={(event) => { edit({ transcription: event.target.value }); setConfirmed(false); }} maxLength={submissionLimits.maxText} rows={6} required placeholder="Type the reasoning and equations visible in your attachments. Include all steps you want assessed." /><FieldDescription>Automatic handwriting extraction is not enabled yet. Provide the exact text and equations yourself. Do not add steps absent from your pages.</FieldDescription></Field><Field orientation="horizontal"><Checkbox id={`${problemId}-confirm`} checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} /><FieldLabel htmlFor={`${problemId}-confirm`}>I checked that this transcription accurately represents my attached work.</FieldLabel></Field></>}
          {error && <Alert variant="destructive" role="alert"><AlertTitle>Could not save your work</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          {sourceError && <Alert variant="destructive"><AlertTitle>Source verification failed</AlertTitle><AlertDescription><Button type="button" variant="outline" size="sm" onClick={() => retrySource()}>Retry verification</Button></AlertDescription></Alert>}
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{uploading ? "Uploading private files…" : source?.gradingEnabled ? source.ratedEnabled ? "Reviewed final-answer checks, full-problem ELO" : "Final-answer checks, unrated" : "No automatic grade, no rating changes"}</p><Button type="submit" disabled={sourceError || saving || uploading || Boolean(pending) || changedVersion || (evidence.length > 0 && !confirmed)}>{saving || uploading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}{saving ? "Saving…" : uploading ? "Uploading…" : "Save attempt"}</Button></div>
        </FieldGroup></fieldset>
      </form>}
    </CardContent>
  </Card>;
}
