"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Eye, FilePenLine, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  authoredDraftSchema,
  authoredDocumentSchema,
  publishableDraftSchema,
  publicAuthoredContent,
} from "@/lib/problem-authoring";
import {
  DraftEditorSession,
  draftPayload,
  draftRequest,
  editorBase,
  editorDraftSchema,
  type EditorDraft,
} from "@/lib/problem-authoring-editor";
import { normalizeStatementImages } from "@/lib/author-media";
import { publicSolutionPolicy } from "@/lib/authored-solution-policy";
import {
  AuthorMediaProvider,
  StatementPdfLinks,
} from "./media-controls";
import { HowItWorksLink, RecoverySection, StatusBar, studioTokens } from "./studio-ui";
import { SimpleEditor } from "./simple-editor";
import { GuidedTour } from "@/components/tour/guided-tour";
import { TourHelpButton } from "@/components/tour/tour-help";
import { otherIssueMessages } from "./simple-model";
import { PartChip } from "@/components/physics/solve-ui";
import { ReaderBlocks } from "./editor-fields";
import { useConfirm } from "./confirm-sheet";

function download(draft: EditorDraft) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `physcratic-private-draft-${draft.problemId}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ProblemEditor({
  initial,
  userId,
  onBack,
  provisional,
  continueDraft,
  publicSolutionsEnabled=false,
}: {
  initial: EditorDraft;
  publicSolutionsEnabled?: boolean;
  userId: string;
  onBack: () => void;
  /** A new problem that is not on the server yet. The first edit saves it, and `onCreated` swaps in the saved copy. */
  provisional?: { onCreated: (saved: EditorDraft) => void };
  /** A link to the most recent draft, shown at the top of a new problem. */
  continueDraft?: { title: string; open: () => void } | null;
}) {
  /**
   * One save session per draft. A new problem starts with a session whose first save creates the draft on the server.
   * When that save is done the page swaps to an ordinary session for the saved draft. The page itself is not remounted,
   * so the cursor, an open equation and anything typed in the meantime stay where they are.
   */
  const make = (start: EditorDraft, creating: boolean): DraftEditorSession => {
    let storage: Storage | undefined;
    try {
      if (typeof window !== "undefined") storage = window.sessionStorage;
    } catch {
      /* Recovery warning shown below. */
    }
    let created = false;
    const holder: { session?: DraftEditorSession } = {};
    holder.session = new DraftEditorSession(
      start,
      async (draft) => {
        if (creating) {
          // Only the first save creates. A later save from this session would race the saved draft that replaces it.
          if (created) throw new Error("Your first draft was saved.");
          const saved = editorDraftSchema.parse(await draftRequest(editorBase, "POST", draftPayload(draft)));
          created = true;
          try {
            storage?.removeItem(`physcratic:author:${userId}:${start.problemId}`);
          } catch {
            /* Ignore. */
          }
          const next = make(saved, false);
          const typedSince = holder.session!.snapshot().draft;
          if (JSON.stringify(draftPayload(typedSince)) !== JSON.stringify(draftPayload(saved)))
            next.edit((d) => {
              d.content = typedSince.content;
              d.privateParts = typedSince.privateParts;
            });
          previous.current = holder.session!;
          setSession(next);
          setCreating(false);
          provisional?.onCreated(saved);
          return saved;
        }
        return editorDraftSchema.parse(
          await draftRequest(`${editorBase}/${draft.problemId}`, "PUT", {
            version: draft.version,
            ...draftPayload(draft),
          }),
        );
      },
      storage,
      `physcratic:author:${userId}:${start.problemId}`,
      creating ? 300 : undefined,
    );
    return holder.session;
  };
  const previous = useRef<DraftEditorSession | null>(null);
  const [creating, setCreating] = useState(!!provisional);
  const [session, setSession] = useState(() => make(initial, !!provisional));
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.snapshot,
    session.snapshot,
  );
  const { draft, phase, dirty, busy, message, recovery } = snapshot;
  const confirm = useConfirm();
  async function publishRequest(d: EditorDraft) {
    const message = publicSolutionsEnabled
      ? "The problem and its worked solution, including attached files, will be public. Your grading keys stay private."
      : "Its statement becomes public. Your grading keys stay private.";
    if (!(await confirm({ title: "Publish this version?", message, confirmLabel: "Publish" }))) return undefined;
    return draftRequest(`${editorBase}/${d.problemId}/publish`, "POST", {
      version: d.version,
      ...(publicSolutionsEnabled ? { solutionPolicy: publicSolutionPolicy } : {}),
    });
  }

  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [latest, setLatest] = useState<EditorDraft | null>(null);
  const [uploads, setUploads] = useState(0);
  const uploadPending = useCallback(
    (delta: number) => setUploads((n) => Math.max(0, n + delta)),
    [],
  );
  const [notice, setNotice] = useState("");
  const [fetchingLatest, setFetchingLatest] = useState(false);
  const parsed = authoredDraftSchema.safeParse({
    problemId: draft.problemId,
    version: draft.version,
    ...draftPayload(draft),
  });
  const publishable = publishableDraftSchema.safeParse({
    problemId: draft.problemId,
    version: draft.version,
    ...draftPayload(draft),
  });
  const issues = publishable.success ? [] : publishable.error.issues;
  // Publish rules Simple words and shows next to its own fields. Anything else is listed by the Publish button.
  const otherIssues = otherIssueMessages(issues);
  async function unpublish() {
    if (
      await confirm({
        title: "Unpublish this problem?",
        message: "It will stop being publicly readable. Previous revisions stay retained.",
        confirmLabel: "Unpublish",
        danger: true,
      })
    )
      void session.publish("unpublish", (d) =>
        draftRequest(
          `${editorBase}/${d.problemId}/unpublish`,
          "POST",
          { version: d.version },
        ),
      );
  }
  useEffect(() => {
    session.activate();
    return () => session.dispose();
  }, [session]);
  // Anything typed in the moment between the first save finishing and the page switching sessions is carried over.
  useEffect(() => {
    const old = previous.current;
    previous.current = null;
    if (!old) return;
    const last = old.snapshot().draft;
    if (JSON.stringify(draftPayload(last)) !== JSON.stringify(draftPayload(session.snapshot().draft)))
      session.edit((d) => {
        d.content = last.content;
        d.privateParts = last.privateParts;
      });
  }, [session]);
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (
        session.snapshot().dirty ||
        session.snapshot().recovery ||
        session.snapshot().recoveryRaw ||
        session.snapshot().busy ||
        uploads > 0
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [session, uploads]);
  const edit = (fn: (value: EditorDraft) => void) => {
    session.edit((d) => {
      fn(d);
      normalizeStatementImages(d.content);
    });
    setLatest(null);
  };
  async function compare() {
    setFetchingLatest(true);
    try {
      const server = editorDraftSchema.parse(
        await draftRequest(`${editorBase}/${draft.problemId}`),
      );
      setLatest(server);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not load the server copy. Local work is retained.",
      );
    } finally {
      setFetchingLatest(false);
    }
  }
  // Back saves first. It never does nothing: while a save or an upload is running it says so, and it never drops typed text.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const leaving = useRef(false);
  async function back() {
    if (leaving.current) return;
    if (uploads > 0) {
      setNotice("An image is still uploading. Tap Back again in a moment. Nothing is lost.");
      return;
    }
    const unsaved = dirty || busy || recovery || snapshot.recoveryRaw;
    if (!unsaved) {
      onBack();
      return;
    }
    leaving.current = true;
    try {
      if (!recovery && !snapshot.recoveryRaw) {
        setNotice("Saving your changes, then going back…");
        // A new problem swaps to its saved draft while this runs, so the check below reads the current session.
        await session.flush().catch(() => false);
        await new Promise((resolve) => setTimeout(resolve, 0));
        const now = sessionRef.current.snapshot();
        if (!now.dirty && !now.recovery && !now.recoveryRaw && !now.busy && now.phase !== "error" && now.phase !== "conflict") {
          setNotice("");
          onBack();
          return;
        }
      }
      if (
        await confirm({
          title: "Leave anyway?",
          message: "Your latest changes are not saved yet. A copy stays in this tab's recovery copy. You can also download a private copy first.",
          confirmLabel: "Leave",
          danger: true,
        })
      ) {
        onBack();
        return;
      }
      setNotice("Your changes are still here. Check your connection and tap Back again, or download a private copy.");
    } finally {
      leaving.current = false;
    }
  }
  const previewCheck = authoredDocumentSchema.safeParse(draft.content);
  const safePreview = previewCheck.success
    ? publicAuthoredContent(previewCheck.data)
    : null;
  return (
    <AuthorMediaProvider
      problemId={draft.problemId}
      disabled={busy || uploads > 0 || !!recovery || !!snapshot.recoveryRaw}
      pending={uploadPending}
    >
    <div className={`min-h-dvh bg-background text-foreground ${studioTokens}`}>
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              aria-label="Back to drafts"
              className="min-h-11 min-w-11"
              onClick={() => void back()}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Problem Studio
            </span>
            <HowItWorksLink />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TourHelpButton tourId="studio" />
            <span
              role="status"
              aria-live="polite"
              className={`max-w-60 text-xs ${phase === "error" || phase === "conflict" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {uploads > 0 ? "Uploading privately…" : message}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                busy ||
                uploads > 0 ||
                phase === "saving" ||
                phase === "conflict" ||
                !!recovery ||
                !parsed.success
              }
              onClick={() => void session.flush()}
            >
              <Save className="mr-1 size-4" />
              Save now
            </Button>
          </div>
        </div>
      </header>
      <main
        id="author-main"
        tabIndex={-1}
        className="focus:outline-none mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 mx-auto max-w-2xl`}>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Problem Studio
            </h1>
          </div>
          <StatusBar
            saveMessage={uploads > 0 ? "Uploading privately…" : message}
            saveTone={
              phase === "error" || phase === "conflict"
                ? "error"
                : phase === "saved" && uploads === 0
                  ? "ok"
                  : "busy"
            }
          />
        </div>
        <p role="status" aria-live="polite" className="mb-3 text-sm">
          {notice}
        </p>
        {snapshot.storageWarning && (
          <p role="alert" className="mb-4 rounded-lg border p-4 text-sm">
            Tab recovery storage is unavailable. Download a private copy from
            Recovery before leaving if saving fails.
          </p>
        )}
        <RecoverySection narrow active={Boolean(snapshot.recoveryRaw || recovery || phase === "conflict" || phase === "error")}>
        <div className="space-y-2">
          <Button type="button" variant="outline" onClick={() => download(draft)}>
            Download private copy
          </Button>
          <p className="text-sm text-muted-foreground">
            Saves your current work as a file on this device. It includes private answer keys, so keep it private.
          </p>
        </div>
        {snapshot.recoveryRaw && (
          <section
            role="alert"
            className="mb-6 space-y-3 rounded-lg border p-5"
          >
            <h2 className="font-semibold">
              A recovery copy needs inspection
            </h2>
            <p className="text-sm">
              This tab contains an unrecognized local copy. It has been
              preserved. Download it before choosing to discard it.
            </p>
            <Button
              type="button"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([snapshot.recoveryRaw!], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "physcratic-private-recovery.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download unrecognized private copy
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (
                  await confirm({ title: "Discard the preserved unrecognized copy?", confirmLabel: "Discard", danger: true })
                )
                  session.discardRecovery();
              }}
            >
              Discard unrecognized copy
            </Button>
          </section>
        )}
        {recovery && (
          <section
            aria-label="Recover unsaved work"
            className="mb-6 space-y-3 rounded-lg border border-primary p-5"
          >
            <h2 className="font-semibold">Unsaved work from this tab</h2>
            <p className="text-sm">
              A local copy of version {recovery.version} is available. Your
              server copy is version {draft.version}. Choose which to open.
              Nothing is replaced automatically.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={uploads > 0} onClick={() => session.restoreRecovery()}>
                Restore local work
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => download(recovery)}
              >
                Download private recovery copy
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={uploads > 0}
                onClick={async () => {
                  if (
                    await confirm({ title: "Discard the tab's unsaved recovery copy?", confirmLabel: "Discard", danger: true })
                  )
                    session.discardRecovery();
                }}
              >
                Discard local recovery copy
              </Button>
            </div>
          </section>
        )}
        {(phase === "conflict" || phase === "error") && (
          <section
            role="alert"
            className="mb-6 space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-5"
          >
            <h2 className="font-semibold">
              {phase === "conflict"
                ? "Resolve a version conflict"
                : "Your work has not been saved"}
            </h2>
            <p className="text-sm">
              {message} Downloaded copies include private keys. Keep them
              private.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={fetchingLatest || uploads > 0}
                onClick={() => void compare()}
              >
                {fetchingLatest
                  ? "Loading…"
                  : "Compare with latest server copy"}
              </Button>
              {phase === "error" && (
                <Button
                  type="button"
                  disabled={!parsed.success || uploads > 0}
                  onClick={() => void session.flush()}
                >
                  Retry saving
                </Button>
              )}
            </div>
            {latest && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm">
                  Local: “{draft.content.title || "Untitled"}” (version{" "}
                  {draft.version}). Server: “
                  {latest.content.title || "Untitled"}” (version{" "}
                  {latest.version}).
                </p>
                {tab === "edit" && (
                  <details>
                    <summary className="min-h-11 cursor-pointer text-sm">
                      Inspect latest server document and private answer
                      configuration
                    </summary>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs">
                      {JSON.stringify(draftPayload(latest), null, 2)}
                    </pre>
                  </details>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploads > 0}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: "Replace local work with the loaded server copy?",
                          message: "Download local work first if you need it.",
                          confirmLabel: "Use server copy",
                          danger: true,
                        })
                      ) {
                        session.useServer(latest);
                        setLatest(null);
                      }
                    }}
                  >
                    Use server copy
                  </Button>
                  <Button
                    type="button"
                    disabled={uploads > 0}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: "Keep all local content over the loaded server version?",
                          message: "The next save replaces that server draft.",
                          confirmLabel: "Keep local work",
                          danger: true,
                        })
                      ) {
                        session.keepLocal(latest);
                        setLatest(null);
                      }
                    }}
                  >
                    Keep local work over this version
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
        </RecoverySection>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex gap-2" role="group" aria-label="Editor view">
            <Button
              type="button"
              aria-pressed={tab === "edit"}
              variant={tab === "edit" ? "secondary" : "ghost"}
              onClick={() => setTab("edit")}
            >
              <FilePenLine className="mr-2 size-4" />
              Write
            </Button>
            <Button
              type="button"
              aria-pressed={tab === "preview"}
              variant={tab === "preview" ? "secondary" : "ghost"}
              onClick={() => setTab("preview")}
            >
              <Eye className="mr-2 size-4" />
              Student preview
            </Button>
          </div>
          {dirty && (
            <p className="text-xs text-muted-foreground">
              Preview includes unsaved local edits
            </p>
          )}
        </div>
        <GuidedTour tourId="studio" />
          <div hidden={tab !== "edit"}>
            {continueDraft && (
              <p className="mx-auto mb-6 max-w-2xl text-base">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                  disabled={busy || uploads > 0}
                  onClick={async () => {
                    if (
                      (dirty || recovery || snapshot.recoveryRaw) &&
                      !(await confirm({ title: "Leave this problem?", message: "Unsaved work stays in this tab's recovery copy.", confirmLabel: "Leave", danger: true }))
                    )
                      return;
                    continueDraft.open();
                  }}
                >
                  Continue your last draft{continueDraft.title ? `: ${continueDraft.title}` : ""}
                </button>
              </p>
            )}
            <SimpleEditor
              draft={draft}
              userId={userId}
              edit={edit}
              locked={busy || uploads > 0 || !!recovery || !!snapshot.recoveryRaw}
              provisional={creating}
              otherIssues={otherIssues}
              publishing={busy}
              onUnpublish={unpublish}
              onPreview={() => setTab("preview")}
              onPublish={() => {
                if (phase === "saving" || phase === "conflict") return;
                void session.publish("publish", publishRequest);
              }}
            />
          </div>
        {tab === "preview" && (
          !safePreview ? (
            <p role="alert">
              Complete the document validation checks to render a safe
              preview. Your local work is retained in the editor.
            </p>
          ) : (
            <article
              aria-label="Student-facing preview"
              className="mx-auto max-w-3xl space-y-8 rounded-xl border px-5 py-8 sm:px-10"
            >
              <h2 className="text-3xl font-semibold tracking-tight">
                {safePreview.title || "Untitled problem"}
              </h2>
              <div className="flex flex-wrap gap-2">
                {[...safePreview.topicTags, ...safePreview.methodTags].map(
                  (tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="rounded-full bg-muted px-3 py-1 text-xs"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
              <StatementPdfLinks
                ids={safePreview.attachments
                  .filter((a) => a.purpose === "statement-pdf")
                  .map((a) => a.id)}
              />
              <ReaderBlocks blocks={safePreview.context} />
              {safePreview.sections.map((section, index) => (
                <section key={section.id} className="space-y-5">
                  {(section.title || safePreview.sections.length > 1) && <h3 className="text-xl font-semibold">
                    {section.title || `Section ${index + 1}`}
                  </h3>}
                  <ReaderBlocks blocks={section.blocks} />
                  {section.parts.map((part, pi) => {
                    const PartHeading = section.title || safePreview.sections.length > 1 ? "h4" : "h3";
                    return (
                    <section
                      key={part.id}
                      className={`space-y-3 rounded-r-lg py-1 pl-4`}
                    >
                      <PartHeading className={safePreview.sections.reduce((n, s) => n + s.parts.length, 0) > 1 ? "font-medium" : "sr-only"}>
                        <PartChip>Part {part.label || pi + 1}</PartChip>
                      </PartHeading>
                      <ReaderBlocks blocks={part.blocks} />
                      <p className="text-xs text-muted-foreground">
                        {part.answerMode === "manual"
                          ? "Manual / ungraded response"
                          : `${part.answerMode === "numeric" ? "Numeric" : "Expression"} response`}
                      </p>
                    </section>
                  ); })}
                </section>
              ))}
            </article>
          )
        )}

      </main>
    </div>
    </AuthorMediaProvider>
  );
}
