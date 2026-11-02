"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { coachingEntryHandlers } from "@/lib/coaching/analytics";

/** One compact link to /coaching on the dashboard home. Uses the dashboard tokens, not the coaching theme. */
export function CoachingCard() {
  return (
    <Card
      aria-labelledby="coaching-card-heading"
      className="flex flex-col items-start gap-4 p-5 shadow-none sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <GraduationCap
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-accent-foreground"
          strokeWidth={1.7}
        />
        <h2 id="coaching-card-heading" className="text-base font-medium">
          Train with IPhO, APhO and EuPhO medallists
        </h2>
      </div>
      <Button asChild variant="outline" className="shrink-0 border-accent-foreground text-accent-foreground hover:bg-accent hover:text-accent-foreground">
        <Link href="/coaching" {...coachingEntryHandlers("card")}>
          Meet the coaches
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Link>
      </Button>
    </Card>
  );
}
