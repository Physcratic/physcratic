import { z } from "zod";

export const arenaProvenance = {
  sourceArchive: "Physcratic Arena Problems",
  representation: "Editable text and LaTeX; only original physics diagrams are images, not embedded PDFs.",
  qualifications: "Source assumptions and qualifications are preserved.",
  reviewStatus: "Independent physics review pending.",
  grading: "Unrated self-review; no marks or ELO awarded.",
} as const;

export const arenaTopics = ["Mechanics", "Electromagnetism", "Waves", "Thermodynamics", "Optics", "Modern physics"] as const;
export const arenaProblemSchema = z.object({
  id: z.string().regex(/^arena-[a-z]+(?:-[a-z]+)*$/),
  title: z.string().min(1),
  topic: z.enum(arenaTopics),
  tags: z.array(z.string().min(1)).min(2).max(5),
  summary: z.string().min(20),
  statement: z.string().min(100),
  solution: z.string().min(100),
  statementFile: z.string().endsWith("_Problem.pdf"),
  solutionFile: z.string().endsWith("_Solution.pdf"),
  importedOn: z.string().date(),
});
export type ArenaProblem = z.infer<typeof arenaProblemSchema>;
export type ArenaSeed = Omit<ArenaProblem, "importedOn" | "solutionFile"> & { solutionFile?: string };
export type ArenaCatalogEntry = Omit<ArenaProblem, "statement" | "solution"> & { path: string };

export function filterArena(problems: ArenaCatalogEntry[], { query = "", topic = "all", difficulty = "all" }: { query?: string; topic?: string; difficulty?: string }) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return problems.filter((problem) => {
    const tags = [problem.topic, ...problem.tags];
    const searchable = [problem.title, problem.summary, ...tags].join(" ").toLocaleLowerCase();
    return (difficulty === "all" || difficulty === "unrated") && (topic === "all" || tags.includes(topic)) && words.every((word) => searchable.includes(word));
  });
}
