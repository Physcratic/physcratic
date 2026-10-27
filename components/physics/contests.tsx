"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  ListChecks,
  Radio,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  demoContests,
  type DemoContest,
} from "@/lib/contest-demo";
import { ContestDetails } from "./contest-details";
import { ContestRoom } from "./contest-room";
import { EntrantDistribution } from "./entrant-distribution";

const IphoContest = dynamic(() => import("./ipho-contest").then((module) => module.IphoContest), {
  loading: () => <p role="status" className="text-sm text-muted-foreground">Opening IPhO practice…</p>,
});

export function Contests() {
  const [iphoOpen, setIphoOpen] = useState(false);
  const [selected, setSelected] = useState<DemoContest | null>(null);
  const [activeContest, setActiveContest] = useState<DemoContest | null>(null);
  const [registered, setRegistered] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const live = demoContests[0];
  const upcoming = demoContests.filter(
    (contest) => contest.status === "upcoming",
  );
  const past = demoContests.filter((contest) => contest.status === "past");

  function toggleRegistration(contest: DemoContest) {
    const isRegistered = registered.includes(contest.id);
    setRegistered((current) =>
      isRegistered
        ? current.filter((id) => id !== contest.id)
        : [...current, contest.id],
    );
    setNotice(
      isRegistered
        ? `Demo registration removed for ${contest.name}.`
        : `You're on the demo list for ${contest.name}. Nothing is sent or saved.`,
    );
  }

  if (iphoOpen) return <IphoContest onExit={() => setIphoOpen(false)} />;

  if (activeContest)
    return (
      <ContestRoom
        key={activeContest.id}
        contest={activeContest}
        onExit={() => setActiveContest(null)}
      />
    );

  return (
    <div className="flex flex-col gap-7">
      <div className="grid min-w-0 grid-cols-1 gap-5 min-[1100px]:grid-cols-[1fr_320px]">
        <section
          className="flex min-w-0 flex-col items-start justify-between gap-6 overflow-hidden rounded-xl border bg-hero p-6 text-hero-foreground sm:p-8"
          aria-labelledby="featured-contest"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <Radio aria-hidden="true" />
              Live demo
            </Badge>
            <span className="text-sm text-hero-foreground/60">
              Open to all levels · Rated format
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-sm text-primary">{live.name}</span>
            <h2
              id="featured-contest"
              className="max-w-md text-balance text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-[34px]"
            >
              {live.tagline}
            </h2>
            <p className="max-w-md text-pretty text-sm leading-relaxed text-hero-foreground/60">
              {live.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-hero-foreground/70">
            <span className="flex items-center gap-2">
              <Clock3 className="size-4" />
              90 minutes
            </span>
            <span className="flex items-center gap-2">
              <ListChecks className="size-4" />5 problems
            </span>
            <span className="flex items-center gap-2">
              <Users className="size-4" />
              186 entrants
            </span>
          </div>
          <Button onClick={() => setSelected(live)}>
            Enter contest
            <ArrowRight data-icon="inline-end" />
          </Button>
        </section>
        <EntrantDistribution contestName={live.name} />
      </div>

      <Card className="shadow-none">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Sample contest</Badge>
            <Badge variant="outline">IPhO 2011 & 2015 · Unrated</Badge>
          </div>
          <CardTitle><h2 className="text-lg font-medium tracking-tight">The IPhO collection</h2></CardTitle>
          <CardDescription>Real Olympiad ideas. A simpler way to answer.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-5">
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">Try three selected archive subparts with original question and solution PDFs. Enter compact, calculator-style expressions and see a live math preview.</p>
          <Button onClick={() => setIphoOpen(true)}>Open sample contest<ArrowRight data-icon="inline-end" /></Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="upcoming" className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="Browse contests">
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past contests ({past.length})
            </TabsTrigger>
          </TabsList>
          <span className="text-sm text-muted-foreground">
            All times in UTC
          </span>
        </div>
        <TabsContent value="upcoming" className="pt-4">
          <div className="flex flex-col gap-4">
            {upcoming.map((contest) => (
              <ContestListing
                key={contest.id}
                contest={contest}
                registered={registered.includes(contest.id)}
                onDetails={() => setSelected(contest)}
                onRegister={() => toggleRegistration(contest)}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="past" className="pt-4">
          <div className="flex flex-col gap-4">
            {past.map((contest) => (
              <ContestListing
                key={contest.id}
                contest={contest}
                onDetails={() => setSelected(contest)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      <p
        role="status"
        aria-live="polite"
        className={notice ? "text-sm text-primary" : "sr-only"}
      >
        {notice}
      </p>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5 text-card-foreground">
        <div className="flex items-start gap-3">
          <Trophy
            className="mt-0.5 size-5 shrink-0 text-primary"
            strokeWidth={1.5}
          />
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">
              Your first contest? You belong here.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Start with an unrated sprint or practice a past round at your own
              pace.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSelected(past[1])}>
          Try a past round
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </section>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Front-end preview · Contests, entrants, and ratings are demo data.
        Registrations and progress reset when you leave or refresh.
      </p>
      <ContestDetails
        contest={selected}
        onClose={() => setSelected(null)}
        onStart={(contest) => {
          setActiveContest(contest);
          setSelected(null);
        }}
      />
    </div>
  );
}

function ContestListing({
  contest,
  registered = false,
  onDetails,
  onRegister,
}: {
  contest: DemoContest;
  registered?: boolean;
  onDetails: () => void;
  onRegister?: () => void;
}) {
  const past = contest.status === "past";
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>
            <h3 className="text-base font-medium">{contest.name}</h3>
          </CardTitle>
          <Badge variant="secondary">
            {contest.rated ? "Rated" : "Unrated"}
          </Badge>
        </div>
        <CardDescription>{contest.tagline}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-5 pb-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            {contest.date}
          </span>
          <span className="flex items-center gap-2">
            <Clock3 className="size-4" />
            {contest.durationMinutes} min
          </span>
          <span className="flex items-center gap-2">
            <ListChecks className="size-4" />
            {contest.problemIds.length} problems
          </span>
          <span className="flex items-center gap-2">
            <Users className="size-4" />
            {contest.participants + (registered ? 1 : 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDetails}>
            {past ? "Standings & practice" : "Details"}
            {past && <ArrowUpRight data-icon="inline-end" />}
          </Button>
          {!past && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegister}
              aria-pressed={registered}
            >
              {registered ? <Check data-icon="inline-start" /> : null}
              {registered ? "Registered · demo" : "Register · demo"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
