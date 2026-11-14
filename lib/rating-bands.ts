// The four rating bands, in one place. The library, Problem Studio and the rating-help popover all read this.
// Ratings still run from 0 to 4000 and players start at 1200, in Intermediate.
// An author's estimate never feeds the rating system. Existing Studio presets are retained.

export type RatingBand = {
  id: "beginner-olympiad" | "intermediate-olympiad" | "advanced" | "mastery"
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
  { id: "beginner-olympiad", name: "Beginner", min: 0, max: 801, range: "0 to 800", example: "Fundamental physics or first selection stage", middle: 500, variant: "elo-intermediate" },
  { id: "intermediate-olympiad", name: "Intermediate", min: 801, max: 1801, range: "801 to 1,800", example: "National finals level", middle: 1200, variant: "elo-intermediate" },
  { id: "advanced", name: "Advanced", min: 1801, max: 2601, range: "1,801 to 2,600", example: "IPhO level", middle: 2100, variant: "elo-advanced" },
  { id: "mastery", name: "Mastery", min: 2601, max: Infinity, range: "2,601+", example: "Hard IPhO, APhO and EuPhO problems", middle: 2800, variant: "elo-advanced" },
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

/** "1,850 · Advanced" for a stored rating, or the old label as written. */
export function describeEstimate(estimate: string | null | undefined): string {
  const text = (estimate ?? "").trim();
  if (!text) return "";
  const rating = parseRating(text);
  if (rating === null) return text;
  return `${rating.toLocaleString("en-US")} · ${ratingBand(rating).name}`;
}

/** Retired filter ids retain their historical ranges without appearing as new choices. */
const legacyRanges: Readonly<Record<string, readonly [number, number]>> = {
  "fundamentals": [0, 200],
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
