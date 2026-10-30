import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getArchiveStats } from "@/lib/problem-archive";
import { problems } from "@/lib/physics";
import { corpusProblems } from "@/lib/corpus-pilot";
import { catalogProblems, competitions } from "@/lib/corpus-catalog";
import arena from "@/lib/arena/index.json";

const competitionVariants = {
  IPhO: "ipho",
  APhO: "apho",
  EuPhO: "eupho",
} as const;

export function ArchiveStats() {
  const { total, addedLast24Hours } = getArchiveStats([
    ...problems,
    ...arena.problems.map((problem) => ({ addedAt: problem.importedOn })),
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
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-base font-medium">
            {total.toLocaleString("en-US")} problems in the archive
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {catalogProblems.length} olympiad exercises + {arena.count} Arena problems + {problems.length}{" "}
            quick-practice exercises. {corpusProblems.length} olympiad exercises
            also include a guided breakdown.
          </p>
          <p className="text-sm text-muted-foreground">
            {addedLast24Hours === null
              ? "New in the last 24 hours: not tracked — addition dates are unavailable."
              : `New in the last 24 hours: ${addedLast24Hours.toLocaleString("en-US")}`}
          </p>
        </div>
        <div
          className="flex shrink-0 flex-wrap gap-2"
          aria-label="Archive by competition"
        >
          <Badge variant="secondary">Arena · {arena.count}</Badge>
          {competitions.map((competition) => (
            <Badge key={competition} variant={competitionVariants[competition]}>
              {competition} ·{" "}
              {
                catalogProblems.filter(
                  (problem) => problem.competition === competition,
                ).length
              }
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
