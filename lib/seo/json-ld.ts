import { classHours, content as coachingContent } from "../coaching/content";
import type { Article } from "../learn/types";
import type { Problem } from "../physics";
import { SITE, siteUrl } from "../site";
import { problemDescription } from "./problem-descriptions";

/** Largest raster icon in public/ (512×512). */
const LOGO_PATH = "/icon-512.png";

const orgId = () => `${siteUrl()}/#organization`;

/** Physcratic's Instagram profile, the same link as in the coaching footer. */
export const INSTAGRAM_URL = "https://www.instagram.com/physcratic";

export function organization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId(),
    name: SITE.name,
    url: siteUrl(),
    logo: `${siteUrl()}${LOGO_PATH}`,
    sameAs: [INSTAGRAM_URL],
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

/** Editorial summaries for identified problems; preserve the 300-char prompt-only API. */
export function problemSummary(problem: Pick<Problem, "prompt"> & Partial<Pick<Problem, "id">>): string {
  if (problem.id) return problemDescription(problem);
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
      ...(article.reviewedBy ? { reviewedBy: { "@type": "Person", name: article.reviewedBy.name } } : {}),
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

/**
 * Structured data for /coaching, built from lib/coaching/content.ts: the Organization, a Service that
 * lists the programs, one Course per program and a BreadcrumbList. Courses are online, weekly and
 * two hours long, and carry no prices, because prices are set per country.
 *
 * On purpose there is NO FAQPage, Review, AggregateRating or Person markup:
 * - FAQPage rich results ended in May 2026, so the markup would buy nothing.
 * - Reviews of your own business are self-serving and not eligible for review rich results, and a single
 *   quoted student is not an aggregate rating.
 * - Some coaches may be minors, so no Person node is published for any of them.
 */
export function coachingGraph(content: typeof coachingContent = coachingContent) {
  const base = siteUrl();
  const url = `${base}/coaching`;
  const courseId = (pathway: string) => `${url}#course-${pathway.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
  const courses = content.programs.items.map((item) => ({
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": courseId(item.pathway),
    name: item.title,
    description: `${item.for} ${item.goal}`,
    url,
    provider: { "@id": orgId() },
    educationalLevel: item.title.replace(/^Olympiad /, ""),
    inLanguage: ["en"],
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseSchedule: { "@type": "Schedule", repeatFrequency: "P1W", duration: `PT${classHours}H` },
    },
  }));
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: content.ui.brand,
    description: content.meta.description,
    url,
    serviceType: content.seo.serviceType,
    provider: { "@id": orgId() },
    areaServed: "Worldwide",
    audience: { "@type": "EducationalAudience", educationalRole: "student" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: content.programs.title,
      itemListElement: courses.map((course) => ({ "@id": course["@id"] })),
    },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: SITE.name, item: base },
      { name: content.seo.breadcrumb, item: url },
    ].map((entry, index) => ({ "@type": "ListItem", position: index + 1, ...entry })),
  };
  return [organization(), service, ...courses, breadcrumbs];
}

/** JSON for an inline <script>: < > & are escaped so no value can close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Structured data for the /learn hub: the Organization, a CollectionPage whose main entity is an
 * ItemList of the published guides, and a BreadcrumbList (Physcratic, Learn). No guide title or slug is
 * typed here: the caller passes the published guides from lib/learn, in the order the hub shows them,
 * so an unpublished guide never appears. With no guides there is no ItemList.
 */
export function learnHubGraph({ title, description, articles }: { title: string; description: string; articles: readonly Pick<Article, "slug" | "title">[] }) {
  const base = siteUrl();
  const url = `${base}/learn`;
  const listId = `${url}#guides`;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": listId,
    name: title,
    itemListOrder: "https://schema.org/ItemListUnordered",
    numberOfItems: articles.length,
    itemListElement: articles.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: article.title,
      url: `${base}/learn/${article.slug}`,
    })),
  };
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: title,
    description,
    inLanguage: "en-GB",
    isAccessibleForFree: true,
    publisher: { "@id": orgId() },
    ...(articles.length > 0 ? { mainEntity: { "@id": listId } } : {}),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: SITE.name, item: base },
      { name: "Learn", item: url },
    ].map((entry, index) => ({ "@type": "ListItem", position: index + 1, ...entry })),
  };
  return [organization(), collection, ...(articles.length > 0 ? [itemList] : []), breadcrumbs];
}
