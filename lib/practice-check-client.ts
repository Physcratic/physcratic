import { z } from "zod";
import { practiceCheckPolicy, practiceCheckInputSchema, practiceCheckRequestSchema, practiceCheckReceiptSchema, type PracticeCheckRequest } from "./practice-check-contracts";
import type { ArchiveGradeRequest } from "./archive-grading-contracts";

const maxRecoveryLength = 2_000_000;
const bookSchema = z.strictObject({
  answers: z.record(z.string().max(100), z.string()),
  pending: practiceCheckRequestSchema.nullable(),
});
type Book = z.infer<typeof bookSchema>;
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export const practiceRecoveryKey = (account: string, problemId: string, version: string) =>
  `physcratic.practice.v1:${encodeURIComponent(account)}:${problemId}:${version}`;

/** The journal owns the retry snapshot, independently of the editable answer fields. */
export class PracticeCheckJournal {
  book: Book = { answers: {}, pending: null };
  warning = "";
  private damaged = false;
  readonly key: string;
  constructor(readonly account: string, readonly problemId: string, readonly version: string, private storage?: Storage) {
    this.key = practiceRecoveryKey(account, problemId, version);
    try {
      const raw = storage?.getItem(this.key);
      if (!raw) return;
      if (raw.length > maxRecoveryLength) throw Error("oversized");
      const book = bookSchema.parse(JSON.parse(raw));
      if (book.pending && (book.pending.problemId !== problemId || book.pending.version !== version)) throw Error("selection");
      this.book = book;
    } catch {
      this.damaged = true;
      this.warning = "Saved recovery could not be read. It has been left untouched. Keep this tab open and copy your answers before leaving.";
    }
  }
  private persist(book: Book): boolean {
    try {
      if (this.damaged || !this.storage) throw Error("unavailable");
      const raw = JSON.stringify(book);
      if (raw.length > maxRecoveryLength) throw Error("capacity");
      this.storage.setItem(this.key, raw);
      this.warning = "";
      return true;
    } catch {
      this.warning = "Recovery is unavailable. Keep this tab open and copy your answers before leaving. Checks can continue without saving.";
      return false;
    }
  }
  edit(answers: Record<string, string>) {
    this.book = { ...this.book, answers: { ...answers } };
    this.persist(this.book);
  }
  begin(input: ArchiveGradeRequest, uuid = () => crypto.randomUUID()): PracticeCheckRequest | null {
    if (this.book.pending) throw Error("Retry the pending save before starting another saved check.");
    const parsed = practiceCheckInputSchema.safeParse(input);
    if (!parsed.success || parsed.data.problemId !== this.problemId || parsed.data.version !== this.version) throw Error("Enter a supported answer within the input limit before saving.");
    // The UUID property adds exactly 56 ASCII bytes to this strict JSON object.
    if (new TextEncoder().encode(JSON.stringify(parsed.data)).byteLength + 56 > practiceCheckPolicy.maxBodyBytes) throw Error("This check is too large to save. Keep your answers and check fewer parts at once.");
    const request = practiceCheckRequestSchema.parse({ ...parsed.data, idempotencyKey: uuid() });
    const next = { ...this.book, pending: request };
    // Never POST a retry intent which was not durably journalled first.
    if (!this.persist(next)) return null;
    this.book = next;
    return structuredClone(request);
  }
  retry(): PracticeCheckRequest | null {
    return this.book.pending ? structuredClone(this.book.pending) : null;
  }
  accept(value: unknown) {
    const receipt = practiceCheckReceiptSchema.parse(value);
    const pending = this.book.pending;
    if (!pending) throw Error("There is no pending check to confirm.");
    const { problemId, version, answers } = receipt.attempt;
    const confirmed = practiceCheckRequestSchema.parse({ problemId, version, answers, idempotencyKey: pending.idempotencyKey });
    if (JSON.stringify(confirmed) !== JSON.stringify(pending)) throw Error("The save response did not match the pending answer. Retry the original check.");
    const next = { ...this.book, pending: null };
    if (this.persist(next)) this.book = next;
    return receipt;
  }
}

export function practiceSessionStorage(): Storage | undefined {
  try { return typeof window === "undefined" ? undefined : window.sessionStorage; } catch { return undefined; }
}
