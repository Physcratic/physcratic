import Link from "next/link";
import type { Metadata } from "next";
import { CrumbTrail } from "@/components/problems/problem-links";
import { ProblemLinkList, problemLinkClass } from "@/components/problems/problem-list-links";
import { jsonLdScript, problemListGraph } from "@/lib/seo/json-ld";
import { allProblemPages, topicsWithProblems } from "@/lib/seo/problem-pages";
import { SITE, baseOpenGraph } from "@/lib/site";

const TITLE = "Physics olympiad problem library";
const DESCRIPTION =
  "Every Physcratic problem in one list: Physcratic Arena problems and the IPhO, APhO and EuPhO archive, each with its own page.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/problems" },
  openGraph: { ...baseOpenGraph, title: `${TITLE} | Physcratic`, description: DESCRIPTION, url: "/problems" },
};

export default function ProblemLibraryPage() {
  const pages = allProblemPages();
  const arena = pages.filter((page) => page.kind === "arena");
  const archive = pages.filter((page) => page.kind === "archive");
  const crumbs = [
    { name: SITE.name, path: "/" },
    { name: "Problems", path: "/problems" },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(problemListGraph({ crumbs, name: TITLE, description: DESCRIPTION, path: "/problems", items: pages })) }}
      />
      <CrumbTrail crumbs={crumbs} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Problem library</h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        {pages.length} physics olympiad problems with checked answers where a problem has a numerical answer. Pick a topic, the archive or a list below.
      </p>
      <p className="mt-3">
        <Link href="/dashboard?view=problems" className={problemLinkClass}>
          Open the interactive library with filters
        </Link>
      </p>
      <nav aria-labelledby="by-topic" className="mt-8">
        <h2 id="by-topic" className="text-xl font-semibold tracking-tight">By topic</h2>
        <ul className="mt-2 flex flex-wrap gap-x-4">
          {topicsWithProblems().map((topic) => (
            <li key={topic.slug}>
              <Link href={`/problems/topics/${topic.slug}`} className={problemLinkClass}>
                {topic.name} ({topic.count})
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <section aria-labelledby="archive-heading" className="mt-8">
        <h2 id="archive-heading" className="text-xl font-semibold tracking-tight">Olympiad archive</h2>
        <p className="mt-2 max-w-prose text-muted-foreground">
          {archive.length} theory problems from IPhO, APhO and EuPhO, one page each.
        </p>
        <p className="mt-2">
          <Link href="/problems/archive" className={problemLinkClass}>
            Browse the archive by olympiad and year
          </Link>
        </p>
      </section>
      <section aria-labelledby="arena" className="mt-8">
        <h2 id="arena" className="text-xl font-semibold tracking-tight">Physcratic Arena</h2>
        <ProblemLinkList pages={arena} />
      </section>
    </>
  );
}
