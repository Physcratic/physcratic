/** Part labels as they are shown. Parts are told apart by their label and order, not by colour. */
/**
 * A part label as it is shown: one pair of brackets around the whole label is dropped, so "(a)" and "[b]" read "a" and "b".
 * Anything else is left alone, so "A.1" and "(i) and (ii)" keep their text. The chip says "Part" for screen readers.
 */
export function bareLabel(label: string): string {
  const match = /^\s*[(\[]\s*([^()\[\]]+?)\s*[)\]]\s*$/.exec(label);
  return match ? match[1] : label.trim();
}
