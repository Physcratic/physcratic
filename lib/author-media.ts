import { z } from "zod";
import type { AuthoredDocument, PrivatePart } from "./problem-authoring";
export const authorMediaPurpose = z.enum([
  "statement-image",
  "solution-image",
  "statement-pdf",
  "solution-pdf",
]);
export type AuthorMediaPurpose = z.infer<typeof authorMediaPurpose>;
export type AuthorMediaInfo = {
  id: string;
  problemId: string;
  purpose: AuthorMediaPurpose;
  mediaType: string;
  filename: string;
  bytes: number;
  inDraft?: boolean;
  inHistory?: boolean;
};
export const authorMediaMaxBytes = 3 * 1024 * 1024;
export function authorMediaPath(
  problemId: string,
  mediaId: string,
  revisionId?: string,
) {
  return `/api/authored-problems/${encodeURIComponent(problemId)}/media/${encodeURIComponent(mediaId)}${revisionId ? `?revision=${encodeURIComponent(revisionId)}` : ""}`;
}
export function collectAuthorMedia(
  content: AuthoredDocument,
  privateParts: Pick<PrivatePart, "hints" | "solution">[],
) {
  const refs = new Map<string, AuthorMediaPurpose>();
  function add(id: string, purpose: AuthorMediaPurpose) {
    if (refs.has(id) && refs.get(id) !== purpose)
      throw new Error("A file cannot have multiple visibility purposes.");
    refs.set(id, purpose);
  }
  content.attachments.forEach((ref) => add(ref.id, ref.purpose));
  [
    ...content.context,
    ...content.sections.flatMap((s) => [
      ...s.blocks,
      ...s.parts.flatMap((p) => p.blocks),
    ]),
  ].forEach((b) => {
    if (b.kind === "image") add(b.mediaId, "statement-image");
  });
  privateParts
    .flatMap((p) => [...p.hints, ...p.solution])
    .forEach((b) => {
      if (b.kind === "image") add(b.mediaId, "solution-image");
    });
  return [...refs].map(([id, purpose]) => ({ id, purpose }));
}
// Only statement images enter the public document's attachment index. Private
// image IDs remain exclusively in private hint/solution rows.
export function normalizeStatementImages(content: AuthoredDocument) {
  const ids = new Set(
    [
      ...content.context,
      ...content.sections.flatMap((s) => [
        ...s.blocks,
        ...s.parts.flatMap((p) => p.blocks),
      ]),
    ]
      .filter((b) => b.kind === "image")
      .map((b) => b.mediaId),
  );
  content.attachments = [
    ...content.attachments.filter((a) => a.purpose !== "statement-image"),
    ...[...ids].map((id) => ({ id, purpose: "statement-image" as const })),
  ];
}
