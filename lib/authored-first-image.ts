// The first image block of a published revision's public content, in reading order. The library query in
// lib/authored-library-api.ts chooses with the same order in SQL, and a test runs both on the same documents.
// Order: the context blocks, then for each section its own blocks, then each of its parts' blocks. The first block
// whose kind is "image" is the one, whether or not it can be shown: a later image never stands in for it.
type Loose = { [key: string]: unknown };
const isObject = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export function firstImageBlock(content: unknown): { mediaId: unknown; alt: unknown } | null {
  if (!isObject(content)) return null;
  const blocks = function* () {
    yield* list(content.context);
    for (const section of list(content.sections)) {
      if (!isObject(section)) continue;
      yield* list(section.blocks);
      for (const part of list(section.parts)) if (isObject(part)) yield* list(part.blocks);
    }
  };
  for (const block of blocks()) if (isObject(block) && block.kind === "image") return { mediaId: block.mediaId, alt: block.alt };
  return null;
}
