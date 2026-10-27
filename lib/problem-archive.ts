import type { Problem } from "./physics";

export const eloBands = [
  { id: "under-1200", name: "Foundational", range: "Below 1,200", min: 0, max: 1200, variant: "elo-foundation" },
  { id: "1200-1599", name: "Intermediate", range: "1,200–1,599", min: 1200, max: 1600, variant: "elo-intermediate" },
  { id: "1600-plus", name: "Advanced", range: "1,600+", min: 1600, max: Infinity, variant: "elo-advanced" },
] as const;

export function getEloBand(elo: number) {
  return eloBands.find((band) => elo < band.max) ?? eloBands[2];
}

export function getArchiveStats(
  items: ReadonlyArray<Pick<Problem, "addedAt">>,
  now: number = Date.now(),
) {
  const timestamps = items.map((item) =>
    item.addedAt ? Date.parse(item.addedAt) : NaN,
  );
  const hasCompleteDates = timestamps.every(Number.isFinite);
  const cutoff = now - 24 * 60 * 60 * 1000;

  return {
    total: items.length,
    addedLast24Hours: hasCompleteDates
      ? timestamps.filter((timestamp) => timestamp > cutoff && timestamp <= now).length
      : null,
  };
}
