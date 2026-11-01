"use client";

import { useState, type FormEvent } from "react";

export const coachingGoals = ["General physics consultation", "IB / A-Level / IGCSE training", "Tutor inquiry"] as const;

export function coachingGoalLabel(goal: string) {
  return goal === "Tutor inquiry" ? "I want to become a tutor" : goal;
}

type InquiryStatus = "idle" | "submitting" | "success" | "error";

export function CoachingInquiryForm({ selectedGoal }: { selectedGoal: string }) {
  const [pathway, setPathway] = useState(selectedGoal);
  const [audience, setAudience] = useState("Student");
  const [currentLevel, setCurrentLevel] = useState("");
  const [goals, setGoals] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<InquiryStatus>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    try {
      const response = await fetch("/api/coaching/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathway, audience, currentLevel, goals, contact }),
      });
      if (!response.ok) throw new Error("Inquiry submission failed");
      setStatus("success");
      setCurrentLevel("");
      setGoals("");
      setContact("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") return <div className="rounded-2xl border border-accent/50 bg-foreground/5 p-6" role="status">
    <p className="text-lg font-semibold">Your inquiry is connected.</p>
    <p className="mt-2 leading-relaxed text-muted-foreground">Thank you. Our team will follow up on WhatsApp within two days.</p>
  </div>;

  return <form id="inquiry-form" className="flex flex-col gap-5 rounded-2xl border border-border p-6" onSubmit={handleSubmit}>
    <div className="flex flex-col gap-2"><p className="text-lg font-semibold">Tell us about your goals</p><p className="text-sm leading-relaxed text-muted-foreground">Share a few details and our team will follow up within two days.</p></div>
    <label className="flex flex-col gap-2 text-sm font-medium">Your pathway<select className="coaching-input" value={pathway} onChange={(event) => setPathway(event.target.value)}>{coachingGoals.map((option) => <option key={option} value={option}>{coachingGoalLabel(option)}</option>)}</select></label>
    <label className="flex flex-col gap-2 text-sm font-medium">I am a<select className="coaching-input" value={audience} onChange={(event) => setAudience(event.target.value)}><option>Student</option><option>Parent</option><option>Tutor applicant</option></select></label>
    <label className="flex flex-col gap-2 text-sm font-medium">Current level<input className="coaching-input" type="text" value={currentLevel} onChange={(event) => setCurrentLevel(event.target.value)} placeholder="For example, IB Year 1" maxLength={100} required /></label>
    <label className="flex flex-col gap-2 text-sm font-medium">WhatsApp or email<input className="coaching-input" type="text" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="How should we reach you?" maxLength={200} required /></label>
    <label className="flex flex-col gap-2 text-sm font-medium">What would you like to work on?<textarea className="coaching-input min-h-28 resize-y" value={goals} onChange={(event) => setGoals(event.target.value)} placeholder="Tell us about your physics goals" maxLength={1000} required /></label>
    {status === "error" && <p className="text-sm text-accent" role="alert">We could not save your inquiry. Please try again.</p>}
    <button type="submit" className="coaching-button" disabled={status === "submitting"}>{status === "submitting" ? "Sending…" : "Send inquiry"}</button>
  </form>;
}
