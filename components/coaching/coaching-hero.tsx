"use client";

import Link from "next/link";
import { useState } from "react";
import { CoachingTutorSlideshow } from "./coaching-tutors";
import { coachingGoals, coachingGoalLabel, coachingGoalPaths, coachingGoalLinkLabels } from "@/lib/coaching-pathways";

export function CoachingHero({ initialGoal }: { initialGoal?: string }) {
  const startingGoal = coachingGoals.find((option) => option === initialGoal) ?? "";
  const [goal, setGoal] = useState<(typeof coachingGoals)[number] | "">(startingGoal);

  return <section className="overflow-hidden">
    <div className="coaching-container coaching-hero">
      <div className="coaching-rise flex flex-col gap-6 pb-6">
        <p className="font-serif text-balance text-4xl uppercase leading-[1.05] sm:text-5xl lg:text-[3.6rem]">Learn from the world itself.</p>
        <h1 className="max-w-md text-balance text-lg font-semibold leading-relaxed text-foreground/85 sm:text-xl">One-to-one physics tutoring for IB, <span className="whitespace-nowrap">A-Level</span>, IGCSE and Olympiad preparation.</h1>
        <Link href="/coaching#pathways" className="w-fit text-sm font-medium leading-relaxed underline decoration-border underline-offset-4 transition-colors hover:text-accent">Compare physics tutoring pathways</Link>
        <fieldset id="hero-cta" className="flex max-w-md flex-col gap-4">
          <legend className="mb-4 text-lg font-bold">What brings you to Physcratic today?</legend>
          <div className="flex flex-col gap-2.5">
            {coachingGoals.map((option) => <label key={option} className="flex cursor-pointer items-center gap-4 rounded-lg border border-transparent bg-foreground/5 px-4 py-3.5 text-base font-medium transition-colors hover:bg-foreground/10 has-[:checked]:border-accent has-[:checked]:bg-foreground/10">
              <input type="radio" name="coaching-goal" value={option} checked={goal === option} onChange={() => setGoal(option)} className="size-4 shrink-0 accent-[hsl(var(--accent))]" />
              {coachingGoalLabel(option)}
            </label>)}
          </div>
          <div>{goal ? <Link href={coachingGoalPaths[goal]} className="coaching-button">{coachingGoalLinkLabels[goal]}</Link> : <button type="button" className="coaching-button" disabled>Choose a pathway</button>}</div>
        </fieldset>
      </div>
      <CoachingTutorSlideshow />
    </div>
  </section>;
}
