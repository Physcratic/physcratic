import Link from "next/link";
import { allProblemPages, topicsWithProblems } from "@/lib/seo/problem-pages";
import { ProblemLinkList, problemLinkClass } from "./problem-list-links";

/** One directory from the public route registry, available without JavaScript or a collection API. */
export function PublicProblemDirectory() {
  const pages = allProblemPages();
  return (
    <section aria-labelledby="public-directory-heading" className="mt-10 min-w-0 border-t pt-6">
      <h2 id="public-directory-heading" className="text-lg font-medium">Browse by topic or source</h2>
      <nav aria-label="Problems by topic" className="mt-2">
        <ul className="flex flex-wrap gap-x-4">
          {topicsWithProblems().map(topic => (
            <li key={topic.slug}><Link className={problemLinkClass} href={`/problems/topics/${topic.slug}`}>{topic.name} ({topic.count})</Link></li>
          ))}
        </ul>
      </nav>
      <p><Link className={problemLinkClass} href="/problems/archive">Browse the archive by olympiad and year</Link></p>
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer rounded-md py-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">All {pages.length} Arena and archive problems</summary>
        <p className="my-3 text-sm text-muted-foreground">Open a problem directly from this list. Topic pages and the archive include source details. This directory also works without JavaScript.</p>
        <section aria-labelledby="arena" className="space-y-2">
          <h3 id="arena" className="font-medium">Physcratic Arena</h3>
          <ProblemLinkList pages={pages.filter(page => page.kind === "arena")} />
        </section>
        <section aria-labelledby="archive-directory-heading" className="mt-6 space-y-2">
          <h3 id="archive-directory-heading" className="font-medium">Olympiad archive</h3>
          <ProblemLinkList pages={pages.filter(page => page.kind === "archive")} />
        </section>
      </details>
    </section>
  );
}
