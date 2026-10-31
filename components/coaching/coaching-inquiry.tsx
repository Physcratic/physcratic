export const coachingGoals = ["General physics consultation", "IB / A-Level / IGCSE training", "Tutor inquiry"] as const;

export function CoachingInquiry({ goal }: { goal?: string }) {
  const selectedGoal = coachingGoals.find((option) => option === goal) ?? coachingGoals[0];
  return <section id="inquiry" className="border-t border-border py-20" aria-labelledby="coaching-inquiry-title">
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5">
      <div className="flex flex-col gap-3"><p className="text-sm font-medium uppercase tracking-wide text-accent">Inquiry design preview</p><h2 id="coaching-inquiry-title" className="text-balance text-3xl font-bold">Your first step starts here.</h2><p id="coaching-preview-notice" className="text-pretty leading-relaxed text-muted-foreground">This is a frontend-only preview. Submissions are not connected; nothing entered here is sent or saved.</p></div>
      <fieldset key={selectedGoal} className="flex flex-col gap-5 rounded-2xl border border-border p-6" aria-describedby="coaching-preview-notice">
        <legend className="px-2 text-lg font-semibold">Tell us about your goals</legend>
        <label className="flex flex-col gap-2 text-sm font-medium">Your pathway<select className="coaching-input" defaultValue={selectedGoal}>{coachingGoals.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-sm font-medium">I am a<select className="coaching-input" defaultValue="Student"><option>Student</option><option>Parent</option><option>Tutor applicant</option></select></label>
        <label className="flex flex-col gap-2 text-sm font-medium">Current level<input className="coaching-input" type="text" placeholder="For example, IB Year 1" maxLength={100} /></label>
        <label className="flex flex-col gap-2 text-sm font-medium">What would you like to work on?<textarea className="coaching-input min-h-28 resize-y" placeholder="Tell us about your physics goals" maxLength={1000} /></label>
        <button type="button" className="coaching-button" disabled aria-describedby="coaching-preview-notice">Inquiry submission not connected</button>
      </fieldset>
    </div>
  </section>;
}
