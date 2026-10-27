"use client";

import { ArrowRight, Clock3, ListChecks, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sampleStandings, type DemoContest } from "@/lib/contest-demo";
import { ContestStandings } from "./contest-standings";

export function ContestDetails({
  contest,
  onClose,
  onStart,
}: {
  contest: DemoContest | null;
  onClose: () => void;
  onStart: (contest: DemoContest) => void;
}) {
  return (
    <Dialog
      open={Boolean(contest)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-xl p-6">
        {contest && (
          <div className="flex flex-col gap-6">
            <DialogHeader className="gap-3 text-left">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Demo round</Badge>
                <Badge variant="outline">
                  {contest.rated ? "Rated format" : "Unrated format"}
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-medium tracking-tight">
                {contest.name}
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                {contest.description}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-5 rounded-lg border p-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Clock3 className="size-4" />
                {contest.durationMinutes} minutes
              </span>
              <span className="flex items-center gap-2">
                <ListChecks className="size-4" />
                {contest.problemIds.length} problems
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-4" />
                {contest.participants} sample entrants
              </span>
            </div>
            <Tabs
              key={contest.id}
              defaultValue={contest.status === "past" ? "standings" : "rules"}
            >
              <TabsList aria-label="Contest details">
                <TabsTrigger value="rules">How it works</TabsTrigger>
                <TabsTrigger value="standings">Sample standings</TabsTrigger>
              </TabsList>
              <TabsContent value="rules" className="pt-4">
                <ul className="flex list-disc flex-col gap-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                  <li>
                    Solve the problems in any order. Each accepted answer earns
                    its listed points.
                  </li>
                  <li>
                    Enter a numerical answer in the specified unit. A 0.5%
                    tolerance is allowed.
                  </li>
                  <li>
                    Points decide placement; lower penalty breaks ties.
                    Accepted-answer times are added, plus 20 minutes for each
                    wrong answer.
                  </li>
                  <li>
                    Your personal timer starts when you enter. This is a local
                    preview, not a live multiplayer round.
                  </li>
                  <li>
                    No Elo changes or real registrations are made. Refreshing
                    the page resets the demo.
                  </li>
                </ul>
              </TabsContent>
              <TabsContent value="standings" className="pt-3">
                <ContestStandings
                  rows={sampleStandings(contest)}
                  problemCount={contest.problemIds.length}
                />
              </TabsContent>
            </Tabs>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <p className="text-sm text-muted-foreground">
                No pressure. Just a taste of competing.
              </p>
              <Button onClick={() => onStart(contest)}>
                {contest.status === "past"
                  ? "Start virtual practice"
                  : "Start demo round"}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
