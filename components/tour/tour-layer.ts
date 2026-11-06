// Layers for the tour ring. Header z-40, menus, sheets and dialogs z-50, the tour card z-61. The ring sits under the
// header so it never covers it, unless the step points at something in the header. Then it rises just above the header,
// still under menus and dialogs, for that step only.
export const HEADER_LAYER = 40;
export const MENU_LAYER = 50;
export const RING_PAGE_LAYER = 25;
export const RING_HEADER_LAYER = 45;
export const CARD_LAYER = 61;

type Targetable = { closest(selector: string): unknown; dataset?: { tour?: string } };

/** The mobile menu button is fixed at the top and belongs to the header even though it is not inside it. */
export function isInHeader(target: Targetable): boolean {
  return !!target.closest("header") || target.dataset?.tour === "nav-open";
}

export function ringLayer(target: Targetable): number {
  return isInHeader(target) ? RING_HEADER_LAYER : RING_PAGE_LAYER;
}
