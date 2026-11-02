"use client";

import { useEffect, useState } from "react";
import { CoachingTutorSlideshow } from "./coaching-tutors";
import { trackConsultationClick } from "@/lib/coaching/analytics";
import { coachingPathways, consultationHref, consultationSource } from "@/lib/coaching/consultation";
import { content } from "@/lib/coaching/content";
import { Highlighted } from "./coaching-highlight";

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

  const href = pathway ? consultationHref({ pathway, source }) : undefined;

  return <section className="overflow-hidden">
    <div className="coaching-container coaching-hero">
      <div className="coaching-rise flex flex-col gap-6 pb-6">
        <h1 className="flex flex-col gap-3">
          <span className="font-serif text-balance text-4xl leading-[1.1] sm:text-5xl lg:text-[3.6rem]">{hero.titleMain}</span>
          <span className="max-w-md text-balance text-lg font-normal leading-snug text-foreground/85 sm:text-xl"><Highlighted text={hero.titleSub} phrase={hero.highlight} /></span>
        </h1>
        <p className="max-w-md text-base font-semibold leading-relaxed text-foreground/85">{hero.intro}</p>
        <ul aria-label={hero.factsLabel} className="flex max-w-md flex-wrap gap-2 text-sm font-semibold">{hero.facts.map((fact) => <li key={fact.label} className="rounded-full border border-border px-3 py-1"><span className="font-bold text-accent">{fact.value}</span> <span className="font-medium text-muted-foreground">{fact.label}</span></li>)}</ul>
        <fieldset id="hero-cta" className="flex max-w-md flex-col gap-4">
          <legend className="mb-4 text-lg font-bold">{hero.legend}</legend>
          <div className="flex flex-col gap-2.5">
            {coachingPathways.map((option) => <label key={option} className="flex cursor-pointer items-start gap-4 rounded-lg border border-transparent bg-foreground/5 px-4 py-3.5 text-base font-medium transition-colors hover:bg-foreground/10 has-[:checked]:border-accent has-[:checked]:bg-foreground/10">
              <input type="radio" name="coaching-goal" value={option} checked={pathway === option} onChange={() => setPathway(option)} className="mt-1 size-4 shrink-0 accent-[hsl(var(--accent))]" />
              <span className="flex flex-col"><span>{option}</span><span className="text-sm font-normal text-muted-foreground">{hero.pathwayHelp[option]}</span></span>
            </label>)}
          </div>
          <div className="flex flex-col gap-2">
            <a
              className="coaching-button"
              {...(href
                ? { href, target: "_blank", rel: "noopener noreferrer", onClick: () => trackConsultationClick(pathway) }
                : { role: "link", "aria-disabled": true, tabIndex: -1, onClick: (event: React.MouseEvent) => event.preventDefault() })}
              aria-describedby="consultation-note"
            >{hero.continueLabel}</a>
            <p id="consultation-note" className="text-sm leading-relaxed text-muted-foreground">{hero.note}</p>
          </div>
        </fieldset>
      </div>
      <CoachingTutorSlideshow />
    </div>
  </section>;
}
