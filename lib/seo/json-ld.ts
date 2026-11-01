import type { Article } from "../learn/types";
import type { Problem } from "../physics";
import { SITE, siteUrl } from "../site";

/** Largest raster icon in public/ (512×512). */
const LOGO_PATH = "/icon-512.png";

const orgId = () => `${siteUrl()}/#organization`;

export function organization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId(),
    name: SITE.name,
    url: siteUrl(),
    logo: `${siteUrl()}${LOGO_PATH}`,
  };
}

export function website() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl()}/#website`,
    name: SITE.name,
    url: siteUrl(),
    publisher: { "@id": orgId() },
  };
}

/** Plain-text summary, at most 300 chars. */
export function problemSummary(problem: Pick<Problem, "prompt">): string {
  const text = problem.prompt
    .replace(/\$\$?[^$]*\$\$?/g, " ")
    .replace(/[`*_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= 300 ? text : `${text.slice(0, 299).trimEnd()}…`;
}

export function problemGraph(problem: Problem) {
  const base = siteUrl();
  const url = `${base}/dashboard/problems/${problem.id}`;
  const topicUrl = `${base}/dashboard?view=problems&topic=${encodeURIComponent(problem.topic)}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Dashboard", item: `${base}/dashboard` },
        { name: "Problems", item: `${base}/dashboard?view=problems` },
        { name: problem.topic, item: topicUrl },
        { name: problem.title, item: url },
      ].map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        ...entry,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: problem.title,
      description: problemSummary(problem),
      url,
      inLanguage: "en",
      isAccessibleForFree: true,
      learningResourceType: "Problem",
      educationalLevel: "Physics Olympiad",
      about: { "@type": "Thing", name: problem.topic },
      publisher: { "@id": orgId() },
    },
  ];
}

/**
 * BreadcrumbList (Learn, then the guide), a WebPage that carries the reviewer
 * (schema.org defines reviewedBy on WebPage), and the Article it points to.
 */
export function articleGraph(article: Article) {
  const base = siteUrl();
  const url = `${base}/learn/${article.slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Learn", item: `${base}/learn` },
        { name: article.title, item: url },
      ].map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        ...entry,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: article.title,
      reviewedBy: { "@type": "Person", name: article.reviewedBy.name },
      mainEntity: { "@id": `${url}#article` },
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${url}#article`,
      headline: article.title,
      description: article.description,
      url,
      mainEntityOfPage: url,
      inLanguage: "en-GB",
      isAccessibleForFree: true,
      datePublished: article.updated,
      dateModified: article.updated,
      author: { "@id": orgId() },
      publisher: { "@id": orgId() },
      citation: article.sources.map((source) => ({
        "@type": "CreativeWork",
        name: source.title,
        url: source.url,
      })),
    },
  ];
}

/** JSON for an inline <script>: < > & are escaped so no value can close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
