"use client";
import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startTour } from "./tour-storage";
import { forgetSeen } from "./tour-storage";
import { tourIds, tours, type TourId } from "./tours";

/** The "?" button that plays a tour again, any time. */
export function TourHelpButton({ tourId, className }: { tourId: TourId; className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className ?? "size-11"}
      aria-label={`Help: ${tours[tourId].name}`}
      title={tours[tourId].name}
      onClick={() => startTour(tourId)}
    >
      <CircleHelp aria-hidden="true" className="size-5" />
    </Button>
  );
}

/** For Settings. The tours start again by themselves the next time each page is opened. */
export function ReplayTours() {
  const [done, setDone] = useState(false);
  return (
    <section aria-labelledby="replay-tours-title" className="mx-auto mt-8 w-full max-w-3xl space-y-3 rounded-xl border-2 p-5">
      <h2 id="replay-tours-title" className="text-xl font-semibold">Tours</h2>
      <p className="text-base text-muted-foreground">Missed something? Play the {tourIds.map((id) => tours[id].name).join(" and ")} tours again.</p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 border-2"
        onClick={() => {
          forgetSeen(tourIds);
          setDone(true);
        }}
      >
        Replay tours
      </Button>
      <p role="status" className="text-base text-muted-foreground">
        {done ? "Done. Each tour starts again the next time you open the dashboard or Problem Studio." : ""}
      </p>
    </section>
  );
}
