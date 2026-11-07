import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a card shows while its data loads, under the heading the card already has. Screen readers hear the label.
 * It replaces a bare "Loading…" line, so the card keeps the shape it will have.
 */
export function LoadingLines({ label, lines = 2 }: { label: string; lines?: number }) {
  return (
    <div role="status" className="flex min-w-0 flex-col gap-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => <Skeleton key={index} aria-hidden="true" className={index === lines - 1 ? "h-4 w-2/3" : "h-4 w-full"} />)}
    </div>
  );
}
