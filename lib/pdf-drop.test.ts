import assert from "node:assert/strict";
import test from "node:test";
import { authorMediaMaxBytes } from "./author-media";
import { DROP_MESSAGES, assignPdfs, checkPdfDrop, type DroppedFile } from "./pdf-drop";

const pdf = (name = "statement.pdf", over: Partial<DroppedFile> = {}): DroppedFile => ({ name, type: "application/pdf", size: 1000, head: "%PDF-", ...over });

test("one PDF is the statement", () => {
  assert.deepEqual(checkPdfDrop([pdf()]), { ok: true, count: 1 });
  assert.deepEqual(assignPdfs(["a"], 0), [{ file: "a", purpose: "statement-pdf" }]);
});

test("two PDFs ask which one is the statement, and the other is the solution PDF", () => {
  assert.deepEqual(checkPdfDrop([pdf("a.pdf"), pdf("b.pdf")]), { ok: true, count: 2 });
  assert.deepEqual(assignPdfs(["a", "b"], 0), [{ file: "a", purpose: "statement-pdf" }, { file: "b", purpose: "solution-pdf" }]);
  assert.deepEqual(assignPdfs(["a", "b"], 1), [{ file: "b", purpose: "statement-pdf" }, { file: "a", purpose: "solution-pdf" }]);
  assert.throws(() => assignPdfs(["a", "b"], 2), "the statement must be one of the two");
});

test("more than two PDFs are refused with what to drop, before any file is judged", () => {
  assert.deepEqual(checkPdfDrop([pdf("a.pdf"), pdf("b.pdf"), pdf("c.pdf")]), { ok: false, message: DROP_MESSAGES.tooMany });
  assert.deepEqual(checkPdfDrop([pdf(), pdf(), { name: "x.png", type: "image/png", size: 5, head: "PNG" }]), { ok: false, message: DROP_MESSAGES.tooMany });
  assert.throws(() => assignPdfs(["a", "b", "c"], 0));
  assert.deepEqual(checkPdfDrop([]), { ok: false, message: DROP_MESSAGES.none });
});

test("a wrong file type is refused by name", () => {
  assert.deepEqual(checkPdfDrop([{ name: "notes.docx", type: "application/msword", size: 10, head: "PK\u0003\u0004\u0014" }]), { ok: false, message: "notes.docx is not a PDF. Drop a PDF file." });
  // A PDF a system gives no type to is judged by its name, then by its first bytes.
  assert.deepEqual(checkPdfDrop([pdf("scan.PDF", { type: "" })]), { ok: true, count: 1 });
  assert.deepEqual(checkPdfDrop([pdf("scan.txt", { type: "" })]), { ok: false, message: DROP_MESSAGES.wrongType("scan.txt") });
});

test("a file over 3 MiB, or an empty one, is refused before anything is made", () => {
  assert.deepEqual(checkPdfDrop([pdf("big.pdf", { size: authorMediaMaxBytes + 1 })]), { ok: false, message: "big.pdf is over 3 MiB. Drop a PDF up to 3 MiB." });
  assert.deepEqual(checkPdfDrop([pdf("edge.pdf", { size: authorMediaMaxBytes })]), { ok: true, count: 1 }, "exactly 3 MiB is allowed, as on the server");
  assert.deepEqual(checkPdfDrop([pdf("empty.pdf", { size: 0 })]), { ok: false, message: DROP_MESSAGES.empty("empty.pdf") });
  // The second file is judged too.
  assert.deepEqual(checkPdfDrop([pdf("a.pdf"), pdf("b.pdf", { size: authorMediaMaxBytes + 1 })]), { ok: false, message: DROP_MESSAGES.tooBig("b.pdf") });
});

test("a PDF with no %PDF- signature is refused with its own message", () => {
  assert.deepEqual(checkPdfDrop([pdf("renamed.pdf", { head: "GIF89" })]), { ok: false, message: "renamed.pdf does not open as a PDF. Save it as a PDF again and drop that file." });
  assert.deepEqual(checkPdfDrop([pdf("short.pdf", { head: "%PDF" })]), { ok: false, message: DROP_MESSAGES.notPdf("short.pdf") });
});

test("every message is plain copy: no em or en dash, no semicolon", () => {
  for (const m of [DROP_MESSAGES.none, DROP_MESSAGES.tooMany, DROP_MESSAGES.wrongType("a"), DROP_MESSAGES.tooBig("a"), DROP_MESSAGES.empty("a"), DROP_MESSAGES.notPdf("a")])
    assert.doesNotMatch(m, /[—–;]/, m);
});
