// The one way back from a problem page. The label is the same everywhere. Only the target changes.
export const problemBackLabel = "All problems";

/** Where a guest goes, and where a signed-in person goes. */
export const guestProblemsHref = "/problems";
export const signedInProblemsHref = "/dashboard?view=problems";

/** The archive list at the year the problem belongs to, for an archive problem. Other problems have none. */
export function archiveBackHref(page: { kind: string; competition?: string; year?: number }): string | undefined {
  if (page.kind !== "archive" || !page.competition || page.year === undefined) return undefined;
  return `/problems/archive#${page.competition.toLowerCase()}-${page.year}`;
}

/** An archive problem returns to the archive list, for everyone. Any other problem returns to the library the person uses. */
export function problemBackHref({ signedIn, archiveHref }: { signedIn: boolean; archiveHref?: string }): string {
  return archiveHref ?? (signedIn ? signedInProblemsHref : guestProblemsHref);
}

/** The breadcrumb is for guests and crawlers. A signed-in person has the back link and does not see it. */
export function showProblemCrumbs(signedIn: boolean): boolean {
  return !signedIn;
}
