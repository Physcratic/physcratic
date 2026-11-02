import type { Block, ArticleDraft } from "./types";

export const WORDS_PER_MINUTE = 220;

/** Keys whose string values are data, not reader-facing copy. */
const NON_COPY_KEYS = new Set([
  "slug",
  "url",
  "id",
  "problemId",
  "cite",
  "updated",
  "accessed",
]);

/** Every reader-facing string in a value, depth first. Skips ids, URLs and dates. */
export function visibleStrings(value: unknown, key?: string): string[] {
  if (key && NON_COPY_KEYS.has(key)) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => visibleStrings(v, key));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => visibleStrings(v, k));
  }
  return [];
}

/** Text a reader reads in the body. Maths is excluded. */
export function bodyText(body: Block[]): string[] {
  return body.flatMap((block) => {
    switch (block.type) {
      case "heading":
        return [block.text];
      case "paragraph":
        return [block.text];
      case "list":
        return block.items;
      case "callout":
        return [block.title ?? "", block.text];
      case "problemLink":
        return [block.label, block.note ?? ""];
      case "guideLink":
        return [block.label, block.note ?? ""];
      case "math":
        return [block.caption ?? ""];
      case "table":
        return [
          block.caption,
          ...block.head,
          ...block.rows.flatMap((r) => [r.header, ...r.cells.map((c) => c.text)]),
        ];
    }
  });
}

export function wordCount(body: Block[]): number {
  return bodyText(body)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function readingMinutes(body: Block[]): number {
  return Math.max(1, Math.ceil(wordCount(body) / WORDS_PER_MINUTE));
}

export function withReadingMinutes(draft: ArticleDraft) {
  return { ...draft, readingMinutes: readingMinutes(draft.body) };
}

/** Anchor id for a heading. Used by the page and by guide-to-guide links. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
