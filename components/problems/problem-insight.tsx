import Link from "next/link";
import { ArticleBody } from "@/components/learn/article-body";
import { findPublishedProblemInsight, type ProblemInsight as Insight } from "@/lib/problem-insights";

/** Server-only editorial supplement. Drafts have no public representation. */
export function PublishedProblemInsight({ problemId }: { problemId: string }) {
  const insight = findPublishedProblemInsight(problemId);
  return insight ? <ProblemInsightContent insight={insight} /> : null;
}

/** Also used by isolated editorial render tests, without introducing a preview URL. */
export function ProblemInsightContent({ insight }: { insight: Insight }) {
  return (
    <section aria-label="Problem insight" className="space-y-4 border-t pt-6">
      <h2 className="text-xl font-semibold">{insight.title}</h2>
      <p className="max-w-prose text-sm text-muted-foreground">Original Physcratic commentary</p>
      <h3 className="font-semibold">Concepts to consider</h3>
      <p className="max-w-prose">{insight.prerequisites}</p>
      <p className="max-w-prose">{insight.idea}</p>
      <details className="max-w-full">
        <summary className="min-h-11 cursor-pointer rounded-sm py-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">Show derivations and final results (spoilers)</summary>
        <div className="space-y-4 pt-3">
          <p className="max-w-prose">{insight.misconception}</p>
          <ArticleBody blocks={insight.hints} sources={insight.sources} />
          <h3 className="font-semibold">Source papers</h3>
          <p className="max-w-prose text-sm text-muted-foreground">Organizer-authored papers hosted by an archive mirror. References support the physical model and results. The explanation above identifies the original commentary.</p>
          <ol className="list-decimal space-y-2 pl-6">
            {insight.sources.map((source, index) => <li key={source.id} id={`source-${index + 1}`}><a href={source.url} className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground">{source.title}</a></li>)}
          </ol>
        </div>
      </details>
      <nav aria-label="Related learning" className="flex flex-wrap gap-x-6 gap-y-2">
        <Link className="inline-flex min-h-11 items-center underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground" href={`/problems/topics/${insight.topic}`}>Browse this topic</Link>
        <Link className="inline-flex min-h-11 items-center underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground" href={`/learn/${insight.guide.slug}${insight.guide.hash ? `#${insight.guide.hash}` : ""}`}>Related guide</Link>
      </nav>
    </section>
  );
}
