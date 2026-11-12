import { problems } from "./physics";

/** The complete closed legacy set, identified from its source model, never by rating. */
export const retiredPracticeIds: readonly string[] = problems.map(({ id }) => id);
export const ARENA_LIBRARY_HREF = "/dashboard?view=problems&collection=arena";

export function isRetiredPracticeProblem(id: string): boolean {
  return retiredPracticeIds.includes(id);
}

/** Explicit exact reader routes. No prefix matching of Arena, archive or authored identities. */
export function legacyPracticeRedirects() {
  return retiredPracticeIds.map(id => ({
    source: `/dashboard/problems/${id}`,
    destination: ARENA_LIBRARY_HREF,
    permanent: true,
  }));
}
