/**
 * llms.txt and llms-full.txt, both built from the route registry that also builds the sitemap. llms.txt stays a short
 * index (a test keeps it under 5 KB) and llms-full.txt lists every page in the sitemap, one line each.
 */
import { SITE } from "../site";
import { indexableRoutes, publicRoutes, type PublicRoute } from "./public-routes";

const pick = (kind: PublicRoute["kind"]) => indexableRoutes.filter((route) => route.kind === kind);
const header = (base: string) => [
  `# ${SITE.name}`,
  "",
  `> ${SITE.description}`,
  "",
  "Physcratic is free physics olympiad practice with IPhO, APhO and EuPhO problems and checked answers.",
  "It is for high-school students and coaches preparing for physics olympiads.",
  "The site is in beta: the problem set is growing and English translations are drafts.",
  "",
  `Every page below is also in ${base}/sitemap.xml.`,
  "",
];

/** A few indexable problems, so an agent can see what a problem page looks like. Archive pages are noindex for now. */
const EXAMPLES = ["incline", "projectile", "arena-mind-the-gap", "arena-the-bubble-treaty"];

export function llmsIndex(base: string): string {
  const abs = (path: string) => `${base}${path}`;
  const terms = publicRoutes.find((route) => route.path === "/terms");
  const guides = pick("learn").filter((route) => route.path !== "/learn");
  const hub = indexableRoutes.find((route) => route.path === "/learn");
  const examples = EXAMPLES.flatMap((id) => indexableRoutes.find((route) => route.path === `/dashboard/problems/${id}`) ?? []);
  const lines = [
    ...header(base),
    "## Problem library",
    "",
    ...pick("library").map((route) => `- [${route.title}](${abs(route.path)}): ${route.summary}`),
    ...pick("topic").map((route) => `- [${route.title}](${abs(route.path)}): topic page`),
    "",
    "## Example problems",
    "",
    ...examples.map((route) => `- [${route.title}](${abs(route.path)}): ${route.topic}`),
    `- Every problem page, one line each: ${abs("/llms-full.txt")}`,
    "",
    ...(guides.length > 0
      ? ["## Guides", "", ...(hub ? [`- [All guides](${abs(hub.path)}): plain guides with cited sources`] : []), ...guides.map((route) => `- [${route.title}](${abs(route.path)})`), ""]
      : []),
    ...(pick("coaching").length > 0 ? ["## Coaching", "", ...pick("coaching").map((route) => `- [${route.title}](${abs(route.path)})`), ""] : []),
    "## Optional",
    "",
    ...(terms ? [`- [${terms.title}](${abs(terms.path)})`] : []),
    "",
  ];
  return lines.join("\n");
}

export function llmsFull(base: string): string {
  const abs = (path: string) => `${base}${path}`;
  const problems = pick("problem");
  const section = (title: string, group: PublicRoute["group"]) => {
    const own = problems.filter((route) => route.group === group);
    return ["", `## ${title} (${own.length} problems)`, "", ...own.map((route) => `- [${route.title}](${abs(route.path)}): ${route.topic}`)];
  };
  return [
    ...header(base),
    "## Pages",
    "",
    ...[...pick("library"), ...pick("topic")].map((route) => `- [${route.title}](${abs(route.path)})`),
    ...section("Olympiad archive", "archive"),
    ...section("Physcratic Arena", "arena"),
    ...section("Practice problems", "practice"),
    "",
    "## Guides",
    "",
    ...pick("learn").map((route) => `- [${route.title}](${abs(route.path)})`),
    "",
    "## Coaching",
    "",
    ...pick("coaching").map((route) => `- [${route.title}](${abs(route.path)})`),
    "",
  ].join("\n");
}
