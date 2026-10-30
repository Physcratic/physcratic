"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import { FileUp, Loader2, Save, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { submissionLimits, solutionSubmissionSchema, type SubmissionEvidence } from "@/lib/solution-grading";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MathWorkingEditor } from "./math-working-editor";

type UploadedEvidence = SubmissionEvidence & { filename: string };
async function loadInfo(url: string): Promise<{ problemVersion: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not verify the problem version.");
  return response.json();
}

export function SolutionSubmissionForm({ problemId }: { problemId: string }) {
  const { data: session, isPending, error: sessionError } = authClient.useSession();
  const { data: source, error: sourceError, mutate: retrySource } = useSWR(session?.user ? `/api/submission-info/${problemId}` : null, loadInfo);
  const { mutate } = useSWRConfig();
  const [partId, setPartId] = useState("");
  const [working, setWorking] = useState("");
  const [finalAnswer, setFinalAnswer] = useState("");
  const [evidence, setEvidence] = useState<UploadedEvidence[]>([]);
  const [transcription, setTranscription] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const retry = useRef<{ signature: string; key: string } | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    if (files.length + evidence.length > submissionLimits.maxFiles || files.some((file) => !file.size || file.size > submissionLimits.maxFileBytes) || [...files, ...evidence].reduce((sum, file) => sum + ("size" in file ? file.size : file.bytes), 0) > submissionLimits.maxTotalBytes) {
      setError("Attach at most 5 files, 3 MiB each and 8 MiB total. Empty files are not supported.");
      return;
    }
    setUploading(true);
    setConfirmed(false);
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/solution-evidence", { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Upload failed. Please retry.");
        setEvidence((current) => [...current, result]);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed. Please retry."); } finally { setUploading(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source || saving || uploading) return;
    setError("");
    const payload = {
      problemId, problemVersion: source.problemVersion, partId, working, finalAnswer,
      evidence: evidence.map(({ id, mediaType, bytes, sha256 }) => ({ id, mediaType, bytes, sha256 })),
      ...(evidence.length ? { transcription: { text: transcription, confirmed } } : {}),
    };
    const signature = JSON.stringify(payload);
    if (!retry.current || retry.current.signature !== signature) retry.current = { signature, key: crypto.randomUUID() };
    const parsed = solutionSubmissionSchema.safeParse({ ...payload, idempotencyKey: retry.current.key });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your submission."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Saving failed. Please retry.");
      setSaved(result.id);
      void mutate((key) => Array.isArray(key) && ["/api/submissions", "/api/dashboard"].includes(key[0]) && key[1] === session?.user.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Saving failed. Please retry."); } finally { setSaving(false); }
  }
  return <Card className="shadow-none">
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Your solution</CardTitle><Badge variant="outline">Private · Unrated</Badge></div><CardDescription>Submit one subpart at a time. Write reasoning with LaTeX, or attach a photo or PDF of your working.</CardDescription></CardHeader>
    <CardContent className="flex min-w-0 flex-col gap-6">
      <Alert><AlertTitle>Save now. Grading comes after rubric review.</AlertTitle><AlertDescription>No marks or Elo are awarded. Attempts are stored against the original source version; automatic marking requires an approved, subpart-specific rubric.</AlertDescription></Alert>
      {isPending ? <p role="status" className="text-sm text-muted-foreground">Checking your account…</p> : sessionError ? <Alert variant="destructive"><AlertTitle>Account unavailable</AlertTitle><AlertDescription>Refresh the page to retry. Your unsaved working is not stored.</AlertDescription></Alert> : !session?.user ? <div className="flex flex-col items-start gap-3"><p className="text-sm leading-relaxed text-muted-foreground">Sign in to save typed solutions and upload private files. Browsing problems is always open.</p><Button asChild><Link href={`/sign-in?returnTo=${encodeURIComponent(`/dashboard/problems/${problemId}`)}`}>Sign in to submit</Link></Button></div> : saved ? <div className="flex flex-col items-start gap-4" role="status"><Alert><AlertTitle>Attempt saved · awaiting rubric</AlertTitle><AlertDescription>Your working and attachment references are stored privately. This is not a grade and has not entered an automated grading queue.</AlertDescription></Alert><div className="flex flex-wrap gap-3"><Button asChild><Link href="/dashboard/submissions">View my attempts</Link></Button><Button variant="outline" onClick={() => { setSaved(null); setWorking(""); setFinalAnswer(""); setEvidence([]); setTranscription(""); setConfirmed(false); retry.current = null; }}>Start another attempt</Button></div></div> : <form onSubmit={submit}>
        <fieldset disabled={saving || uploading}><FieldGroup>
          <Field><FieldLabel htmlFor={`${problemId}-part`}>Subpart label</FieldLabel><Input id={`${problemId}-part`} value={partId} onChange={(event) => setPartId(event.target.value)} required maxLength={32} placeholder="e.g. A.1 or 1(a)" /><FieldDescription>Copy the label from the statement. This label is student-entered, not yet verified against a marking scheme.</FieldDescription></Field>
          <MathWorkingEditor id={`${problemId}-working`} value={working} onChange={setWorking} description="Include assumptions, units and intermediate steps. A final expression alone may not earn method marks when grading becomes available." />
          <Field><FieldLabel htmlFor={`${problemId}-answer`}>Final answer <span className="text-muted-foreground">(optional)</span></FieldLabel><Textarea id={`${problemId}-answer`} value={finalAnswer} onChange={(event) => setFinalAnswer(event.target.value)} maxLength={1000} rows={2} placeholder="Your final expression, including units" /></Field>
          <Field><FieldLabel htmlFor={`${problemId}-files`}><FileUp className="size-4" /> Photos or PDF <span className="text-muted-foreground">(optional)</span></FieldLabel><Input id={`${problemId}-files`} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={upload} disabled={evidence.length >= submissionLimits.maxFiles} /><FieldDescription>JPEG, PNG, WebP or PDF. Up to 5 files, 3 MiB each, 8 MiB total. Files upload privately when selected; only attach work you are comfortable storing.</FieldDescription></Field>
          {evidence.length > 0 && <><ul className="flex flex-col gap-2" aria-label="Attached work">{evidence.map((file) => <li key={file.id} className="flex min-w-0 items-center justify-between gap-2 rounded-md border px-3 py-2"><span className="min-w-0 truncate text-sm">{file.filename} · {(file.bytes / 1024).toFixed(0)} KiB</span><Button size="icon" variant="ghost" type="button" aria-label={`Remove ${file.filename} from this attempt`} onClick={() => { setEvidence((current) => current.filter((item) => item.id !== file.id)); setConfirmed(false); }}><X /></Button></li>)}</ul><Field><FieldLabel htmlFor={`${problemId}-transcript`}>Transcribe your attached working</FieldLabel><Textarea id={`${problemId}-transcript`} value={transcription} onChange={(event) => { setTranscription(event.target.value); setConfirmed(false); }} maxLength={submissionLimits.maxText} rows={6} required placeholder="Type the reasoning and equations visible in your attachments. Include all steps you want assessed." /><FieldDescription>Automatic handwriting extraction is not enabled yet. Provide the exact text and equations yourself; do not add steps absent from your pages.</FieldDescription></Field><Field orientation="horizontal"><Checkbox id={`${problemId}-confirm`} checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} /><FieldLabel htmlFor={`${problemId}-confirm`}>I checked that this transcription accurately represents my attached work.</FieldLabel></Field></>}
          {error && <Alert variant="destructive" role="alert"><AlertTitle>Could not save your work</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
          {sourceError && <Alert variant="destructive"><AlertTitle>Source verification failed</AlertTitle><AlertDescription><Button type="button" variant="outline" size="sm" onClick={() => retrySource()}>Retry verification</Button></AlertDescription></Alert>}
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{uploading ? "Uploading private files…" : "No automatic grade · no rating changes"}</p><Button type="submit" disabled={!source || saving || uploading || (evidence.length > 0 && !confirmed)}>{saving || uploading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}{saving ? "Saving…" : uploading ? "Uploading…" : "Save attempt"}</Button></div>
        </FieldGroup></fieldset>
      </form>}
    </CardContent>
  </Card>;
}
