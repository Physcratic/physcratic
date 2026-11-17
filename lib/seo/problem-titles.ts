import type { CatalogProblem } from "../corpus-catalog";

export const META_TITLE_BUDGET = 60 - " | Physcratic".length;

/** The copy rules ban en dashes, em dashes and semicolons in text we write, so official titles and statement leads get plain forms. */
export function plainPunctuation(text: string): string {
  return text.replace(/\s*[–—]\s*/g, " - ").replace(/\s*;\s*/g, ", ");
}

/**
 * "WATER-POWERED RICE-POUNDING MORTAR" becomes "Water-Powered Rice-Pounding Mortar" in the <title>. The page heading keeps
 * the official title as written. One-word titles such as "LIGO-GW150914" are acronyms and stay as they are.
 */
export function displayTitle(title: string): string {
  if (title !== title.toUpperCase() || !/[A-Z]/.test(title) || !/\s/.test(title.trim())) return title;
  return title.toLowerCase().replace(/(^|[\s(-])([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase());
}

export function archiveMetaTitle(title: string, competition: string, year: number, number: number, identifierOnly: boolean): string {
  const long = `${competition} ${year} Problem ${number}`;
  if (identifierOnly) return long;
  const short = `${competition} ${year} P${number}`;
  for (const label of [long, short]) {
    const full = `${title}, ${label}`;
    if (full.length <= META_TITLE_BUDGET) return full;
  }
  const room = META_TITLE_BUDGET - `…, ${short}`.length;
  const cut = title.slice(0, room);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 12 ? space : room).replace(/[\s,;:-]+$/, "")}…, ${short}`;
}

/** Shared by full SEO pages and filesystem-independent problem images. */
export function archiveTitle(problem: CatalogProblem) {
  const number = Number(problem.code.slice(1));
  const identifierOnly = problem.titleOrigin === "problem-identifier";
  const title = identifierOnly ? `${problem.competition} ${problem.year} Problem ${number}` : problem.title;
  return {
    number,
    title,
    metaTitle: archiveMetaTitle(plainPunctuation(displayTitle(title)), problem.competition, problem.year, number, identifierOnly),
  };
}

export function arenaMetaTitle(title: string): string {
  return title.length <= META_TITLE_BUDGET ? title : `${title.slice(0, META_TITLE_BUDGET - 1).trimEnd()}…`;
}
