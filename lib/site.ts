export const SITE = {
  name: "Physcratic",
  defaultTitle: "Physcratic | Physics Olympiad practice for IPhO, APhO, EuPhO",
  description:
    "Practice IPhO, APhO and EuPhO theory problems with original diagrams and English translations, save your attempts, and check answers on authored problems.",
  locale: "en_US",
} as const;

/** Absolute site origin without a trailing slash. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const raw = explicit
    ? explicit
    : vercel
      ? `https://${vercel}`
      : "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function isProductionDeploy(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/**
 * Next replaces the whole openGraph object instead of merging it, so every
 * page that sets openGraph must spread this.
 */
export const baseOpenGraph = {
  siteName: SITE.name,
  locale: SITE.locale,
  type: "website",
} as const;
