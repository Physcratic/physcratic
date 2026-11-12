import Link from "next/link";
import Dashboard from "@/components/kokonutui/dashboard";
import { topicsWithProblems } from "@/lib/seo/problem-pages";

const linkClass =
  "inline-flex min-h-11 items-center rounded-md underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The existing Lobby, with a small server-rendered public discovery header. */
export function HomeLanding() {
  return (
    <Dashboard view="overview" discovery={
      <div data-public-home>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground" data-home-sentence>
          Physcratic offers free physics Olympiad practice with Arena, IPhO, APhO and EuPhO problems.
        </p>
        <nav aria-label="Practice and guides" className="mt-2 flex flex-wrap gap-x-5 text-sm text-muted-foreground">
          <Link href="/dashboard?view=problems&collection=arena" className={linkClass}>Practise in Arena</Link>
          <Link href="/problems" className={linkClass}>Problem library</Link>
          <Link href="/problems/archive" className={linkClass}>Olympiad archive</Link>
          <Link href="/learn" className={linkClass}>Guides</Link>
          {topicsWithProblems().map((topic) => (
            <Link key={topic.slug} href={`/problems/topics/${topic.slug}`} className={linkClass}>{topic.name}</Link>
          ))}
        </nav>
      </div>
    } />
  );
}
