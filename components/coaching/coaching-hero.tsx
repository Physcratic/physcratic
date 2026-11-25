"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CoachingTutorSlideshow } from "./coaching-tutors";
import { trackConsultationClick } from "@/lib/coaching/analytics";
import { coachingPathways, consultationHref, consultationSource } from "@/lib/coaching/consultation";
import { content } from "@/lib/coaching/content";
import { Highlighted } from "./coaching-highlight";
import { BookingButton } from "./booking-button";

const { hero } = content;

export function CoachingHero({ initialGoal }: { initialGoal?: string }) {
  const startingPathway = coachingPathways.find((option) => option === initialGoal) ?? "";
  const [pathway, setPathway] = useState<string>(startingPathway);
  const [source, setSource] = useState("");

  useEffect(() => {
    setSource(consultationSource(window.location.search, document.referrer));
    // "Ask about this program" links change ?goal= and remount the hero without a router scroll,
    // so glide to the picker here. On a first load the browser has already jumped, so this is a no-op.
    if (window.location.hash === "#hero-cta") {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("hero-cta")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, []);

  // The button always works. Choosing where you are is optional and is passed on when it is chosen.
  const href = consultationHref({ pathway, source });

  return <section className="overflow-hidden">
    <div className="coaching-container coaching-hero">
      <div className="coaching-rise mx-auto flex max-w-4xl flex-col gap-4 text-center">
        <h1 className="font-serif text-balance text-4xl leading-[1.1] sm:text-5xl lg:text-[3.6rem]">{hero.titleMain}</h1>
        <p className="text-balance text-lg font-normal leading-relaxed text-foreground/85 sm:text-xl"><Highlighted text={hero.titleSub} phrase={hero.highlight} /></p>
      </div>
      <div id="hero-cta" className="mx-auto grid w-full max-w-3xl items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <details className="group w-full rounded-lg border border-border p-2" open={pathway ? true : undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-2 text-base [&::-webkit-details-marker]:hidden">{hero.legend}<ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open:rotate-180" /></summary>
        <fieldset className="mt-4 flex flex-col gap-4">
          <legend className="sr-only">{hero.legend}</legend>
          <div className="flex flex-col gap-2.5">
            {coachingPathways.map((option) => <label key={option} className="flex cursor-pointer items-start gap-4 rounded-lg border border-transparent bg-foreground/5 px-4 py-3.5 text-base transition-colors hover:bg-foreground/10 has-[:checked]:border-accent has-[:checked]:bg-foreground/10">
              <input type="radio" name="coaching-goal" value={option} checked={pathway === option} onChange={() => setPathway(option)} className="mt-1 size-4 shrink-0 accent-[hsl(var(--accent))]" />
              <span className="flex flex-col"><span>{option}</span><span className="text-sm font-normal text-muted-foreground">{hero.pathwayHelp[option]}</span></span>
            </label>)}
          </div>
        </fieldset>
        </details>
        <BookingButton href={href} label={hero.bookLabel} className="coaching-button min-h-[62px] w-full sm:w-auto" onOpen={() => trackConsultationClick(pathway || "none")} describedBy="consultation-note" />
        <p id="consultation-note" className="text-center text-sm leading-relaxed text-muted-foreground sm:col-span-2">{hero.note}</p>
      </div>
      <CoachingTutorSlideshow />
    </div>
  </section>;
}
