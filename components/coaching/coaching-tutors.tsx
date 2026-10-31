"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { medallists, medallistStats, medalLabel, type Medallist } from "@/lib/coaching/medallists";

export function CoachingTutorCard({ tutor, priority = false, eager = false }: { tutor: Medallist; priority?: boolean; eager?: boolean }) {
  const extension = ["angel", "kanishk", "ermuun-battulga", "reuben-felix"].includes(tutor.slug) ? "png" : "webp";
  const hasPortrait = !["nima", "yota"].includes(tutor.slug);
  return <article className="coaching-portrait">
    {hasPortrait ? <Image src={`/coaching/medallists/${tutor.slug}.${extension}`} alt={`${tutor.name}, physics tutor from ${tutor.country}`} width={720} height={900} sizes="(min-width: 1024px) 260px, (min-width: 640px) 288px, 45vw" priority={priority} loading={priority ? undefined : eager ? "eager" : "lazy"} className="coaching-portrait-image" /> : <div className="coaching-portrait-image flex items-center justify-center font-serif text-7xl" aria-hidden="true">{tutor.name.charAt(0)}</div>}
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
      {[0, 1].map((column) => <ul key={column} className="coaching-marquee-column" style={{ "--marquee-duration": column ? "110s" : "90s", "--marquee-delay": column ? "-40s" : "0s" } as CSSProperties}>
        {[0, 1].map((copy) => medallists.filter((_, index) => index % 2 === column).map((tutor, index) => <li key={`${copy}-${tutor.slug}`} aria-hidden={copy === 1 ? true : undefined} className="pb-3 lg:pb-4"><CoachingTutorCard tutor={tutor} priority={!copy && !index} eager /></li>))}
      </ul>)}
    </div>
    <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "Play tutor slideshow" : "Pause tutor slideshow"} className="absolute bottom-2 right-2 flex size-10 items-center justify-center rounded-full bg-background/80 text-foreground">
      {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
    </button>
  </div>;
}

export function CoachingTutors() {
  const gallery = useRef<HTMLUListElement>(null);
  function scroll(direction: number) {
    gallery.current?.scrollBy({ left: direction * gallery.current.clientWidth * .8, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <section id="tutors" className="py-20">
    <div className="coaching-container flex min-w-0 flex-col gap-8">
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Our tutors</p>
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Taught by people who have stood on the Olympiad stage.</h2>
        <p className="max-w-xl leading-relaxed text-muted-foreground">Every tutor has medalled at national, Asian, or international level. We match each student to the tutor whose strengths fit their syllabus and goals.</p>
        <dl className="flex flex-wrap gap-10">
          <div><dt className="text-sm text-muted-foreground">Tutors</dt><dd className="text-2xl font-semibold">{medallistStats.count}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Countries represented</dt><dd className="text-2xl font-semibold">{medallistStats.countries}</dd></div>
        </dl>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" aria-label="Previous tutors" onClick={() => scroll(-1)} className="flex size-10 items-center justify-center rounded-full border border-border"><ArrowLeft className="size-4" aria-hidden="true" /></button>
        <button type="button" aria-label="Next tutors" onClick={() => scroll(1)} className="flex size-10 items-center justify-center rounded-full border border-border"><ArrowRight className="size-4" aria-hidden="true" /></button>
      </div>
      <ul className="coaching-gallery" ref={gallery} aria-label="Physcratic tutors">{medallists.map((tutor) => <li key={tutor.slug}><CoachingTutorCard tutor={tutor} /></li>)}</ul>
    </div>
  </section>;
}
