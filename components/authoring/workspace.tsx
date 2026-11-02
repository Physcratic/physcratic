"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FilePlus2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  draftRequest,
  editorBase,
  editorDraftSchema,
  newProblem,
  type EditorDraft,
} from "@/lib/problem-authoring-editor";
import { ProblemEditor } from "./problem-editor";

type DraftItem = {
  problemId: string;
  title: string;
  state: string;
  version: number;
  updatedAt: string;
};
export function AuthoringWorkspace({ userId }: { userId: string }) {
  const [items, setItems] = useState<DraftItem[]>([]),
    [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<EditorDraft | null>(null);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [cleanupNotice, setCleanupNotice] = useState("");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load drafts.");
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    setBusy(true);
    setError("");
    try {
      const draft = editorDraftSchema.parse(
        await draftRequest(`${editorBase}/${encodeURIComponent(id)}`),
      );
      setSelected(draft);
      history.replaceState(null, "", `?draft=${draft.problemId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open draft.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const id = new URL(location.href).searchParams.get("draft");
    if (id) void open(id);
    else void list();
  }, []);
  if (selected)
    return (
      <ProblemEditor
        key={selected.problemId}
        initial={selected}
        userId={userId}
        onBack={() => {
          setSelected(null);
          history.replaceState(null, "", location.pathname);
          void list();
        }}
      />
    );
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="flex min-h-11 items-center gap-2 text-sm"
          >
            <ArrowLeft className="size-4" />
            Physcratic
          </Link>
          <span className="text-sm text-muted-foreground">Problem studio</span>
        </div>
      </header>
      <main
        id="author-main"
        tabIndex={-1}
        className="focus:outline-none mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          A blank page. A good question.
        </p>
        <div className="my-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Your problem studio
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Turn a physical idea into a problem others can explore. Draft in
              native text and mathematics, then publish when it is ready.
            </p>
          </div>
          <Button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const draft = editorDraftSchema.parse(
                  await draftRequest(editorBase, "POST", newProblem()),
                );
                setSelected(draft);
                history.replaceState(null, "", `?draft=${draft.problemId}`);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not create a draft.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <FilePlus2 className="mr-2 size-4" />
            New problem
          </Button>
        </div>
        <div className="my-4 space-y-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  "Delete up to five old unlinked uploads? Saved drafts and published history stay protected. Unsaved recovery references older than 24 hours may need replacement.",
                )
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
                  `Cleaned ${result.deleted} files; ${result.retry} need retry. Repeat for additional files.`,
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
              "Private uploads removed from drafts can be cleaned after 24 hours; historical files are retained."}
          </p>
        </div>
        {error && (
          <div
            role="alert"
            className="my-6 rounded-lg border border-destructive/40 p-4"
          >
            <p className="text-sm">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => void list()}
            >
              Retry loading drafts
            </Button>
          </div>
        )}
        <p role="status" className="my-6 text-sm text-muted-foreground">
          {busy ? "Loading…" : `${items.length} drafts loaded`}
        </p>
        <div className="divide-y rounded-xl border">
          {items.length
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
                        {item.state} · version {item.version} ·{" "}
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy || item.state === "published"}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "Delete this draft? Saved working content is removed; historical published revisions are retained. Download any unsaved recovery work first.",
                          )
                        )
                          return;
                        setBusy(true);
                        setError("");
                        try {
                          await draftRequest(
                            `${editorBase}/${item.problemId}`,
                            "DELETE",
                            { version: item.version },
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
                    Room for your first idea
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Start a problem above. It stays private until you publish.
                  </p>
                </div>
              )}
        </div>
        {cursor && (
          <Button
            type="button"
            className="mt-6"
            variant="outline"
            disabled={busy}
            onClick={() => void list(cursor)}
          >
            Load more drafts
          </Button>
        )}
        <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Only original or authorized content may be published. Images and PDF
          uploads arrive in a later release. Drafts and private answer keys are
          accessible only to your verified author account.
        </p>
      </main>
    </div>
  );
}
