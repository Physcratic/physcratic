"use client";

import { useState } from "react";
import { Check, Search, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
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
import {
  formatClock,
  sortStandings,
  type ContestProblem,
  type ContestStanding,
} from "@/lib/contest-demo";
import { cn } from "@/lib/utils";

export function ContestStandings({
  rows,
  problems,
  onSelectProblem,
}: {
  rows: ContestStanding[];
  problems: ContestProblem[];
  onSelectProblem?: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [onlyYou, setOnlyYou] = useState(false);
  const filtered = sortStandings(rows)
    .map((row, index) => ({ ...row, rank: index + 1 }))
    .filter(
      (row) =>
        (!onlyYou || row.isYou) &&
        row.handle.toLowerCase().includes(query.trim().toLowerCase()),
    );
  const hasYou = rows.some((row) => row.isYou);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">
            {hasYou ? "Round standings" : "Sample standings"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {rows.length} in the demo field · Points first, then lowest penalty
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Search contest standings"
            placeholder="Find a contestant…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-44"
          />
          {hasYou && (
            <Button
              variant="outline"
              size="sm"
              aria-pressed={onlyYou}
              onClick={() => {
                setOnlyYou((current) => !current);
                setQuery("");
              }}
            >
              {onlyYou ? "Show everyone" : "My standing"}
            </Button>
          )}
        </div>
      </div>
      {filtered.length ? (
        <Table>
          <TableCaption className="px-4 pb-4 text-left">
            Fixed sample competitors, not a live feed. Accepted cells show
            attempts and elapsed time.{" "}
            {hasYou
              ? "Select a cell in your row to open that problem."
              : "Start virtual practice to add your own row."}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-16">
                Rank
              </TableHead>
              <TableHead scope="col">Contestant</TableHead>
              <TableHead scope="col" className="text-right">
                Points
              </TableHead>
              <TableHead scope="col" className="text-right">
                Penalty
              </TableHead>
              {problems.map((problem) => (
                <TableHead
                  key={problem.id}
                  scope="col"
                  className="min-w-20 text-center"
                >
                  <span className="flex flex-col py-2">
                    <span>{problem.letter}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {problem.points} pts
                    </span>
                  </span>
                </TableHead>
              ))}
              <TableHead scope="col" className="text-right">
                Solved
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow
                key={row.handle}
                className={cn(row.isYou && "bg-accent/50")}
              >
                <TableCell className="tabular-nums">
                  <span className="flex items-center gap-2">
                    {row.rank}
                    {row.rank === 1 && (
                      <Trophy
                        aria-label="First place"
                        className="size-4 text-primary"
                      />
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 font-medium">
                    {row.handle}
                    {row.isYou && <Badge variant="secondary">You</Badge>}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {row.points.toLocaleString("en-US")}
                </TableCell>
<TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                    {row.penalty} min
                </TableCell>
                {problems.map((problem) => {
                  const result = row.results.find(
                    (entry) => entry.problemId === problem.id,
                  );
                  const accepted = result?.status === "accepted";
                  const label = `${row.handle}, problem ${problem.letter}: ${accepted ? "accepted" : result?.attempts ? "wrong answer" : "not attempted"}${result?.attempts ? `, ${result.attempts} ${result.attempts === 1 ? "attempt" : "attempts"}` : ""}`;
                  const content = (
                    <span className="flex flex-col items-center gap-1 text-sm tabular-nums">
                      <span
                        className={cn(
                          "flex items-center gap-1",
                          accepted
                            ? "font-medium text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {accepted && (
                          <Check aria-hidden="true" className="size-3.5" />
                        )}
                        {result?.attempts || "—"}
                      </span>
                      {result?.elapsed !== undefined ? (
                        <span className="text-muted-foreground">
                          {formatClock(result.elapsed)}
                        </span>
                      ) : result?.attempts ? (
                        <span className="text-muted-foreground">Retry</span>
                      ) : null}
                    </span>
                  );
                  return (
                    <TableCell key={problem.id} className="text-center">
                      {row.isYou && onSelectProblem ? (
                        <button
                          type="button"
                          aria-label={`Open ${label}`}
                          onClick={() => onSelectProblem(problem.id)}
                          className="w-full rounded-md p-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {content}
                        </button>
                      ) : (
                        <span aria-label={label}>{content}</span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {row.solved} / {problems.length}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>No matching contestants</EmptyTitle>
            <EmptyDescription>
              Try another name or clear the filter to see the full field.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("");
                setOnlyYou(false);
              }}
            >
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
