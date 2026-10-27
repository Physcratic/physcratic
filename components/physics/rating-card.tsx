"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  demoProfile,
  demoRatingHistory,
} from "@/lib/contest-demo";
import { RankTitle } from "./rank-title";
import { cn } from "@/lib/utils";

const chartConfig = {
  rating: { label: "Elo", color: "var(--chart-1)" },
} satisfies ChartConfig;
const horizontalChartConfig = {
  rating: { label: "Elo", color: "var(--chart-2)" },
} satisfies ChartConfig;
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
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
  const latest = new Date(`${demoRatingHistory.at(-1)!.date}T12:00:00Z`);
  const threshold = new Date(latest);
  threshold.setUTCMonth(threshold.getUTCMonth() - (range === "1M" ? 1 : 3));
  const filtered =
    range === "All"
      ? demoRatingHistory
      : demoRatingHistory.filter(
          (point) => new Date(`${point.date}T12:00:00Z`) >= threshold,
        );
  const firstIndex = demoRatingHistory.indexOf(filtered[0]);
  const baseline =
    range === "All"
      ? filtered[0]
      : demoRatingHistory[Math.max(0, firstIndex - 1)];
  const data = baseline === filtered[0] ? filtered : [baseline, ...filtered];
  const gain = demoProfile.rating - baseline.rating;

  return (
    <Card className="flex min-w-0 flex-col justify-between overflow-hidden shadow-none">
      <CardHeader className="gap-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>
            <h2 className="text-base font-medium tracking-tight">
              {expanded ? "Your rating journey" : "Your rating"}
            </h2>
          </CardTitle>
          <Badge variant="outline">Demo</Badge>
        </div>
        {expanded && (
          <CardDescription>
            Progress is rarely a straight line. Keep showing up.
          </CardDescription>
        )}
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
                {demoProfile.rating.toLocaleString("en-US")}
              </span>
              <span className="text-sm text-muted-foreground">Elo</span>
            </div>
            <RankTitle rating={demoProfile.rating} className="self-start" />
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
          <ChartContainer
            config={horizontal ? horizontalChartConfig : chartConfig}
            className={cn(
              "w-full text-sm",
              expanded
                ? "h-56 aspect-auto"
                : horizontal
                  ? "h-32 aspect-auto"
                  : "h-28 aspect-auto",
            )}
            aria-label={`Demo Elo history, ${baseline.rating} to ${demoProfile.rating}`}
          >
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{ top: 8, right: 7, left: expanded ? 0 : 7, bottom: 0 }}
            >
              <defs>
                <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-rating)"
                    stopOpacity={0.19}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-rating)"
                    stopOpacity={0.01}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--border))"
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickMargin={10}
                minTickGap={expanded ? 40 : 28}
                ticks={
                  expanded
                    ? undefined
                    : [
                        data[0].date,
                        data[Math.floor(data.length / 2)].date,
                        data[data.length - 1].date,
                      ]
                }
                tickFormatter={dateLabel}
                fontSize={14}
              />
              <YAxis
                hide={!expanded}
                domain={["dataMin - 35", "dataMax + 35"]}
                tickLine={false}
                axisLine={false}
                width={45}
                fontSize={14}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="text-sm"
                    labelFormatter={(_, payload) => {
                      const point = payload[0]?.payload;
                      return point ? (
                        <span>
                          {dateLabel(point.date)} · {point.contest}
                        </span>
                      ) : null;
                    }}
                  />
                }
              />
              <Area
                type="linear"
                dataKey="rating"
                stroke="var(--color-rating)"
                strokeWidth={2}
                fill={`url(#${chartId})`}
                activeDot={{ r: 4, strokeWidth: 2 }}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>
        <span className="sr-only">
          {data
            .map((point) => `${dateLabel(point.date)}: ${point.rating} Elo`)
            .join(". ")}
        </span>
      </CardContent>
      <CardFooter className="justify-between border-t py-3">
        <span className="text-sm text-muted-foreground">
          #{demoProfile.rank} overall
        </span>
        {expanded ? (
          <span className="text-sm text-muted-foreground">
            {demoProfile.contests} rated contests
          </span>
        ) : (
          <Link
            href="/dashboard?view=rankings"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View rankings
            <ArrowUpRight className="size-4" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
