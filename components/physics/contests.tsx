"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
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
import {
  iphoExperimentCount,
  iphoPapers,
  iphoSubproblems,
  iphoTheoryCount,
} from "@/lib/ipho-archive";
import { PublishedContestCard } from "./published-contest-card";

const IphoContest = dynamic(
  () => import("./ipho-contest").then((module) => module.IphoContest),
  {
    loading: () => (
      <p role="status" className="text-sm text-muted-foreground">
        Opening IPhO practice…
      </p>
    ),
  },
);

export function Contests() {
  const [iphoOpen, setIphoOpen] = useState(false);
  const { data, error, isLoading, mutate } = useDashboard();
  if (iphoOpen) return <IphoContest onExit={() => setIphoOpen(false)} />;
  return (
    <div className="flex flex-col gap-7">
      <Card className="shadow-none">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Complete 2025 archive</Badge>
            <Badge variant="outline">France · Unrated practice</Badge>
          </div>
          <CardTitle>
            <h2 className="text-lg font-medium tracking-tight">
              The IPhO 2025 collection
            </h2>
          </CardTitle>
          <CardDescription>
            {iphoPapers.length} official papers. {iphoSubproblems.length}{" "}
            subproblems. All the physics, at your own pace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-5">
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
            {iphoTheoryCount} theory and {iphoExperimentCount} experimental
            subproblems, from hydrogen and galaxies to sand craters and Earth’s
            magnetic field. Browse original figures, work through each part, and
            compare with official solutions.
          </p>
          <Button onClick={() => setIphoOpen(true)}>
            Open collection
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardContent>
      </Card>
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
                    published. The IPhO collection is available for self-paced
                    practice.
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
