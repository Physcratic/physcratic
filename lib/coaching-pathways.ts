export const coachingGoals = ["General physics consultation", "IB / A-Level / IGCSE training", "Tutor inquiry"] as const;

export const coachingGoalPaths: Record<(typeof coachingGoals)[number], string> = {
  "General physics consultation": "/coaching/consultation",
  "IB / A-Level / IGCSE training": "/coaching/training",
  "Tutor inquiry": "/coaching/become-a-tutor",
};

export function coachingGoalLabel(goal: string) {
  return goal === "Tutor inquiry" ? "I want to become a tutor" : goal;
}
