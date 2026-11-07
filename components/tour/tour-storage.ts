// Where a tour remembers things. Everything is in try/catch: private windows and blocked storage must never break a page.
import type { TourId } from "./tours";

const seenKey = (id: TourId) => `physcratic.tour.${id}.v1`;
const runningKey = "physcratic.tour.running";

export function hasSeen(id: TourId): boolean {
  try {
    return window.localStorage.getItem(seenKey(id)) === "seen";
  } catch {
    // If storage is blocked we cannot remember, so do not start by itself on every page.
    return true;
  }
}
export function markSeen(id: TourId): void {
  try {
    window.localStorage.setItem(seenKey(id), "seen");
  } catch {
    /* Ignore. */
  }
}
export function forgetSeen(ids: readonly TourId[]): void {
  for (const id of ids) {
    try {
      window.localStorage.removeItem(seenKey(id));
    } catch {
      /* Ignore. */
    }
  }
  clearRunning();
}
/** The tour that is part way through, so it carries across a page change. */
export function readRunning(): { id: TourId; step: number } | null {
  try {
    const raw = window.sessionStorage.getItem(runningKey);
    const match = raw ? /^(welcome|studio):(\d{1,3})$/.exec(raw) : null;
    return match ? { id: match[1] as TourId, step: Number(match[2]) } : null;
  } catch {
    return null;
  }
}
export function writeRunning(id: TourId, step: number): void {
  try {
    window.sessionStorage.setItem(runningKey, `${id}:${step}`);
  } catch {
    /* Ignore. */
  }
}
export function clearRunning(): void {
  try {
    window.sessionStorage.removeItem(runningKey);
  } catch {
    /* Ignore. */
  }
}

export const TOUR_EVENT = "physcratic:tour";
/** Starts a tour from the beginning, from anywhere on the page. */
export function startTour(id: TourId): void {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: { id } }));
}
