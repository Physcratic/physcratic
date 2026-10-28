import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getArchiveStats } from "@/lib/problem-archive";
import { problems } from "@/lib/physics";
import { corpusProblems } from "@/lib/corpus-pilot";
import { catalogProblems } from "@/lib/corpus-catalog";

export function ArchiveStats() {
  const { total, addedLast24Hours } = getArchiveStats([
    ...problems,
    ...catalogProblems.map(() => ({ addedAt: undefined })),
  ]);

  return (
    <Card
      aria-labelledby="archive-stats-heading"
      className="overflow-hidden shadow-none"
    >
      <CardHeader className="sr-only">
        <CardTitle id="archive-stats-heading">Archive at a glance</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <dl className="flex divide-x divide-border">
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-5 sm:p-7">
            <dt className="text-sm text-muted-foreground">
              Problems in the archive
            </dt>
            <dd className="order-first text-5xl font-medium tracking-[-0.06em] tabular-nums sm:text-6xl">
              {total.toLocaleString("en-US")}
            </dd>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {catalogProblems.length} catalog entries (including{" "}
              {corpusProblems.length} imported) + {problems.length}{" "}
              quick-practice problems
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-5 sm:p-7">
            <dt className="text-sm text-muted-foreground">
              New in the last 24 hours
            </dt>
            <dd
              className="order-first text-5xl font-medium tracking-[-0.06em] text-primary tabular-nums sm:text-6xl"
              aria-label={
                addedLast24Hours === null
                  ? "Not available: addition dates are not recorded"
                  : undefined
              }
            >
              {addedLast24Hours === null
                ? "—"
                : addedLast24Hours.toLocaleString("en-US")}
            </dd>
            {addedLast24Hours === null && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Addition dates aren&apos;t recorded yet.
              </p>
            )}
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
