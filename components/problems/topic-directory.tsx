import Link from "next/link";
import type { ProblemPage } from "@/lib/seo/problem-pages";
import arena from "@/lib/arena/index.json";
import { catalogProblems } from "@/lib/corpus-catalog";
import { getProblemTags } from "@/lib/problem-tags";
import { getEstimatedProblemElo } from "@/lib/problem-archive";
import { ProblemCard } from "@/components/physics/problem-card";
import { OlympiadProblemCard } from "@/components/physics/olympiad-problem-card";
import { problemLinkClass } from "./problem-list-links";

/** Registry supplies membership, display titles and URLs. Existing models supply card metadata. */
export function TopicDirectory({ name, pages }: { name: string; pages: readonly ProblemPage[] }) {
  const originals = pages.filter(page => page.kind === "arena");
  const archive = pages.filter(page => page.kind === "archive");
  return <div className="flex min-w-0 flex-col gap-7">
    <div className="space-y-2">
      <h1 className="text-2xl font-medium tracking-[-0.04em] sm:text-[27px]">{name} problems</h1>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{pages.length} problems on {name.toLowerCase()}.</p>
      <Link href="/problems" className={problemLinkClass}>Search and filter the problem library</Link>
    </div>
    {originals.length > 0 && <section aria-labelledby="topic-arena" className="min-w-0 space-y-4">
      <h2 id="topic-arena" className="text-xl font-medium">Physcratic Arena</h2>
      <ul className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
        {originals.map(page => {
          const problem = arena.problems.find(problem => problem.id === page.id);
          if (!problem) throw new Error(`Topic Arena metadata missing: ${page.id}`);
          return <li key={page.id} className="min-w-0"><ProblemCard id={page.id} title={page.title} source="Physcratic" description={problem.summary} tags={getProblemTags(problem)} elo={getEstimatedProblemElo(page.id)} href={page.path} /></li>;
        })}
      </ul>
    </section>}
    {archive.length > 0 && <section aria-labelledby="topic-archive" className="min-w-0 space-y-5">
      <h2 id="topic-archive" className="text-xl font-medium">Olympiad archive</h2>
      {(["IPhO", "APhO", "EuPhO"] as const).map(competition => {
        const own = archive.filter(page => page.competition === competition).sort((a,b) => b.year!-a.year! || a.number!-b.number!);
        if (!own.length) return null;
        return <section key={competition} aria-labelledby={`topic-${competition}`} className="space-y-4">
          <h3 id={`topic-${competition}`} className="text-lg font-medium">{competition}</h3>
          <ul className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
            {own.map(page => {
              const problem = catalogProblems.find(problem => problem.id === page.id);
              if (!problem) throw new Error(`Topic archive metadata missing: ${page.id}`);
              return <li key={page.id} className="min-w-0"><OlympiadProblemCard problem={{ ...problem, title: page.title }} /></li>;
            })}
          </ul>
        </section>;
      })}
    </section>}
  </div>;
}
