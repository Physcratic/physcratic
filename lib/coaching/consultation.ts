export const CONSULTATION_FORM_URL = "https://tally.so/r/XxZBr4";
export const TUTOR_FORM_URL = "https://tally.so/r/MeodDX";

export const coachingPathways = [
  "Olympiad Beginner",
  "Olympiad Intermediate",
  "Olympiad Advanced",
  "IB or A-Level",
  "Not sure yet",
] as const;

export type CoachingPathway = (typeof coachingPathways)[number];

const OWN_HOST = "physcratic.com";
const MAX_SOURCE_LENGTH = 100;

export function isCoachingPathway(value: unknown): value is CoachingPathway {
  return typeof value === "string" && (coachingPathways as readonly string[]).includes(value);
}

/** Builds the Tally link. Empty values are left out and an unknown pathway is rejected. */
export function consultationHref({ pathway, source }: { pathway?: string; source?: string }): string {
  if (pathway && !isCoachingPathway(pathway)) throw new Error(`Unknown coaching pathway: ${pathway}`);
  const params: string[] = [];
  if (pathway) params.push(`pathway=${encodeURIComponent(pathway)}`);
  if (source) params.push(`source=${encodeURIComponent(source.slice(0, MAX_SOURCE_LENGTH))}`);
  return params.length ? `${CONSULTATION_FORM_URL}?${params.join("&")}` : CONSULTATION_FORM_URL;
}

/** Builds the tutor application link. Only the source is passed, in the same way as the consultation form. */
export function tutorFormHref({ source }: { source?: string }): string {
  return source ? `${TUTOR_FORM_URL}?source=${encodeURIComponent(source.slice(0, MAX_SOURCE_LENGTH))}` : TUTOR_FORM_URL;
}

/** utm_source if present, else the referrer hostname unless it is our own site, else "direct". */
export function consultationSource(search: string, referrer: string): string {
  const utm = new URLSearchParams(search).get("utm_source")?.trim();
  if (utm) return utm.slice(0, MAX_SOURCE_LENGTH);
  if (referrer) {
    try {
      const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
      if (host && host !== OWN_HOST && !host.endsWith(`.${OWN_HOST}`)) return host.slice(0, MAX_SOURCE_LENGTH);
    } catch {
      // An unparseable referrer counts as direct.
    }
  }
  return "direct";
}
