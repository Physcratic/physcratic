"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetchJson } from "@/lib/api-client";
import type { RankingsResponse } from "@/lib/rankings";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
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
import { LoadingLines } from "@/components/loading-lines";

export function Rankings({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (search: string) => void;
}) {
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const normalizedSearch = search.trim();
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(normalizedSearch), 300);
    return () => clearTimeout(timer);
  }, [normalizedSearch]);
  return (
    <RankingsPage
      key={debouncedSearch}
      search={debouncedSearch}
      searching={normalizedSearch !== debouncedSearch}
      onSearchChange={onSearchChange}
    />
  );
}

function RankingsPage({
  search,
  searching,
  onSearchChange,
}: {
  search: string;
  searching: boolean;
  onSearchChange: (search: string) => void;
}) {
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ search, page: String(page) });
  const { data, error, isLoading, isValidating, mutate } =
    useSWR<RankingsResponse>(`/api/rankings?${params}`, fetchJson, {
      refreshInterval: 60_000,
    });
  const busy = isLoading || searching;
  const rows = data?.rankings ?? [];
  const pagination = data?.pagination;
  function goToPage(nextPage: number) {
    setPage(nextPage);
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card
        id="rankings-table"
        aria-busy={busy || isValidating}
        className="min-w-0 overflow-hidden shadow-none"
      >
        <CardContent className="p-0">
          {busy ? (
            <LoadingLines label={searching ? "Searching contestants…" : "Loading rankings…"} />
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
                Public contestants by their latest published rated result. Equal
                ratings share a rank. Ranks stay the same when searching.
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
                {rows.map((row, index) => (
                  <TableRow key={`${row.rank}-${row.handle}-${index}`}>
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
      {!busy && !error && pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p
            role="status"
            aria-atomic="true"
            className="text-sm text-muted-foreground"
          >
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total} contestants
          </p>
          <Pagination aria-label="Rankings pages" className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => goToPage(pagination.page - 1)}
                  aria-controls="rankings-table"
                >
                  Previous
                </Button>
              </PaginationItem>
              <PaginationItem>
                <span className="px-2 text-sm tabular-nums">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                  aria-controls="rankings-table"
                >
                  Next
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">
        Only explicitly public handles are shown. Account names, email addresses
        and private attempts are never published here.
      </p>
    </div>
  );
}
