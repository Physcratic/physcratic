import { z } from "zod";

// The first image of a published community problem, for its card. Data only: the thumbnail route does not exist yet
// (C3b), so `src` is the address it will have. No file is read here. Dimensions are not stored for community images,
// so every card image is the same fixed 4:3 display box, which is a ratio and not the size of the file.
export const authoredCardImageAltMax = 140;
export const authoredCardImageBox = { width: 640, height: 480 } as const;

export const authoredCardImageSrc = (problemId: string, revisionId: string) => `/api/authored-problems/${problemId}/card-image/${revisionId}`;

export const authoredCardImageSchema = z.strictObject({
  src: z.string().regex(/^\/api\/authored-problems\/[0-9a-f-]{36}\/card-image\/[0-9a-f-]{36}$/),
  alt: z.string().min(1).max(authoredCardImageAltMax),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type AuthoredCardImage = z.infer<typeof authoredCardImageSchema>;

/** The block's alt text, trimmed and cut to 140 characters (whole characters, not half of an emoji). Empty when there is none. */
export function clampCardAlt(alt: unknown): string {
  return typeof alt === "string" ? [...alt.trim()].slice(0, authoredCardImageAltMax).join("").trimEnd() : "";
}

/** The card image, or undefined when the alt text is empty: an image without a description is not shown. */
export function authoredCardImage(problemId: string, revisionId: string, alt: unknown): AuthoredCardImage | undefined {
  const text = clampCardAlt(alt);
  return text ? { src: authoredCardImageSrc(problemId, revisionId), alt: text, ...authoredCardImageBox } : undefined;
}
