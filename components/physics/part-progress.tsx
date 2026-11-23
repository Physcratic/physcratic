import { useRef } from "react";
import { CircleCheck } from "lucide-react";
import { partToken } from "@/lib/part-colors";
import { cn } from "@/lib/utils";

/** One part of the answer area. `colorIndex` is the same index the part's chip and stripe use. */
export type BarPart = { id: string; colorIndex: number; correct: boolean };

/** The words for the bar, true to the parts passed in. */
export function partsCorrectText(done: number, total: number): string {
  return `${done} of ${total} part${total === 1 ? "" : "s"} correct`;
}

/**
 * One segment per part, in the part's own colour. A segment is filled when that part is correct and is a tint with an outline
 * when it is not. The words are the accessible name, so the bar never relies on colour. One part needs no bar.
 */
export function PartProgressBar({ parts, className }: { parts: readonly BarPart[]; className?: string }) {
  if (parts.length < 2) return null;
  const done = parts.filter((part) => part.correct).length;
  return (
    <div role="img" aria-label={partsCorrectText(done, parts.length)} className={cn("flex gap-1", className)}>
      {parts.map((part) => {
        const token = partToken(part.colorIndex);
        return <span key={part.id} data-part-token={token.name} data-filled={part.correct} className={cn("h-2 min-w-0 flex-1 rounded-full border", token.stripe, part.correct ? token.fill : token.tint)} />;
      })}
    </div>
  );
}

/**
 * True from the moment a problem becomes solved during this session until it stops being solved. A problem that is already
 * solved when this starts watching does not count, so nothing is celebrated on load.
 */
export class SolvedWatcher {
  private shown = false;
  constructor(private before: boolean) {}
  next(solved: boolean): boolean {
    if (!solved) this.shown = false;
    else if (!this.before) this.shown = true;
    this.before = solved;
    return this.shown;
  }
}
export function useJustSolved(solved: boolean): boolean {
  const watcher = useRef<SolvedWatcher | null>(null);
  watcher.current ??= new SolvedWatcher(solved);
  return watcher.current.next(solved);
}

/** A calm note that the problem is solved. A short fade in, and none under reduced motion. */
export function SolvedBanner() {
  return (
    <p role="status" className="flex items-center gap-2 rounded-lg border border-success bg-success-tint p-4 text-base font-semibold text-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success-ink" />
      Solved
    </p>
  );
}
