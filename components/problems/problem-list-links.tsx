import Link from "next/link";
import type { ProblemPage } from "@/lib/seo/problem-pages";

const linkClass =
  "inline-flex min-h-11 items-center rounded-md underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** A list of problems as real links. Archive problems say which olympiad, year and problem they are. */
export function ProblemLinkList({ pages }: { pages: readonly ProblemPage[] }) {
  return (
    <ul className="flex flex-col">
      {pages.map((page) => (
        <li key={page.id} className="flex flex-wrap items-baseline gap-x-2">
          <Link href={page.path} className={linkClass}>
            {page.title}
          </Link>
          <span className="text-sm text-muted-foreground">
            {page.competition ? `${page.competition} ${page.year}, Problem ${page.number}, ` : ""}
            {page.topic}
          </span>
        </li>
      ))}
    </ul>
  );
}

export { linkClass as problemLinkClass };
