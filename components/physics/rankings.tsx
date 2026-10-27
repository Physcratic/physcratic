"use client";

import { useState } from "react";
import { Flame, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { demoProfile, demoRankings, ratingTitle, risingStreak } from "@/lib/contest-demo";
import { cn } from "@/lib/utils";

export function Rankings() {
  const [search, setSearch] = useState("");
  const rows = demoRankings.filter((row) =>
    row.handle.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card className="min-w-0 overflow-hidden shadow-none">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <CardTitle>
                <h2 className="text-base font-medium tracking-tight">
                  The leaderboard
                </h2>
              </CardTitle>
              <CardDescription>
                A flame marks 3 or more consecutive rated rounds with Elo gains.
              </CardDescription>
            </div>
            <Badge variant="outline">Sample top 7 + your rank</Badge>
          </div>
          <FieldGroup className="max-w-xs">
            <Field>
              <FieldLabel htmlFor="ranking-search" className="sr-only">
                Search sample contestants
              </FieldLabel>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
                />
                <Input
                  id="ranking-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sample contestants…"
                  className="pl-9"
                />
              </div>
            </Field>
          </FieldGroup>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {rows.length ? (
            <Table>
              <TableCaption className="pb-5">
                Illustrative rankings from a sample field of{" "}
                {demoProfile.totalPlayers.toLocaleString("en-US")} contestants.
                Not real accounts or results.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-20 pl-6">
                    Rank
                  </TableHead>
                  <TableHead scope="col">Contestant</TableHead>
                  <TableHead scope="col" className="text-right">
                    Elo
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
                  <TableRow
                    key={row.handle}
                    className={cn(row.handle === "You" && "bg-accent/50")}
                  >
                    <TableCell className="pl-6 tabular-nums text-muted-foreground">
                      #{row.rank}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 font-medium">
                          {row.handle}
                          {risingStreak(row.recentChanges) >= 3 && (
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 rounded-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    aria-label={`${risingStreak(row.recentChanges)} consecutive rounds of Elo gains`}
                                  >
                                    <Flame aria-hidden="true" className="size-4" />
                                    <span className="text-sm tabular-nums">{risingStreak(row.recentChanges)}</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Elo increased in each of the last {risingStreak(row.recentChanges)} rated rounds.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {ratingTitle(row.rating)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.rating.toLocaleString("en-US")}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        row.change > 0
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
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
                <EmptyTitle>No matching contestants</EmptyTitle>
                <EmptyDescription>
                  Try another handle, or clear the search to see the sample
                  leaderboard.
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={() => setSearch("")}>
                Clear search
              </Button>
            </Empty>
          )}
        </CardContent>
      </Card>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Front-end preview · All ratings and ranks are illustrative. A real Elo
        system will be connected with the back-end.
      </p>
    </div>
  );
}
