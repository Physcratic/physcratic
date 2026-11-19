// Pure helpers for the shared link-preview image. They carry no next/og import so unit tests can load them.

export const ogSize = { width: 1200, height: 630 } as const;

/** The longest title the preview shows. A longer one is cut at a word boundary. */
export const ogTitleLimit = 120;

/** Keeps a long title inside the 1200 by 630 image. Whitespace is collapsed and a cut title ends with three dots. */
export function clampOgTitle(title: string): string {
  const text = title.replace(/\s+/g, " ").trim();
  if (text.length <= ogTitleLimit) return text;
  const cut = text.slice(0, ogTitleLimit - 3);
  const space = cut.lastIndexOf(" ");
  return `${(space > ogTitleLimit / 2 ? cut.slice(0, space) : cut).replace(/[\s,.:;]+$/, "")}...`;
}

/** Font size in pixels for a title, so short titles stay large and long ones still fit in four lines. */
export function ogTitleFontSize(title: string): number {
  const length = title.length;
  if (length <= 36) return 76;
  if (length <= 60) return 64;
  if (length <= 90) return 54;
  return 46;
}
