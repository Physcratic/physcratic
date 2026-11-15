import Link from "next/link";
import { allProblemPages } from "@/lib/seo/problem-pages";
import { catalogProblems } from "@/lib/corpus-catalog";
import { OlympiadProblemCard } from "@/components/physics/olympiad-problem-card";
import { problemLinkClass } from "./problem-list-links";
import { Button } from "@/components/ui/button";
import { archiveCompetitions, browseArchive } from "@/lib/archive-browse";

/** Registry controls membership and ordering. Existing catalog cards supply source, tags, host and rating. */
export function ArchiveDirectory({ edition }: { edition?: string | string[] }) {
  const browse = browseArchive(allProblemPages(), edition);
  const archive = browse.problems;
  const catalog = new Map(catalogProblems.map(problem => [problem.id, problem]));
  return <div className="flex min-w-0 flex-col gap-7">
    <div className="space-y-2">
      <h1 className="text-2xl font-medium tracking-[-0.04em] sm:text-[27px]">Olympiad problem archive</h1>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">Choose an olympiad and year, then open a problem.</p>
    </div>
    <form action="/problems/archive#archive-results" method="get" className="flex flex-wrap items-end gap-3" aria-label="Find olympiad problems">
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-80">
        <label htmlFor="archive-edition" className="text-sm font-medium">Olympiad and year</label>
        <select key={browse.value} id="archive-edition" name="edition" defaultValue={browse.value} className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">All olympiads and years</option>
          {browse.groups.map(group => <optgroup key={group.competition} label={group.name}>
            {group.choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </optgroup>)}
        </select>
      </div>
      <Button type="submit">Show problems</Button>
      {browse.value && <Link href="/problems/archive#archive-results" className={problemLinkClass}>Show full archive</Link>}
    </form>
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <p id="archive-results" tabIndex={-1} className="scroll-mt-24 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{archive.length} {archive.length === 1 ? "problem" : "problems"} · {browse.label}</p>
      <Link href="/problems" className={problemLinkClass}>Search by topic or difficulty</Link>
    </div>
    {!browse.value && <nav aria-label="Olympiads" className="flex flex-wrap gap-x-6">
      {archiveCompetitions.map(([code, name]) => <Link key={code} href={`#h-${code}`} className={problemLinkClass} aria-label={`${code}: ${name}`}>{code}</Link>)}
    </nav>}
    {archiveCompetitions.map(([competition, name]) => {
      const own = archive.filter(page => page.competition === competition);
      if (!own.length) return null;
      const years = [...new Set(own.map(page => page.year!))].sort((a,b) => b-a);
      return <section key={competition} aria-labelledby={`h-${competition}`} className="min-w-0 space-y-5">
        <div className="space-y-2">
          <h2 id={`h-${competition}`} className="scroll-mt-24 text-xl font-medium">{competition}</h2>
          <p className="text-sm text-muted-foreground">{name}</p>
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
