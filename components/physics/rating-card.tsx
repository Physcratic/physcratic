"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useId, useState } from "react";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDashboard } from "@/hooks/use-dashboard";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { RankTitle } from "./rank-title";
import { cn } from "@/lib/utils";
import { LoadingLines } from "@/components/loading-lines";

const RatingHistoryChart = dynamic(
  () => import("./rating-history-chart").then((m) => m.RatingHistoryChart),
  { ssr: false },
);
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function RatingCard({
  expanded = false,
  horizontal = false,
}: {
  expanded?: boolean;
  horizontal?: boolean;
}) {
  const [range, setRange] = useState("3M");
  const chartId = `rating-fill-${useId().replace(/:/g, "")}`;
  const dashboard = useDashboard();
  const history =
    dashboard.data?.ratings.map((point) => ({
      date: point.createdAt,
      rating: point.rating,
      contest: point.contestName,
    })) ?? [];
  const threshold = new Date();
  threshold.setUTCMonth(threshold.getUTCMonth() - (range === "1M" ? 1 : 3));
  const firstIndex =
    range === "All"
      ? 0
      : history.findIndex((point) => new Date(point.date) >= threshold);
  const data =
    firstIndex < 0
      ? history.slice(-1)
      : history.slice(Math.max(0, firstIndex - 1));
  const baseline = data[0];
  const latestRating = history.at(-1)?.rating;
  const gain =
    baseline && latestRating !== undefined ? latestRating - baseline.rating : 0;

  if (dashboard.isLoading || dashboard.error || !history.length)
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>
            <h2 className="text-base font-medium">Your rating</h2>
          </CardTitle>
          <CardDescription>
            Earned through published rated contest results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard.isLoading ? (
            <LoadingLines label="Loading your rating…" />
          ) : dashboard.error ? (
            <div className="flex flex-col items-start gap-3">
              <p role="alert" className="text-sm text-destructive">
                Your rating could not be loaded.
              </p>
              <Button variant="outline" onClick={() => dashboard.mutate()}>
                Retry rating
              </Button>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>
                  {dashboard.data?.user
                    ? "Not rated yet"
                    : "No rating yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {dashboard.data?.user
                    ? "Your first published rated result will start your rating history. Practice and self-review do not change ELO."
                    : "Sign in to track your rating and save your progress across devices."}
                </EmptyDescription>
              </EmptyHeader>
              {!dashboard.data?.user && (
                <Button variant="outline" asChild>
                  <Link href="/sign-in?returnTo=%2Fdashboard">Sign in</Link>
                </Button>
              )}
            </Empty>
          )}
        </CardContent>
        <CardFooter>
          <Link
            href="/dashboard?view=rankings"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4"
          >
            View rankings
          </Link>
        </CardFooter>
      </Card>
    );

  return (
    <Card className="flex min-w-0 flex-col justify-between overflow-hidden shadow-none">
      <CardHeader className="gap-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>
            <h2 className="text-base font-medium tracking-tight">
              {expanded ? "Your rating history" : "Your rating"}
            </h2>
          </CardTitle>
          <Badge variant="outline">Rated results</Badge>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex flex-1 flex-col gap-5 pb-4",
          horizontal && "md:flex-row md:items-stretch md:gap-8",
        )}
      >
        <div
          className={cn(
            "flex flex-col justify-center gap-4",
            horizontal && "md:w-60 md:shrink-0 md:border-r md:pr-8",
          )}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "font-medium tracking-[-0.055em] tabular-nums",
                  horizontal ? "text-6xl text-rating" : "text-4xl",
                )}
              >
                {latestRating!.toLocaleString("en-US")}
              </span>
              <span className="text-sm text-muted-foreground">ELO</span>
            </div>
            <RankTitle rating={latestRating!} className="self-start" />
          </div>
          <div
            className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <TrendingUp
              className={cn(
                "size-4",
                horizontal ? "text-rating" : "text-primary",
              )}
              aria-hidden="true"
            />
            <span className={horizontal ? "text-rating" : "text-primary"}>
              +{gain}
            </span>
            <span>
              {range === "All"
                ? "since your first contest"
                : range === "1M"
                  ? "in the last month"
                  : "in the last 3 months"}
            </span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Rating history
            </span>
            <ToggleGroup
              type="single"
              size="sm"
              value={range}
              onValueChange={(value) => {
                if (value) setRange(value);
              }}
              aria-label="Rating history time range"
            >
              {["1M", "3M", "All"].map((value) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={
                    value === "All"
                      ? "All rating history"
                      : `Last ${value === "1M" ? "month" : "3 months"}`
                  }
                >
                  {value}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div
            className={cn(
              "w-full",
              expanded ? "h-56" : horizontal ? "h-32" : "h-28",
            )}
          >
            <RatingHistoryChart
              data={data}
              expanded={expanded}
              horizontal={horizontal}
              chartId={chartId}
              ariaLabel={`ELO history, ${baseline.rating} to ${latestRating!}`}
            />
          </div>
        </div>
        <span className="sr-only">
          {data
            .map((point) => `${dateLabel(point.date)}: ${point.rating} ELO`)
            .join(". ")}
        </span>
      </CardContent>
      <CardFooter className="justify-between border-t py-3">
        <span className="text-sm text-muted-foreground">
          {history.length} rated {history.length === 1 ? "result" : "results"}
        </span>
        {expanded ? (
          <span className="text-sm text-muted-foreground">
            Published results only
          </span>
        ) : (
          <Link
            href="/dashboard?view=rankings"
            className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View rankings
            <ArrowUpRight className="size-4" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
