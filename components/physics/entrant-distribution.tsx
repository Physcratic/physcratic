"use client";

import { Bar, BarChart, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const distribution = [
  { elo: 800, entrants: 3 },
  { elo: 1000, entrants: 10 },
  { elo: 1200, entrants: 24 },
  { elo: 1400, entrants: 38 },
  { elo: 1600, entrants: 46 },
  { elo: 1800, entrants: 32 },
  { elo: 2000, entrants: 19 },
  { elo: 2200, entrants: 10 },
  { elo: 2400, entrants: 4 },
];
const total = distribution.reduce((sum, bucket) => sum + bucket.entrants, 0);
const average = Math.round(distribution.reduce((sum, bucket) => sum + bucket.elo * bucket.entrants, 0) / total);

export function EntrantDistribution({ contestName }: { contestName: string }) {
  return (
    <Card className="flex min-w-0 flex-col shadow-none">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle><h2 className="text-base font-medium">The field</h2></CardTitle>
          <Badge variant="outline">Sample</Badge>
        </div>
        <CardDescription>{contestName} · {total} sample entrants</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-medium tabular-nums tracking-tight">{average.toLocaleString("en-US")}</span>
          <span className="text-sm text-muted-foreground">average Elo</span>
        </div>
        <figure className="flex min-w-0 flex-col gap-2">
          <ChartContainer
            config={{ entrants: { label: "Entrants", color: "var(--chart-1)" } }}
            className="h-36 w-full aspect-auto"
            aria-label="Sample entrant Elo histogram. Illustrative data, not real signups. Most entrants are in the 1,500 to 1,699 rating band."
          >
            <BarChart accessibilityLayer data={distribution} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
              <XAxis dataKey="elo" tickLine={false} axisLine={false} ticks={[800, 1600, 2400]} tick={{ fontSize: 14 }} tickFormatter={(value) => Number(value).toLocaleString("en-US")} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(value) => `${Number(value) - 100}–${Number(value) + 99} Elo`} />} />
              <Bar dataKey="entrants" fill="var(--color-entrants)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
          <figcaption className="sr-only">Illustrative entrants by 200-point rating band; not real signups.</figcaption>
          <table className="sr-only">
            <caption>Sample entrant distribution</caption>
            <thead><tr><th scope="col">Rating band</th><th scope="col">Entrants</th></tr></thead>
            <tbody>{distribution.map((bucket) => <tr key={bucket.elo}><th scope="row">{bucket.elo - 100}–{bucket.elo + 99}</th><td>{bucket.entrants}</td></tr>)}</tbody>
          </table>
        </figure>
      </CardContent>
    </Card>
  );
}
