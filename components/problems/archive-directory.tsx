import Link from "next/link";
import { allProblemPages } from "@/lib/seo/problem-pages";
import { catalogProblems } from "@/lib/corpus-catalog";
import { OlympiadProblemCard } from "@/components/physics/olympiad-problem-card";
import { problemLinkClass } from "./problem-list-links";

const competitions = [
  ["IPhO", "International Physics Olympiad"],
  ["APhO", "Asian Physics Olympiad"],
  ["EuPhO", "European Physics Olympiad"],
] as const;

/** Registry controls membership and ordering. Existing catalog cards supply source, tags, host and rating. */
export function ArchiveDirectory() {
  const archive = allProblemPages().filter(page => page.kind === "archive");
  const catalog = new Map(catalogProblems.map(problem => [problem.id, problem]));
  return <div className="flex min-w-0 flex-col gap-7">
    <div className="space-y-2">
      <h1 className="text-2xl font-medium tracking-[-0.04em] sm:text-[27px]">Olympiad problem archive</h1>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{archive.length} theory problems. Open one to read the statement, see the official PDF and write your own solution.</p>
      <Link href="/problems" className={problemLinkClass}>Search and filter the problem library</Link>
    </div>
    <nav aria-label="Olympiads" className="flex flex-wrap gap-x-6">
      {competitions.map(([code, name]) => <Link key={code} href={`#h-${code}`} className={problemLinkClass} aria-label={`${code}: ${name}`}>{code}</Link>)}
    </nav>
    {competitions.map(([competition, name]) => {
      const own = archive.filter(page => page.competition === competition);
      const years = [...new Set(own.map(page => page.year!))].sort((a,b) => b-a);
      return <section key={competition} aria-labelledby={`h-${competition}`} className="min-w-0 space-y-5">
        <div className="space-y-2">
          <h2 id={`h-${competition}`} className="scroll-mt-24 text-xl font-medium">{competition}</h2>
          <p className="text-sm text-muted-foreground">{name}</p>
          <nav aria-label={`${competition} years`} className="flex flex-wrap gap-x-4">
            {years.map(year => <Link key={year} href={`#${competition.toLowerCase()}-${year}`} className={problemLinkClass}>{year}</Link>)}
          </nav>
        </div>
        {years.map(year => <section key={year} id={`${competition.toLowerCase()}-${year}`} aria-labelledby={`${competition}-${year}-heading`} className="scroll-mt-24 space-y-4">
          <h3 id={`${competition}-${year}-heading`} className="text-lg font-medium">{competition} {year}</h3>
          <ul className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
            {own.filter(page => page.year === year).sort((a,b) => a.number!-b.number!).map(page => {
              const problem = catalog.get(page.id);
              if (!problem) throw new Error(`Archive registry entry missing catalog metadata: ${page.id}`);
              return <li key={page.id} className="min-w-0"><OlympiadProblemCard problem={{ ...problem, title: page.title }} /></li>;
            })}
          </ul>
        </section>)}
      </section>;
    })}
  </div>;
}
