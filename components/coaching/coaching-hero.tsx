"use client";

import { useEffect, useState } from "react";
import { CoachingTutorSlideshow } from "./coaching-tutors";
import { coachingPathways, consultationHref, consultationSource } from "@/lib/coaching/consultation";

export function CoachingHero({ initialGoal }: { initialGoal?: string }) {
  const startingPathway = coachingPathways.find((option) => option === initialGoal) ?? "";
  const [pathway, setPathway] = useState<string>(startingPathway);
  const [source, setSource] = useState("");

  useEffect(() => {
    setSource(consultationSource(window.location.search, document.referrer));
  }, []);

  const href = pathway ? consultationHref({ pathway, source }) : undefined;

  return <section className="overflow-hidden">
    <div className="coaching-container coaching-hero">
      <div className="coaching-rise flex flex-col gap-6 pb-6">
        <h1 className="font-serif text-balance text-4xl uppercase leading-[1.05] sm:text-5xl lg:text-[3.6rem]">Learn from the world itself.</h1>
        <p className="max-w-md text-base font-semibold leading-relaxed text-foreground/85">Live online classes of up to 6 students, matched by level, goals, language and schedule. From your first olympiad to IPhO, plus IB and A-Level physics.</p>
        <fieldset id="hero-cta" className="flex max-w-md flex-col gap-4">
          <legend className="mb-4 text-lg font-bold">What brings you to Physcratic today?</legend>
          <div className="flex flex-col gap-2.5">
            {coachingPathways.map((option) => <label key={option} className="flex cursor-pointer items-center gap-4 rounded-lg border border-transparent bg-foreground/5 px-4 py-3.5 text-base font-medium transition-colors hover:bg-foreground/10 has-[:checked]:border-accent has-[:checked]:bg-foreground/10">
              <input type="radio" name="coaching-goal" value={option} checked={pathway === option} onChange={() => setPathway(option)} className="size-4 shrink-0 accent-[hsl(var(--accent))]" />
              {option}
            </label>)}
          </div>
          <div className="flex flex-col gap-2">
            <a
              className="coaching-button"
              {...(href
                ? { href, target: "_blank", rel: "noopener noreferrer" }
                : { role: "link", "aria-disabled": true, tabIndex: -1, onClick: (event: React.MouseEvent) => event.preventDefault() })}
              aria-describedby="consultation-note"
            >Continue to the consultation form</a>
            <p id="consultation-note" className="text-sm leading-relaxed text-muted-foreground">Opens our consultation form. An admin replies on WhatsApp within 2 business days.</p>
          </div>
        </fieldset>
      </div>
      <CoachingTutorSlideshow />
    </div>
  </section>;
}
