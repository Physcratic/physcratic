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
import { Button } from "@/components/ui/button";
import {
  collectAuthorMedia,
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
export function UploadControl({
  purpose,
  label,
  onUploaded,
}: {
  purpose: AuthorMediaPurpose;
  label: string;
  onUploaded: (file: AuthorMediaInfo) => void;
}) {
  const ctx = useContext(context),
    id = useId();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  if (!ctx) return null;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="file"
        className="block min-h-11 w-full min-w-0 text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-2 file:text-sm"
        aria-describedby={`${id}-help ${id}-status`}
        accept={
          purpose.endsWith("pdf")
            ? "application/pdf"
            : "image/png,image/jpeg,image/webp"
        }
        disabled={busy || ctx.disabled}
        onChange={async (e) => {
          const input = e.currentTarget,
            file = input.files?.[0];
          input.value = "";
          if (!file) return;
          setMessage("");
          setError("");
          if (file.size <= 0 || file.size > authorMediaMaxBytes) {
            setError("Choose a nonempty file up to 3 MiB.");
            return;
          }
          setBusy(true);
          ctx.pending(1);
          try {
            const form = new FormData();
            form.set("file", file);
            form.set("purpose", purpose);
            const response = await fetch(
              `${editorBase}/${ctx.problemId}/media`,
              {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store",
                body: form,
                signal: AbortSignal.timeout(30000),
              },
            );
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || "Upload failed.");
            const result = fileInfo.parse(body);
            if (
              result.problemId !== ctx.problemId ||
              result.purpose !== purpose
            )
              throw new Error("Upload response did not match this problem.");
            onUploaded(result);
            setMessage(
              `Uploaded ${result.filename}. Save document changes to attach it.`,
            );
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Upload failed. Existing files are unchanged.",
            );
          } finally {
            ctx.pending(-1);
            setBusy(false);
          }
        }}
      />
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        {purpose.endsWith("pdf")
          ? "PDF attachment; downloaded safely rather than embedded."
          : "PNG, JPEG or static WebP. Add descriptive alt text after upload."}{" "}
        Up to 3 MiB.
      </p>
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
          This image is unavailable. Save or replace the reference; your other
          work is retained.
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- Owner-only media must use the authenticated proxy without an optimizer cache.
        <img
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
  return ctx ? (
    <div className="flex flex-wrap gap-3">
      {ids.map((id, i) => (
        <a
          key={id}
          href={authorMediaPath(ctx.problemId, id)}
          className="inline-block min-h-11 py-2 text-sm underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download statement PDF {i + 1}
        </a>
      ))}
    </div>
  ) : null;
}
export function MediaAttachments({
  draft,
  edit,
}: {
  draft: EditorDraft;
  edit: (fn: (d: EditorDraft) => void) => void;
}) {
  const ctx = useContext(context),
    [files, setFiles] = useState<AuthorMediaInfo[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const mediaProblemId = ctx?.problemId;
  const refresh = useCallback(async () => {
    if (!mediaProblemId) return;
    try {
      const result = await draftRequest(
        `${editorBase}/${mediaProblemId}/media`,
      );
      setFiles(result.files);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load media.");
    }
  }, [mediaProblemId]);
  useEffect(() => {
    void refresh();
  }, [draft.version, refresh]);
  if (!ctx) return null;
  let localRefs: Set<string>;
  try {
    localRefs = new Set(
      collectAuthorMedia(draft.content, draft.privateParts).map(
        (ref) => ref.id,
      ),
    );
  } catch {
    localRefs = new Set(files.map((file) => file.id));
  }
  const pdfs = draft.content.attachments.filter((a) =>
    a.purpose.endsWith("pdf"),
  );
  return (
    <section id="author-assets" className="space-y-5 border-t pt-8">
      <h2 className="text-xl font-semibold">Images & optional PDFs</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Add images where they belong in the statement, hints or worked solution.
        All uploads stay in private storage. Statement files become readable
        only when pinned to a published revision; solution files remain
        author-only.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        {(["statement-pdf", "solution-pdf"] as const).map((purpose) => (
          <UploadControl
            key={purpose}
            purpose={purpose}
            label={
              purpose === "statement-pdf"
                ? "Upload statement PDF"
                : "Upload private solution PDF"
            }
            onUploaded={(file) => {
              edit((d) => {
                d.content.attachments.push({ id: file.id, purpose });
              });
              setFiles((previous) => [...previous, file]);
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
                : "Statement PDF"}{" "}
              · {file?.filename ?? "Saved attachment"}
            </p>
            <a
              href={authorMediaPath(ctx.problemId, ref.id)}
              className="inline-block min-h-11 py-2 text-sm underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download{" "}
              {ref.purpose === "solution-pdf"
                ? "private solution"
                : "statement"}{" "}
              PDF
            </a>
            <UploadControl
              purpose={ref.purpose as "statement-pdf" | "solution-pdf"}
              label={`Replace ${ref.purpose === "solution-pdf" ? "private solution" : "statement"} PDF`}
              onUploaded={(next) => {
                edit((d) => {
                  d.content.attachments = d.content.attachments.map((a) =>
                    a.id === ref.id ? { id: next.id, purpose: ref.purpose } : a,
                  );
                });
                setFiles((previous) => [...previous, next]);
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
      <details className="rounded-lg border p-4">
        <summary className="min-h-11 cursor-pointer text-sm font-medium">
          Manage uploaded files and safe cleanup
        </summary>
        <p className="my-3 text-xs leading-relaxed text-muted-foreground">
          Removing a block or attachment removes only its draft reference after
          saving. Published history keeps its files permanently. Cleanup removes
          unlinked uploads older than 24 hours, or failed-upload traces older
          than one hour, across your own problems.
        </p>
        {files.map((file) => (
          <div
            key={file.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t py-3"
          >
            <div>
              <p className="break-all text-sm">{file.filename}</p>
              <p className="text-xs text-muted-foreground">
                {file.purpose} · {Math.ceil(file.bytes / 1024)} KiB ·{" "}
                {file.inHistory
                  ? "Retained by published history"
                  : file.inDraft
                    ? "Used by saved draft"
                    : "Unlinked upload"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                file.inDraft ||
                file.inHistory ||
                localRefs.has(file.id) ||
                ctx.disabled
              }
              onClick={async () => {
                if (
                  !window.confirm(
                    "Permanently delete this unused file? Saved and historical references will be protected by the server.",
                  )
                )
                  return;
                setError("");
                try {
                  await draftRequest(
                    authorMediaPath(ctx.problemId, file.id),
                    "DELETE",
                    {},
                  );
                  setMessage("Unused file removed.");
                  await refresh();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not remove file.",
                  );
                }
              }}
            >
              Delete unused file
            </Button>
          </div>
        ))}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refresh()}
          >
            Refresh files
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={ctx.disabled}
            onClick={async () => {
              if (
                !window.confirm(
                  "Clean up old unlinked uploads across your problems? Unsaved recovery references older than 24 hours may need replacement; saved and historical revisions are protected.",
                )
              )
                return;
              setError("");
              try {
                const result = await draftRequest(
                  "/api/authored-problems/media/cleanup",
                  "POST",
                  {},
                );
                setMessage(
                  `Cleaned ${result.deleted} files. ${result.retry} need retry.`,
                );
                await refresh();
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Cleanup failed; tracked files remain private.",
                );
              }
            }}
          >
            Clean old unused uploads
          </Button>
        </div>
      </details>
      <p
        role={error ? "alert" : "status"}
        className={`text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}
      >
        {error || message}
      </p>
    </section>
  );
}
