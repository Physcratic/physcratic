/**
 * Scroll maths for the coach gallery. The list is rendered twice side by side, so `half` is the
 * width of one copy and the cards of copy two sit exactly `half` further right. `half = 0` means
 * there is no second copy (reduced motion), and the ends wrap round instead.
 */

/** Keep the auto-scroll position inside the first copy. */
export function wrapLoop(left: number, half: number) {
  if (half <= 0) return left;
  return left >= half ? left - half : left;
}

/**
 * Where an arrow press should go: one card from the card nearest to `left`. `jumpFrom` is an
 * instant reposition into the other copy (same picture) that has to happen first.
 */
export function stepTarget(left: number, step: number, dir: 1 | -1, half: number, max: number): { jumpFrom?: number; target: number } {
  if (step <= 0) return { target: left };
  if (half > 0) {
    let from = left;
    if (dir < 0 && left < step / 2) from = left + half;
    if (dir > 0 && left >= half) from = left - half;
    const target = Math.min(Math.max((Math.round(from / step) + dir) * step, 0), max);
    return from === left ? { target } : { jumpFrom: from, target };
  }
  if (dir > 0 && left >= max - 1) return { target: 0 };
  if (dir < 0 && left <= 1) return { target: max };
  return { target: Math.min(Math.max((Math.round(left / step) + dir) * step, 0), max) };
}
