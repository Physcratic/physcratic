import { splitHighlight } from "@/lib/coaching/highlight";
import type { Medal } from "@/lib/coaching/medallists";

/** Renders `text` with one short phrase in the accent colour at weight 600. */
export function Highlighted({ text, phrase }: { text: string; phrase?: string }) {
  const parts = splitHighlight(text, phrase);
  if (!parts) return <>{text}</>;
  return <>{parts.before}<strong className="coaching-highlight">{parts.match}</strong>{parts.after}</>;
}

/** Medal chip: the Phase 2b medal dot plus a label. The first (best) chip on a card is one step larger. */
export function MedalChip({ medal, label, detail, best = false }: { medal: Medal; label: string; detail?: string; best?: boolean }) {
  // On a narrow card the chip may break once, between the medal and the contest, never mid-phrase.
  return <span className={`coaching-chip coaching-chip-${medal}${best ? " coaching-chip-best" : ""}`}>
    <span className={`coaching-medal coaching-medal-${medal}`} aria-hidden="true" />
    {detail ? <span><span className="whitespace-nowrap">{label} ·</span> <span className="whitespace-nowrap">{detail}</span></span> : <span>{label}</span>}
  </span>;
}
