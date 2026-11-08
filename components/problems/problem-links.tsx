import { Fragment } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Crumb } from "@/lib/seo/json-ld";
import type { ProblemPage } from "@/lib/seo/problem-pages";

const linkClass =
  "inline-flex min-h-11 items-center rounded-md underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** The visible breadcrumb. It renders the same list the BreadcrumbList structured data is built from. */
export function CrumbTrail({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.path}>
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="inline-flex min-h-11 items-center">
                    <Link href={crumb.path}>{crumb.name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {last ? null : <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** What a problem is, in one plain line: kind and source. Shown above the statement so it is in the HTML. */
export function ProblemSourceLine({ page }: { page: ProblemPage }) {
  if (!page.source) return null;
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {page.source.line}{" "}
      <a href={page.source.officialUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {page.source.officialLabel}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );
}

/** 3 to 5 related problems and the topic page, as plain links. */
export function RelatedProblems({ page, related }: { page: ProblemPage; related: readonly ProblemPage[] }) {
  return (
    <nav aria-labelledby="related-problems-heading" className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 id="related-problems-heading" className="text-lg font-medium tracking-tight">
        Related problems
      </h2>
      <ul className="flex flex-col">
        {related.map((other) => (
          <li key={other.id}>
            <Link href={other.path} className={linkClass}>
              {other.competition ? `${other.title}, ${other.competition} ${other.year} Problem ${other.number}` : other.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        More on this topic:{" "}
        <Link href={`/problems/topics/${page.topicSlug}`} className={linkClass}>
          All {page.topic.toLowerCase()} problems
        </Link>
      </p>
    </nav>
  );
}
