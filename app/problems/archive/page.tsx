import Link from "next/link";
import type { Metadata } from "next";
import { CrumbTrail } from "@/components/problems/problem-links";
import { problemLinkClass } from "@/components/problems/problem-list-links";
import { jsonLdScript, problemListGraph } from "@/lib/seo/json-ld";
import { allProblemPages, type ProblemPage } from "@/lib/seo/problem-pages";
import { SITE, baseOpenGraph } from "@/lib/site";

const TITLE = "IPhO, APhO and EuPhO problem archive";
const DESCRIPTION =
  "Theory problems from IPhO, APhO and EuPhO, grouped by olympiad and year. Each has its own page with the statement as text and a link to the official PDF.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/problems/archive" },
  openGraph: { ...baseOpenGraph, title: `${TITLE} | Physcratic`, description: DESCRIPTION, url: "/problems/archive" },
};

const COMPETITIONS = ["IPhO", "APhO", "EuPhO"] as const;
const NAMES: Record<(typeof COMPETITIONS)[number], string> = {
  IPhO: "International Physics Olympiad",
  APhO: "Asian Physics Olympiad",
  EuPhO: "European Physics Olympiad",
};

export default function ArchivePage() {
  const archive = allProblemPages().filter((page) => page.kind === "archive");
  const crumbs = [
    { name: SITE.name, path: "/" },
    { name: "Problems", path: "/problems" },
    { name: "Archive", path: "/problems/archive" },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(problemListGraph({ crumbs, name: TITLE, description: DESCRIPTION, path: "/problems/archive", items: archive })) }}
      />
      <CrumbTrail crumbs={crumbs} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Olympiad problem archive</h1>
      <p className="mt-4 max-w-prose text-lg text-muted-foreground">
        {archive.length} theory problems. Open one to read the statement, see the official PDF and write your own solution.
      </p>
      {COMPETITIONS.map((competition) => {
        const own = archive.filter((page) => page.competition === competition);
        const years = [...new Set(own.map((page) => page.year!))].sort((a, b) => b - a);
        return (
          <section key={competition} aria-labelledby={`h-${competition}`} className="mt-10">
            <h2 id={`h-${competition}`} className="text-2xl font-semibold tracking-tight">
              {competition}
              <span className="ml-2 text-base font-normal text-muted-foreground">{NAMES[competition]}</span>
            </h2>
            {years.map((year) => (
              <div key={year} id={`${competition.toLowerCase()}-${year}`} className="mt-4 scroll-mt-6">
                <h3 className="text-lg font-medium">{competition} {year}</h3>
                <ul className="flex flex-col">
                  {own
                    .filter((page: ProblemPage) => page.year === year)
                    .sort((a, b) => a.number! - b.number!)
                    .map((page) => (
                      <li key={page.id} className="flex flex-wrap items-baseline gap-x-2">
                        <Link href={page.path} className={problemLinkClass}>
                          Problem {page.number}: {page.title}
                        </Link>
                        <span className="text-sm text-muted-foreground">{page.topic}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </>
  );
}
