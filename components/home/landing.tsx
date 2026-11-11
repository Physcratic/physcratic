import Link from "next/link";
import Layout from "@/components/kokonutui/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { publishedArticles, learnPath } from "@/lib/learn/articles";
import { findProblemPage, topicsWithProblems } from "@/lib/seo/problem-pages";
import { problems } from "@/lib/physics";

const linkClass =
  "inline-flex min-h-11 items-center rounded-md underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Public product lobby. All discovery and practice links are present before hydration. */
export function HomeLanding() {
  const first = problems[0];
  const suggestions = ["arena-mind-the-gap", "ipho-2026-t1"].map(findProblemPage).filter((page) => page !== undefined);
  return (
    <Layout view="overview" stickyHeader>
      <div className="flex min-w-0 flex-col gap-7" data-public-home>
        <header className="space-y-2">
          <h1 className="text-balance text-2xl font-medium tracking-[-0.04em] sm:text-[27px]">Free physics olympiad practice</h1>
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground" data-home-sentence>
            Physcratic is free physics olympiad practice with IPhO, APhO and EuPhO problems and checked answers.
          </p>
        </header>
        <div className="grid min-w-0 gap-5 xl:grid-cols-[1.5fr_1fr]">
          <Card className="flex min-w-0 flex-col shadow-none" data-tour="problem-card">
            <CardHeader>
              <p className="text-sm font-medium text-accent-foreground">Start practising</p>
              <CardTitle><h2 className="text-xl font-medium leading-snug">{first.title}</h2></CardTitle>
              <p className="text-sm text-muted-foreground">{first.topic} · Practice</p>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="max-w-prose leading-relaxed">{first.prompt}</p>
              <p className="mt-3 text-sm text-muted-foreground">Open the problem, enter your answer and check it. No account is needed.</p>
            </CardContent>
            <CardFooter className="flex-wrap gap-3">
              <Button asChild className="min-h-11"><Link href={`/dashboard/problems/${first.id}`}>Try a problem</Link></Button>
              <Button asChild variant="outline" className="min-h-11"><Link href="/problems">Browse problems</Link></Button>
            </CardFooter>
          </Card>
          <Card className="min-w-0 shadow-none">
            <CardHeader><CardTitle><h2 className="text-lg font-medium">More problems to try</h2></CardTitle></CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-4">
                {suggestions.map((page) => <li key={page.id}>
                  <Link href={page.path} className={`${linkClass} font-medium`}>{page.title}</Link>
                  <p className="text-sm leading-relaxed text-muted-foreground">{page.description}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{page.competition ? `${page.competition} ${page.year}, Problem ${page.number}` : "Physcratic Arena"} · {page.topic}</p>
                </li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
        <Card className="shadow-none">
          <CardHeader><CardTitle><h2 className="text-lg font-medium">Browse by topic</h2></CardTitle></CardHeader>
          <CardContent>
            <nav aria-label="Problems by topic"><ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
              {topicsWithProblems().map((topic) => <li key={topic.slug}><Link href={`/problems/topics/${topic.slug}`} className={linkClass}>{topic.name} ({topic.count})</Link></li>)}
            </ul></nav>
            <nav aria-label="More practice" className="mt-4 flex flex-wrap gap-x-6 border-t pt-3">
              <Link href="/problems/archive" className={linkClass}>Olympiad archive</Link>
              <Link href="/dashboard?view=contests" className={linkClass}>Contests</Link>
              <Link href="/coaching" className={linkClass}>Coaching</Link>
            </nav>
          </CardContent>
        </Card>
        <div className="grid min-w-0 gap-5 xl:grid-cols-[1.5fr_1fr]">
          <Card className="min-w-0 shadow-none">
            <CardHeader><CardTitle><h2 className="text-lg font-medium">Guides</h2></CardTitle></CardHeader>
            <CardContent><ul className="flex flex-col">
              {publishedArticles.map((article) => <li key={article.slug}><Link href={learnPath(article.slug)} className={linkClass}>{article.title}</Link></li>)}
            </ul><Link href="/learn" className={linkClass}>All guides</Link></CardContent>
          </Card>
          <Card className="min-w-0 self-start shadow-none">
            <CardHeader><CardTitle><h2 className="text-lg font-medium">Save your progress</h2></CardTitle></CardHeader>
            <CardContent><p className="text-sm leading-relaxed text-muted-foreground">Sign in and verify your email to save checked answers when saving is available. You can practise without an account.</p></CardContent>
            <CardFooter className="flex-wrap gap-3">
              <Button asChild variant="outline" className="min-h-11"><Link href="/sign-in?returnTo=%2F">Sign in</Link></Button>
              <Link href="/sign-up" className={linkClass}>Make a free account</Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
