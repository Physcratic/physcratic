import { z } from "zod";
import { solutionSubmissionSchema, submissionLimits, type SolutionSubmission } from "./solution-grading";

const draftSchema = z.strictObject({
  partId: z.string().max(32),
  working: z.string().max(submissionLimits.maxText),
  finalAnswer: z.string().max(1000),
  transcription: z.string().max(submissionLimits.maxText),
});
export type SolutionDraft = z.infer<typeof draftSchema>;
export const solutionReceiptSchema = z.object({
  id: z.uuid(),
  check: z.object({ matched: z.boolean(), awardedPoints: z.number().finite().nonnegative(), maxPoints: z.number().finite().nonnegative() }).nullable(),
  ratingEvent: z.object({ rating: z.number().finite(), change: z.number().finite() }).nullable(),
});
const bookSchema = z.strictObject({ draft: draftSchema, pending: solutionSubmissionSchema.nullable(), receipt: solutionReceiptSchema.nullable() });
type Book = z.infer<typeof bookSchema>;
type RecoveryStorage = Pick<Storage, "getItem" | "setItem">;
const emptyDraft = (): SolutionDraft => ({ partId: "", working: "", finalAnswer: "", transcription: "" });
const maxRecoveryLength = 200_000;
export const solutionRecoveryKey = (account: string, problemId: string, version: string) =>
  `physcratic.solution.v1:${encodeURIComponent(account)}:${encodeURIComponent(problemId)}:${encodeURIComponent(version)}`;

/** Mutable text and immutable pending requests are separate. Files and storage URLs are never cached. */
export class SolutionRecovery {
  book: Book = { draft: emptyDraft(), pending: null, receipt: null };
  warning = "";
  private damaged = false;
  readonly key: string;
  constructor(readonly account: string, readonly problemId: string, readonly version: string, private storage?: RecoveryStorage) {
    this.key = solutionRecoveryKey(account, problemId, version);
    try {
      if (!storage) throw Error("unavailable");
      const raw = storage.getItem(this.key);
      if (!raw) return;
      if (raw.length > maxRecoveryLength) throw Error("capacity");
      const book = bookSchema.parse(JSON.parse(raw));
      if (book.pending && (book.pending.problemId !== problemId || book.pending.problemVersion !== version)) throw Error("selection");
      if (book.pending && book.receipt) throw Error("conflicting receipt");
      this.book = book;
    } catch {
      this.damaged = Boolean(storage);
      this.warning = "Tab recovery is unavailable. Keep this tab open and download your working before leaving.";
    }
  }
  private persist(book: Book): boolean {
    try {
      if (!this.storage || this.damaged) throw Error("unavailable");
      const raw = JSON.stringify(book);
      if (raw.length > maxRecoveryLength) throw Error("capacity");
      this.storage.setItem(this.key, raw);
      this.warning = "";
      return true;
    } catch {
      this.warning = "Tab recovery is unavailable. Keep this tab open and download your working before leaving.";
      return false;
    }
  }
  edit(draft: SolutionDraft) {
    if (this.book.pending) throw Error("Retry the pending save before editing this attempt.");
    this.book = { ...this.book, draft: draftSchema.parse(draft) };
    this.persist(this.book);
  }
  begin(input: Omit<SolutionSubmission, "idempotencyKey">, uuid: () => string = () => crypto.randomUUID()): SolutionSubmission {
    if (this.book.pending || this.book.receipt) throw Error("Finish the current attempt before starting another.");
    const parsed = solutionSubmissionSchema.safeParse({ ...input, idempotencyKey: uuid() });
    if (!parsed.success) throw Error(parsed.error.issues[0]?.message ?? "Check your submission.");
    const pending = parsed.data;
    if (pending.problemId !== this.problemId || pending.problemVersion !== this.version) throw Error("The problem version changed. Download your working before reloading.");
    if (new TextEncoder().encode(JSON.stringify(pending)).byteLength > 100_000) throw Error("This attempt is too large. Shorten the text before saving.");
    const next = { ...this.book, pending };
    // Do not send an intent which a reload would turn into a different submission.
    if (!this.persist(next)) throw Error("Could not preserve this save for retry. Download your working and keep this tab open.");
    this.book = next;
    return structuredClone(pending);
  }
  retry(): SolutionSubmission | null {
    return this.book.pending ? structuredClone(this.book.pending) : null;
  }
  accept(value: unknown) {
    if (!this.book.pending) throw Error("There is no pending attempt to confirm.");
    const parsed = solutionReceiptSchema.safeParse(value);
    if (!parsed.success) throw Error("The save response could not be confirmed. Retry the original save.");
    const receipt = parsed.data;
    const next = { ...this.book, pending: null, receipt };
    if (!this.persist(next)) throw Error("The server replied, but tab recovery could not be updated. Retry the original save to confirm it.");
    this.book = next;
    return receipt;
  }
  /** Only definitive pre-save rejection statuses may unlock editing. Ambiguous failures keep their original key. */
  reject(status: number): boolean {
    if (![400, 401, 403, 413, 415].includes(status) || !this.book.pending) return false;
    const next = { ...this.book, pending: null };
    if (!this.persist(next)) return false;
    this.book = next;
    return true;
  }
  startAnother(): boolean {
    if (this.book.pending || !this.book.receipt) return false;
    const next = { draft: emptyDraft(), pending: null, receipt: null };
    if (!this.persist(next)) return false;
    this.book = next;
    return true;
  }
  exportText(): string {
    const d = this.book.draft;
    return [`Problem: ${this.problemId}`, `Version: ${this.version}`, `Part: ${d.partId}`, "", d.working, "", "Final answer", d.finalAnswer, "", "Attachment transcription", d.transcription].join("\n");
  }
}
