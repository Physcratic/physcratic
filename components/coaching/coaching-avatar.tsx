import { useId } from "react";

/**
 * Placeholder person, in the WhatsApp or Instagram style: a round head and a rounded torso with a
 * small gap and no neck, in the muted fill on a slightly lighter background. Decorative only.
 * `portrait` fills a 4:5 card frame, `round` is a small circle (the review).
 * `transparent` drops the background so a card's country flag shows behind the figure.
 */
export function CoachingAvatar({ variant, transparent = false, className }: { variant: "portrait" | "round"; transparent?: boolean; className?: string }) {
  const clip = useId();
  const figure = { fill: "hsl(var(--muted))" };
  const backdrop = { fill: "hsl(var(--muted-foreground) / .22)" };
  if (variant === "round") {
    return <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={className}>
      <clipPath id={clip}><circle cx="24" cy="24" r="24" /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect width="48" height="48" style={backdrop} />
        <g style={figure}>
          <circle cx="24" cy="18" r="8.5" />
          <path d="M8 50C8 37 15 30 24 30S40 37 40 50Z" />
        </g>
      </g>
    </svg>;
  }
  return <svg viewBox="0 0 720 900" aria-hidden="true" focusable="false" className={className}>
    {!transparent && <rect width="720" height="900" style={backdrop} />}
    <g style={figure}>
      <circle cx="360" cy="370" r="125" />
      <path d="M130 900V735C130 610 230 535 360 535S590 610 590 735V900Z" />
    </g>
  </svg>;
}
