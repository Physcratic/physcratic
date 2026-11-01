export const coachingGoals = ["General physics consultation", "IB / A-Level / IGCSE training", "Tutor inquiry"] as const;

export const coachingGoalPaths: Record<(typeof coachingGoals)[number], string> = {
  "General physics consultation": "/coaching/consultation",
  "IB / A-Level / IGCSE training": "/coaching/training",
  "Tutor inquiry": "/coaching/become-a-tutor",
};

export const coachingGoalLinkLabels: Record<(typeof coachingGoals)[number], string> = {
  "General physics consultation": "Request a physics consultation",
  "IB / A-Level / IGCSE training": "Request IB, A-Level & IGCSE tutoring",
  "Tutor inquiry": "Apply to become a physics tutor",
};

export function coachingGoalLabel(goal: string) {
  return goal === "Tutor inquiry" ? "I want to become a tutor" : goal;
}
