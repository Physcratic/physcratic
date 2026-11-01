// After PR #2 merges, add catalog + Arena problems and /coaching here (Batch 3b).
//
// Single registry of URLs that resolve with 200 on main today. The sitemap,
// llms.txt and the dashboard metadata all derive from it.
import { content as coachingContent } from "../coaching/content";
import { filterCatalog } from "../corpus-catalog";
import { learnPath, publishedArticles } from "../learn/articles";
import { problems, topics, type Problem } from "../physics";

export type PublicRouteKind =
  | "overview"
  | "view"
  | "topic"
  | "problem"
  | "learn"
  | "coaching"
  | "legal";

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
  // Published guides only. An unpublished guide has no route, so it stays out of the sitemap.
  ...(publishedArticles.length > 0
    ? [
        {
          path: learnPath(),
          kind: "learn" as const,
          title: "Physics Olympiad guides",
          indexable: true,
        },
      ]
    : []),
  ...publishedArticles.map((article) => ({
    path: learnPath(article.slug),
    kind: "learn" as const,
    title: article.title,
    indexable: true,
  })),
  // Coaching pages: the main page and the two Tally form pages.
  { path: "/coaching", kind: "coaching", title: coachingContent.meta.title, indexable: true },
  { path: "/coaching/consultation", kind: "coaching", title: coachingContent.consultationPage.meta.title, indexable: true },
  { path: "/coaching/become-a-tutor", kind: "coaching", title: coachingContent.tutorPage.meta.title, indexable: true },
  { path: "/terms", kind: "legal", title: "Terms of Service", indexable: false },
];

export const indexableRoutes = publicRoutes.filter((route) => route.indexable);
