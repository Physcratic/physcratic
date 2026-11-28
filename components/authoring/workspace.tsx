"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FilePlus2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorText, HowItWorksLink, RecoverySection, studioTokens } from "./studio-ui";
import {
  draftPayload,
  draftRequest,
  editorBase,
  editorDraftSchema,
  newProblem,
  type EditorDraft,
} from "@/lib/problem-authoring-editor";
import { PdfDropZone, deleteUpload, uploadPdf, type DropProgress, type DropResult, type PdfAssignment } from "./pdf-drop";
import { AuthorCredit } from "./author-credit";
import { ProblemEditor } from "./problem-editor";
import { ConfirmProvider, useConfirm } from "./confirm-sheet";
import { ensureSimpleShape } from "./simple-model";

/** A new problem that lives only in this tab until the first edit saves it. */
function blankDraft(): EditorDraft {
  const draft: EditorDraft = {
    problemId: crypto.randomUUID(),
    version: 1,
    state: "draft",
    slug: "",
    ...structuredClone(newProblem()),
  };
  // The editor starts with its one part.
  ensureSimpleShape(draft);
  return draft;
}

type DraftItem = {
  problemId: string;
  title: string;
  state: string;
  version: number;
  updatedAt: string;
};
/** Problem Studio's drafts list and editor. One confirm sheet serves every confirm inside it. */
export function AuthoringWorkspace(props: { userId: string; publicSolutionsEnabled?: boolean; authorCreditEnabled?: boolean }) {
  return (
    <ConfirmProvider>
      <WorkspaceBody {...props} />
    </ConfirmProvider>
  );
}

function WorkspaceBody({
  userId, publicSolutionsEnabled = false, authorCreditEnabled = false,
}: { userId: string; publicSolutionsEnabled?: boolean; authorCreditEnabled?: boolean }) {
  const confirm = useConfirm();
  const [items, setItems] = useState<DraftItem[]>([]),
    [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<EditorDraft | null>(null);
  // The sheet answers later than the click. A list action reads its row again from the latest list.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  /** "list": My drafts, where Problem Studio opens. "new": the editor on a blank problem that is saved at the first edit. */
  const [view, setView] = useState<"new" | "list">("list");
  const [fresh, setFresh] = useState<EditorDraft>(() => blankDraft());
  const [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [cleanupNotice, setCleanupNotice] = useState("");
  const [removalNotice, setRemovalNotice] = useState("");
  const [refreshRequired, setRefreshRequired] = useState(false);
  async function list(after?: string) {
    setBusy(true);
    setError("");
    try {
      const result = await draftRequest(
        `${editorBase}${after ? `?after=${encodeURIComponent(after)}` : ""}`,
      );
      setItems((previous) =>
        after ? [...previous, ...result.drafts] : result.drafts,
      );
      setCursor(result.nextCursor);
      if (!after) setRefreshRequired(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load drafts.");
    } finally {
      setBusy(false);
    }
  }
  /** Opens a draft. Returns "" when it opened, or the message when it could not. */
  async function open(id: string): Promise<string> {
    setBusy(true);
    setError("");
    try {
      const draft = editorDraftSchema.parse(
        await draftRequest(`${editorBase}/${encodeURIComponent(id)}`),
      );
      setSelected(draft);
      history.replaceState(null, "", `?draft=${draft.problemId}`);
      return "";
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not open draft.";
      setError(message);
      return message;
    } finally {
      setBusy(false);
    }
  }
  /**
   * A PDF drop on My drafts: one new draft, the files uploaded to it and saved as its attachments, then it opens.
   * If a step fails, what was made is taken away again, uploads first and the draft last. Anything that cannot be is named.
   */
  async function draftFromPdfs(files: PdfAssignment[], progress: DropProgress): Promise<DropResult> {
    let created: EditorDraft | null = null;
    const uploaded: { id: string; purpose: PdfAssignment["purpose"] }[] = [];
    try {
      created = editorDraftSchema.parse(await draftRequest(editorBase, "POST", draftPayload(blankDraft())));
      for (const [i, { file, purpose }] of files.entries()) {
        progress(i + 1, files.length, file.name);
        uploaded.push({ id: (await uploadPdf(created.problemId, file, purpose)).id, purpose });
      }
      const content = { ...created.content, attachments: [...created.content.attachments, ...uploaded] };
      await draftRequest(`${editorBase}/${created.problemId}`, "PUT", { version: created.version, content, privateParts: created.privateParts });
    } catch (e) {
      const why = e instanceof Error ? e.message : "Upload failed.";
      if (!created) return { error: why };
      const problemId = created.problemId;
      const refused = (await Promise.allSettled(uploaded.map((u) => deleteUpload(problemId, u.id)))).filter((r): r is PromiseRejectedResult => r.status === "rejected");
      const kept = refused.length;
      // Refused by the write limit, the files stay ready and unused, so Delete old uploads in that draft lists them after 24 hours.
      const limited = kept > 0 && refused.every((r) => (r.reason as { status?: number })?.status === 429);
      // A draft is only removed once none of its uploads is left, so no file is left without a draft to find it in.
      if (kept === 0) {
        try {
          await draftRequest(`${editorBase}/${problemId}`, "DELETE", { version: created.version });
          return { error: `${why} No draft was made.` };
        } catch { /* Kept below. */ }
      }
      void list();
      const files = kept === 1 ? "The uploaded file is" : `The ${kept} uploaded files are`;
      return { error: kept
        ? `${why} ${files} kept in a new draft in My drafts.${limited ? " Delete old uploads in its More options removes them after 24 hours." : ""}`
        : `${why} An empty draft was kept. It is in My drafts.` };
    }
    await open(created.problemId);
    return { done: "Uploaded. Opening the draft." };
  }
  useEffect(() => {
    const id = new URL(location.href).searchParams.get("draft");
    if (!id) {
      void list();
      return;
    }
    // The list is where Studio opens, so a draft that cannot be opened leaves the drafts underneath the message.
    void open(id).then(async (message) => {
      if (!message) return;
      await list();
      setError(message);
    });
  }, []);
  const last = items[0];
  if (selected)
    return (
      <ProblemEditor publicSolutionsEnabled={publicSolutionsEnabled}
        key={selected.problemId}
        initial={selected}
        userId={userId}
        onBack={() => {
          setSelected(null);
          setView("list");
          history.replaceState(null, "", location.pathname);
          void list();
        }}
      />
    );
  if (view === "new")
    return (
      <ProblemEditor publicSolutionsEnabled={publicSolutionsEnabled}
        key={fresh.problemId}
        initial={fresh}
        userId={userId}
        provisional={{
          // The editor swaps to the saved draft by itself. Only the address changes.
          onCreated: (saved) => history.replaceState(null, "", `?draft=${saved.problemId}`),
        }}
        continueDraft={last ? { title: last.title, open: () => void open(last.problemId) } : null}
        onBack={() => {
          setView("list");
          // The new problem may have been saved, which put its id in the address. The list has no draft in it.
          history.replaceState(null, "", location.pathname);
          void list();
        }}
      />
    );
  return (
    <div className={`min-h-dvh bg-background text-foreground ${studioTokens}`}>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="flex min-h-11 items-center gap-2 text-sm"
          >
            <ArrowLeft className="size-4" />
            Physcratic
          </Link>
          <div className="flex items-center gap-4">
            <HowItWorksLink />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Problem Studio
            </span>
          </div>
        </div>
      </header>
      <main
        id="author-main"
        tabIndex={-1}
        className="focus:outline-none mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20"
      >
        <div className="my-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Problem Studio
            </h1>
          </div>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              setFresh(blankDraft());
              setView("new");
            }}
          >
            <FilePlus2 className="mr-2 size-4" />
            New problem
          </Button>
        </div>
        {authorCreditEnabled && <AuthorCredit key={userId} userId={userId} />}
        <div className="my-8">
          <PdfDropZone disabled={busy} onPdfs={draftFromPdfs} />
        </div>
        <RecoverySection active={false}>
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (
                !(await confirm({
                  title: "Delete up to five old unlinked uploads?",
                  message: "Saved drafts and published history stay protected. Unsaved recovery references older than 24 hours may need replacement.",
                  confirmLabel: "Delete uploads",
                  danger: true,
                }))
              )
                return;
              setBusy(true);
              setError("");
              try {
                const result = await draftRequest(
                  "/api/authored-problems/media/cleanup",
                  "POST",
                  {},
                );
                setCleanupNotice(
                  `Cleaned ${result.deleted} files. ${result.retry} need retry. Repeat for additional files.`,
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Cleanup failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Clean old unused uploads
          </Button>
          <p role="status" className="text-xs text-muted-foreground">
            {cleanupNotice ||
              "Private uploads removed from drafts can be cleaned after 24 hours. Historical files are retained."}
          </p>
        </div>
        </RecoverySection>
        {(error || refreshRequired) && (
          <div
            role="alert"
            className="my-6 rounded-lg border border-destructive p-4"
          >
            <ErrorText>{error || "Reload the list to check the removal status before retrying."}</ErrorText>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              disabled={busy}
              onClick={() => void list()}
            >
              Retry loading drafts
            </Button>
          </div>
        )}
        <p role="status" className="my-6 text-sm text-muted-foreground">
          {busy && !items.length ? "Loading your drafts…" : busy ? "Working…" : `${items.length} drafts loaded`}
        </p>
        {removalNotice && <p role="status" className="my-4 text-sm">{removalNotice}</p>}
        <div className="divide-y rounded-xl border bg-card">
          {busy && !items.length ? (
            // The page already has its headings and buttons. The list shows the shape of what is coming.
            [0, 1, 2].map((row) => (
              <div key={row} aria-hidden="true" className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-4"><Skeleton className="size-5 shrink-0" /><div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></div>
                <Skeleton className="h-11 w-20" />
              </div>
            ))
          ) : items.length
            ? items.map((item) => (
                <article
                  key={item.problemId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <FileText className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <h2 className="break-words font-medium">
                        {item.title || "Untitled problem"}
                      </h2>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {item.state}, version {item.version},{" "}
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void open(item.problemId)}
                    >
                      Open{" "}
                      <span className="sr-only">
                        {item.title || "untitled problem"}
                      </span>
                    </Button>
                    {item.state === "published" && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy || refreshRequired}
                        onClick={async () => {
                          if (!(await confirm({
                            title: `Remove "${item.title || "Untitled problem"}" from public?`,
                            message: "It will leave public discovery and stop accepting new submissions. Earlier revisions and student records are retained. You can publish it again from Studio.",
                            confirmLabel: "Remove from public",
                            danger: true,
                          }))) return;
                          const current = itemsRef.current.find((row) => row.problemId === item.problemId);
                          if (!current || current.state !== "published") return;
                          setBusy(true);
                          setError("");
                          setRemovalNotice("");
                          try {
                            const result = await draftRequest(
                              `${editorBase}/${item.problemId}/unpublish`,
                              "POST",
                              { version: current.version },
                            );
                            setItems(previous => previous.map(row => row.problemId === item.problemId
                              ? { ...row, state: result.state, version: result.version }
                              : row));
                            setRemovalNotice(`"${item.title || "Untitled problem"}" removed from public. Earlier revisions and student records are retained.`);
                          } catch {
                            setRefreshRequired(true);
                            setError("Removal was not confirmed. Reload the list to check its current status before retrying.");
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Remove from public
                        <span className="sr-only"> {item.title || "untitled problem"}</span>
                      </Button>
                    )}
                    <span aria-hidden="true" className="mx-2 h-6 w-px bg-border" />
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={busy || item.state === "published"}
                      onClick={async () => {
                        if (
                          !(await confirm({
                            title: "Delete this draft?",
                            message: "Saved working content is removed. Historical published revisions are retained. Download any unsaved recovery work first.",
                            confirmLabel: "Delete draft",
                            danger: true,
                          }))
                        )
                          return;
                        const current = itemsRef.current.find((row) => row.problemId === item.problemId);
                        if (!current || current.state === "published") return;
                        setBusy(true);
                        setError("");
                        try {
                          await draftRequest(
                            `${editorBase}/${item.problemId}`,
                            "DELETE",
                            { version: current.version },
                          );
                          try {
                            sessionStorage.removeItem(
                              `physcratic:author:${userId}:${item.problemId}`,
                            );
                          } catch {}
                          await list();
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Could not delete draft. Reload the list and retry.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Delete{" "}
                      <span className="sr-only">
                        {item.title || "untitled problem"}
                      </span>
                    </Button>
                  </div>
                </article>
              ))
            : !busy && (
                <div className="px-6 py-16 text-center">
                  <h2 className="text-xl font-medium">
                    No drafts yet
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Press New problem above to write your first one.
                  </p>
                  <HowItWorksLink className="mt-2" />
                </div>
              )}
        </div>
        {cursor && (
          <Button
            type="button"
            className="mt-6"
            variant="outline"
            disabled={busy || refreshRequired}
            onClick={() => void list(cursor)}
          >
            Load more drafts
          </Button>
        )}
        <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Only original or authorized content may be published. Drafts and
          private answer keys are accessible only to your verified author
          account.
        </p>
      </main>
    </div>
  );
}
