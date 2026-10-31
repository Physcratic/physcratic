// After PR #2 merges, add catalog + Arena problems and /coaching here (Batch 3b).
//
// Single registry of URLs that resolve with 200 on main today. The sitemap,
// llms.txt and the dashboard metadata all derive from it.
import { filterCatalog } from "../corpus-catalog";
import { problems, topics, type Problem } from "../physics";

export type PublicRouteKind = "home" | "overview" | "view" | "topic" | "problem" | "legal";

export interface PublicRoute {
  path: string;
  kind: PublicRouteKind;
  title: string;
  /** Topic name (problem and topic entries). */
  topic?: string;
  /** false → listed for humans/llms.txt but never in the sitemap (noindex page). */
  indexable: boolean;
}

/**
 * True when /dashboard?view=problems&topic=<name> shows something: either
 * lib/physics practice problems, or catalog problems via the same filter (and
 * tagLabel mapping, e.g. "Modern" → "Modern physics") the UI uses.
 */
export function topicHasProblems(topic: string): boolean {
  return (
    problems.some((problem) => problem.topic === topic) ||
    filterCatalog({ topic }).length > 0
  );
}

export function findPublicProblem(id: string): Problem | null {
  return problems.find((problem) => problem.id === id) ?? null;
}

export const publicRoutes: PublicRoute[] = [
  { path: "/", kind: "home", title: "Physcratic", indexable: true },
  { path: "/dashboard", kind: "overview", title: "Physcratic", indexable: true },
  ...(
    [
      ["problems", "Physics Olympiad problems"],
      ["contests", "Physics contests"],
      ["rankings", "Rankings"],
      ["guide", "Learning guide"],
    ] as const
  ).map(([view, title]) => ({
    path: `/dashboard?view=${view}`,
    kind: "view" as const,
    title,
    indexable: true,
  })),
  ...topics
    .filter((topic) => topicHasProblems(topic.name))
    .map((topic) => ({
      path: `/dashboard?view=problems&topic=${encodeURIComponent(topic.name)}`,
      kind: "topic" as const,
      title: `${topic.name} physics problems`,
      topic: topic.name,
      indexable: true,
    })),
  ...problems.map((problem) => ({
    path: `/dashboard/problems/${problem.id}`,
    kind: "problem" as const,
    title: problem.title,
    topic: problem.topic,
    indexable: true,
  })),
  { path: "/terms", kind: "legal", title: "Terms of Service", indexable: false },
];

export const indexableRoutes = publicRoutes.filter((route) => route.indexable);
