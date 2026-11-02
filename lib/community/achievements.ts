import { z } from "zod";

export const achievementDefinitions = [
  { id: "first-spark", name: "First Spark", category: "author", threshold: 1, description: "Own 1 currently published problem.", tone: "slate", rare: false },
  { id: "problem-weaver", name: "Problem Weaver", category: "author", threshold: 5, description: "Own 5 currently published problems.", tone: "teal", rare: false },
  { id: "equation-architect", name: "Equation Architect", category: "author", threshold: 15, description: "Own 15 currently published problems.", tone: "indigo", rare: false },
  { id: "master-problem-setter", name: "Master Problem Setter", category: "author", threshold: 50, description: "Own 50 currently published problems.", tone: "amber", rare: true },
  { id: "first-breakthrough", name: "First Breakthrough", category: "solver", threshold: 1, description: "Complete 1 current authored problem without assistance.", tone: "green", rare: false },
  { id: "persistent-solver", name: "Persistent Solver", category: "solver", threshold: 10, description: "Complete 10 distinct current authored problems without assistance.", tone: "blue", rare: false },
  { id: "olympiad-pathfinder", name: "Olympiad Pathfinder", category: "solver", threshold: 50, description: "Complete 50 distinct current authored problems without assistance.", tone: "violet", rare: true },
] as const;
export type AchievementId = typeof achievementDefinitions[number]["id"];
export type AchievementCategory = "author" | "solver";
export const achievementIdSchema = z.enum(achievementDefinitions.map(item => item.id));
export const showcaseSchema = z.strictObject({ selectedIds: z.array(achievementIdSchema).max(2)
  .refine(ids => new Set(ids).size === ids.length) });
export const achievementProgressSchema = z.strictObject({ author: z.number().int().min(0).max(50), solver: z.number().int().min(0).max(50).nullable() });
export type AchievementProgress = z.infer<typeof achievementProgressSchema>;
export function achievementEligible(id: AchievementId, progress: AchievementProgress) {
  const definition = achievementDefinitions.find(item => item.id === id)!;
  const count = progress[definition.category];
  return count !== null && count >= definition.threshold;
}
export const ownAchievementsSchema = z.strictObject({
  progress: achievementProgressSchema, selectedIds: showcaseSchema.shape.selectedIds,
  hiddenSelectionCount: z.number().int().min(0).max(2), profileExists: z.boolean(),
});
export type OwnAchievements = z.infer<typeof ownAchievementsSchema>;
