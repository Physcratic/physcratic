"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * One row of topic buttons. On a narrow screen the row scrolls inside its own box with a fade on the edge that
 * has more chips, so the page never scrolls sideways. Every chip is a real button, so Tab reaches them all and
 * the browser scrolls the focused chip into view.
 */
export function TopicChips({ topics, value, onChange }: { topics: readonly string[]; value: string; onChange: (topic: string) => void }) {
  const row = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const measure = useCallback(() => {
    const element = row.current;
    if (!element) return;
    setEdges({ start: element.scrollLeft > 2, end: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    measure();
    const element = row.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  const options = ["all", ...topics];
  return (
    <div role="group" aria-labelledby="topic-chips-label" className="flex min-w-0 flex-col gap-2">
      <span id="topic-chips-label" className="text-sm font-medium">Topic</span>
      <div className="relative min-w-0">
        <div ref={row} onScroll={measure} className="flex min-w-0 gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {options.map((topic) => {
            const pressed = topic === value;
            return (
              <button
                key={topic}
                type="button"
                aria-pressed={pressed}
                onClick={() => onChange(topic)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  pressed ? "border-foreground bg-foreground text-background" : "bg-background text-foreground hover:bg-muted",
                )}
              >
                {topic === "all" ? "All topics" : topic}
              </button>
            );
          })}
        </div>
        {edges.start && <div aria-hidden="true" data-testid="topic-fade-start" className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card to-transparent" />}
        {edges.end && <div aria-hidden="true" data-testid="topic-fade-end" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent" />}
      </div>
    </div>
  );
}
