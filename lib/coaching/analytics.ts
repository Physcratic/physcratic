import { track } from "@vercel/analytics";

/**
 * Conversion events for the coaching page, sent with Vercel Analytics custom events.
 *   coaching_consultation_click  { pathway }   the consultation button (hero or /coaching/consultation)
 *   coaching_tutor_click                       the button on /coaching/become-a-tutor
 * `track` does nothing when analytics is not loaded, and any error is swallowed so a click never fails.
 * No personal data is sent: only the pathway the visitor chose.
 */
export type Tracker = (name: string, properties?: Record<string, string>) => void;

export const CONSULTATION_CLICK_EVENT = "coaching_consultation_click";
export const TUTOR_CLICK_EVENT = "coaching_tutor_click";

export function trackConsultationClick(pathway: string, send: Tracker = track) {
  try {
    send(CONSULTATION_CLICK_EVENT, { pathway });
  } catch {
    // Analytics must never break the link.
  }
}

export function trackTutorClick(send: Tracker = track) {
  try {
    send(TUTOR_CLICK_EVENT);
  } catch {
    // Analytics must never break the link.
  }
}
