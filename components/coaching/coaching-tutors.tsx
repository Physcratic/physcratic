"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
import { countryFlagCodes, medallists, medalLabel, type Medallist } from "@/lib/coaching/medallists";
import { coachAnchorId, coachImageAlt, content } from "@/lib/coaching/content";
import abhikaPortrait from "@/public/coaching/medallists/abhika-atmaja-cutout.webp";

const { hero, coaches } = content;

function CoachingSilhouette({ backdrop }: { backdrop: boolean }) {
  return <svg viewBox="0 0 720 900" aria-hidden="true" focusable="false" className="coaching-portrait-image">
    {!backdrop && <rect width="720" height="900" style={{ fill: "hsl(var(--card))" }} />}
    <g style={{ fill: "hsl(var(--muted))" }}>
      <circle cx="360" cy="400" r="105" />
      <rect x="318" y="480" width="84" height="130" />
      <path d="M100 900C100 720 200 600 360 600S620 720 620 900Z" />
    </g>
  </svg>;
}

export function CoachingTutorCard({ tutor, priority = false, eager = false, countryBackdrop = false, focusable = true, anchor = false, asHeading = true }: { tutor: Medallist; priority?: boolean; eager?: boolean; countryBackdrop?: boolean; focusable?: boolean; anchor?: boolean; asHeading?: boolean }) {
  const Name = asHeading ? "h3" : "p";
  const flagCode = countryFlagCodes[tutor.country];
  const photo = tutor.photo ?? "webp";
  const cutout = tutor.slug === "abhika-atmaja" ? abhikaPortrait : `/coaching/medallists/${tutor.slug}-cutout.webp`;
  return <article id={anchor ? coachAnchorId(tutor.slug) : undefined} className="coaching-portrait" data-country-backdrop={countryBackdrop || undefined} tabIndex={countryBackdrop && focusable ? 0 : undefined}>
    <div className={countryBackdrop ? "coaching-portrait-artwork" : undefined}>
      {countryBackdrop && flagCode && <Image src={`/coaching/flags/${flagCode}.png`} alt="" aria-hidden="true" fill sizes="(min-width: 640px) 288px, 256px" className="coaching-country-flag" />}
      {photo === false ? <CoachingSilhouette backdrop={countryBackdrop} /> : <Image src={countryBackdrop ? cutout : `/coaching/medallists/${tutor.slug}.${photo}`} alt={coachImageAlt(tutor.name, tutor.country)} width={720} height={900} sizes="(min-width: 640px) 288px, 256px" priority={priority} loading={priority ? undefined : eager ? "eager" : "lazy"} className="coaching-portrait-image" />}
    </div>
    <div className="coaching-portrait-copy">
      <p className="text-sm uppercase tracking-widest opacity-80">{tutor.country}</p>
      <Name className="font-serif text-lg uppercase leading-tight text-balance sm:text-xl">{tutor.name}</Name>
      <p className="text-sm font-bold">{medalLabel[tutor.achievements[0].medal]} · {tutor.achievements[0].contest} {tutor.achievements[0].year}</p>
      {tutor.achievements.length > 1 && <p className="text-sm leading-snug opacity-80">{tutor.achievements.slice(1).map((achievement) => `${medalLabel[achievement.medal]} ${achievement.contest} ${achievement.year}`).join(" · ")}</p>}
    </div>
  </article>;
}

export function CoachingTutorSlideshow() {
  const [paused, setPaused] = useState(false);
  return <div className="coaching-hero-slideshow relative min-w-0">
    <div className="coaching-marquee" role="group" aria-label={hero.slideshowLabel} data-paused={paused}>
      {[0, 1].map((column) => <ul key={column} className="coaching-marquee-column" style={{ "--marquee-duration": column ? "300s" : "260s", "--marquee-direction": column ? "reverse" : "normal" } as CSSProperties}>
        {[0, 1].map((copy) => medallists.filter((_, index) => index % 2 === column).map((tutor, index) => <li key={`${copy}-${tutor.slug}`} aria-hidden={copy === 1 ? true : undefined} className="pb-3 lg:pb-4"><CoachingTutorCard tutor={tutor} priority={!copy && !index} eager asHeading={false} /></li>))}
      </ul>)}
    </div>
    <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? hero.slideshowPlay : hero.slideshowPause} className="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full bg-background/80 text-foreground">
      {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
    </button>
  </div>;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CoachingTutors() {
  const [paused, setPaused] = useState(false);

  // Links such as #coach-arrow-kristian: the gallery is a moving, clipped track, so bring the card
  // to the front by focusing it (focus stops the animation and unlocks scrolling), then scroll to it.
  // Leaving the card blurs the viewport, which scrolls it back and lets the gallery run again.
  useEffect(() => {
    const jump = (hash: string) => {
      if (!hash.startsWith(`#${coachAnchorId("")}`)) return false;
      const card = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!card) return false;
      card.focus({ preventScroll: true });
      requestAnimationFrame(() => card.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center", inline: "center" }));
      return true;
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href^='#coach-']");
      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      const hash = link.getAttribute("href") ?? "";
      if (jump(hash)) {
        event.preventDefault();
        history.pushState(null, "", hash);
      }
    };
    const onHashChange = () => { jump(window.location.hash); };
    document.addEventListener("click", onClick);
    window.addEventListener("hashchange", onHashChange);
    if (window.location.hash) jump(window.location.hash);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return <section id="tutors" className="py-20">
    <div className="coaching-container flex min-w-0 flex-col gap-8">
      <div className="flex w-full max-w-2xl flex-col items-center gap-4 self-center text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{coaches.title}</h2>
        <p className="max-w-xl leading-relaxed text-muted-foreground">{coaches.text}</p>
        <dl className="flex flex-wrap justify-center gap-10">
          <div><dt className="text-sm text-muted-foreground">{coaches.coachesLabel}</dt><dd className="text-2xl font-semibold">{coaches.coachCount}</dd></div>
          <div><dt className="text-sm text-muted-foreground">{coaches.countriesLabel}</dt><dd className="text-2xl font-semibold">{coaches.countryCount}</dd></div>
        </dl>
        <button type="button" aria-controls="coaching-tutor-gallery" aria-pressed={paused} onClick={() => setPaused(!paused)} className="coaching-gallery-toggle inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          {paused ? coaches.play : coaches.pause}
        </button>
      </div>
      <div id="coaching-tutor-gallery" className="coaching-gallery-viewport" data-paused={paused} role="region" aria-label={coaches.galleryLabel} tabIndex={0} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.scrollLeft = 0; }}>
        <div className="coaching-gallery-track">
          {[0, 1].map((copy) => <ul key={copy} className="coaching-gallery" aria-label={copy === 0 ? coaches.listLabel : undefined} aria-hidden={copy === 1 ? true : undefined}>
            {medallists.map((tutor) => <li key={tutor.slug}><CoachingTutorCard tutor={tutor} countryBackdrop focusable={copy === 0} anchor={copy === 0} /></li>)}
          </ul>)}
        </div>
      </div>
    </div>
  </section>;
}
