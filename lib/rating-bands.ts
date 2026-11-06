// The five rating bands, in one place. The library, Problem Studio and the "What do the ratings mean?" popover all read this.
// Fitted to the site's own scale: users start at 1200, ratings run from 0 to 4000, and the archive problems sit between
// 1350 and 2800. An author's estimate is a guess, not a measured rating, and never feeds the rating system.

export type RatingBand = {
  id: "fundamentals" | "beginner-olympiad" | "intermediate-olympiad" | "advanced" | "mastery";
  name: string;
  /** Inclusive lower end. */
  min: number;
  /** Exclusive upper end. */
  max: number;
  /** The range as it is read aloud and shown in the table. */
  range: string;
  /** One short line that says what that level feels like. */
  example: string;
  /** The rating Studio fills in when an author picks the band. */
  middle: number;
  /** The colour group in the badge styles. */
  variant: "elo-foundation" | "elo-intermediate" | "elo-advanced";
};

export const ratingBands: readonly RatingBand[] = [
  { id: "fundamentals", name: "Fundamentals", min: 0, max: 1200, range: "Below 1,200", example: "Like a hard A Level question", middle: 1000, variant: "elo-foundation" },
  { id: "beginner-olympiad", name: "Beginner olympiad", min: 1200, max: 1600, range: "1,200 to 1,599", example: "Like a BPhO Round 1 or national first round problem", middle: 1400, variant: "elo-intermediate" },
  { id: "intermediate-olympiad", name: "Intermediate olympiad", min: 1600, max: 2000, range: "1,600 to 1,999", example: "Like a national final problem", middle: 1800, variant: "elo-intermediate" },
  { id: "advanced", name: "Advanced (IPhO level)", min: 2000, max: 2500, range: "2,000 to 2,499", example: "Like an IPhO theory problem", middle: 2250, variant: "elo-advanced" },
  { id: "mastery", name: "Mastery", min: 2500, max: Infinity, range: "2,500 and up", example: "Like the hardest IPhO and APhO problems", middle: 2600, variant: "elo-advanced" },
];

/** The band a rating falls in. A rating under 0 counts as the lowest band. */
export function ratingBand(rating: number): RatingBand {
  return ratingBands.find((band) => rating < band.max) ?? ratingBands[ratingBands.length - 1];
}

export const maxRating = 4000;

/** What an author typed as an exact rating, or null when it is not a whole number from 0 to 4000. Commas and spaces are allowed. */
export function parseRating(text: string): number | null {
  const cleaned = text.trim().replace(/[,\s]/g, "").replace(/^~/, "");
  if (!/^\d{1,4}$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value <= maxRating ? value : null;
}

/** The band for a stored estimate such as "1850", or null for older free-text labels that are not a rating. */
export function bandForEstimate(estimate: string | null | undefined): RatingBand | null {
  const rating = parseRating(estimate ?? "");
  return rating === null ? null : ratingBand(rating);
}

/** "~1,850 · Intermediate olympiad (estimate)" for a stored estimate, or the old label as written. */
export function describeEstimate(estimate: string | null | undefined): string {
  const text = (estimate ?? "").trim();
  if (!text) return "";
  const rating = parseRating(text);
  if (rating === null) return text;
  return `~${rating.toLocaleString("en-US")} · ${ratingBand(rating).name} (estimate)`;
}

/** The three band ids the library used before. Links and saved URLs that carry them still work. */
const legacyRanges: Readonly<Record<string, readonly [number, number]>> = {
  "under-1200": [0, 1200],
  "1200-1599": [1200, 1600],
  "1600-plus": [1600, Infinity],
};

export const bandFilterIds = [...ratingBands.map((band) => band.id), ...Object.keys(legacyRanges)] as [string, ...string[]];

/** Whether a measured rating is inside the band a filter names. `all` matches everything and an unknown id matches nothing. */
export function matchesBand(rating: number, filter: string): boolean {
  if (filter === "all") return true;
  const legacy = legacyRanges[filter];
  if (legacy) return rating >= legacy[0] && rating < legacy[1];
  const band = ratingBands.find((entry) => entry.id === filter);
  return band ? rating >= band.min && rating < band.max : false;
}
