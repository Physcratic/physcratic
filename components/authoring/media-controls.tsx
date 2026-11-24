"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import Image from "next/image";
import { AuthoredPdf, StatementPdfs } from "@/components/authored/statement-pdfs";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { ErrorText } from "./studio-ui";
import {
  authorMediaMaxBytes,
  authorMediaPath,
  authorMediaPurpose,
  type AuthorMediaInfo,
  type AuthorMediaPurpose,
} from "@/lib/author-media";
import {
  draftRequest,
  editorBase,
  type EditorDraft,
} from "@/lib/problem-authoring-editor";
const context = createContext<{
  problemId: string;
  disabled: boolean;
  pending: (delta: number) => void;
} | null>(null);
export function AuthorMediaProvider({
  problemId,
  disabled,
  pending,
  children,
}: {
  problemId: string;
  disabled: boolean;
  pending: (delta: number) => void;
  children: ReactNode;
}) {
  return (
    <context.Provider value={{ problemId, disabled, pending }}>
      {children}
    </context.Provider>
  );
}
const fileInfo = z.object({
  id: z.uuid(),
  problemId: z.uuid(),
  purpose: authorMediaPurpose,
  filename: z.string().max(160),
  mediaType: z.string(),
  bytes: z.number().positive().max(authorMediaMaxBytes),
});
/**
 * The one upload used by every upload button and by the picture box. It checks the size, sends the file
 * to the private media route of this draft and checks the answer. `upload` returns null when it failed, and `error`
 * says why.
 */
export function useAuthorMediaUpload(purpose: AuthorMediaPurpose) {
  const ctx = useContext(context);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const upload = useCallback(
    async (file: File): Promise<AuthorMediaInfo | null> => {
      if (!ctx) return null;
      setMessage("");
      setError("");
      if (file.size <= 0 || file.size > authorMediaMaxBytes) {
        setError("Choose a nonempty file up to 3 MiB.");
        return null;
      }
      setBusy(true);
      ctx.pending(1);
      try {
        const form = new FormData();
        form.set("file", file);
        form.set("purpose", purpose);
        const response = await fetch(`${editorBase}/${ctx.problemId}/media`, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          body: form,
          signal: AbortSignal.timeout(30000),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Upload failed.");
        const result = fileInfo.parse(body);
        if (result.problemId !== ctx.problemId || result.purpose !== purpose)
          throw new Error("Upload response did not match this problem.");
        setMessage(`Uploaded ${result.filename}. Save document changes to attach it.`);
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed. Existing files are unchanged.");
        return null;
      } finally {
        ctx.pending(-1);
        setBusy(false);
      }
    },
    [ctx, purpose],
  );
  return { available: !!ctx, locked: !ctx || ctx.disabled || busy, busy, message, error, upload };
}
export function UploadControl({
  purpose,
  label,
  onUploaded,
  disabled = false,
}: {
  purpose: AuthorMediaPurpose;
  label: string;
  onUploaded: (file: AuthorMediaInfo) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const { available, locked, busy, message, error, upload } = useAuthorMediaUpload(purpose);
  if (!available) return null;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="file"
        className="block min-h-11 w-full min-w-0 text-sm file:mr-3 file:rounded-md file:border file:bg-background file:text-foreground file:px-3 file:py-2 file:text-sm"
        aria-describedby={`${id}-status`}
        accept={
          purpose.endsWith("pdf")
            ? "application/pdf"
            : "image/png,image/jpeg,image/webp"
        }
        disabled={locked || disabled}
        onChange={async (e) => {
          const input = e.currentTarget,
            file = input.files?.[0];
          input.value = "";
          if (!file) return;
          const result = await upload(file);
          if (result) onUploaded(result);
        }}
      />
      <p
        id={`${id}-status`}
        role={error ? "alert" : "status"}
        className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}
      >
        {busy ? "Uploading privately…" : error || message}
      </p>
    </div>
  );
}
export function MediaImage({
  mediaId,
  alt,
  caption,
}: {
  mediaId: string;
  alt: string;
  caption?: string;
}) {
  const ctx = useContext(context),
    [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [mediaId]);
  if (!ctx)
    return <p className="text-sm">Image preview requires a problem context.</p>;
  return (
    <figure className="space-y-2">
      {failed ? (
        <p role="status" className="text-sm text-destructive">
          This image is unavailable. Save or replace the reference. Your other
          work is retained.
        </p>
      ) : (
        <Image
          // Keep authorization and private cache policy on the media route, not the optimizer.
          unoptimized
          width={0}
          height={0}
          style={{ width: "auto", height: "auto" }}
          src={authorMediaPath(ctx.problemId, mediaId)}
          alt={alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="mx-auto max-h-96 max-w-full rounded-md object-contain"
          onError={() => setFailed(true)}
        />
      )}{" "}
      {caption && (
        <figcaption className="text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
export function StatementPdfLinks({ ids }: { ids: string[] }) {
  const ctx = useContext(context);
  return ctx ? <StatementPdfs problemId={ctx.problemId} ids={ids} /> : null;
}

export function MediaAttachments({
  draft,
  edit,
}: {
  draft: EditorDraft;
  edit: (fn: (d: EditorDraft) => void) => void;
}) {
  const ctx = useContext(context);
  const { data: files = [], error: loadError, mutate } = useSWR<AuthorMediaInfo[]>(
    ctx ? [`${editorBase}/${ctx.problemId}/media`, draft.version] : null,
    async ([url]: [string, number]) => {
      const result = await draftRequest(url);
      return result.files;
    },
    { revalidateOnFocus: false },
  );
  if (!ctx) return null;
  const pdfs = draft.content.attachments.filter((a) =>
    a.purpose.endsWith("pdf"),
  );
  const body = <>
      <div className="grid gap-6 sm:grid-cols-2">
        {(["statement-pdf", "solution-pdf"] as const).filter(purpose => !pdfs.some(ref => ref.purpose === purpose)).map((purpose) => (
          <UploadControl
            key={purpose}
            purpose={purpose}
            label={
              purpose === "statement-pdf"
                ? "Upload problem PDF"
                : "Upload Solution PDF"
            }
            onUploaded={(file) => {
              edit((d) => {
                d.content.attachments.push({ id: file.id, purpose });
              });
              void mutate((previous = []) => [...previous, file], { revalidate: false });
            }}
          />
        ))}
      </div>
      {pdfs.map((ref) => {
        const file = files.find((f) => f.id === ref.id);
        return (
          <div key={ref.id} className="space-y-3 rounded-md border p-4">
            <p className="text-sm font-medium">
              {ref.purpose === "solution-pdf"
                ? "Private solution PDF"
                : "Statement PDF"}, {file?.filename ?? "Saved attachment"}
            </p>
            <AuthoredPdf url={authorMediaPath(ctx.problemId, ref.id)} label={ref.purpose === "solution-pdf" ? "Private solution PDF" : "Statement PDF"} />
            <UploadControl
              purpose={ref.purpose as "statement-pdf" | "solution-pdf"}
              label={`Replace ${ref.purpose === "solution-pdf" ? "private solution" : "statement"} PDF`}
              onUploaded={(next) => {
                edit((d) => {
                  d.content.attachments = d.content.attachments.map((a) =>
                    a.id === ref.id ? { id: next.id, purpose: ref.purpose } : a,
                  );
                });
                void mutate((previous = []) => [...previous, next], { revalidate: false });
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                edit((d) => {
                  d.content.attachments = d.content.attachments.filter(
                    (a) => a.id !== ref.id,
                  );
                })
              }
            >
              Remove PDF reference
            </Button>
          </div>
        );
      })}
      {loadError && <div role="alert"><ErrorText>Could not load attachment names. Your attachments are retained. Reload to retry.</ErrorText></div>}

    </>;
  return <section aria-label="Problem PDFs" className="space-y-4">{body}</section>;
}
