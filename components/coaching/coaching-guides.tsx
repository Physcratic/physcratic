import Link from "next/link";
import { content } from "@/lib/coaching/content";
import { learnPath, publishedArticles } from "@/lib/learn/articles";

const { guides } = content;

/**
 * A centered heading, one card per published guide and a directory link below the cards.
 */
export function CoachingGuides() {
  if (publishedArticles.length === 0) return null;
  return <section id="guides" aria-labelledby="guides-title" className="border-t border-border py-14">
    <div className="coaching-container flex flex-col gap-6">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <h2 id="guides-title" className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{guides.title}</h2>
          <p className="text-muted-foreground">{guides.intro}</p>
      </div>
      <ul aria-label={guides.listLabel} className="coaching-guide-row -mx-6 flex scroll-px-6 snap-x gap-3 overflow-x-auto sm:scroll-px-8 md:scroll-px-0 px-6 pb-3 pt-2 sm:-mx-8 sm:px-8 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:p-0">
        {publishedArticles.map((article) => <li key={article.slug} className="w-64 shrink-0 snap-start md:w-auto">
          <Link href={learnPath(article.slug)} className="coaching-lift flex h-full flex-col gap-3 rounded-xl border border-border p-5 sm:p-6">
            <h3 className="text-lg font-semibold leading-snug tracking-tight sm:text-xl">{article.title}</h3>
            <span className="text-sm leading-relaxed text-muted-foreground">{article.description}</span>
            <span className="mt-auto pt-1 text-xs text-muted-foreground">{article.readingMinutes} {guides.minutes}</span>
          </Link>
        </li>)}
      </ul>
      <Link href={learnPath()} className="coaching-button coaching-button-secondary self-center">{guides.seeAll}</Link>
    </div>
  </section>;
}
