export type ProblemCollection = "arena" | "catalog" | "pilot" | "authored";

export function parseProblemCollection(value: string | null): ProblemCollection {
  return value === "catalog" || value === "pilot" || value === "authored"
    ? value
    : "arena";
}

export function problemCollectionHref(href: string, collection: string): string {
  const url = new URL(href);
  url.searchParams.set("collection", parseProblemCollection(collection));
  return `${url.pathname}${url.search}${url.hash}`;
}
