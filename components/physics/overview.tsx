"use client";

import { topics, type Problem } from "@/lib/physics";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/hooks/use-dashboard";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";
import { DashboardHighlights } from "./dashboard-highlights";
import { ProblemHistory } from "./problem-history";
import { RatingCard } from "./rating-card";

export function Overview({ onOpen }: { onOpen: (problem: Problem) => void }) {
  const [topicQuery, setTopicQuery] = useState("");
  const router = useRouter();
  const dashboard = useDashboard();
  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="browse-topics-heading" data-tour="nav-topics" className="space-y-3">
        <h2 id="browse-topics-heading" className="sr-only">Browse by Topic</h2>
        <form role="search" className="relative" onSubmit={event => { event.preventDefault(); router.push(`/dashboard?view=problems&q=${encodeURIComponent(topicQuery.trim())}`); }}>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Browse any problem" placeholder="Browse any problem..." value={topicQuery} onChange={event => setTopicQuery(event.target.value)} className="h-12 bg-card pl-12 pr-14 text-base" />
          <button type="submit" aria-label="Search problems" className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowRight aria-hidden="true" className="size-5" /></button>
        </form>
        <nav id="homepage-topics" aria-label="Problems by topic" className="flex flex-wrap justify-center gap-2">
          {topics.map(({ name, icon: Icon }) => (
            <Link key={name} href={`/dashboard?view=problems&topic=${encodeURIComponent(name)}`} className="group flex w-fit min-h-11 items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-sm font-normal transition-colors hover:border-accent-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground" aria-hidden="true" strokeWidth={1.7} />
              <span className="min-w-0 flex-1">{name}</span>
            </Link>
          ))}
        </nav>

      </section>
      {dashboard.refreshError && <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><p>Showing cached data. The latest update could not be loaded.</p><button type="button" onClick={() => dashboard.mutate()} className="min-h-11 underline underline-offset-4">Retry update</button></div>}
      <div className="flex min-w-0 flex-col gap-5">
        <DashboardHighlights />

      </div>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-2">
        <ProblemHistory onOpen={onOpen} />
        <RatingCard />
      </div>
    </div>
  );
}
