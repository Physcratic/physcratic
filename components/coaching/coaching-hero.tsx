"use client";

import Link from "next/link";
import { useState } from "react";
import { CoachingTutorSlideshow } from "./coaching-tutors";
import { CoachingInquiryForm, coachingGoals } from "./coaching-inquiry";

export function CoachingHero({ initialGoal }: { initialGoal?: string }) {
  const startingGoal = coachingGoals.find((option) => option === initialGoal) ?? "";
  const [goal, setGoal] = useState(startingGoal);
  const [showInquiry, setShowInquiry] = useState(false);

  return <section className="overflow-hidden">
    <div className="coaching-container coaching-hero">
      <div className="coaching-rise flex flex-col gap-6 pb-6">
        <h1 className="font-serif text-balance text-4xl uppercase leading-[1.05] sm:text-5xl lg:text-[3.6rem]">Learn from the world itself.</h1>
        <p className="max-w-md text-base font-semibold leading-relaxed text-foreground/85">One-to-one physics tutoring for school exams and Olympiads. Choose IB, A-Level or IGCSE support, or a general physics consultation. Olympiad winners interested in teaching can select Tutor inquiry.</p>
        <fieldset id="hero-cta" className="flex max-w-md flex-col gap-4">
          <legend className="mb-4 text-lg font-bold">What brings you to Physcratic today?</legend>
          <div className="flex flex-col gap-2.5">
            {coachingGoals.map((option) => <label key={option} className="flex cursor-pointer items-center gap-4 rounded-lg border border-transparent bg-foreground/5 px-4 py-3.5 text-base font-medium transition-colors hover:bg-foreground/10 has-[:checked]:border-accent has-[:checked]:bg-foreground/10">
              <input type="radio" name="coaching-goal" value={option} checked={goal === option} onChange={() => { setGoal(option); setShowInquiry(false); }} className="size-4 shrink-0 accent-[hsl(var(--accent))]" />
              {option}
            </label>)}
          </div>
          <div><button type="button" className="coaching-button" disabled={!goal} aria-expanded={showInquiry} aria-controls="inquiry-form" onClick={() => setShowInquiry(true)}>Continue</button></div>
          {showInquiry && <CoachingInquiryForm selectedGoal={goal} />}
        </fieldset>
      </div>
      <CoachingTutorSlideshow />
    </div>
  </section>;
}
