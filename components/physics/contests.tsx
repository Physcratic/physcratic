"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetchJson } from "@/lib/api-client";
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

export function Contests() {
  const { data, error, isLoading, mutate } = useDashboard();
  const { data: access } = useSWR<{ canManage: boolean }>("/api/contests/access", fetchJson);
  return (
    <div className="flex flex-col gap-7">
      <section
        className="flex flex-col gap-4"
        aria-labelledby="published-contests-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="published-contests-title" className="text-lg font-medium tracking-tight">Published contests</h2>
          {access?.canManage && <Button asChild variant="outline"><Link href="/dashboard/contests/manage">Manage contests</Link></Button>}
        </div>
        {isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading published contests…
          </p>
        ) : error ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-destructive">
              Contests could not be loaded. Please retry.
            </p>
            <Button variant="outline" onClick={() => mutate()}>
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
