"use client";
import { SolutionPermissions } from "./solution-permissions";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { CircleAlert, Eye, FilePenLine, Save, ShieldCheck } from "lucide-react";
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
  moveItem,
  type EditorDraft,
} from "@/lib/problem-authoring-editor";
import { normalizeStatementImages } from "@/lib/author-media";
import {
  AuthorMediaProvider,
  MediaAttachments,
  StatementPdfLinks,
} from "./media-controls";
import { AnswerPanel } from "./answer-panel";
import { TagPicker, MissingTagNote } from "./tag-picker";
import { HowItWorksLink, StatusBar, StepCard, studioTokens } from "./studio-ui";
import { SimpleEditor, rememberSimpleFocus } from "./simple-editor";
import { STUDIO_MODE_KEY, readStudioMode, type StudioMode } from "./simple-model";
import { colorsByPartId } from "@/lib/part-colors";
import { PartChip, partBorder, partStyle } from "@/components/physics/solve-ui";
import {
  BlocksEditor,
  Field,
  inputClass,
  OrderControls,
  ReaderBlocks,
} from "./editor-fields";

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
  carry,
  continueDraft,
}: {
  initial: EditorDraft;
  userId: string;
  onBack: () => void;
  /** A new problem that is not on the server yet. The first edit saves it, and `onCreated` swaps in the saved copy. */
  provisional?: { onCreated: (saved: EditorDraft, latest: EditorDraft) => void };
  /** Edits made while the first save was in flight. They are applied to the saved copy. */
  carry?: EditorDraft | null;
  /** A link to the most recent draft, shown at the top of a new problem. */
  continueDraft?: { title: string; open: () => void } | null;
}) {
  const [mode, setModeState] = useState<StudioMode>("simple");
  // The saved choice is read in the browser, so nothing is drawn until it is known. No flash of the wrong mode.
  const [modeReady, setModeReady] = useState(false);
  useEffect(() => {
    setModeState(readStudioMode());
    setModeReady(true);
  }, []);
  function chooseMode(next: StudioMode) {
    setModeState(next);
    try {
      window.localStorage.setItem(STUDIO_MODE_KEY, next);
    } catch {
      /* Ignore. */
    }
  }
  const [session] = useState(() => {
    let storage: Storage | undefined;
    try {
      if (typeof window !== "undefined") storage = window.sessionStorage;
    } catch {
      /* Recovery warning shown below. */
    }
    let created = false;
    const holder: { session?: DraftEditorSession } = {};
    holder.session = new DraftEditorSession(
      initial,
      async (draft) => {
        if (provisional) {
          // The first save creates the draft. Any later save from this copy would race the saved copy that replaces it.
          if (created) throw new Error("Your first draft was saved. Keep typing.");
          const saved = editorDraftSchema.parse(await draftRequest(editorBase, "POST", draftPayload(draft)));
          created = true;
          rememberSimpleFocus();
          try {
            storage?.removeItem(`physcratic:author:${userId}:${initial.problemId}`);
          } catch {
            /* Ignore. */
          }
          provisional.onCreated(saved, holder.session!.snapshot().draft);
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
      `physcratic:author:${userId}:${initial.problemId}`,
      provisional ? 300 : undefined,
    );
    return holder.session;
  });
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.snapshot,
    session.snapshot,
  );
  const { draft, phase, dirty, busy, message, recovery } = snapshot;
  const editorColours = colorsByPartId(draft?.content.sections ?? []);
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
  // Publish rules Simple shows next to its own fields. Anything else is listed by the Publish button.
  const simpleOwned = /^(Title and rights provenance required|Native statement and at least one part required|Every published part requires a key or explicit manual mode)$/;
  const otherIssues = issues.map((i) => i.message).filter((m) => !simpleOwned.test(m));
  useEffect(() => {
    session.activate();
    return () => session.dispose();
  }, [session]);
  useEffect(() => {
    if (!carry) return;
    const current = session.snapshot().draft;
    if (JSON.stringify(draftPayload(carry)) !== JSON.stringify(draftPayload(current)))
      session.edit((d) => {
        d.content = carry.content;
        d.privateParts = carry.privateParts;
      });
    // Runs once, when the saved copy replaces the provisional one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  function back() {
    if (busy || uploads > 0) return;
    if (
      (dirty || recovery || snapshot.recoveryRaw) &&
      !window.confirm(
        "Leave this editor? Unsaved work stays in this tab's recovery copy. You can also download a private copy first.",
      )
    )
      return;
    onBack();
  }
  function addSection() {
    edit((d) => {
      d.content.sections.push({
        id: crypto.randomUUID(),
        title: "",
        blocks: [],
        parts: [],
      });
    });
    setNotice("Section added. Use Tab or the outline to reach it.");
  }
  function setMode(partId: string, mode: "numeric" | "expression" | "manual") {
    edit((d) => {
      const part = d.content.sections
        .flatMap((s) => s.parts)
        .find((p) => p.id === partId)!;
      part.answerMode = mode;
      const entry = d.privateParts.find((p) => p.partId === partId)!;
      entry.key =
        mode === "numeric"
          ? { kind: mode, value: null, units: "", absTol: 0.01, relTol: 0 }
          : mode === "expression"
            ? {
                kind: mode,
                expected: "",
                variables: [],
                angleUnit: "radians",
                exclusions: [],
              }
            : { kind: "manual" };
    });
  }
  const previewCheck = authoredDocumentSchema.safeParse(draft.content);
  const safePreview = previewCheck.success
    ? publicAuthoredContent(previewCheck.data)
    : null;
  const previewColours = colorsByPartId(safePreview?.sections ?? []);
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
              onClick={back}
              disabled={busy || uploads > 0}
            >
              ← My drafts
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Problem Studio
            </span>
            <HowItWorksLink />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Editor mode" className="flex gap-1 rounded-lg border p-1">
              {(["simple", "advanced"] as const).map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  aria-pressed={mode === m}
                  variant={mode === m ? "secondary" : "ghost"}
                  onClick={() => chooseMode(m)}
                >
                  {m === "simple" ? "Simple" : "Advanced"}
                </Button>
              ))}
            </div>
            <span
              role="status"
              aria-live="polite"
              className={`max-w-60 text-xs ${phase === "error" || phase === "conflict" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {uploads > 0 ? "Uploading privately…" : message}
            </span>
            {mode === "advanced" && (
              <>
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
            <Button
              type="button"
              size="sm"
              className="disabled:border disabled:border-input disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
              disabled={
                busy ||
                uploads > 0 ||
                phase === "saving" ||
                phase === "conflict" ||
                !!recovery ||
                !publishable.success
              }
              onClick={() => {
                if (
                  window.confirm(
                    "Publish this version? Its statement becomes public. Your grading keys stay private.",
                  )
                )
                  void session.publish("publish", (d) =>
                    draftRequest(
                      `${editorBase}/${d.problemId}/publish`,
                      "POST",
                      { version: d.version },
                    ),
                  );
              }}
            >
              {busy
                ? "Working…"
                : draft.state === "published"
                  ? "Publish new revision"
                  : "Publish problem"}
            </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main
        id="author-main"
        tabIndex={-1}
        className="focus:outline-none mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12"
      >
        <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 ${mode === "simple" ? "mx-auto max-w-2xl" : ""}`}>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Problem Studio
            </h1>
            {mode === "advanced" && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Write a problem, add a solution, then publish.
              </p>
            )}
          </div>
          <StatusBar
            compact={mode === "simple"}
            state={draft.state}
            version={draft.version}
            saveMessage={uploads > 0 ? "Uploading privately…" : message}
            saveTone={
              phase === "error" || phase === "conflict"
                ? "error"
                : phase === "saved" && uploads === 0
                  ? "ok"
                  : "busy"
            }
            checksLeft={issues.length}
          />
        </div>
        <p role="status" aria-live="polite" className="mb-3 text-sm">
          {notice}
        </p>
        {snapshot.storageWarning && (
          <p role="alert" className="mb-4 rounded-lg border p-4 text-sm">
            Tab recovery storage is unavailable. Download a private copy
            before leaving if saving fails.
          </p>
        )}
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
              onClick={() => {
                if (
                  window.confirm("Discard the preserved unrecognized copy?")
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
                onClick={() => {
                  if (
                    window.confirm("Discard the tab's unsaved recovery copy?")
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
                onClick={() => download(draft)}
              >
                Download private local copy
              </Button>
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
                    onClick={() => {
                      if (
                        window.confirm(
                          "Replace local work with the loaded server copy? Download local work first if you need it.",
                        )
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
                    onClick={() => {
                      if (
                        window.confirm(
                          "Keep all local content over the loaded server version? The next save replaces that server draft.",
                        )
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
        {!modeReady ? null : mode === "simple" ? (
          <>
            {continueDraft && (
              <p className="mb-6 text-sm">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                  disabled={busy || uploads > 0}
                  onClick={() => {
                    if (
                      (dirty || recovery || snapshot.recoveryRaw) &&
                      !window.confirm("Leave this problem? Unsaved work stays in this tab's recovery copy.")
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
              edit={edit}
              locked={busy || uploads > 0 || !!recovery || !!snapshot.recoveryRaw}
              provisional={!!provisional}
              otherIssues={otherIssues}
              publishing={busy}
              onPublish={() => {
                if (phase === "saving" || phase === "conflict") return;
                void session.publish("publish", (d) =>
                  draftRequest(`${editorBase}/${d.problemId}/publish`, "POST", { version: d.version }),
                );
              }}
            />
          </>
        ) : (
          <>
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
          <p className="text-xs text-muted-foreground">
            {dirty
              ? "Preview includes unsaved local edits"
              : "Native text + LaTeX"}
          </p>
        </div>
        {tab === "preview" ? (
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
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Student preview · practice
              </p>
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
                  <h3 className="text-xl font-semibold">
                    {section.title || `Section ${index + 1}`}
                  </h3>
                  <ReaderBlocks blocks={section.blocks} />
                  {section.parts.map((part, pi) => (
                    <section
                      key={part.id}
                      style={partStyle(previewColours.get(part.id) ?? 0)}
                      className={`space-y-3 rounded-r-lg py-1 pl-4 ${partBorder}`}
                    >
                      <h4 className="font-medium">
                        <PartChip index={previewColours.get(part.id) ?? 0}>Part {part.label || pi + 1}</PartChip>
                      </h4>
                      <ReaderBlocks blocks={part.blocks} />
                      <p className="text-xs text-muted-foreground">
                        {part.answerMode === "manual"
                          ? "Manual / ungraded response"
                          : `${part.answerMode === "numeric" ? "Numeric" : "Expression"} response`}
                      </p>
                    </section>
                  ))}
                </section>
              ))}
            </article>
          )
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
            <fieldset
              disabled={
                busy || uploads > 0 || !!recovery || !!snapshot.recoveryRaw
              }
              className="min-w-0 space-y-8 disabled:opacity-70"
            >
              <legend className="sr-only">Problem authoring document</legend>
              <StepCard
                id="step-statement"
                step={1}
                title="Statement"
                hint="The title, difficulty and the context shared by every part."
              >
                <Field label="Problem title">
                  {(id) => (
                    <input
                      id={id}
                      className={`${inputClass} py-3 text-xl font-medium sm:text-2xl`}
                      placeholder="2 to 5 words, such as Mind the Gap"
                      maxLength={200}
                      value={draft.content.title}
                      onChange={(e) =>
                        edit((d) => {
                          d.content.title = e.target.value;
                        })
                      }
                    />
                  )}
                </Field>
                <Field
                  label="Estimated difficulty (optional)"
                  help="An author estimate, not an Elo rating."
                >
                  {(id) => (
                    <input
                      id={id}
                      className={inputClass}
                      maxLength={80}
                      value={draft.content.estimatedDifficulty ?? ""}
                      onChange={(e) =>
                        edit((d) => {
                          d.content.estimatedDifficulty =
                            e.target.value || null;
                        })
                      }
                    />
                  )}
                </Field>
                <div id="common-context" className="scroll-mt-24 space-y-3">
                  <h3 className="text-base font-semibold">Set the scene</h3>
                  <p className="text-sm text-muted-foreground">
                    Shared context for every part. Add inline equations inside
                    text, or give an equation its own block.
                  </p>
                <BlocksEditor
                  label="Common context"
                  blocks={draft.content.context}
                  onChange={(blocks) =>
                    edit((d) => {
                      d.content.context = blocks;
                    })
                  }
                />
                </div>
              </StepCard>
              <StepCard
                id="step-parts"
                step={2}
                title="Parts and answers"
                hint="Each part has its own statement, answer key, hints and worked solution. Answer keys stay private."
              >
              {draft.content.sections.map((section, si) => (
                <section
                  key={section.id}
                  data-order-item
                  id={`section-${section.id}`}
                  tabIndex={-1}
                  className="scroll-mt-24 space-y-6 rounded-lg border bg-background p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">
                      Section {si + 1}
                    </h3>
                    <OrderControls
                      label={`section ${si + 1}`}
                      index={si}
                      count={draft.content.sections.length}
                      move={(delta) => {
                        edit((d) => {
                          d.content.sections = moveItem(
                            d.content.sections,
                            si,
                            delta,
                          );
                        });
                        setNotice(
                          `Section ${si + 1} moved to position ${si + delta + 1}.`,
                        );
                      }}
                      remove={() => {
                        if (
                          !window.confirm(
                            "Delete this section, its parts, and their private answer content?",
                          )
                        )
                          return false;
                        edit((d) => {
                          const ids = new Set(
                            d.content.sections[si].parts.map((p) => p.id),
                          );
                          d.content.sections.splice(si, 1);
                          d.privateParts = d.privateParts.filter(
                            (p) => !ids.has(p.partId),
                          );
                        });
                        setNotice("Section deleted.");
                      }}
                    />
                  </div>
                  <Field label={`Section ${si + 1} title`}>
                    {(id) => (
                      <input
                        id={id}
                        className={inputClass}
                        value={section.title}
                        maxLength={200}
                        onChange={(e) =>
                          edit((d) => {
                            d.content.sections[si].title = e.target.value;
                          })
                        }
                      />
                    )}
                  </Field>
                  <BlocksEditor
                    label={`Section ${si + 1} context`}
                    blocks={section.blocks}
                    onChange={(blocks) =>
                      edit((d) => {
                        d.content.sections[si].blocks = blocks;
                      })
                    }
                  />
                  {section.parts.map((part, pi) => {
                    const entry = draft.privateParts.find(
                      (p) => p.partId === part.id,
                    ) ?? {
                      partId: part.id,
                      key: null,
                      hints: [],
                      solution: [],
                    };
                    return (
                      <section
                        key={part.id}
                        data-order-item
                        tabIndex={-1}
                        style={partStyle(editorColours.get(part.id) ?? 0)}
                        className={`space-y-5 rounded-lg border bg-muted/30 p-4 ${partBorder}`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">
                            <PartChip index={editorColours.get(part.id) ?? 0}>Part {part.label || pi + 1}</PartChip>
                          </h4>
                          <OrderControls
                            label={`section ${si + 1} part ${pi + 1}`}
                            index={pi}
                            count={section.parts.length}
                            move={(delta) => {
                              edit((d) => {
                                d.content.sections[si].parts = moveItem(
                                  d.content.sections[si].parts,
                                  pi,
                                  delta,
                                );
                              });
                              setNotice(
                                `Part ${pi + 1} moved to position ${pi + delta + 1}.`,
                              );
                            }}
                            remove={() => {
                              if (
                                !window.confirm(
                                  "Delete this part and its private answer content?",
                                )
                              )
                                return false;
                              edit((d) => {
                                d.content.sections[si].parts.splice(pi, 1);
                                d.privateParts = d.privateParts.filter(
                                  (p) => p.partId !== part.id,
                                );
                              });
                              setNotice("Part deleted.");
                            }}
                          />
                        </div>
                        <Field
                          label={`Section ${si + 1} part ${pi + 1} label`}
                        >
                          {(id) => (
                            <input
                              id={id}
                              className={inputClass}
                              maxLength={80}
                              value={part.label}
                              onChange={(e) =>
                                edit((d) => {
                                  d.content.sections[si].parts[pi].label =
                                    e.target.value;
                                })
                              }
                            />
                          )}
                        </Field>
                        <BlocksEditor
                          label={`Part ${part.label || pi + 1} statement`}
                          blocks={part.blocks}
                          onChange={(blocks) =>
                            edit((d) => {
                              d.content.sections[si].parts[pi].blocks =
                                blocks;
                            })
                          }
                        />
                        <details style={partStyle(editorColours.get(part.id) ?? 0)} className={`rounded-lg border bg-card p-4 ${partBorder}`}>
                          <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
                            <ShieldCheck className="size-4" />
                            Answer key, hints and solution · part{" "}
                            {part.label || pi + 1}
                          </summary>
                          <div className="mt-5">
                            <AnswerPanel
                              entry={entry}
                              mode={part.answerMode}
                              onChange={(value) =>
                                edit((d) => {
                                  d.privateParts = [
                                    ...d.privateParts.filter(
                                      (p) => p.partId !== part.id,
                                    ),
                                    value,
                                  ];
                                })
                              }
                              onMode={(mode) => {
                                if (
                                  !entry.key ||
                                  entry.key.kind === mode ||
                                  window.confirm(
                                    "Change answer type? This replaces the current private grading configuration. Hints and solution remain.",
                                  )
                                ) {
                                  if (
                                    !draft.privateParts.some(
                                      (p) => p.partId === part.id,
                                    )
                                  )
                                    edit((d) => {
                                      d.privateParts.push(entry);
                                    });
                                  setMode(part.id, mode);
                                }
                              }}
                            />
                            {!entry.key && (
                              <Button
                                type="button"
                                variant="outline"
                                className="mt-4"
                                onClick={() => {
                                  edit((d) => {
                                    d.privateParts = [
                                      ...d.privateParts.filter(
                                        (p) => p.partId !== part.id,
                                      ),
                                      { ...entry, key: { kind: "manual" } },
                                    ];
                                    d.content.sections[si].parts[
                                      pi
                                    ].answerMode = "manual";
                                  });
                                }}
                              >
                                Set explicit manual grading
                              </Button>
                            )}
                          </div>
                        </details>
                      </section>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={section.parts.length >= 50}
                    onClick={() =>
                      edit((d) => {
                        const id = crypto.randomUUID();
                        d.content.sections[si].parts.push({
                          id,
                          label: String(
                            d.content.sections[si].parts.length + 1,
                          ),
                          blocks: [],
                          answerMode: "manual",
                        });
                        d.privateParts.push({
                          partId: id,
                          key: { kind: "manual" },
                          hints: [],
                          solution: [],
                        });
                      })
                    }
                  >
                    + Add part to section {si + 1}
                  </Button>
                </section>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed py-6"
                disabled={draft.content.sections.length >= 30}
                onClick={addSection}
              >
                + Add section
              </Button>
              </StepCard>
              <StepCard
                id="step-tags"
                step={3}
                title="Tags"
                hint="Tags help students find the problem in the library. Choose from the same list the library uses."
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <TagPicker
                    kind="topic"
                    label="Topics"
                    values={draft.content.topicTags}
                    change={(v) =>
                      edit((d) => {
                        d.content.topicTags = v;
                      })
                    }
                  />
                  <TagPicker
                    kind="method"
                    label="Methods"
                    values={draft.content.methodTags}
                    pickedTopics={draft.content.topicTags}
                    change={(v) =>
                      edit((d) => {
                        d.content.methodTags = v;
                      })
                    }
                  />
                </div>
                <MissingTagNote />
              </StepCard>
              <MediaAttachments draft={draft} edit={edit} />
              <StepCard
                id="publication"
                step={5}
                title="Publish"
                hint="Publish only original or properly authorized material. New publications create immutable revisions. Your earlier published version stays visible while you edit."
              >
                <Field label="Content provenance">
                  {(id) => (
                    <select
                      id={id}
                      className={inputClass}
                      value={draft.content.provenance.kind}
                      onChange={(e) =>
                        edit((d) => {
                          d.content.provenance.kind = e.target.value as
                            | "original"
                            | "authorized";
                        })
                      }
                    >
                      <option value="original">My original work</option>
                      <option value="authorized">Used with permission</option>
                    </select>
                  )}
                </Field>
                <Field
                  label="Source / permission reference"
                  help="Required for authorized material. Include where permission was granted."
                >
                  {(id) => (
                    <input
                      id={id}
                      className={inputClass}
                      maxLength={2000}
                      value={draft.content.provenance.source}
                      onChange={(e) =>
                        edit((d) => {
                          d.content.provenance.source = e.target.value;
                        })
                      }
                    />
                  )}
                </Field>
                <Field
                  label="Rights declaration"
                  help="State that you own this work or have permission to publish it."
                >
                  {(id) => (
                    <textarea
                      id={id}
                      className={inputClass}
                      rows={2}
                      maxLength={4000}
                      value={draft.content.provenance.rightsDeclaration}
                      onChange={(e) =>
                        edit((d) => {
                          d.content.provenance.rightsDeclaration =
                            e.target.value;
                        })
                      }
                    />
                  )}
                </Field>
                <div className="rounded-lg border bg-background p-4">
                  <h3 className="text-sm font-semibold">Publication checks</h3>
                  {issues.length ? (
                    <ul className="mt-3 space-y-2 text-sm">
                      {issues.slice(0, 8).map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-destructive">
                          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                          <span>
                            {issue.path.length
                              ? `${issue.path.join(" → ")}: `
                              : ""}
                            {issue.message}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm">
                      Statement, rights and answer configuration are ready.
                      Publishing still validates everything on the server.
                    </p>
                  )}
                </div>
                <SolutionPermissions key={draft.problemId} problemId={draft.problemId} />
                {draft.state === "published" && (
                  <a
                    href={`/dashboard/authored/${draft.problemId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
                  >
                    Open student problem room
                  </a>
                )}
                {draft.state === "published" && (
                  <div className="space-y-3 rounded-lg border border-destructive p-4">
                  <h3 className="text-sm font-semibold">Danger zone</h3>
                  <p className="text-sm text-muted-foreground">
                    Unpublishing stops the problem being publicly readable.
                    Previous revisions stay retained.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={uploads > 0}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Unpublish this problem? It will stop being publicly readable. Previous revisions stay retained.",
                        )
                      )
                        void session.publish("unpublish", (d) =>
                          draftRequest(
                            `${editorBase}/${d.problemId}/unpublish`,
                            "POST",
                            { version: d.version },
                          ),
                        );
                    }}
                  >
                    Unpublish problem
                  </Button>
                  </div>
                )}
              </StepCard>
            </fieldset>
            <aside className="hidden lg:block">
              <nav
                aria-label="Document outline"
                className="sticky top-24 space-y-3 rounded-lg border bg-card p-5"
              >
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Steps
                </h2>
                <ol className="space-y-1 text-sm">
                  <li>
                    <a href="#step-statement" className="flex min-h-11 items-center rounded-sm hover:underline">
                      1. Statement
                    </a>
                  </li>
                  <li>
                    <a href="#step-parts" className="flex min-h-11 items-center rounded-sm hover:underline">
                      2. Parts and answers
                    </a>
                    <ul className="ml-4 space-y-1 border-l pl-3">
                      {draft.content.sections.map((section, i) => (
                        <li key={section.id}>
                          <a
                            href={`#section-${section.id}`}
                            className="flex min-h-11 items-center truncate rounded-sm text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {section.title || `Section ${i + 1}`}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li>
                    <a href="#step-tags" className="flex min-h-11 items-center rounded-sm hover:underline">
                      3. Tags
                    </a>
                  </li>
                  <li>
                    <a href="#author-assets" className="flex min-h-11 items-center rounded-sm hover:underline">
                      4. Images and PDFs
                    </a>
                  </li>
                  <li>
                    <a href="#publication" className="flex min-h-11 items-center rounded-sm hover:underline">
                      5. Publish
                    </a>
                  </li>
                </ol>
                <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                  Use the arrow buttons to reorder with a keyboard. No uploads
                  are needed. Native content comes first.
                </p>
              </nav>
            </aside>
          </div>
        )}
          </>
        )}
      </main>
    </div>
    </AuthorMediaProvider>
  );
}
