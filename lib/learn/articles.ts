import { booksAndResources } from "./guides/books-and-resources";
import { compareOlympiads } from "./guides/compare-olympiads";
import { howMarkingWorks } from "./guides/how-marking-works";
import { startPreparing } from "./guides/start-preparing";
import { howToUsePhyscratic } from "./guides/how-to-use-physcratic";
import { howToWriteAProblem } from "./guides/how-to-write-a-problem";
import { withReadingMinutes } from "./reading";
import type { Article } from "./types";

export type { Article, ArticleDraft, Block, Source, TableCell } from "./types";
export { CHECK_HOST_SITE } from "./types";

/** All guides, published or not, in the order they appear on the hub. */
export const articles: Article[] = [
  startPreparing,
  compareOlympiads,
  howMarkingWorks,
  booksAndResources,
  howToUsePhyscratic,
  howToWriteAProblem,
].map(withReadingMinutes);

export const publishedArticles: Article[] = articles.filter((a) => a.published);

export function findArticle(slug: string): Article | null {
  return publishedArticles.find((a) => a.slug === slug) ?? null;
}

/** The muted line at the end of every guide that points readers to the coaching page. */
export const COACHING_LINE = {
  lead: "Want a coach who has sat these exams?",
  linkLabel: "Meet our medallist coaches.",
  href: "/coaching",
} as const;

export const learnPath = (slug?: string) => (slug ? `/learn/${slug}` : "/learn");

/** "1 November 2026" for an ISO date. Fixed to UTC so server and tests agree. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
