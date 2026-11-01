"use client";

import Image from "next/image";
import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
import { countryFlagCodes, medallists, medallistStats, medalLabel, type Medallist } from "@/lib/coaching/medallists";
import abhikaPortrait from "@/public/coaching/medallists/abhika-atmaja-cutout.webp";

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function getPrefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CoachingTutorCard({ tutor, priority = false, eager = false, countryBackdrop = false, focusable = true }: { tutor: Medallist; priority?: boolean; eager?: boolean; countryBackdrop?: boolean; focusable?: boolean }) {
  const extension = ["angel", "kanishk", "ermuun-battulga", "reuben-felix"].includes(tutor.slug) ? "png" : "webp";
  const hasPortrait = !["nima", "yota"].includes(tutor.slug);
  const flagCode = countryFlagCodes[tutor.country];
  const cutout = tutor.slug === "abhika-atmaja" ? abhikaPortrait : `/coaching/medallists/${tutor.slug}-cutout.webp`;
  return <article className="coaching-portrait" data-country-backdrop={countryBackdrop || undefined} tabIndex={countryBackdrop && focusable ? 0 : undefined}>
    <div className={countryBackdrop ? "coaching-portrait-artwork" : undefined}>
      {countryBackdrop && flagCode && <Image src={`/coaching/flags/${flagCode}.png`} alt="" aria-hidden="true" fill sizes="(min-width: 640px) 288px, 256px" className="coaching-country-flag" />}
      {hasPortrait ? <Image src={countryBackdrop ? cutout : `/coaching/medallists/${tutor.slug}.${extension}`} alt={`${tutor.name}, physics tutor from ${tutor.country}`} width={720} height={900} sizes="(min-width: 640px) 288px, 256px" priority={priority} loading={priority ? undefined : eager ? "eager" : "lazy"} className="coaching-portrait-image" /> : <div className="coaching-portrait-image flex items-center justify-center font-serif text-7xl" aria-hidden="true">{tutor.name.charAt(0)}</div>}
    </div>
    <div className="coaching-portrait-copy">
      <p className="text-sm uppercase tracking-widest opacity-80">{tutor.country}</p>
      <h3 className="font-serif text-lg uppercase leading-tight text-balance sm:text-xl">{tutor.name}</h3>
      <p className="text-sm font-bold">{medalLabel[tutor.achievements[0].medal]} · {tutor.achievements[0].contest} {tutor.achievements[0].year}</p>
      {tutor.achievements.length > 1 && <p className="text-sm leading-snug opacity-80">{tutor.achievements.slice(1).map((achievement) => `${medalLabel[achievement.medal]} ${achievement.contest} ${achievement.year}`).join(" · ")}</p>}
    </div>
  </article>;
}

export function CoachingTutorSlideshow() {
  const [paused, setPaused] = useState(false);
  return <div className="coaching-hero-slideshow relative min-w-0">
    <div className="coaching-marquee" role="group" aria-label="Featured Physcratic tutors" data-paused={paused}>
      {[0, 1].map((column) => <ul key={column} className="coaching-marquee-column" style={{ "--marquee-duration": column ? "300s" : "260s", "--marquee-direction": column ? "reverse" : "normal" } as CSSProperties}>
        {[0, 1].map((copy) => medallists.filter((_, index) => index % 2 === column).map((tutor, index) => <li key={`${copy}-${tutor.slug}`} aria-hidden={copy === 1 ? true : undefined} className="pb-3 lg:pb-4"><CoachingTutorCard tutor={tutor} priority={!copy && !index} eager /></li>))}
      </ul>)}
    </div>
    <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "Play tutor slideshow" : "Pause tutor slideshow"} className="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full bg-background/80 text-foreground">
      {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
    </button>
  </div>;
}

export function CoachingTutors() {
  const prefersReducedMotion = useSyncExternalStore(subscribeToMotionPreference, getPrefersReducedMotion, () => false);
  const [pausedOverride, setPausedOverride] = useState<boolean | null>(null);
  const paused = pausedOverride ?? prefersReducedMotion;
  return <section id="tutors" className="py-20">
    <div className="coaching-container flex min-w-0 flex-col gap-8">
      <div className="flex w-full max-w-2xl flex-col items-center gap-4 self-center text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Meet Our Tutors</h2>
        <p className="max-w-xl leading-relaxed text-muted-foreground">Every tutor has medalled at national, Asian, or international level. We match each student to the tutor whose strengths fit their syllabus and goals.</p>
        <dl className="flex flex-wrap justify-center gap-10">
          <div><dt className="text-sm text-muted-foreground">Tutors</dt><dd className="text-2xl font-semibold">{medallistStats.count}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Countries represented</dt><dd className="text-2xl font-semibold">{medallistStats.countries}</dd></div>
        </dl>
        <button type="button" aria-controls="coaching-tutor-gallery" aria-pressed={paused} onClick={() => setPausedOverride(!paused)} className="coaching-gallery-toggle inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          {paused ? "Play tutor slider" : "Pause tutor slider"}
        </button>
      </div>
      <div id="coaching-tutor-gallery" className="coaching-gallery-viewport" data-paused={paused} data-motion-enabled={pausedOverride !== null} role="region" aria-label="Tutor slideshow; hover to pause, or use Tab to browse" tabIndex={0} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.scrollLeft = 0; }}>
        <div className="coaching-gallery-track">
          {[0, 1].map((copy) => <ul key={copy} className="coaching-gallery" aria-label={copy === 0 ? "Physcratic tutors" : undefined} aria-hidden={copy === 1 ? true : undefined}>
            {medallists.map((tutor) => <li key={tutor.slug}><CoachingTutorCard tutor={tutor} countryBackdrop focusable={copy === 0} /></li>)}
          </ul>)}
        </div>
      </div>
    </div>
  </section>;
}
