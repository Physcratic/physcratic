import { z } from "zod";
import {
  authoredRevisionSchema,
  publicAuthoredRevision,
} from "./problem-authoring";
import { authoredAnswerSchema } from "./authored-grading-contracts";
import {
  studentSubmissionSchema,
  studentGradeSchema,
  type AuthoredAttempt,
  type StudentSubmission,
} from "./authored-attempt-contracts";
export type PublicRevision = ReturnType<typeof publicAuthoredRevision>;
export type Viewer =
  | { state: "loading" | "error" | "guest" }
  | { state: "verified" | "unverified"; id: string };
export const solverBase = "/api/authored-problems";
const id = z.uuid();
const decimal = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine((n) => BigInt(n) <= BigInt("9223372036854775807"));
const attemptFields = z.strictObject({
  id,
  problemId: id,
  revisionId: id,
  partId: id,
  answer: authoredAnswerSchema,
  status: z.enum(["correct", "incorrect", "needs-review", "ungraded"]),
  reason: z.string().max(80),
  engineVersion: z.enum(["numeric-v1", "symbolic-v1"]),
  attemptNumber: decimal,
  createdAt: z.iso.datetime(),
  spoilerPolicy: z.literal("no-reveal-v1"),
  assisted: z.boolean(),
});
export const studentAttemptSchema = attemptFields.transform((a, ctx) => {
  const grade = studentGradeSchema.safeParse({
    status: a.status,
    reason: a.reason,
    engineVersion: a.engineVersion,
    selection: {
      problemId: a.problemId,
      revisionId: a.revisionId,
      partId: a.partId,
    },
  });
  if (!grade.success) {
    ctx.addIssue({ code: "custom", message: "Invalid attempt response" });
    return z.NEVER;
  }
  return {
    ...a,
    status: grade.data.status,
    reason: grade.data.reason,
  } as AuthoredAttempt;
});
export const studentHistorySchema = z.strictObject({
  attempts: z.array(studentAttemptSchema).max(50),
  nextCursor: z.string().max(256).nullable(),
});
export const symbolName = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,31}$/);
export const submissionInfoSchema = z.object({
  problemId: id,
  revisionId: id,
  parts: z
    .array(
      z.strictObject({
        partId: id,
        answerMode: z.enum(["numeric", "expression", "manual"]),
        /** Declared variable names of an expression part, in the order the author listed them. Names only. */
        symbols: z.array(symbolName).max(20).default([]),
        attemptsUsed: z.string().regex(/^\d{1,19}$/),
        attemptsRemaining: z.null(),
      }),
    )
    .max(1500),
  limits: z.object({
    requestsPerMinute: z.number().int().positive(),
    submissionsPerMinute: z.number().int().positive(),
    attemptsPerDay: z.number().int().positive(),
    attemptsPerPart: z.null(),
    spoilerPolicy: z.literal("no-reveal-v1"),
    reveal: z.literal("disabled"),
  }),
});
export class StudentRequestError extends Error {
  constructor(
    public status: number,
    public retryAfter = 0,
  ) {
    super(`Request failed (${status})`);
  }
}
export async function studentRequest(
  path: string,
  options: { body?: unknown; signal?: AbortSignal } = {},
) {
  const response = await fetch(path, {
    method: options.body ? "POST" : "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const seconds = Number(response.headers.get("retry-after"));
    throw new StudentRequestError(
      response.status,
      Number.isFinite(seconds) ? Math.min(3600, Math.max(0, seconds)) : 0,
    );
  }
  return response.json();
}
export function publicStudentRevision(
  value: unknown,
  problemId: string,
): PublicRevision {
  const safe = publicAuthoredRevision(value);
  authoredRevisionSchema.parse(safe);
  if (safe.problemId !== problemId) throw Error("Wrong problem response");
  return safe;
}
export function studentError(error: unknown) {
  const status = error instanceof StudentRequestError ? error.status : 0;
  return status === 401
    ? "Your session ended. Sign in again; your local work is retained."
    : status === 403
      ? "A verified email and a valid session are required. Recheck your account; your work is retained."
      : status === 404
        ? "This published problem or part is unavailable. Reload its publication before a new submission."
        : status === 408
          ? "The request timed out. Retry the original submission; its key and answer are retained."
          : status === 409
            ? "The revision changed or the submission key conflicts. Reload the current problem before starting again."
            : status === 429
              ? "A temporary request or rolling 24-hour limit was reached. Practice is not permanently capped. Wait before retrying the original submission."
              : status === 400 || status === 413
                ? "The server rejected this answer. Your local input is retained; review it before a new attempt."
                : "We could not confirm the save. The original answer and retry key are retained; retry that submission before starting another.";
}
export function studentReadError(error: unknown) {
  const status = error instanceof StudentRequestError ? error.status : 0;
  if ([401, 403, 404, 409].includes(status)) return studentError(error);
  if (status === 429)
    return "A temporary request limit was reached. Wait before retrying this read. Practice is not permanently capped.";
  if (status === 408)
    return "This read timed out. Retry loading the information; your local work is retained.";
  return "We could not load this information. Retry this read; your local work is retained.";
}
export type AnswerBuffer =
  | { kind: "numeric"; value: string; units: string }
  | { kind: "expression"; expression: string }
  | { kind: "manual"; text: string };
const bufferSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("numeric"),
    value: z.string().max(80),
    units: z.string().max(80),
  }),
  z.strictObject({
    kind: z.literal("expression"),
    expression: z.string().max(180),
  }),
  z.strictObject({ kind: z.literal("manual"), text: z.string().max(4000) }),
]);
export function emptyBuffer(kind: AnswerBuffer["kind"]): AnswerBuffer {
  return kind === "numeric"
    ? { kind, value: "", units: "" }
    : kind === "expression"
      ? { kind, expression: "" }
      : { kind, text: "" };
}
export function answerFromBuffer(buffer: AnswerBuffer) {
  if (buffer.kind !== "numeric") return authoredAnswerSchema.parse(buffer);
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(buffer.value.trim())
  )
    throw Error("Enter a finite decimal or scientific-notation number.");
  const raw = buffer.value.trim(),
    value = Number(raw);
  if (value === 0 && /[1-9]/.test(raw.split(/[eE]/)[0]))
    throw Error(
      "This nonzero value is too small to represent. Use a representable finite number.",
    );
  return authoredAnswerSchema.parse({
    kind: "numeric",
    value,
    units: buffer.units,
  });
}
export const formKey = (revisionId: string, partId: string) =>
  `${revisionId}:${partId}`;
const keySchema = z.string().regex(/^[0-9a-f-]{36}:[0-9a-f-]{36}$/);
const pendingSchema = z.strictObject({
  body: studentSubmissionSchema,
  source: bufferSchema,
  rejected: z.boolean().default(false),
});
const bookSchema = z
  .strictObject({
    version: z.literal(1),
    buffers: z.record(keySchema, bufferSchema),
    pending: pendingSchema.nullable(),
    receipts: z.record(
      keySchema,
      z.strictObject({ source: bufferSchema, attempt: studentAttemptSchema }),
    ),
  })
  .superRefine((b, ctx) => {
    if (
      Object.keys(b.buffers).length > 1500 ||
      Object.keys(b.receipts).length > 1500
    )
      ctx.addIssue({ code: "custom", message: "Recovery is too large" });
  });
type Book = z.infer<typeof bookSchema>;
export type SolverSnapshot = {
  book: Book;
  busy: boolean;
  message: string;
  error: string;
  storageWarning: string;
  recoveryNotice: string;
  rawRecovery: string | null;
  lastResult: AuthoredAttempt | null;
  lastStatus: number;
  retryAt: number;
};
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export class StudentSolverSession {
  private listeners = new Set<() => void>();
  private value: SolverSnapshot;
  private active = true;
  private controller?: AbortController;
  private generation = 0;
  constructor(
    readonly problemId: string,
    readonly userId: string,
    private storage: Storage | undefined,
    private send = (body: StudentSubmission, signal: AbortSignal) =>
      studentRequest(`${solverBase}/${problemId}/attempts`, { body, signal }),
    private uuid = () => crypto.randomUUID(),
  ) {
    let book: Book = { version: 1, buffers: {}, pending: null, receipts: {} },
      rawRecovery: string | null = null,
      storageWarning = "",
      recoveryNotice = "";
    try {
      const raw = storage?.getItem(this.storageKey);
      if (raw) {
        if (raw.length > 2_000_000) throw Error("Large recovery");
        const parsed = bookSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) throw Error("Invalid recovery");
        book = parsed.data;
        recoveryNotice =
          "Local work restored for this account. It is separate from saved submissions.";
        for (const receipt of Object.values(book.receipts))
          if (receipt.attempt.problemId !== problemId)
            throw Error("Wrong recovery problem");
      }
    } catch {
      try {
        rawRecovery = storage?.getItem(this.storageKey) ?? "";
      } catch {
        storageWarning =
          "Tab recovery is unavailable. Submitting is paused until your retry key can be stored safely.";
      }
    }
    if (rawRecovery !== null)
      book = { version: 1, buffers: {}, pending: null, receipts: {} };
    if (!storage)
      storageWarning =
        "Tab recovery is unavailable. Submitting is paused until your retry key can be stored safely.";
    this.value = {
      book,
      busy: false,
      message: "",
      error: "",
      storageWarning,
      recoveryNotice,
      rawRecovery,
      lastResult: null,
      lastStatus: 0,
      retryAt: 0,
    };
  }
  get storageKey() {
    return `physcratic:solve:v1:${this.userId}:${this.problemId}`;
  }
  snapshot = () => this.value;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<SolverSnapshot>) {
    this.value = { ...this.value, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private persist(book: Book) {
    if (this.value.rawRecovery !== null) {
      this.update({
        storageWarning:
          "Preserved recovery needs inspection before it can be replaced.",
      });
      return false;
    }
    try {
      if (!this.storage) throw Error();
      bookSchema.parse(book);
      const raw = JSON.stringify(book);
      if (raw.length > 2_000_000) throw Error("Recovery is too large");
      this.storage.setItem(this.storageKey, raw);
      this.update({ storageWarning: "" });
      return true;
    } catch {
      this.update({
        storageWarning:
          "Tab recovery could not be written. Download your local work. New sends are paused until the retry key can be stored safely.",
      });
      return false;
    }
  }
  activate() {
    this.active = true;
  }
  dispose() {
    this.active = false;
    this.generation++;
    this.controller?.abort();
    this.update({ busy: false });
  }
  buffer(revisionId: string, partId: string, kind: AnswerBuffer["kind"]) {
    const b = this.value.book.buffers[formKey(revisionId, partId)];
    return b?.kind === kind ? b : emptyBuffer(kind);
  }
  edit(revisionId: string, partId: string, buffer: AnswerBuffer) {
    const parsed = bufferSchema.parse(buffer),
      key = formKey(revisionId, partId),
      pending = this.value.book.pending;
    if (
      pending &&
      formKey(pending.body.revisionId, pending.body.partId) === key
    )
      return;
    const book = {
      ...this.value.book,
      buffers: { ...this.value.book.buffers, [key]: parsed },
    };
    this.persist(book);
    this.update({
      book,
      error: "",
      message: "",
    });
  }
  startAnother(revisionId: string, partId: string) {
    if (this.value.busy || this.value.book.pending) return;
    const key = formKey(revisionId, partId),
      receipts = { ...this.value.book.receipts };
    delete receipts[key];
    const book = { ...this.value.book, receipts };
    if (this.persist(book))
      this.update({
        book,
        lastResult: null,
        error: "",
        message: "New attempt ready. Review your input, then submit.",
      });
  }
  async submit(revisionId: string, partId: string, kind: AnswerBuffer["kind"]) {
    if (
      this.value.busy ||
      this.value.book.pending ||
      this.value.book.receipts[formKey(revisionId, partId)] ||
      this.value.rawRecovery !== null
    )
      return;
    try {
      const source = this.buffer(revisionId, partId, kind),
        body = studentSubmissionSchema.parse({
          revisionId,
          partId,
          answer: answerFromBuffer(source),
          idempotencyKey: this.uuid(),
        }),
        book = {
          ...this.value.book,
          pending: { body, source, rejected: false },
        };
      if (!this.persist(book)) return;
      this.update({ book, lastResult: null, error: "", lastStatus: 0 });
      await this.retry();
    } catch {
      this.update({
        error:
          "Check your answer: use a representable finite decimal number (nonzero values must not round to zero), at most 180 expression characters, or at most 4000 manual-answer characters.",
      });
    }
  }
  closeRejected() {
    const p = this.value.book.pending;
    if (this.value.busy || !p?.rejected) return;
    const book = { ...this.value.book, pending: null };
    if (this.persist(book))
      this.update({
        book,
        error: "",
        message:
          "Rejected submission closed. Local input remains tied to its original revision.",
      });
  }
  async retry() {
    const pending = this.value.book.pending;
    if (
      !pending ||
      this.value.busy ||
      pending.rejected ||
      Date.now() < this.value.retryAt
    )
      return;
    if (!this.persist(this.value.book)) return;
    const generation = ++this.generation;
    const controller = new AbortController();
    this.controller = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    this.update({
      busy: true,
      error: "",
      message: "Saving the original answer…",
      lastStatus: 0,
    });
    try {
      const value = z
          .strictObject({
            attempt: studentAttemptSchema,
            replayed: z.boolean(),
          })
          .parse(await this.send(pending.body, this.controller.signal)),
        a = value.attempt;
      if (!this.active || generation !== this.generation) return;
      if (
        a.problemId !== this.problemId ||
        a.revisionId !== pending.body.revisionId ||
        a.partId !== pending.body.partId ||
        JSON.stringify(a.answer) !== JSON.stringify(pending.body.answer)
      )
        throw Error("Wrong submission response");
      const key = formKey(a.revisionId, a.partId),
        book = {
          ...this.value.book,
          pending: null,
          receipts: {
            ...this.value.book.receipts,
            [key]: { source: pending.source, attempt: a },
          },
        };
      if (this.persist(book))
        this.update({
          book,
          lastResult: a,
          error: "",
          message: value.replayed
            ? "Original saved attempt recovered. No duplicate was created."
            : "Attempt saved. Your input is separate from this submitted record.",
          lastStatus: 200,
          retryAt: 0,
        });
      else
        this.update({
          lastResult: a,
          error:
            "Saved on the server, but tab recovery could not be updated. Retry the original key before starting another attempt.",
          message: "",
        });
    } catch (e) {
      if (!this.active || generation !== this.generation) return;
      const status = e instanceof StudentRequestError ? e.status : 0;
      const rejected = [400, 404, 409, 413].includes(status),
        book = rejected
          ? { ...this.value.book, pending: { ...pending, rejected: true } }
          : this.value.book;
      if (rejected) this.persist(book);
      this.update({
        book,
        error: studentError(e),
        message: "",
        lastStatus: status,
        retryAt:
          status === 429
            ? Date.now() + ((e as StudentRequestError).retryAfter || 60) * 1000
            : 0,
      });
    } finally {
      clearTimeout(timer);
      if (this.active && generation === this.generation)
        this.update({ busy: false });
    }
  }
}
