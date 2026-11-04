"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { countryFlagCodes, medallists, medalLabel, type Medallist } from "@/lib/coaching/medallists";
import { coachAnchorId, coachImageAlt, content } from "@/lib/coaching/content";
import { stepTarget, wrapLoop } from "@/lib/coaching/gallery";
import { CoachingAvatar } from "./coaching-avatar";
import { Highlighted, MedalChip } from "./coaching-highlight";
import abhikaPortrait from "@/public/coaching/medallists/abhika-atmaja-cutout.webp";

const { hero, coaches } = content;

/** Auto-scroll speed in pixels per second, and how long the gallery waits after the visitor leaves. */
const SPEED = 28;
const RESUME_DELAY = 2000;

export function CoachingTutorCard({ tutor, priority = false, eager = false, countryBackdrop = false, focusable = true, anchor = false, asHeading = true }: { tutor: Medallist; priority?: boolean; eager?: boolean; countryBackdrop?: boolean; focusable?: boolean; anchor?: boolean; asHeading?: boolean }) {
  const Name = asHeading ? "h3" : "p";
  const flagCode = countryFlagCodes[tutor.country];
  const photo = tutor.photo ?? "webp";
  const cutout = tutor.slug === "abhika-atmaja" ? abhikaPortrait : `/coaching/medallists/${tutor.slug}-cutout.webp`;
  return <article id={anchor ? coachAnchorId(tutor.slug) : undefined} className="coaching-portrait" data-country-backdrop={countryBackdrop || undefined} tabIndex={countryBackdrop ? (focusable ? 0 : -1) : undefined}>
    <div className="coaching-portrait-frame">
      <div className={countryBackdrop ? "coaching-portrait-clip coaching-portrait-artwork" : "coaching-portrait-clip"}>
        {countryBackdrop && flagCode && <Image src={`/coaching/flags/${flagCode}.png`} alt="" aria-hidden="true" fill sizes="(min-width: 640px) 288px, 256px" className="coaching-country-flag" />}
        {photo === false ? <CoachingAvatar variant="portrait" transparent={countryBackdrop} className="coaching-portrait-image" /> : <Image src={countryBackdrop ? cutout : `/coaching/medallists/${tutor.slug}.${photo}`} alt={coachImageAlt(tutor.name, tutor.country)} width={720} height={900} sizes="(min-width: 1280px) 288px, (min-width: 640px) 288px, 256px" priority={priority} loading={priority ? undefined : eager ? "eager" : "lazy"} className="coaching-portrait-image" />}
      </div>
    </div>
    <div className="coaching-portrait-copy">
      <div className="coaching-card-head">
        <Name className="font-serif text-lg leading-tight sm:text-xl">{tutor.name}</Name>
        <p className="coaching-card-country">{flagCode && <Image src={`/coaching/flags/${flagCode}.png`} alt="" aria-hidden="true" width={20} height={14} className="coaching-flag-chip" />}{tutor.country}</p>
      </div>
      <ul className="coaching-chips">
        {tutor.achievements.map((achievement, index) => <li key={`${achievement.contest}-${achievement.year}`}><MedalChip medal={achievement.medal} best={index === 0} label={medalLabel[achievement.medal]} detail={`${achievement.contest} ${achievement.year}`} /></li>)}
      </ul>
    </div>
  </article>;
}

export function CoachingTutorSlideshow() {
  const [paused, setPaused] = useState(false);
  return <div className="coaching-hero-slideshow flex min-w-0 flex-col items-center gap-4">
    <div className="relative w-full">
      <div className="coaching-marquee" role="group" aria-label={hero.slideshowLabel} data-paused={paused}>
        {[0, 1].map((column) => <ul key={column} className="coaching-marquee-column" style={{ "--marquee-duration": column ? "300s" : "260s", "--marquee-direction": column ? "reverse" : "normal" } as CSSProperties}>
          {[0, 1].map((copy) => medallists.filter((_, index) => index % 2 === column).map((tutor, index) => <li key={`${copy}-${tutor.slug}`} aria-hidden={copy === 1 ? true : undefined} className="pb-3 lg:pb-4"><CoachingTutorCard tutor={tutor} priority={!copy && !index} eager asHeading={false} /></li>))}
        </ul>)}
      </div>
      <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? hero.slideshowPlay : hero.slideshowPause} className="coaching-icon-button absolute bottom-2 right-2">
        {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
      </button>
    </div>
    <a href="#tutors" className="coaching-link text-sm font-semibold">{hero.seeAll}</a>
  </div>;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CoachingTutors() {
  const [paused, setPaused] = useState(false);
  const [grid, setGrid] = useState(false);
  const [reduced, setReduced] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Why the gallery is holding still right now. `until` keeps it still for a moment after the visitor leaves.
  const hold = useRef({ hover: false, focus: false, touch: false, until: 0, moving: false });
  const release = () => { hold.current.until = performance.now() + RESUME_DELAY; };
  const setSnap = (on: boolean) => { if (viewportRef.current) viewportRef.current.dataset.snap = String(on); };

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // The auto-scroll loop. It writes scrollLeft (no CSS animation), so a visitor can take over by
  // swiping or with the arrows at any time. Snap stays off while it moves, because snapping would
  // fight the slow drift. It only runs while the gallery is on screen and the tab is visible.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (grid || paused || reduced) {
      hold.current.moving = false;
      if (reduced) setSnap(true);
      return;
    }
    let frame = 0;
    let last = 0;
    let position = viewport.scrollLeft;
    let onScreen = false;
    let visible = !document.hidden;
    const tick = (now: number) => {
      frame = 0;
      const state = hold.current;
      const moving = !state.hover && !state.focus && !state.touch && performance.now() >= state.until;
      if (moving) {
        if (!state.moving) { position = viewport.scrollLeft; setSnap(false); }
        const elapsed = last ? Math.min(now - last, 64) : 0;
        position = wrapLoop(position + (SPEED * elapsed) / 1000, listRef.current?.offsetWidth ?? 0);
        viewport.scrollLeft = position;
      }
      state.moving = moving;
      last = now;
      start();
    };
    const start = () => { if (!frame && onScreen && visible) frame = requestAnimationFrame(tick); };
    const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; hold.current.moving = false; };
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; if (onScreen) start(); else stop(); });
    observer.observe(viewport);
    const onVisibility = () => { visible = !document.hidden; if (visible) start(); else stop(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [grid, paused, reduced]);

  // After a swipe or an arrow slide settles, move back into the first copy so the loop never runs out.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || grid || reduced) return;
    let timer = 0;
    const settle = () => {
      const half = listRef.current?.offsetWidth ?? 0;
      if (half && !hold.current.touch && viewport.scrollLeft >= half) viewport.scrollLeft -= half;
    };
    const onScroll = () => {
      if (hold.current.moving) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 160);
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.clearTimeout(timer); viewport.removeEventListener("scroll", onScroll); };
  }, [grid, reduced]);

  const go = (dir: 1 | -1) => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    const card = list?.querySelector("li");
    if (!viewport || !list || !card) return;
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(list).columnGap || "0");
    const half = reduced ? 0 : list.offsetWidth;
    const { jumpFrom, target } = stepTarget(viewport.scrollLeft, step, dir, half, viewport.scrollWidth - viewport.clientWidth);
    hold.current.moving = false;
    release();
    setSnap(true);
    if (jumpFrom !== undefined) viewport.scrollLeft = jumpFrom;
    viewport.scrollTo({ left: target, behavior: reduced ? "auto" : "smooth" });
  };

  // Links such as #coach-arrow-kristian: hold the gallery, then bring the card into view and focus it.
  useEffect(() => {
    const jump = (hash: string) => {
      if (!hash.startsWith(`#${coachAnchorId("")}`)) return false;
      const card = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!card) return false;
      hold.current.focus = true;
      hold.current.moving = false;
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
        <h2 className="font-serif text-balance text-3xl leading-tight sm:text-4xl">{coaches.title}</h2>
        <p className="max-w-xl leading-relaxed text-muted-foreground"><Highlighted text={coaches.text} phrase={coaches.highlight} /></p>
        <dl className="flex flex-wrap justify-center gap-10">
          <div><dt className="text-sm text-muted-foreground">{coaches.coachesLabel}</dt><dd className="text-2xl font-semibold">{coaches.coachCount}</dd></div>
          <div><dt className="text-sm text-muted-foreground">{coaches.countriesLabel}</dt><dd className="text-2xl font-semibold">{coaches.countryCount}</dd></div>
        </dl>
        {!grid && <button type="button" aria-controls="coaching-tutor-gallery" aria-pressed={paused} onClick={() => setPaused(!paused)} className="coaching-gallery-toggle inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          {paused ? coaches.play : coaches.pause}
        </button>}
      </div>
      <div id="coaching-tutor-gallery" className="min-w-0">
        {grid
          ? <ul className="coaching-tutor-grid" aria-label={coaches.listLabel}>
            {medallists.map((tutor) => <li key={tutor.slug}><CoachingTutorCard tutor={tutor} countryBackdrop anchor /></li>)}
          </ul>
          : <div
            className="coaching-gallery-shell"
            onPointerEnter={(event) => { if (event.pointerType === "mouse") hold.current.hover = true; }}
            onPointerLeave={(event) => { if (event.pointerType === "mouse") { hold.current.hover = false; release(); } }}
            onFocus={() => { hold.current.focus = true; }}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { hold.current.focus = false; release(); } }}
            onTouchStart={() => { hold.current.touch = true; hold.current.moving = false; setSnap(true); }}
            onTouchEnd={() => { hold.current.touch = false; release(); }}
            onTouchCancel={() => { hold.current.touch = false; release(); }}
          >
            <button type="button" className="coaching-icon-button coaching-gallery-arrow" data-side="start" aria-label={coaches.previous} aria-controls="coaching-tutor-viewport" onClick={() => go(-1)}><ChevronLeft className="size-5" aria-hidden="true" /></button>
            <div id="coaching-tutor-viewport" ref={viewportRef} className="coaching-gallery-viewport" data-snap="false" role="region" aria-label={coaches.galleryLabel} tabIndex={0}>
              <div className="coaching-gallery-track">
                {[0, 1].map((copy) => <ul key={copy} ref={copy === 0 ? listRef : undefined} className="coaching-gallery" aria-label={copy === 0 ? coaches.listLabel : undefined} aria-hidden={copy === 1 ? true : undefined}>
                  {medallists.map((tutor) => <li key={tutor.slug}><CoachingTutorCard tutor={tutor} countryBackdrop focusable={copy === 0} anchor={copy === 0} /></li>)}
                </ul>)}
              </div>
            </div>
            <button type="button" className="coaching-icon-button coaching-gallery-arrow" data-side="end" aria-label={coaches.next} aria-controls="coaching-tutor-viewport" onClick={() => go(1)}><ChevronRight className="size-5" aria-hidden="true" /></button>
          </div>}
      </div>
      <button type="button" aria-expanded={grid} aria-controls="coaching-tutor-gallery" onClick={() => setGrid(!grid)} className="coaching-button coaching-button-secondary self-center">{grid ? coaches.backToSlider : coaches.seeAll}</button>
    </div>
  </section>;
}
