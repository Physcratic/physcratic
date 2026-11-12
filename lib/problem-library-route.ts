import { parseProblemCollection } from "./problem-collection-route";
import { tagLabel } from "./problem-tags";
import { bandFilterIds } from "./rating-bands";

type Params = Pick<URLSearchParams, "get">;

/** Shared by the public library and the dashboard. Never includes account or progress state. */
export function parseLibraryFilters(params: Params) {
  const tagInput = (params.get("tag") ?? params.get("topic") ?? "").slice(0, 80);
  const tag = tagInput.trim();
  const difficulty = params.get("difficulty") ?? "all";
  return {
    collection: parseProblemCollection(params.get("collection")),
    search: (params.get("q") ?? "").slice(0, 200),
    tagInput,
    topic: tag ? tagLabel(tag) : "all",
    competition: (params.get("competition") ?? "").slice(0, 100),
    difficulty: difficulty === "unrated" || bandFilterIds.includes(difficulty) ? difficulty : "all",
    exercise: (params.get("exercise") ?? "").slice(0, 100),
  };
}

type FilterKey = "collection" | "q" | "tag" | "difficulty" | "competition" | "exercise";

/** Keep the current route, unrelated parameters and fragment. A tag replaces the sidebar's topic. */
export function libraryFilterHref(href: string, changes: Partial<Record<FilterKey, string>>) {
  const url = new URL(href);
  if ("tag" in changes) url.searchParams.delete("topic");
  for (const [key, value] of Object.entries(changes)) {
    if (!value || ((key === "tag" || key === "difficulty") && value === "all")) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
