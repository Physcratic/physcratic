"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  rating: { label: "ELO", color: "var(--chart-1)" },
} satisfies ChartConfig;
const horizontalChartConfig = {
  rating: { label: "ELO", color: "var(--chart-2)" },
} satisfies ChartConfig;
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// Split out of rating-card.tsx so recharts loads only when a rating chart is shown.
export function RatingHistoryChart({
  data,
  expanded,
  horizontal,
  chartId,
  ariaLabel,
}: {
  data: { date: string; rating: number; contest: string }[];
  expanded: boolean;
  horizontal: boolean;
  chartId: string;
  ariaLabel: string;
}) {
  return (
    <ChartContainer
      config={horizontal ? horizontalChartConfig : chartConfig}
      className="aspect-auto h-full w-full text-sm"
      aria-label={ariaLabel}
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
  );
}
