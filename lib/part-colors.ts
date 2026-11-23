/**
 * The colours of the parts of a problem: part a is teal, b violet, c amber and d blue, then they repeat.
 * They are design tokens (app/globals.css), so both themes and their contrast come from one place, see lib/colour-tokens.test.ts.
 *
 * Colours are keyed by part position, not by label text, so labels such as "A.1", "A.2" and "B.1" work.
 * A sub-part takes its parent's colour: everything before the first dot is the parent ("A.1" -> "A").
 * The label text is always shown as well, so colour is never the only cue.
 */
export const partTokenNames = ["teal", "violet", "amber", "blue"] as const;
export type PartTokenName = (typeof partTokenNames)[number];
/** The class names are written out in full so Tailwind can see them. */
export const partTokenClasses: Record<PartTokenName, { tint: string; ink: string; fill: string; stripe: string }> = {
  teal: { tint: "bg-part-teal-tint", ink: "text-part-teal-ink", fill: "bg-part-teal text-part-teal-foreground", stripe: "border-part-teal" },
  violet: { tint: "bg-part-violet-tint", ink: "text-part-violet-ink", fill: "bg-part-violet text-part-violet-foreground", stripe: "border-part-violet" },
  amber: { tint: "bg-part-amber-tint", ink: "text-part-amber-ink", fill: "bg-part-amber text-part-amber-foreground", stripe: "border-part-amber" },
  blue: { tint: "bg-part-blue-tint", ink: "text-part-blue-ink", fill: "bg-part-blue text-part-blue-foreground", stripe: "border-part-blue" },
};
/** The colour token for a part by position, so the first part is teal. */
export function partToken(index: number): { name: PartTokenName } & (typeof partTokenClasses)[PartTokenName] {
  const name = partTokenNames[((index % partTokenNames.length) + partTokenNames.length) % partTokenNames.length];
  return { name, ...partTokenClasses[name] };
}

/** The parent of a label: "A.1" and "A.2" share "A". Empty labels have no parent. */
export function partParent(label: string): string {
  return label.trim().split(".")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Colour index for each part, in the order given. Parents are numbered in order of first appearance,
 * sub-parts reuse their parent's index, and the colours repeat after four parents.
 * A part with an empty label counts as its own parent.
 */
export function assignPartColors(labels: readonly string[]): number[] {
  const seen = new Map<string, number>();
  return labels.map((label, position) => {
    const parent = partParent(label) || `#${position}`;
    if (!seen.has(parent)) seen.set(parent, seen.size);
    return seen.get(parent)! % partTokenNames.length;
  });
}

/**
 * A part label as it is shown: one pair of brackets around the whole label is dropped, so "(a)" and "[b]" read "a" and "b".
 * Anything else is left alone, so "A.1" and "(i) and (ii)" keep their text. The chip says "Part" for screen readers.
 */
export function bareLabel(label: string): string {
  const match = /^\s*[(\[]\s*([^()\[\]]+?)\s*[)\]]\s*$/.exec(label);
  return match ? match[1] : label.trim();
}

/**
 * Colour index for every part of a problem, by part id. Colours restart in each section, so the first part
 * of every section is teal, and a part with no label is counted by its position. The statement, the answer
 * box, the hint and the solution of one part all look the index up here, so they always agree.
 */
export function colorsByPartId(sections: readonly { parts: readonly { id: string; label: string }[] }[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const section of sections) {
    const indices = assignPartColors(section.parts.map((part, position) => part.label.trim() || String(position + 1)));
    section.parts.forEach((part, position) => result.set(part.id, indices[position]));
  }
  return result;
}
