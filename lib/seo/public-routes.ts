// Single registry of URLs that resolve with 200 today. The sitemap, llms.txt and the metadata guard test all
// derive from it. Every problem comes from lib/seo/problem-pages.ts. There are no query-string URLs here: topics
// have their own paths (/problems/topics/<slug>) and /dashboard is the signed-in app, which is noindex.
import { filterProblemsByTag } from "../problem-tags";
import { content as coachingContent } from "../coaching/content";
import { learnPath, publishedArticles } from "../learn/articles";
import { allProblemPages, topicsWithProblems } from "./problem-pages";

export type PublicRouteKind = "home" | "library" | "topic" | "problem" | "learn" | "coaching" | "legal";

export interface PublicRoute {
  path: string;
  kind: PublicRouteKind;
  title: string;
  /** Topic name (problem and topic entries). */
  topic?: string;
  /** Problem entries: practice, arena or archive. */
  group?: "practice" | "arena" | "archive";
  /** Short line for llms.txt. */
  summary?: string;
  /** YYYY-MM-DD from the data. Absent when the data has no date, and then the sitemap leaves lastmod out. */
  lastmod?: string;
  /** false → listed for humans but never in the sitemap or llms.txt (noindex page). */
  indexable: boolean;
}

/** All public topic availability follows the same retained page registry as discovery. */
export function topicHasProblems(topic: string): boolean {
  return filterProblemsByTag(allProblemPages(), topic).length > 0;
}

export const publicRoutes: PublicRoute[] = [
  { path: "/", kind: "home", title: "Physcratic", summary: "Free physics olympiad practice", indexable: true },
  { path: "/problems", kind: "library", title: "Problem library", summary: "Every problem in one list", indexable: true },
  { path: "/problems/archive", kind: "library", title: "Olympiad problem archive", summary: "IPhO, APhO and EuPhO problems by year", indexable: true },
  ...topicsWithProblems().map((topic) => ({
    path: `/problems/topics/${topic.slug}`,
    kind: "topic" as const,
    title: `${topic.name} problems`,
    topic: topic.name,
    indexable: true,
  })),
  ...allProblemPages().map((page) => ({
    path: page.path,
    kind: "problem" as const,
    title: page.competition ? `${page.title}, ${page.competition} ${page.year} Problem ${page.number}` : page.title,
    topic: page.topic,
    group: page.kind,
    summary: page.description,
    lastmod: page.lastmod,
    indexable: page.indexable,
  })),
  // Published guides only. An unpublished guide has no route, so it stays out of the sitemap.
  ...(publishedArticles.length > 0
    ? [{ path: learnPath(), kind: "learn" as const, title: "Physics Olympiad guides", indexable: true, lastmod: publishedArticles.map((a) => a.updated).sort().at(-1) }]
    : []),
  ...publishedArticles.map((article) => ({
    path: learnPath(article.slug),
    kind: "learn" as const,
    title: article.title,
    lastmod: article.updated,
    indexable: true,
  })),
  // Coaching pages: the main page and the two Tally form pages. The coaching content carries no dates, so no lastmod.
  { path: "/coaching", kind: "coaching", title: coachingContent.meta.title, indexable: true },
  { path: "/coaching/consultation", kind: "coaching", title: coachingContent.consultationPage.meta.title, indexable: true },
  { path: "/coaching/become-a-tutor", kind: "coaching", title: coachingContent.tutorPage.meta.title, indexable: true },
  { path: "/terms", kind: "legal", title: "Terms of Service", indexable: false },
];

export const indexableRoutes = publicRoutes.filter((route) => route.indexable);
