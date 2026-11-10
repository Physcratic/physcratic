import type { Problem } from "./physics";
import { matchesBand } from "./rating-bands";

/** The three colour groups the older filter used. New code reads lib/rating-bands.ts. */
export const eloBands = [
  { id: "under-1200", name: "Foundational", range: "Below 1,200", min: 0, max: 1200, variant: "elo-foundation" },
  { id: "1200-1599", name: "Intermediate", range: "1,200 to 1,599", min: 1200, max: 1600, variant: "elo-intermediate" },
  { id: "1600-plus", name: "Advanced", range: "1,600+", min: 1600, max: Infinity, variant: "elo-advanced" },
] as const;

export function getEloBand(elo: number) {
  return eloBands.find((band) => elo < band.max) ?? eloBands[2];
}

// Editorial estimates of solving difficulty for a strong Olympiad student, not measured ratings
// or inputs to player-rating updates. Review evidence: docs/engineering/PROBLEM_DIFFICULTY_REVIEW.md.
// Keep a problem's estimate identical across collections.
const estimatedProblemElos: Readonly<Record<string, number>> = {
  "ipho-2026-t1": 2250,
  "ipho-2026-t2": 2300,
  "arena-mind-the-gap": 1350,
  "arena-the-bubble-treaty": 1750,
  "arena-the-cosmic-kitchen": 2600,
  "arena-the-five-fold-collision": 2400,
  "arena-the-phantom-charge": 1800,
  "arena-the-string-that-answered-back": 1950,
  "arena-the-clock-in-the-racing-mirror": 2100,
  "arena-the-dodecahedron-conspiracy": 1800,
  "arena-the-gas-with-elbows": 2200,
  "arena-the-quantum-escape-room": 2100,
  "arena-the-three-way-wave-split": 1800,
  "arena-titans-double-take": 1850,
  "arena-a-grin-and-a-wiggle": 2500,
  "arena-an-atom-with-stage-fright": 2000,
  "arena-the-invisible-brake": 2200,
  "arena-the-bending-beam-riddle": 2350,
  "arena-the-capacitors-missing-energy": 2500,
  "arena-the-infinite-v": 2300,
  "ipho-2025-t1": 2200,
  "ipho-2025-t2": 2450,
  "ipho-2025-t3": 2300,
  "ipho-2024-t1": 2050,
  "ipho-2024-t2": 2300,
  "ipho-2024-t3": 2450,
  "ipho-2023-t1": 2400,
  "ipho-2023-t2": 2300,
  "ipho-2023-t3": 2350,
  "ipho-2021-t1": 2400,
  "ipho-2021-t2": 2450,
  "ipho-2019-t1": 2300,
  "ipho-2019-t2": 2500,
  "ipho-2019-t3": 2600,
  "ipho-2018-t1": 2200,
  "ipho-2018-t2": 2200,
  "ipho-2018-t3": 2300,
  "ipho-2008-t1": 2400,
  "ipho-2017-t2": 2350,
  "ipho-2017-t3": 2300,
  "ipho-2016-t2": 2400,
  "ipho-2005-t1": 2050,
  "ipho-2015-t1": 2200,
  "ipho-2015-t2": 2300,
  "ipho-2015-t3": 2050,
  "ipho-2016-t1": 2400,
  "ipho-2014-t3": 2300,
  "ipho-2013-t1": 2250,
  "ipho-2013-t2": 2250,
  "ipho-2013-t3": 2400,
  "ipho-2012-t2": 2450,
  "ipho-2011-t1": 2550,
  "ipho-2010-t1": 2300,
  "ipho-2010-t2": 2000,
  "ipho-2008-t2": 2300,
  "ipho-2007-t2": 2000,
  "ipho-2009-t1": 2100,
  "ipho-2005-t2": 2400,
  "ipho-2009-t2": 2150,
  "ipho-2004-t3": 1950,
  "apho-2025-t1": 2300,
  "apho-2025-t2": 2450,
  "apho-2025-t3": 2300,
  "apho-2024-t3": 2300,
  "apho-2023-t1": 2350,
  "apho-2023-t2": 2950,
  "apho-2011-t2": 2500,
  "apho-2022-t1": 2100,
  "apho-2022-t2": 2200,
  "apho-2022-t3": 2200,
  "apho-2021-t1": 2450,
  "apho-2021-t2": 2900,
  "apho-2021-t3": 2900,
  "apho-2019-t1": 2700,
  "apho-2019-t2": 2750,
  "apho-2019-t3": 2950,
  "apho-2018-t1": 2400,
  "apho-2018-t2": 2500,
  "apho-2018-t3": 2400,
  "apho-2017-t1": 2750,
  "apho-2017-t2": 2500,
  "apho-2017-t3": 2500,
  "apho-2016-t1": 2450,
  "apho-2009-t1": 2250,
  "apho-2016-t3": 2100,
  "apho-2015-t1": 2050,
  "apho-2015-t2": 2550,
  "apho-2015-t3": 2100,
  "apho-2006-t2": 1900,
  "apho-2014-t2": 2250,
  "apho-2014-t3": 1950,
  "apho-2013-t1": 2500,
  "apho-2013-t3": 2250,
  "apho-2012-t1": 2050,
  "apho-2012-t3": 2100,
  "eupho-2025-t1": 2200,
  "eupho-2025-t2": 2250,
  "eupho-2025-t3": 2500,
  "eupho-2024-t1": 2100,
  "eupho-2024-t2": 2250,
  "eupho-2024-t3": 2350,
  "eupho-2023-t1": 2300,
  "eupho-2023-t3": 2600,
  "eupho-2022-t1": 2300,
  "eupho-2022-t2": 2450,
  "eupho-2022-t3": 2550,
  "eupho-2021-t1": 2300,
  "eupho-2021-t3": 2450,
  "eupho-2020-t1": 2250,
  "eupho-2020-t2": 2350,
  "eupho-2020-t3": 2500,
  "eupho-2019-t1": 2200,
  "eupho-2019-t2": 2350,
  "eupho-2019-t3": 2250,
  "eupho-2018-t1": 2200,
  "eupho-2018-t2": 2400,
  "eupho-2018-t3": 2300,
  "eupho-2017-t1": 1900,
  "eupho-2017-t2": 2200,
  "eupho-2017-t3": 2450,
};

export function getEstimatedProblemElo(problemId: string): number {
  const elo = estimatedProblemElos[problemId];
  if (elo === undefined) {
    throw new Error(`Missing editorial difficulty estimate: ${problemId}`);
  }
  return elo;
}

export function matchesEstimatedDifficulty(problemId: string, difficulty: string) {
  // Takes the five band ids from lib/rating-bands.ts and the three older ids that saved links may still carry.
  return matchesBand(getEstimatedProblemElo(problemId), difficulty);
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
