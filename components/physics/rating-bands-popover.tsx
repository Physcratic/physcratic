"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ratingBands } from "@/lib/rating-bands";

/** "What do the ratings mean?" with the five bands. The library and Problem Studio both use it. */
export function RatingBandsPopover({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" className={className ?? "min-h-11 px-2 text-base font-medium underline underline-offset-4"} data-tour="rating-help">
          <CircleHelp aria-hidden="true" className="mr-1.5 size-4" />
          What do the ratings mean?
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,38rem)] space-y-3 p-4">
        <p className="text-base font-semibold">What do the ratings mean?</p>
        <p className="text-base text-muted-foreground">
          New players start at 1,200. A problem&apos;s rating shows how hard it is. A problem from a student author shows their estimate, marked with a ~.
        </p>
        <table className="w-full text-left text-base">
          <caption className="sr-only">Rating bands</caption>
          <thead>
            <tr className="border-b text-sm text-muted-foreground">
              <th scope="col" className="py-1.5 pr-3 font-medium">Band</th>
              <th scope="col" className="py-1.5 pr-3 font-medium">Rating</th>
              <th scope="col" className="py-1.5 font-medium">What it feels like</th>
            </tr>
          </thead>
          <tbody>
            {ratingBands.map((band) => (
              <tr key={band.id} className="border-b align-top last:border-0">
                <th scope="row" className="py-2 pr-3 font-semibold">{band.name}</th>
                <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{band.range}</td>
                <td className="py-2">{band.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PopoverContent>
    </Popover>
  );
}
