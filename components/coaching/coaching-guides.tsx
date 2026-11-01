import Link from "next/link";
import { content } from "@/lib/coaching/content";
import { learnPath, publishedArticles } from "@/lib/learn/articles";

const { guides } = content;

/**
 * An extra, so it is quieter than the sections above: a plain sans heading, small bordered cards and
 * no accent fill. One card per published guide, read from lib/learn. A scroll row on mobile, a grid on desktop.
 */
export function CoachingGuides() {
  if (publishedArticles.length === 0) return null;
  return <section id="guides" aria-labelledby="guides-title" className="border-t border-border py-14">
    <div className="coaching-container flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <h2 id="guides-title" className="text-2xl font-semibold tracking-tight">{guides.title}</h2>
          <p className="text-muted-foreground">{guides.intro}</p>
        </div>
        <Link href={learnPath()} className="coaching-link text-sm font-semibold text-muted-foreground hover:text-foreground">{guides.seeAll}</Link>
      </div>
      <ul aria-label={guides.listLabel} className="coaching-guide-row -mx-6 flex scroll-px-6 snap-x gap-3 overflow-x-auto sm:scroll-px-8 md:scroll-px-0 px-6 pb-3 pt-2 sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:p-0">
        {publishedArticles.map((article) => <li key={article.slug} className="w-64 shrink-0 snap-start md:w-auto">
          <Link href={learnPath(article.slug)} className="coaching-lift flex h-full flex-col gap-2 rounded-xl border border-border p-4">
            <span className="font-semibold leading-snug">{article.title}</span>
            <span className="text-sm leading-relaxed text-muted-foreground">{article.description}</span>
            <span className="mt-auto pt-1 text-xs text-muted-foreground">{article.readingMinutes} {guides.minutes}</span>
          </Link>
        </li>)}
      </ul>
    </div>
  </section>;
}
