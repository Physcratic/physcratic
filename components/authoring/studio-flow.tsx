"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, CircleAlert, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STEP_NAMES, STUDIO_STEPS, barText, type StudioStep } from "./studio-steps";

export type StepStatus = "done" | "left" | "open";

/** One step with its icon and words. Colour is never the only cue: the icon shape and the words say it too. */
export function StepButton({ step, status, count, current, onGo }: { step: StudioStep; status: StepStatus; count: number; current: boolean; onGo: (step: StudioStep) => void }) {
  return (
    <button
      type="button"
      aria-current={current ? "step" : undefined}
      onClick={() => onGo(step)}
      className={`flex min-h-11 w-full items-center gap-3 rounded-md border-2 px-3 py-2 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${current ? "border-foreground bg-muted font-semibold" : "border-transparent hover:bg-muted"}`}
    >
      {status === "done" ? (
        <Check aria-hidden="true" className="size-5 shrink-0 text-success" />
      ) : status === "left" ? (
        <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-amber" />
      ) : (
        <Circle aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block">{STEP_NAMES[step]}</span>
        {status !== "open" && <span className="block text-sm font-normal text-muted-foreground">{status === "done" ? "Done" : barText(count)}</span>}
      </span>
    </button>
  );
}

/** The steps: a rail on wide screens, a compact stepper with the same list behind it on phones. */
export function StepNav({ step, statusOf, counts, onGo }: { step: StudioStep; statusOf: (s: StudioStep) => StepStatus; counts: Record<StudioStep, number>; onGo: (step: StudioStep) => void }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const index = STUDIO_STEPS.indexOf(step);
  return (
    <nav aria-label="Steps" className="mb-6 md:mb-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border-2 px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <span className="font-semibold">{STEP_NAMES[step]}</span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {index + 1} of {STUDIO_STEPS.length}
          <ChevronDown aria-hidden="true" className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      <ol id={listId} className={`${open ? "mt-2" : "hidden"} space-y-1 md:sticky md:top-4 md:mt-0 md:block`}>
        {STUDIO_STEPS.map((s) => (
          <li key={s}>
            <StepButton step={s} status={statusOf(s)} count={counts[s]} current={s === step} onGo={(to) => { setOpen(false); onGo(to); }} />
          </li>
        ))}
      </ol>
    </nav>
  );
}

export type BarItem = { key: string; label: string; onGo: () => void };

/**
 * The bar at the bottom of the screen: what is left, Back, and Next or Publish. Its height is kept as the page's bottom
 * scroll padding, so a focused field is never under it.
 */
export function StudioBar({ count, items, back, next }: { count: number; items: BarItem[]; back?: () => void; next: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    // The nearest ancestor that scrolls, or the page.
    let root: HTMLElement = document.documentElement;
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) { root = p; break; }
    }
    const roots = root === document.documentElement ? [root] : [root, document.documentElement];
    const sync = () => roots.forEach((r) => (r.style.scrollPaddingBottom = `${el.getBoundingClientRect().height}px`));
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      roots.forEach((r) => (r.style.scrollPaddingBottom = ""));
    };
  }, []);
  useEffect(() => { if (count === 0) setOpen(false); }, [count]);
  return (
    <div
      ref={bar}
      data-studio-bar=""
      className="sticky bottom-0 z-20 mt-10 border-t-2 bg-background pb-3 pt-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
    >
      {open && count > 0 && (
        <ul id={listId} className="mb-3 max-h-60 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <li key={item.key}>
              <button type="button" onClick={() => { setOpen(false); item.onGo(); }} className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-base underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-amber" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {count === 0 ? (
          <p role="status" className="flex min-h-11 items-center gap-2 text-base font-medium">
            <Check aria-hidden="true" className="size-5 text-success" />
            {barText(0)}
          </p>
        ) : (
          <button
            type="button"
            id="studio-bar-left"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((o) => !o)}
            className="flex min-h-11 items-center gap-2 rounded-md px-2 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CircleAlert aria-hidden="true" className="size-5 text-amber" />
            {barText(count)}
            <ChevronDown aria-hidden="true" className={`size-5 transition-transform ${open ? "" : "rotate-180"}`} />
          </button>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-h-11 border-2 text-base" disabled={!back} onClick={back}>
            Back
          </Button>
          {next}
        </div>
      </div>
    </div>
  );
}
