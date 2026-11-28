"use client";
import { useEffect, useId, useRef, useState } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Check, CircleAlert, FileUp } from "lucide-react";
import { z } from "zod";
import { AlertDialog, AlertDialogDescription, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CONFIRM_LAYER } from "@/components/tour/tour-layer";
import { authorMediaMaxBytes, authorMediaPurpose, type AuthorMediaInfo } from "@/lib/author-media";
import { editorBase } from "@/lib/problem-authoring-editor";
import { assignPdfs, checkPdfDrop } from "@/lib/pdf-drop";

export type PdfAssignment = { file: File; purpose: "statement-pdf" | "solution-pdf" };
/** What a drop handler reports back: words for the done state, or the error to show. */
export type DropResult = { done: string } | { error: string };
/** A drop handler calls this before each upload, with the file's place in the drop and its name. */
export type DropProgress = (at: number, of: number, name: string) => void;

const fileInfo = z.object({ id: z.uuid(), problemId: z.uuid(), purpose: authorMediaPurpose, filename: z.string(), mediaType: z.string(), bytes: z.number().positive().max(authorMediaMaxBytes) });

/** Uploads one PDF to the draft's private media route, the same request the upload buttons send. */
export async function uploadPdf(problemId: string, file: File, purpose: PdfAssignment["purpose"]): Promise<AuthorMediaInfo> {
  const form = new FormData();
  form.set("file", file);
  form.set("purpose", purpose);
  const response = await fetch(`${editorBase}/${problemId}/media`, { method: "POST", credentials: "same-origin", cache: "no-store", body: form, signal: AbortSignal.timeout(30000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Upload failed.");
  const result = fileInfo.parse(body);
  if (result.problemId !== problemId || result.purpose !== purpose) throw new Error("Upload response did not match this problem.");
  return result;
}
/** Deletes an upload nothing refers to. The server refuses one a saved draft or a published version still uses. */
export async function deleteUpload(problemId: string, mediaId: string) {
  const response = await fetch(`/api/authored-problems/${encodeURIComponent(problemId)}/media/${encodeURIComponent(mediaId)}`, { method: "DELETE", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Object.assign(new Error((await response.json().catch(() => ({}))).error || "Could not delete the upload."), { status: response.status });
}

const head = async (file: File) => new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());

/**
 * Drop one or two PDFs, or choose them with the button. One is the statement. Two ask which one is the statement,
 * and the other is the private solution PDF. One PDF on a draft that already has a statement asks whether it replaces
 * the statement or is the solution, so a solution is never made public by mistake. Every state has words.
 */
export function PdfDropZone({ disabled = false, hasStatement = false, onPdfs }: { disabled?: boolean; hasStatement?: boolean; onPdfs: (files: PdfAssignment[], progress: DropProgress) => Promise<DropResult> }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [state, setState] = useState<{ done: string } | { error: string } | null>(null);
  /** Two files ask which is the statement. One file with a statement already there asks for its role. */
  const [choice, setChoice] = useState<{ files: File[]; role: boolean } | null>(null);
  const locked = disabled || busy;
  // A file dropped just outside the zone would open in the tab and leave Studio. Text drags are left alone.
  useEffect(() => {
    const keep = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) e.preventDefault(); };
    window.addEventListener("dragover", keep);
    window.addEventListener("drop", keep);
    return () => {
      window.removeEventListener("dragover", keep);
      window.removeEventListener("drop", keep);
    };
  }, []);

  async function take(list: File[]) {
    if (locked) return;
    setState(null);
    const check = checkPdfDrop(await Promise.all(list.map(async (f) => ({ name: f.name, type: f.type, size: f.size, head: await head(f) }))));
    if (!check.ok) return setState({ error: check.message });
    if (check.count === 2) return setChoice({ files: list, role: false });
    if (hasStatement) return setChoice({ files: list, role: true });
    await send(assignPdfs(list, 0));
  }
  async function send(files: PdfAssignment[]) {
    setBusy(true);
    setProgress("");
    try {
      setState(await onPdfs(files, (at, of, name) => setProgress(`Uploading ${at} of ${of}, ${name}`)));
    } finally {
      setBusy(false);
    }
  }
  const pick = (files: PdfAssignment[]) => { setChoice(null); void send(files); };
  const status = busy ? progress : state && "error" in state ? state.error : state?.done ?? "";
  return (
    <div
      data-pdf-drop=""
      onDragOver={(e) => { e.preventDefault(); if (!locked) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void take([...e.dataTransfer.files]); }}
      className={`space-y-4 rounded-lg border-2 border-dashed p-4 sm:p-6 ${over ? "border-foreground bg-muted" : "border-input"}`}
    >
      <p id={`${id}-what`} className="flex items-start gap-2 text-base">
        <FileUp aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span>{over ? "Drop to upload" : "Drop a statement PDF here, or two PDFs for the statement and the solution."}</span>
      </p>
      <Button type="button" variant="outline" className="min-h-11 border-2 text-base" disabled={locked} aria-describedby={`${id}-what ${id}-status`} onClick={() => input.current?.click()}>
        Choose PDFs
      </Button>
      <input ref={input} type="file" accept="application/pdf,.pdf" multiple hidden tabIndex={-1} onChange={(e) => { const files = [...(e.currentTarget.files ?? [])]; e.currentTarget.value = ""; void take(files); }} />
      <p id={`${id}-status`} role={state && "error" in state ? "alert" : "status"} className={`flex items-start gap-2 text-base ${state && "error" in state ? "text-destructive" : ""}`}>
        {state && "error" in state && <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
        {state && "done" in state && !busy && <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />}
        <span>{status}</span>
      </p>
      <AlertDialog open={choice !== null} onOpenChange={(open) => { if (!open) setChoice(null); }}>
        {choice && (
          <AlertDialogPortal>
            <AlertDialogOverlay style={{ zIndex: CONFIRM_LAYER }} onClick={() => setChoice(null)} />
            <AlertDialogPrimitive.Content
              data-pdf-choice=""
              style={{ zIndex: CONFIRM_LAYER }}
              className="fixed inset-x-0 bottom-0 z-50 grid gap-4 rounded-t-2xl border-t bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:p-6"
            >
              <div className="space-y-2">
                <AlertDialogTitle className="break-all text-lg font-semibold">{choice.role ? choice.files[0].name : "Which PDF is the statement?"}</AlertDialogTitle>
                <AlertDialogDescription className="text-base text-muted-foreground">{choice.role ? "The solution PDF is private until you approve access after publication." : "The other one is the solution PDF. It is private until you approve access after publication."}</AlertDialogDescription>
              </div>
              <div className="grid gap-2">
                {choice.role
                  ? ([["statement-pdf", "Replace the statement"], ["solution-pdf", "Add as the solution"]] as const).map(([purpose, label]) => (
                      <Button key={purpose} type="button" variant="outline" className="min-h-11 justify-start border-2 text-base" onClick={() => pick([{ file: choice.files[0], purpose }])}>
                        {label}
                      </Button>
                    ))
                  : choice.files.map((file, i) => (
                      <Button key={i} type="button" variant="outline" className="h-auto min-h-11 justify-start whitespace-normal break-all border-2 text-left text-base" onClick={() => pick(assignPdfs(choice.files, i))}>
                        {file.name}
                      </Button>
                    ))}
                <AlertDialogPrimitive.Cancel asChild>
                  <Button type="button" variant="ghost" className="min-h-11 text-base">Cancel</Button>
                </AlertDialogPrimitive.Cancel>
              </div>
            </AlertDialogPrimitive.Content>
          </AlertDialogPortal>
        )}
      </AlertDialog>
    </div>
  );
}
