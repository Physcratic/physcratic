// Where the phone keyboard is. The pad docks above it only when this can be read for certain. Otherwise it stays inline
// under the field, so it can never cover the field being typed in.

/** Smallest gap between the layout and visual viewport that counts as an open keyboard. */
export const MIN_KEYBOARD = 100;

type Viewport = { height: number; offsetTop: number } | null | undefined;

/** Pixels between the bottom of the layout viewport and the top of the keyboard, or null when it cannot be read or no keyboard is open. */
export function keyboardInset(viewport: Viewport, innerHeight: number): number | null {
  if (!viewport || ![viewport.height, viewport.offsetTop, innerHeight].every((n) => Number.isFinite(n)) || viewport.height <= 0 || innerHeight <= 0) return null;
  const inset = innerHeight - viewport.offsetTop - viewport.height;
  return inset >= MIN_KEYBOARD ? Math.round(inset) : null;
}

/**
 * How far to scroll the page so the field's bottom edge sits above the docked pad, or null when it cannot fit: the field is
 * taller than the space left, or its top would leave the screen. Then the pad goes back under the field.
 */
export function scrollToClearPad(field: { top: number; bottom: number }, viewport: { height: number; offsetTop: number }, padHeight: number, margin = 8): number | null {
  const limit = viewport.offsetTop + viewport.height - padHeight - margin;
  const shift = Math.ceil(Math.max(0, field.bottom - limit));
  if (field.top - shift < viewport.offsetTop + 4) return null;
  return shift;
}
