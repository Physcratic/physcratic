/**
 * One fixed palette of six accessible hues for the parts of a problem.
 *
 * Colours are keyed by part position, not by label text, so labels such as "A.1", "A.2" and "B.1" work.
 * A sub-part takes its parent's colour: everything before the first dot is the parent ("A.1" -> "A").
 * The label text is always shown as well, so colour is never the only cue.
 *
 * Values are measured, see lib/part-colors.test.ts:
 * - chip text on the chip background is at least 4.5:1 in both themes,
 * - the 4px left border is at least 3:1 against the card and the page background in both themes.
 */
export type PartTheme = { border: string; chipBackground: string; chipText: string };
export type PartColor = { name: string; light: PartTheme; dark: PartTheme };

export const partPalette: readonly PartColor[] = [
  { name: "blue", light: { border: "#1d4ed8", chipBackground: "#dbeafe", chipText: "#1e3a8a" }, dark: { border: "#60a5fa", chipBackground: "#1e3a8a", chipText: "#dbeafe" } },
  { name: "violet", light: { border: "#6d28d9", chipBackground: "#ede9fe", chipText: "#4c1d95" }, dark: { border: "#a78bfa", chipBackground: "#4c1d95", chipText: "#ede9fe" } },
  { name: "teal", light: { border: "#0f766e", chipBackground: "#ccfbf1", chipText: "#134e4a" }, dark: { border: "#2dd4bf", chipBackground: "#134e4a", chipText: "#ccfbf1" } },
  { name: "amber", light: { border: "#b45309", chipBackground: "#fef3c7", chipText: "#78350f" }, dark: { border: "#fbbf24", chipBackground: "#78350f", chipText: "#fef3c7" } },
  { name: "rose", light: { border: "#be123c", chipBackground: "#ffe4e6", chipText: "#881337" }, dark: { border: "#fb7185", chipBackground: "#881337", chipText: "#ffe4e6" } },
  { name: "green", light: { border: "#15803d", chipBackground: "#dcfce7", chipText: "#14532d" }, dark: { border: "#4ade80", chipBackground: "#14532d", chipText: "#dcfce7" } },
];

/** The parent of a label: "A.1" and "A.2" share "A". Empty labels have no parent. */
export function partParent(label: string): string {
  return label.trim().split(".")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Palette index for each part, in the order given. Parents are numbered in order of first appearance,
 * sub-parts reuse their parent's index, and the palette repeats after six parents.
 * A part with an empty label counts as its own parent.
 */
export function assignPartColors(labels: readonly string[]): number[] {
  const seen = new Map<string, number>();
  return labels.map((label, position) => {
    const parent = partParent(label) || `#${position}`;
    if (!seen.has(parent)) seen.set(parent, seen.size);
    return seen.get(parent)! % partPalette.length;
  });
}

export function partColor(index: number): PartColor {
  return partPalette[((index % partPalette.length) + partPalette.length) % partPalette.length];
}

function channel(value: number) {
  const unit = value / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => channel(Number.parseInt(hex.slice(start, start + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** WCAG contrast ratio between two #rrggbb colours. */
export function contrastRatio(first: string, second: string): number {
  const [high, low] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}
