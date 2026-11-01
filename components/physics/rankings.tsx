"use client";

import useSWR from "swr";
import { fetchJson } from "@/lib/api-client";
import type { PublicRanking } from "@/lib/dashboard-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RankTitle } from "./rank-title";

export function Rankings({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (search: string) => void;
}) {
  const { data, error, isLoading, mutate } = useSWR<{
    rankings: PublicRanking[];
  }>("/api/rankings", fetchJson, { refreshInterval: 60_000 });
  const rankings = data?.rankings ?? [];
  const rows = rankings
    .map((row, index) => ({
      ...row,
      rank: rankings.findIndex((entry) => entry.rating === row.rating) + 1,
      key: index,
    }))
    .filter((row) =>
      row.handle.toLowerCase().includes(search.trim().toLowerCase()),
    );
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card id="rankings-table" className="min-w-0 overflow-hidden shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
            <p role="status" className="p-6 text-sm text-muted-foreground">
              Loading rankings…
            </p>
          ) : error ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Rankings unavailable</EmptyTitle>
                <EmptyDescription>
                  We could not load published results. Please retry.
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={() => mutate()}>
                Retry rankings
              </Button>
            </Empty>
          ) : rows.length ? (
            <Table>
              <TableCaption className="pb-5">
                Top 100 public contestants by their latest published rated
                result. Equal ratings share a rank.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-20 pl-6">
                    Rank
                  </TableHead>
                  <TableHead scope="col">Contestant</TableHead>
                  <TableHead scope="col" className="text-right">
                    ELO
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Last round
                  </TableHead>
                  <TableHead scope="col" className="pr-6 text-right">
                    Contests
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="pl-6 tabular-nums text-muted-foreground">
                      #{row.rank}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-medium">{row.handle}</span>
                        <RankTitle rating={row.rating} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.rating.toLocaleString("en-US")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.change > 0 ? "+" : ""}
                      {row.change}
                    </TableCell>
                    <TableCell className="pr-6 text-right tabular-nums text-muted-foreground">
                      {row.contests}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>
                  {search.trim()
                    ? "No matching contestants"
                    : "No rated results yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {search.trim()
                    ? "Try another handle or clear your search."
                    : "Public rankings will appear after rated contest results are published. Practice and private submissions do not affect ELO."}
                </EmptyDescription>
              </EmptyHeader>
              {search.trim() && (
                <Button variant="outline" onClick={() => onSearchChange("")}>
                  Clear search
                </Button>
              )}
            </Empty>
          )}
        </CardContent>
      </Card>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Only explicitly public handles are shown. Account names, email addresses
        and private attempts are never published here.
      </p>
    </div>
  );
}
