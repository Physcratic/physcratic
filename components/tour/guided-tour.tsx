"use client";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { tours, type TourId, type TourStep } from "./tours";
import { ringLayer } from "./tour-layer";
import { TourText } from "./tour-text";
import { clearRunning, hasSeen, markSeen, readRunning, TOUR_EVENT, writeRunning } from "./tour-storage";

type Box = { top: number; left: number; width: number; height: number };

/** The first element named by `names` that is on screen. */
function findTarget(names: readonly string[]): HTMLElement | null {
  for (const name of names) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(name)}"]`)) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && !el.closest("[hidden],[inert]")) return el;
    }
  }
  return null;
}
const editable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|MATH-FIELD)$/.test(el.tagName));

/**
 * A guided tour. It is one small card pointing at a real element with a ring around it. It has no overlay and takes no
 * clicks outside the card, so it never blocks the page. Skip, Esc or Done ends it, and it is remembered as seen.
 */
export function GuidedTour({ tourId }: { tourId: TourId }) {
  const tour = tours[tourId];
  const pathname = usePathname();
  const router = useRouter();
  const [index, setIndex] = useState<number | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [cardBox, setCardBox] = useState<{ top: number; left: number } | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLParagraphElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const textId = useId();
  const step: TourStep | undefined = index === null ? undefined : tour.steps[index];
  const matches = !!step && (!step.path || step.path.test(pathname));

  const finish = useCallback(() => {
    markSeen(tourId);
    clearRunning();
    setIndex(null);
    setTarget(null);
    setBox(null);
    const back = returnTo.current;
    returnTo.current = null;
    if (back && document.contains(back)) back.focus();
  }, [tourId]);
  const go = useCallback(
    (to: number) => {
      if (to < 0) return;
      if (to >= tour.steps.length) return finish();
      writeRunning(tourId, to);
      setTarget(null);
      setBox(null);
      setCardBox(null);
      setIndex(to);
    },
    [finish, tour.steps.length, tourId],
  );

  /** The nearest earlier step that belongs on this page and has something to point at. Back never lands on a skipped step. */
  const previous = (from: number) => {
    for (let i = from - 1; i >= 0; i--) {
      const { path, targets } = tour.steps[i];
      if ((!path || path.test(pathname)) && findTarget(targets)) return i;
    }
    return -1;
  };

  useEffect(() => setMounted(true), []);

  // Start: resume one that is part way through, start on a first visit, or start when asked.
  useEffect(() => {
    const running = readRunning();
    if (running && running.id === tourId && running.step < tour.steps.length) {
      setIndex(running.step);
      return;
    }
    const automated = typeof navigator !== "undefined" && navigator.webdriver === true;
    if (hasSeen(tourId) || automated || !tour.autoStart.test(window.location.pathname)) return;
    const timer = setTimeout(() => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      markSeen(tourId);
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      writeRunning(tourId, 0);
      setIndex(0);
    }, 900);
    return () => clearTimeout(timer);
  }, [tour, tourId]);
  useEffect(() => {
    const onStart = (event: Event) => {
      if ((event as CustomEvent<{ id: TourId }>).detail?.id !== tourId) return;
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      writeRunning(tourId, 0);
      setTarget(null);
      setIndex(0);
    };
    window.addEventListener(TOUR_EVENT, onStart);
    return () => window.removeEventListener(TOUR_EVENT, onStart);
  }, [tourId]);

  // Find the element. Look for about two seconds, because pages draw their content a moment after they open.
  useEffect(() => {
    if (!step || !matches) return;
    let tries = 0;
    const look = () => {
      const found = findTarget(step.targets);
      if (found) {
        setTarget(found);
        return true;
      }
      return false;
    };
    if (look()) return;
    const timer = setInterval(() => {
      tries++;
      if (look()) clearInterval(timer);
      else if (tries > 14) {
        clearInterval(timer);
        go(index! + 1); // Nothing to point at here, so move on.
      }
    }, 150);
    return () => clearInterval(timer);
  }, [step, matches, index, go]);

  // Keep the ring and the card with the element while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!target) return;
    const small = window.innerWidth < 640;
    setNarrow(small);
    target.scrollIntoView({ block: "center", behavior: "auto" });
    const place = () => {
      const rect = target.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setNarrow(vw < 640);
      const cardEl = card.current;
      const ch = cardEl?.offsetHeight ?? 180;
      const cw = Math.min(352, vw - 16);
      // On a phone the card sits at the bottom, so leave room under the page for the last element to rise above it.
      document.body.style.paddingBottom = vw < 640 ? `${Math.ceil(ch) + 32}px` : "";
      if (vw < 640) {
        // Bring the element above the card, and never under it.
        const room = vh - ch - 24;
        if (rect.bottom > room) window.scrollBy(0, Math.min(rect.bottom - room, Math.max(0, rect.top - 8)));
        else if (rect.top < 8) window.scrollBy(0, rect.top - 8);
      }
      const next = target.getBoundingClientRect();
      // A target taller than the space above the phone card cannot clear it. Then the ring marks the part that is in view,
      // so the card never covers the ring. The person scrolls for the rest.
      const clear = vw < 640 ? vh - ch - 24 - next.top : Infinity;
      setBox({ top: next.top, left: next.left, width: next.width, height: next.height > clear && clear >= 48 ? clear : next.height });
      if (vw >= 640) {
        const gap = 14;
        let top: number;
        if (next.bottom + gap + ch <= vh - 8) top = next.bottom + gap;
        else if (next.top - gap - ch >= 8) top = next.top - gap - ch;
        else top = Math.max(8, Math.min(vh - ch - 8, next.top));
        let left = Math.max(8, Math.min(vw - cw - 8, next.left));
        // If the card had to sit over the element (a tall element), put it beside it instead.
        if (top < next.bottom && top + ch > next.top) left = next.right + gap + cw <= vw - 8 ? next.right + gap : Math.max(8, next.left - gap - cw);
        setCardBox({ top, left });
      }
    };
    place();
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const timer = setInterval(schedule, 400);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
      document.body.style.paddingBottom = "";
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [target]);

  // Move focus to the card on each step, so a screen reader reads it and the keyboard starts there.
  // The card is drawn a moment after the target is found, so this waits for it.
  const shown = !!(target && box && matches);
  useEffect(() => {
    if (shown) heading.current?.focus({ preventScroll: true });
  }, [shown, index]);

  // Esc closes. The arrow keys move, unless the person is typing.
  useEffect(() => {
    if (index === null || !matches) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
      } else if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && !editable(event.target) && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (event.key === "ArrowRight") go(index + 1);
        else if (previous(index) >= 0) go(previous(index));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, matches, finish, go, pathname]);

  if (!mounted || index === null || !step || !matches || !target || !box) return null;
  const last = index === tour.steps.length - 1;
  const total = tour.steps.length;
  const place: React.CSSProperties = narrow
    ? { left: 8, right: 8, bottom: 8 }
    : { top: cardBox?.top ?? 0, left: cardBox?.left ?? 0, width: Math.min(352, window.innerWidth - 16), visibility: cardBox ? "visible" : "hidden" };

  return createPortal(
    <>
      <div
        aria-hidden="true"
        data-tour-ring=""
        className="pointer-events-none fixed rounded-md ring-2 ring-primary ring-offset-2 ring-offset-background"
        data-tour-ring-layer={ringLayer(target)}
        style={{ zIndex: ringLayer(target), top: box.top - 2, left: box.left - 2, width: box.width + 4, height: box.height + 4 }}
      />
      <div
        ref={card}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={textId}
        data-tour-card=""
        className="fixed z-[61] max-h-[60dvh] space-y-3 overflow-y-auto rounded-xl border-2 border-primary bg-card p-4 text-card-foreground shadow-lg"
        style={place}
      >
        <p className="sr-only" role="status">{`Step ${index + 1} of ${total}: ${step.title}`}</p>
        <p ref={heading} id={titleId} tabIndex={-1} className="text-lg font-semibold leading-snug outline-none">
          {step.title}
        </p>
        <p id={textId} className="text-base leading-relaxed"><TourText text={step.text} /></p>
        <div className="flex flex-wrap items-center gap-2">
          {index > 0 && (
            <Button type="button" variant="outline" className="min-h-11" disabled={previous(index) < 0} onClick={() => go(previous(index))}>
              Back
            </Button>
          )}
          <Button
            type="button"
            className="min-h-11"
            onClick={() => {
              if (step.go) {
                markSeen(tourId);
                writeRunning(tourId, index + 1);
                setIndex(index + 1);
                setTarget(null);
                router.push(step.go.href);
              } else go(index + 1);
            }}
          >
            {step.go ? step.go.label : last ? "Done" : "Next"}
          </Button>
          <Button type="button" variant="ghost" className="min-h-11" onClick={finish}>
            Skip tour
          </Button>
          <span className="ml-auto text-sm text-muted-foreground">{index + 1} of {total}</span>
        </div>
      </div>
    </>,
    document.body,
  );
}
