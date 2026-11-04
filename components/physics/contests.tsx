"use client";

import { useDashboard } from "@/hooks/use-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { PublishedContestCard } from "./published-contest-card";
import { solveTokens } from "./solve-ui";

export function Contests() {
  const { data, error, isLoading, mutate } = useDashboard();
  return (
    <div className={`flex flex-col gap-7 ${solveTokens}`}>
      <section
        className="flex flex-col gap-4"
        aria-labelledby="published-contests-title"
      >
        <h2
          id="published-contests-title"
          className="text-lg font-medium tracking-tight"
        >
          Published contests
        </h2>
        {isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading published contests…
          </p>
        ) : error ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-destructive">
              Contests could not be loaded. Please retry.
            </p>
            <Button variant="outline" className="min-h-11" onClick={() => mutate()}>
              Retry contests
            </Button>
          </div>
        ) : data?.contests.length ? (
          <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
            {data.contests.map((contest) => (
              <PublishedContestCard key={contest.id} contest={contest} />
            ))}
          </div>
        ) : (
          <Card className="shadow-none">
            <CardContent>
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No contests published yet</EmptyTitle>
                  <EmptyDescription>
                    Upcoming rounds and past results will appear here when
                    published. Find self-paced practice in the problem archive.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
