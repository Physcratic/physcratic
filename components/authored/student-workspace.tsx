"use client";
import { SkipLink } from "@/components/skip-link";
import { studioTokens } from "@/components/authoring/studio-ui";
import { WorkedSolution } from "./worked-solution";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/authoring/editor-fields";
import { numericUnitsHelp } from "@/lib/authored-grading-contracts";
import { authorMediaPath } from "@/lib/author-media";
import {
  StudentSolverSession,
  solverBase,
  publicStudentRevision,
  studentRequest,
  studentReadError,
  StudentRequestError,
  studentHistorySchema,
  submissionInfoSchema,
  formKey,
  type PublicRevision,
  type Viewer,
  type AnswerBuffer,
} from "@/lib/authored-student";
import type { AuthoredAttempt } from "@/lib/authored-attempt-contracts";
import { StatementBlocks } from "./public-content";
const feedback = {
  correct: {
    label: "Correct",
    text: "Your answer satisfied the checker. This saved result is tied to the stated revision.",
    color: "border-emerald-500/40 bg-emerald-500/5",
  },
  incorrect: {
    label: "Incorrect",
    text: "This answer did not meet the checker’s criteria. You can start another attempt.",
    color: "border-rose-500/40 bg-rose-500/5",
  },
  "needs-review": {
    label: "Needs review",
    text: "The checker could not establish a result. This does not necessarily mean your answer is wrong. Unsupported expressions, units or domain conditions can need review.",
    color: "border-amber-600 bg-amber-500/5",
  },
  ungraded: {
    label: "Ungraded",
    text: "Your answer was saved without an automatic correctness decision. Manual answers are ungraded.",
    color: "border-slate-400/40 bg-muted/30",
  },
};
function answerText(a: AuthoredAttempt["answer"]) {
  return a.kind === "numeric"
    ? `${a.value} ${a.units || "(dimensionless)"}`
    : a.kind === "expression"
      ? a.expression
      : a.text || "(empty manual answer)";
}
function short(id: string) {
  return id.slice(0, 8);
}
function download(value: string, name: string) {
  const url = URL.createObjectURL(
      new Blob([value], { type: "application/json" }),
    ),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
type Availability = "loading" | "ready" | "stale" | "unavailable" | "error";
export function StudentWorkspace({
  problemId,
  viewer,
}: {
  problemId: string;
  viewer: Viewer;
}) {
  const [revision, setRevision] = useState<PublicRevision | null>(null),
    [availability, setAvailability] = useState<Availability>("loading"),
    [publicMessage, setPublicMessage] = useState(""),
    [authDenied, setAuthDenied] = useState(false);
  const revisionRef = useRef(revision),
    requestId = useRef(0),
    needsReload = useRef(false),
    replacing = useRef(false),
    publicController = useRef<AbortController | undefined>(undefined),
    alive = useRef(true);
  const load = useCallback(
    async (replace = false) => {
      if (!replace && (replacing.current || needsReload.current)) return;
      replacing.current = replace;
      const serial = ++requestId.current;
      publicController.current?.abort();
      const controller = new AbortController();
      publicController.current = controller;
      if (replace) setAvailability("loading");
      try {
        const next = publicStudentRevision(
          await studentRequest(`${solverBase}/${problemId}`, {
            signal: controller.signal,
          }),
          problemId,
        );
        if (!alive.current || serial !== requestId.current) return;
        if (!replace && needsReload.current) return;
        if (
          !replace &&
          revisionRef.current &&
          next.id !== revisionRef.current.id
        ) {
          needsReload.current = true;
          setAvailability("stale");
          setPublicMessage(
            "A new revision is published. Your old input stays separate. Reload the current problem before a new submission.",
          );
          return;
        }
        needsReload.current = false;
        revisionRef.current = next;
        setRevision(next);
        setAvailability("ready");
        setPublicMessage("");
      } catch (e) {
        if (
          !alive.current ||
          controller.signal.aborted ||
          serial !== requestId.current
        )
          return;
        if (e instanceof StudentRequestError && e.status === 404) {
          needsReload.current = true;
          setAvailability("unavailable");
          setPublicMessage(
            "This problem is unpublished, deleted or unavailable. Its statement is hidden. Your own saved attempts and local work remain available.",
          );
        } else {
          setAvailability("error");
          setPublicMessage(
            "We could not confirm the current publication. New submissions are paused. Your local work is retained.",
          );
        }
      } finally {
        if (serial === requestId.current) replacing.current = false;
      }
    },
    [problemId],
  );
  useEffect(() => {
    alive.current = true;
    void load(true);
    const focus = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const timer = setInterval(focus, 30000);
    return () => {
      alive.current = false;
      publicController.current?.abort();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [load]);
  const invalidate = useCallback(() => {
    needsReload.current = true;
    setAvailability("stale");
    setPublicMessage(
      "The publication could not accept that revision. Reload the current problem before a new submission.",
    );
  }, []);
  const accountKey = "id" in viewer ? viewer.id : viewer.state;
  useEffect(() => setAuthDenied(false), [accountKey, viewer.state]);
  const denyAuth = useCallback(() => setAuthDenied(true), []);
  return (
    <div className={`min-h-dvh bg-background text-foreground ${studioTokens}`}>
      <SkipLink targetId="solver-main">Skip to problem content</SkipLink>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <a
            href="/dashboard?view=problems&collection=authored"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Physcratic
          </a>
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Problem room
            </span>
            <span className="rounded-md border bg-card px-3 py-2 text-xs">
              {authDenied
                ? "Recheck your account"
                : viewer.state === "verified"
                  ? "Verified learner"
                  : viewer.state === "unverified"
                    ? "Email verification needed"
                    : viewer.state === "loading"
                      ? "Checking account…"
                      : viewer.state === "error"
                        ? "Account unavailable"
                        : "Public reading"}
            </span>
          </div>
        </div>
      </header>
      <main
        id="solver-main"
        tabIndex={-1}
        className="focus:outline-none mx-auto w-full min-w-0 max-w-[1440px] space-y-7 px-4 py-6 sm:px-8 sm:py-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
          <div className="min-w-0 max-w-full">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Authored physics · Practice
            </p>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
              {availability === "ready"
                ? revision?.content.title
                : "Physics problem"}
            </h1>
            {availability === "ready" && revision && (
              <p className="mt-3 text-sm text-muted-foreground">
                Published revision {revision.number} ·{" "}
                <span className="font-mono text-xs">{short(revision.id)}</span>
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void load(true)}
            disabled={availability === "loading"}
          >
            {availability === "stale"
              ? "Reload current problem"
              : "Recheck publication"}
          </Button>
        </div>
        {availability === "loading" && (
          <p role="status">Loading the current published problem…</p>
        )}
        {publicMessage && (
          <div
            role="alert"
            className="rounded-lg border border-amber-600 bg-amber-500/5 p-5 text-sm leading-relaxed"
          >
            {publicMessage}
          </div>
        )}
        {viewer.state === "verified" && !authDenied ? (
          <PrivateWorkspace
            key={`${accountKey}:${problemId}`}
            userId={viewer.id}
            problemId={problemId}
            revision={revision}
            availability={availability}
            invalidate={invalidate}
            denyAuth={denyAuth}
          />
        ) : (
          <>
            <PublicStatement
              revision={availability === "ready" ? revision : null}
              problemId={problemId}
            />
            <section className="mx-auto max-w-3xl space-y-4 rounded-xl border bg-card p-6">
              <h2 className="text-xl font-semibold">
                {viewer.state === "unverified"
                  ? "Verify your email to submit"
                  : "Read freely. Sign in to practice."}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {viewer.state === "loading"
                  ? "Checking your account. Published problem content stays available below."
                  : viewer.state === "error" || authDenied
                    ? "We could not verify your session. Refresh the page to retry. Submissions and private history are paused."
                    : viewer.state === "unverified"
                      ? "Use your email verification link, then sign in again. No answer will be sent until your account is verified."
                      : "Published statements and public attachments are open to everyone. A verified account is required to save answers and see your own attempt history."}
              </p>
              <a
                className="inline-block min-h-11 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
                href={`/sign-in?returnTo=${encodeURIComponent(`/dashboard/authored/${problemId}`)}`}
              >
                Sign in to submit
              </a>
            </section>
          </>
        )}
      </main>
      <footer className="mx-auto max-w-[1440px] border-t px-5 py-6 text-xs leading-relaxed text-muted-foreground sm:px-8">
        Practice has no permanent per-part cap. Submitting or receiving a grade
        does not reveal private answers, hints or worked solutions.
      </footer>
    </div>
  );
}
function PublicStatement({
  revision,
  problemId,
  onAnswer,
}: {
  revision: PublicRevision | null;
  problemId: string;
  onAnswer?: (partId: string) => void;
}) {
  if (!revision) return null;
  const doc = revision.content;
  return (
    <article
      aria-label="Published problem statement"
      className="min-w-0 space-y-8 rounded-xl border bg-card p-5 sm:p-8"
    >
      <div className="flex flex-wrap gap-2">
        {[...doc.topicTags, ...doc.methodTags].map((tag, i) => (
          <span
            key={`${tag}:${i}`}
            className="rounded-full bg-muted px-3 py-1 text-xs"
          >
            {tag}
          </span>
        ))}
        {doc.estimatedDifficulty && (
          <span className="rounded-full border px-3 py-1 text-xs">
            Difficulty · {doc.estimatedDifficulty}
          </span>
        )}
      </div>
      {doc.attachments.filter((a) => a.purpose === "statement-pdf").length >
        0 && (
        <div className="rounded-lg border bg-muted/20 p-4">
          <h2 className="mb-2 text-sm font-semibold">Statement attachments</h2>
          {doc.attachments
            .filter((a) => a.purpose === "statement-pdf")
            .map((a, i) => (
              <a
                key={a.id}
                href={authorMediaPath(problemId, a.id, revision.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-4 inline-flex min-h-11 items-center gap-2 text-sm underline"
              >
                <FileText aria-hidden="true" className="size-4" /> Download
                statement PDF {i + 1}
              </a>
            ))}
        </div>
      )}
      <StatementBlocks
        blocks={doc.context}
        problemId={problemId}
        revisionId={revision.id}
      />
      {doc.sections.map((section, si) => (
        <section key={section.id} className="min-w-0 space-y-5 border-t pt-7">
          <h2 className="text-xl font-semibold">
            {section.title || `Section ${si + 1}`}
          </h2>
          <StatementBlocks
            blocks={section.blocks}
            problemId={problemId}
            revisionId={revision.id}
          />
          <div className="space-y-6">
            {section.parts.map((part, pi) => (
              <section
                id={`part-${part.id}`}
                key={part.id}
                className="min-w-0 scroll-mt-6 space-y-4 border-l-2 border-primary/25 pl-4 sm:pl-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold">
                    Part {part.label || pi + 1}
                  </h3>
                  {onAnswer && (
                    <button
                      type="button"
                      className="min-h-11 text-sm font-medium underline underline-offset-4"
                      onClick={() => onAnswer(part.id)}
                    >
                      Answer part {part.label || pi + 1}
                    </button>
                  )}
                </div>
                <StatementBlocks
                  blocks={part.blocks}
                  problemId={problemId}
                  revisionId={revision.id}
                />
              </section>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
function PrivateWorkspace({
  userId,
  problemId,
  revision,
  availability,
  invalidate,
  denyAuth,
}: {
  userId: string;
  problemId: string;
  revision: PublicRevision | null;
  availability: Availability;
  invalidate: () => void;
  denyAuth: () => void;
}) {
  const [session] = useState(() => {
    let storage;
    try {
      storage = window.sessionStorage;
    } catch {}
    return new StudentSolverSession(problemId, userId, storage);
  });
  const state = useSyncExternalStore(
    session.subscribe,
    session.snapshot,
    session.snapshot,
  );
  const [tab, setTab] = useState<"problem" | "history">("problem"),
    [selected, setSelected] = useState("");
  const [info, setInfo] = useState<ReturnType<
      typeof submissionInfoSchema.parse
    > | null>(null),
    [infoError, setInfoError] = useState("");
  const [history, setHistory] = useState<AuthoredAttempt[]>([]),
    [historyLoaded, setHistoryLoaded] = useState(false),
    [historyEpoch, setHistoryEpoch] = useState(0),
    [historyBusy, setHistoryBusy] = useState(false),
    [historyError, setHistoryError] = useState(""),
    [historyCursor, setHistoryCursor] = useState<string | null>(null),
    [pages, setPages] = useState<(string | null)[]>([null]);
  const infoSerial = useRef(0),
    infoAbort = useRef<AbortController | undefined>(undefined),
    historySerial = useRef(0),
    historyAbort = useRef<AbortController | undefined>(undefined),
    mounted = useRef(true),
    resultRef = useRef<HTMLDivElement>(null),
    historyTitle = useRef<HTMLHeadingElement>(null),
    partTitle = useRef<HTMLHeadingElement>(null),
    seenResult = useRef<string | null>(null);
  const revisionId = revision?.id;
  const parts =
      revision?.content.sections.flatMap((s) =>
        s.parts.map((p) => ({ ...p, sectionTitle: s.title })),
      ) ?? [],
    part = parts.find((p) => p.id === selected) ?? parts[0];
  const cancelInfo = useCallback(() => {
    infoSerial.current++;
    infoAbort.current?.abort();
  }, []);
  const cancelHistory = useCallback(() => {
    historySerial.current++;
    historyAbort.current?.abort();
  }, []);
  useEffect(() => {
    session.activate();
    mounted.current = true;
    return () => {
      mounted.current = false;
      session.dispose();
      cancelHistory();
      cancelInfo();
    };
  }, [session, cancelHistory, cancelInfo]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (
        state.book.pending ||
        Object.keys(state.book.buffers).length ||
        state.rawRecovery !== null
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [state.book, state.rawRecovery]);
  const firstPartId = parts[0]?.id ?? "";
  useEffect(() => {
    setSelected(firstPartId);
  }, [revisionId, firstPartId]);
  const refreshInfo = useCallback(async () => {
    if (!revisionId || availability !== "ready") return;
    const serial = ++infoSerial.current;
    infoAbort.current?.abort();
    const controller = new AbortController();
    infoAbort.current = controller;
    setInfoError("");
    setInfo(null);
    try {
      const data = submissionInfoSchema.parse(
        await studentRequest(`${solverBase}/${problemId}/submission-info`, {
          signal: controller.signal,
        }),
      );
      if (!mounted.current || serial !== infoSerial.current) return;
      if (data.problemId !== problemId || data.revisionId !== revisionId) {
        invalidate();
        return;
      }
      setInfo(data);
    } catch (e) {
      if (!mounted.current || serial !== infoSerial.current) return;
      if (e instanceof StudentRequestError && [401, 403].includes(e.status))
        denyAuth();
      setInfoError(studentReadError(e));
      if (e instanceof StudentRequestError && [404, 409].includes(e.status))
        invalidate();
    }
  }, [revisionId, availability, problemId, invalidate, denyAuth]);
  useEffect(() => {
    void refreshInfo();
    return cancelInfo;
  }, [refreshInfo, cancelInfo]);
  const loadHistory = useCallback(
    async (cursor: string | null = null, focus = false) => {
      const serial = ++historySerial.current;
      historyAbort.current?.abort();
      const controller = new AbortController();
      historyAbort.current = controller;
      setHistoryBusy(true);
      setHistory([]);
      setHistoryCursor(null);
      setHistoryError("");
      try {
        const data = studentHistorySchema.parse(
          await studentRequest(
            `${solverBase}/attempts?problemId=${problemId}${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`,
            { signal: controller.signal },
          ),
        );
        if (!mounted.current || serial !== historySerial.current) return;
        if (data.attempts.some((a) => a.problemId !== problemId))
          throw Error("Wrong history");
        setHistory(data.attempts);
        setHistoryCursor(data.nextCursor);
        setHistoryLoaded(true);
        if (focus) requestAnimationFrame(() => historyTitle.current?.focus());
      } catch (e) {
        if (
          !mounted.current ||
          controller.signal.aborted ||
          serial !== historySerial.current
        )
          return;
        if (e instanceof StudentRequestError && [401, 403].includes(e.status))
          denyAuth();
        setHistoryError(studentReadError(e));
      } finally {
        if (mounted.current && serial === historySerial.current)
          setHistoryBusy(false);
      }
    },
    [problemId, denyAuth],
  );
  useEffect(() => {
    if (tab === "history" && !historyLoaded) void loadHistory();
  }, [tab, historyLoaded, loadHistory, historyEpoch]);
  useEffect(() => {
    const a = state.lastResult;
    if (!a || seenResult.current === a.id) return;
    seenResult.current = a.id;
    setInfo((current) =>
      current && a.revisionId === current.revisionId
        ? {
            ...current,
            parts: current.parts.map((p) =>
              p.partId === a.partId &&
              BigInt(p.attemptsUsed) < BigInt(a.attemptNumber)
                ? { ...p, attemptsUsed: a.attemptNumber }
                : p,
            ),
          }
        : current,
    );
    historyAbort.current?.abort();
    historySerial.current++;
    setHistory([]);
    setHistoryCursor(null);
    setPages([null]);
    setHistoryBusy(false);
    setHistoryLoaded(false);
    setHistoryEpoch((x) => x + 1);
    if (part?.id === a.partId && revisionId === a.revisionId)
      requestAnimationFrame(() => resultRef.current?.focus());
  }, [state.lastResult, part?.id, revisionId]);
  useEffect(() => {
    if ([401, 403].includes(state.lastStatus)) denyAuth();
  }, [state.lastStatus, denyAuth]);
  useEffect(() => {
    const pending = state.book.pending;
    if (
      [404, 409].includes(state.lastStatus) &&
      pending?.body.revisionId === revision?.id
    )
      invalidate();
  }, [state.lastStatus, state.book.pending, revision?.id, invalidate]);
  const jump = (partId: string) => {
    setSelected(partId);
    setTab("problem");
    requestAnimationFrame(() => {
      document
        .getElementById("answer-workspace")
        ?.scrollIntoView({ block: "start" });
      partTitle.current?.focus({ preventScroll: true });
    });
  };
  const key = revision && part ? formKey(revision.id, part.id) : "",
    buffer =
      revision && part
        ? session.buffer(revision.id, part.id, part.answerMode)
        : null,
    receipt = state.book.receipts[key],
    pending = state.book.pending,
    pendingHere = Boolean(
      pending &&
        revision &&
        part &&
        pending.body.revisionId === revision.id &&
        pending.body.partId === part.id,
    ),
    ready = availability === "ready" && info?.revisionId === revision?.id;
  const [, clock] = useState(0);
  useEffect(() => {
    if (!state.retryAt) return;
    const timer = setInterval(() => clock((x) => x + 1), 1000);
    return () => clearInterval(timer);
  }, [state.retryAt]);
  const remaining = Math.max(0, Math.ceil((state.retryAt - Date.now()) / 1000));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Problem workspace view"
          className="flex gap-2"
        >
          <Button
            type="button"
            variant={tab === "problem" ? "secondary" : "outline"}
            aria-pressed={tab === "problem"}
            onClick={() => setTab("problem")}
          >
            Problem
          </Button>
          <Button
            type="button"
            variant={tab === "history" ? "secondary" : "outline"}
            aria-pressed={tab === "history"}
            onClick={() => setTab("history")}
          >
            <History aria-hidden="true" className="mr-2 size-4" /> My
            submissions
          </Button>
        </div>
        <button
          type="button"
          className="min-h-11 text-xs underline"
          onClick={() =>
            download(
              state.rawRecovery ?? JSON.stringify(state.book, null, 2),
              `physcratic-local-work-${problemId}.json`,
            )
          }
        >
          Download my local work
        </button>
      </div>
      {state.recoveryNotice && (
        <p role="status" className="text-sm text-muted-foreground">
          {state.recoveryNotice}
        </p>
      )}
      {state.storageWarning && (
        <p
          role="alert"
          className="rounded-lg border border-amber-600 p-4 text-sm"
        >
          {state.storageWarning}
        </p>
      )}
      {state.rawRecovery !== null && (
        <p role="alert" className="rounded-lg border p-4 text-sm">
          A preserved recovery copy could not be read. Download it before
          replacing anything. New submissions are paused.
        </p>
      )}
      {pending && (
        <section
          aria-label="Original submission recovery"
          className="space-y-3 rounded-lg border border-amber-600 bg-amber-500/5 p-5"
        >
          <h2 className="font-semibold">
            {state.busy
              ? "Saving submission…"
              : "Resolve the original submission"}
          </h2>
          <p className="text-sm leading-relaxed">
            Original revision{" "}
            <span className="font-mono">{short(pending.body.revisionId)}</span>{" "}
            · part{" "}
            <span className="font-mono">{short(pending.body.partId)}</span>. A
            retry sends this original answer and key. It never changes revisions
            or creates a new intended attempt.
          </p>
          <p className="break-words whitespace-pre-wrap rounded-md bg-background p-3 text-sm">
            {answerText(pending.body.answer)}
          </p>
          {state.error && (
            <p role="alert" className="text-sm">
              {state.error}
            </p>
          )}
          {pending.rejected ? (
            <Button
              type="button"
              variant="outline"
              disabled={state.busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Close this rejected submission? Your local answer stays tied to its original revision. A new attempt needs a fresh explicit submit.",
                  )
                )
                  session.closeRejected();
              }}
            >
              Keep local work and close rejected submission
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={state.busy || remaining > 0}
              onClick={() => void session.retry()}
            >
              {state.busy
                ? "Saving…"
                : remaining
                  ? `Retry original in ${remaining}s`
                  : "Retry original submission"}
            </Button>
          )}
        </section>
      )}
      {!pending && state.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive p-4 text-sm"
        >
          {state.error}
        </p>
      )}
      {tab === "history" ? (
        <section
          aria-label="My saved submissions"
          className="space-y-5 rounded-xl border bg-card p-5 sm:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              ref={historyTitle}
              tabIndex={-1}
              className="text-xl font-semibold"
            >
              My submissions
            </h2>
            <Button
              type="button"
              variant="outline"
              disabled={historyBusy}
              onClick={() => {
                setPages([null]);
                void loadHistory(null, true);
              }}
            >
              Refresh history
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Only your saved answers are shown. Older revision IDs do not load
            withdrawn problem content. Local unfinished input is kept
            separately.
          </p>
          {historyBusy && <p role="status">Loading your saved attempts…</p>}
          {historyError && (
            <div role="alert" className="space-y-3 text-sm">
              <p>{historyError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadHistory(pages.at(-1) ?? null)}
              >
                Retry history
              </Button>
            </div>
          )}
          {historyLoaded &&
            !history.length &&
            !historyBusy &&
            !historyError && (
              <p className="rounded-md bg-muted/30 p-5 text-sm">
                No saved attempts yet. Your first submitted answer will appear
                here.
              </p>
            )}
          <ol className="divide-y">
            {history.map((a) => {
              const current =
                  a.revisionId === revision?.id && availability === "ready",
                label = current
                  ? parts.find((p) => p.id === a.partId)?.label
                  : null;
              return (
                <li key={a.id} className="space-y-3 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">
                      Attempt {a.attemptNumber} · {feedback[a.status].label} · {a.assisted ? "Assisted" : "Unassisted"}
                    </p>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={a.createdAt}
                    >
                      {new Date(a.createdAt).toLocaleString()}
                    </time>
                  </div>
                  <p className="break-words text-xs text-muted-foreground">
                    {current
                      ? `Current revision · ${label ? `Part ${label}` : `part ${short(a.partId)}`}`
                      : `Historical selection · part ${short(a.partId)}`}{" "}
                    · revision{" "}
                    <span className="font-mono">{short(a.revisionId)}</span>
                  </p>
                  <p className="whitespace-pre-wrap break-words rounded-md bg-muted/30 p-3 font-mono text-sm">
                    {answerText(a.answer)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {feedback[a.status].text}
                  </p>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={historyBusy || pages.length === 1}
              onClick={() => {
                const next = pages.slice(0, -1);
                setPages(next);
                void loadHistory(next.at(-1) ?? null, true);
              }}
            >
              Previous page
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {pages.length}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={historyBusy || !historyCursor}
              onClick={() => {
                if (!historyCursor) return;
                setPages([...pages, historyCursor]);
                void loadHistory(historyCursor, true);
              }}
            >
              Next page
            </Button>
          </div>
        </section>
      ) : (
        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <PublicStatement
            revision={availability === "ready" ? revision : null}
            problemId={problemId}
            onAnswer={jump}
          />
          <aside
            id="answer-workspace"
            className="min-w-0 scroll-mt-4 space-y-5 xl:sticky xl:top-5"
          >
            <section className="space-y-5 rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-5 text-muted-foreground"
                />
                <h2
                  ref={partTitle}
                  tabIndex={-1}
                  className="text-lg font-semibold"
                >
                  Submit an answer
                </h2>
              </div>
              {availability === "ready" && revision && part && buffer ? (
                <>
                  <Field label="Choose part">
                    {(id) => (
                      <select
                        id={id}
                        className={inputClass}
                        value={part.id}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        {parts.map((p, i) => (
                          <option key={p.id} value={p.id}>
                            {i + 1}. {p.sectionTitle || "Section"} · Part{" "}
                            {p.label || i + 1}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                  <p className="break-words text-xs text-muted-foreground">
                    Pinned revision {revision.number} ·{" "}
                    <span className="font-mono">{short(revision.id)}</span>
                  </p>
                  {receipt && (
                    <div
                      ref={resultRef}
                      tabIndex={-1}
                      role="status"
                      className={`space-y-2 rounded-lg border p-4 ${feedback[receipt.attempt.status].color}`}
                    >
                      <h3 className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 aria-hidden="true" className="size-4" />
                        {feedback[receipt.attempt.status].label} · saved attempt{" "}
                        {receipt.attempt.attemptNumber}
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {feedback[receipt.attempt.status].text}
                      </p>
                      <p className="break-words text-xs">
                        {receipt.attempt.assisted ? "Assisted (server record)" : "Unassisted (server record)"} · Submitted answer: {answerText(receipt.attempt.answer)}
                      </p>
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (ready)
                        void session.submit(
                          revision.id,
                          part.id,
                          part.answerMode,
                        );
                    }}
                    className="space-y-4"
                  >
                    <fieldset
                      disabled={
                        Boolean(receipt) ||
                        pendingHere ||
                        state.busy ||
                        state.rawRecovery !== null
                      }
                      className="min-w-0 space-y-4"
                    >
                      <legend className="sr-only">
                        Answer for part {part.label}
                      </legend>
                      <AnswerFields
                        buffer={buffer}
                        onChange={(next) =>
                          session.edit(revision.id, part.id, next)
                        }
                      />
                    </fieldset>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Unfinished input is retained locally for this account and
                      revision. It is not a saved submission.
                    </p>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        !ready ||
                        state.busy ||
                        Boolean(pending) ||
                        Boolean(receipt) ||
                        state.rawRecovery !== null
                      }
                    >
                      {state.busy
                        ? "Saving…"
                        : receipt
                          ? "Attempt already saved"
                          : "Submit answer"}
                    </Button>
                  </form>
                  {receipt && (
                    <div className="border-t pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={state.busy || Boolean(pending) || !ready}
                        onClick={() =>
                          session.startAnother(revision.id, part.id)
                        }
                      >
                        Start another attempt
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Load the current publication to answer a part. Saved history
                  and original retry records remain separate.
                </p>
              )}
              {availability !== "ready" && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Current publication must be reloaded before a new submission.
                </p>
              )}
              {infoError && (
                <div role="alert" className="space-y-2 text-sm">
                  <p>{infoError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void refreshInfo()}
                  >
                    Recheck submission access
                  </Button>
                </div>
              )}
              {availability === "ready" && !info && !infoError && (
                <p role="status" className="text-sm text-muted-foreground">
                  Checking submission access…
                </p>
              )}
              {info && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {info.parts.find((p) => p.partId === part?.id)
                    ?.attemptsUsed ?? "0"}{" "}
                  saved attempts on this part/revision. No permanent per-part
                  cap. Up to {info.limits.attemptsPerDay} new attempts in a
                  rolling 24 hours, {info.limits.submissionsPerMinute}{" "}
                  submission requests and {info.limits.requestsPerMinute} total
                  requests per minute.
                </p>
              )}
              <p
                role="status"
                className="text-xs leading-relaxed text-muted-foreground"
              >
                {state.message}
              </p>
            </section>
            {availability === "ready" && revision && part && <WorkedSolution key={`${revision.id}:${part.id}`} problemId={problemId} revisionId={revision.id} partId={part.id} onStale={invalidate} onAuth={denyAuth} />}
            <section className="space-y-2 rounded-xl border bg-muted/20 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Clock3 aria-hidden="true" className="size-4" /> Practice, then
                reflect
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                A grade never reveals private answers or worked solutions.
                “Needs review” is not a verdict that your mathematics is wrong.
                You can keep practicing within the temporary request limits.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
function AnswerFields({
  buffer,
  onChange,
}: {
  buffer: AnswerBuffer;
  onChange: (b: AnswerBuffer) => void;
}) {
  if (buffer.kind === "numeric")
    return (
      <>
        <Field
          label="Numerical answer"
          help="A finite, representable decimal or scientific-notation number, for example -0.5 or 1.2e3. Numbers use binary64 precision. Nonzero underflow is rejected."
        >
          {(id) => (
            <input
              id={id}
              className={inputClass}
              value={buffer.value}
              maxLength={80}
              inputMode="decimal"
              autoComplete="off"
              onChange={(e) => onChange({ ...buffer, value: e.target.value })}
            />
          )}
        </Field>
        <Field label="Units" help={numericUnitsHelp}>
          {(id) => (
            <input
              id={id}
              className={inputClass}
              value={buffer.units}
              maxLength={80}
              autoComplete="off"
              onChange={(e) => onChange({ ...buffer, units: e.target.value })}
            />
          )}
        </Field>
      </>
    );
  if (buffer.kind === "expression")
    return (
      <>
        <Field
          label="Expression answer"
          help="Plain text, up to 180 characters. Use the variables and domain stated in the question."
        >
          {(id) => (
            <textarea
              id={id}
              className={`${inputClass} font-mono`}
              rows={3}
              value={buffer.expression}
              maxLength={180}
              spellCheck={false}
              onChange={(e) =>
                onChange({ ...buffer, expression: e.target.value })
              }
            />
          )}
        </Field>
        <details className="rounded-md border p-3 text-xs leading-relaxed">
          <summary className="min-h-11 cursor-pointer font-medium">
            Expression syntax and checker limits
          </summary>
          <p>
            Use explicit + - * / ^ and parentheses: x*x, x^2, (x+1)/2. Powers
            bind before unary minus; ^ is right-associative. Integer exponents
            are limited to -8…8. Decimals and fractions are exact rational
            constants.
          </p>
          <p className="mt-2">
            Write 3*x, not 3x. No units, equals signs, implicit multiplication,
            pi/e constants or arbitrary function calls. sqrt and abs have
            limited real-domain support. General trig/log identities and more
            complex expressions can need review, even when mathematically
            correct. No client-side equivalence check is performed.
          </p>
        </details>
      </>
    );
  return (
    <Field
      label="Manual answer"
      help="Up to 4000 characters. This answer is saved with an explicit ungraded outcome."
    >
      {(id) => (
        <textarea
          id={id}
          className={inputClass}
          rows={6}
          value={buffer.text}
          maxLength={4000}
          onChange={(e) => onChange({ ...buffer, text: e.target.value })}
        />
      )}
    </Field>
  );
}
