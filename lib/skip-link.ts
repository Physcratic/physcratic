/** Minimal shape of the DOM we touch, so the behaviour can be tested without a browser. */
export type SkipTarget = {
  hasAttribute(name: string): boolean;
  setAttribute(name: string, value: string): void;
  focus(options?: { preventScroll?: boolean }): void;
  scrollIntoView?(options?: { block?: "start" }): void;
};

/**
 * Move focus to the main region. The caller has already stopped the link's default action, so the
 * URL never gets a hash. Returns false when the region is missing so the link can do nothing at all.
 */
export function focusSkipTarget(target: SkipTarget | null): boolean {
  if (!target) return false;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus();
  target.scrollIntoView?.({ block: "start" });
  return true;
}
