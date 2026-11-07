import Link from "next/link";
import { LearnHeader } from "@/components/learn-header";
import { SkipLink } from "@/components/skip-link";
import { Button } from "@/components/ui/button";
import { publishedArticles, learnPath } from "@/lib/learn/articles";
import { allProblemPages, topicsWithProblems } from "@/lib/seo/problem-pages";
import { problems } from "@/lib/physics";

const linkClass =
  "inline-flex min-h-11 items-center rounded-md underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The public home page for a signed-out visitor or a crawler. Plain server HTML: one sentence that says what
 * Physcratic is, and links to the problem library, the archive, Learn and Coaching.
 */
export function HomeLanding() {
  const pages = allProblemPages();
  const archive = pages.filter((page) => page.kind === "archive").length;
  const topics = topicsWithProblems();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <LearnHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 py-8 focus:outline-none sm:px-6 sm:py-12">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Free physics olympiad practice</h1>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-muted-foreground" data-home-sentence>
          Physcratic is free physics olympiad practice with IPhO, APhO and EuPhO problems and checked answers.
        </p>
        <nav aria-label="Start here" className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="min-h-11 w-full sm:w-auto">
            <Link href={`/dashboard/problems/${problems[0].id}`}>Try a problem</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/problems">Problem library</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/problems/archive">Olympiad archive</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/learn">Learn</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/coaching">Coaching</Link>
          </Button>
        </nav>

        <section aria-labelledby="topics-heading" className="mt-8">
          <h2 id="topics-heading" className="text-xl font-semibold tracking-tight">Problems by topic</h2>
          <ul className="mt-2 flex flex-wrap gap-x-4">
            {topics.map((topic) => (
              <li key={topic.slug}>
                <Link href={`/problems/topics/${topic.slug}`} className={linkClass}>
                  {topic.name} ({topic.count})
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="what-heading" className="mt-10">
          <h2 id="what-heading" className="text-xl font-semibold tracking-tight">What you can do here</h2>
          <ul className="mt-3 flex max-w-prose list-disc flex-col gap-2 pl-5 leading-relaxed">
            <li>Read {archive} theory problems from IPhO, APhO and EuPhO, each on its own page with a link to the official PDF.</li>
            <li>Practise {pages.length - archive} more problems and get your answer checked where a problem has a numerical answer.</li>
            <li>Write your own solution, then open the worked solution when you are ready.</li>
          </ul>
          <p className="mt-4">
            <Link href="/sign-up" className={linkClass}>Make a free account</Link>
            <span className="px-2 text-muted-foreground">or</span>
            <Link href="/sign-in" className={linkClass}>sign in</Link>
          </p>
        </section>


        <section aria-labelledby="learn-heading" className="mt-10">
          <h2 id="learn-heading" className="text-xl font-semibold tracking-tight">Guides</h2>
          <ul className="mt-2 flex flex-col">
            {publishedArticles.map((article) => (
              <li key={article.slug}>
                <Link href={learnPath(article.slug)} className={linkClass}>{article.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
