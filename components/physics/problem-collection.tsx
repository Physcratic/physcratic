"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

function CollectionPagination({
  page,
  pageCount,
  onPageChange,
  label,
  placement,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
  placement: "top" | "bottom";
}) {
  const controls = (
    <>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {pageCount}
      </span>
      <nav
        className="flex items-center gap-2"
        aria-label={`${label} pages (${placement})`}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ArrowLeft data-icon="inline-start" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ArrowRight data-icon="inline-end" />
        </Button>
      </nav>
    </>
  );

  return placement === "top" ? (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
      {controls}
    </div>
  ) : (
    <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      {controls}
    </CardFooter>
  );
}

export function ProblemCollection<T extends { id: string }>({
  id,
  title,
  paginationLabel,
  items,
  totalCount,
  filterKey,
  pagination,
  status,
  renderProblem,
  emptyTitle,
  emptyDescription,
  onReset,
}: {
  id: string;
  title: string;
  paginationLabel: string;
  items: readonly T[];
  totalCount: number;
  filterKey: string;
  pagination?: {
    key: string;
    page: number;
    onChange: (next: { key: string; page: number }) => void;
  };
  status?: string;
  renderProblem: (problem: T) => React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  onReset: () => void;
}) {
  const [internalPagination, setInternalPagination] = React.useState({ key: filterKey, page: 1 });
  const currentPagination = pagination ?? internalPagination;
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page =
    currentPagination.key === filterKey ? Math.min(currentPagination.page, pageCount) : 1;
  const visible = items.slice((page - 1) * pageSize, page * pageSize);
  const headingId = `${id}-heading`;

  function changePage(next: number) {
    const nextPagination = { key: filterKey, page: next };
    if (pagination) pagination.onChange(nextPagination);
    else setInternalPagination(nextPagination);
    document.getElementById(headingId)?.focus({ preventScroll: true });
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }

  return (
    <section
      className="flex min-w-0 flex-col gap-5"
      aria-labelledby={headingId}
    >
      <Card
        id={id}
        className="min-w-0 scroll-mt-6 overflow-hidden shadow-none"
      >
        {items.length > 0 && (
          <CollectionPagination
            page={page}
            pageCount={pageCount}
            onPageChange={changePage}
            label={paginationLabel}
            placement="top"
          />
        )}
        <CardHeader>
          <CardTitle>
            <h3
              id={headingId}
              tabIndex={-1}
              className="text-base font-medium outline-none"
            >
              {title}
            </h3>
          </CardTitle>
          <CardDescription aria-live="polite">
            {items.length} of {totalCount} problems
            {items.length > 0 &&
              ` · Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, items.length)}`}
            {status && ` · ${status}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {visible.length ? (
            <ul className="flex min-w-0 flex-col gap-4 px-4 pb-5 sm:px-6">
              {visible.map((problem) => (
                <li key={problem.id} className="min-w-0">
                  {renderProblem(problem)}
                </li>
              ))}
            </ul>
          ) : (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpen />
                </EmptyMedia>
                <EmptyTitle>{emptyTitle}</EmptyTitle>
                <EmptyDescription>{emptyDescription}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={onReset}>
                  <RotateCcw data-icon="inline-start" /> Clear filters
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
        {items.length > 0 && (
          <CollectionPagination
            page={page}
            pageCount={pageCount}
            onPageChange={changePage}
            label={paginationLabel}
            placement="bottom"
          />
        )}
      </Card>
    </section>
  );
}
