import { content } from "@/lib/coaching/content";

/**
 * One line with one button, between sections. It scrolls to the picker in the hero, which opens the
 * Tally form through consultationHref with the chosen pathway and the source. No other new buttons.
 */
export function CoachingMidCta() {
  return <div className="flex items-center justify-center gap-6 pt-4">
    <span aria-hidden="true" className="hidden h-px flex-1 bg-border sm:block" />
    <a href="#hero-cta" className="coaching-button">{content.ui.consultationCta}</a>
    <span aria-hidden="true" className="hidden h-px flex-1 bg-border sm:block" />
  </div>;
}
