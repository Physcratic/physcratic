/**
 * What a PDF drop on Problem Studio does. Pure, so the rules are tested without a browser.
 * One PDF is the statement. Two PDFs ask which one is the statement, and the other is the private solution PDF.
 * The size limit and the %PDF- check are the media route's own, so a file is refused before anything is created.
 */
import { authorMediaMaxBytes } from "./author-media";

export type DroppedFile = { name: string; type: string; size: number; /** The first five bytes, as text. */ head: string };
export type DropCheck = { ok: true; count: 1 | 2 } | { ok: false; message: string };

export const DROP_MESSAGES = {
  none: "Drop a PDF, or choose one.",
  tooMany: "Drop one or two PDFs.",
  wrongType: (name: string) => `${name} is not a PDF. Drop a PDF file.`,
  tooBig: (name: string) => `${name} is over 3 MiB. Drop a PDF up to 3 MiB.`,
  empty: (name: string) => `${name} is empty. Drop a PDF with pages in it.`,
  notPdf: (name: string) => `${name} does not open as a PDF. Save it as a PDF again and drop that file.`,
} as const;

const looksLikePdf = (f: Pick<DroppedFile, "name" | "type">) => f.type === "application/pdf" || (!f.type && /\.pdf$/i.test(f.name));

/** Checks a drop. The count comes first, so a drop of three files says how many to drop before it judges any one. */
export function checkPdfDrop(files: readonly DroppedFile[]): DropCheck {
  if (files.length === 0) return { ok: false, message: DROP_MESSAGES.none };
  if (files.length > 2) return { ok: false, message: DROP_MESSAGES.tooMany };
  for (const f of files) {
    if (!looksLikePdf(f)) return { ok: false, message: DROP_MESSAGES.wrongType(f.name) };
    if (f.size <= 0) return { ok: false, message: DROP_MESSAGES.empty(f.name) };
    if (f.size > authorMediaMaxBytes) return { ok: false, message: DROP_MESSAGES.tooBig(f.name) };
    if (f.head !== "%PDF-") return { ok: false, message: DROP_MESSAGES.notPdf(f.name) };
  }
  return { ok: true, count: files.length as 1 | 2 };
}

/** The purpose of each file once the statement is known. The other file is always the private solution PDF. */
export function assignPdfs<T>(files: readonly T[], statement: number): { file: T; purpose: "statement-pdf" | "solution-pdf" }[] {
  if (files.length === 1) return [{ file: files[0], purpose: "statement-pdf" }];
  if (files.length !== 2 || (statement !== 0 && statement !== 1)) throw new Error("A drop has one or two PDFs, and one of them is the statement.");
  return [
    { file: files[statement], purpose: "statement-pdf" },
    { file: files[1 - statement], purpose: "solution-pdf" },
  ];
}
