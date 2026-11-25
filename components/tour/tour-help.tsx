"use client";
import React, { useState } from "react";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { startTour } from "./tour-storage";
import { forgetSeen } from "./tour-storage";
import { tourIds, tours, type TourId } from "./tours";

/** The "?" button that plays a tour again, any time. */
export function TourHelpButton({ tourId, className }: { tourId: TourId; className?: string }) {
  const { data, isPending, error } = authClient.useSession();
  if (isPending || error || !data?.user) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      className={className ?? "h-12 min-w-12 w-auto flex-col gap-0.5 px-2 py-1 text-xs font-medium leading-none sm:h-11 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"}
      aria-label={`Help: ${tours[tourId].name}`}
      title={tours[tourId].name}
      onClick={() => startTour(tourId)}
    >
      <CircleHelp aria-hidden="true" className="size-5" />
      <span>Help</span>
    </Button>
  );
}

/** The "Help and tours" section in Settings, styled like Appearance. The tours start again by themselves the next time each page is opened. */
export function ReplayTours() {
  const [done, setDone] = useState(false);
  const { data, isPending, error } = authClient.useSession();
  const signedIn = !isPending && !error && Boolean(data?.user);
  return (
    <section id="tours-settings" aria-labelledby="replay-tours-title" className="scroll-mt-6 space-y-6 rounded-2xl border bg-card p-5 sm:p-7">
      <header className="space-y-1">
        <h2 id="replay-tours-title" className="text-lg font-semibold">Help and Tours</h2>
        <p className="text-sm text-muted-foreground">{signedIn
          ? `Play ${tourIds.map((id) => `"${tours[id].name}"`).join(" and ")} again.`
          : "Sign in to use the dashboard and Problem Studio tours."}</p>
      </header>
      {signedIn ? <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={() => {
          forgetSeen(tourIds);
          setDone(true);
        }}
      >
        Replay tours
      </Button>
      <p role="status" className="text-xs leading-5 text-muted-foreground">
        {done ? "Done. Each tour starts again the next time you open the dashboard or Problem Studio." : ""}
      </p>
      </> : <Button variant="outline" asChild><Link href="/sign-in?next=%2Fsettings%23tours-settings">Sign in</Link></Button>}
    </section>
  );
}
