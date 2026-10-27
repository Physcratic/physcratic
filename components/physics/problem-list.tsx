"use client";

import { ArrowUpRight, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { topics, type Problem } from "@/lib/physics";

export function ProblemList({
  items,
  onOpen,
}: {
  items: Problem[];
  onOpen: (problem: Problem) => void;
}) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {items.map((problem) => {
        const Icon = topics.find((topic) => topic.name === problem.topic)!.icon;
        return (
          <button
            type="button"
            key={problem.id}
            onClick={() => onOpen(problem)}
            className="group flex w-full items-center gap-3 px-5 py-5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-6"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground">
              <Icon className="size-[18px]" strokeWidth={1.6} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium transition-colors group-hover:text-primary">
                {problem.title}
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>{problem.concept}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <Clock3 className="size-3.5" />
                  {problem.minutes} min
                </span>
              </span>
            </span>
            <Badge variant="secondary" className="shrink-0 tabular-nums" aria-label={`Difficulty rating ${problem.elo.toLocaleString("en-US")}`}>
              {problem.elo.toLocaleString("en-US")}
            </Badge>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </button>
        );
      })}
    </div>
  );
}
