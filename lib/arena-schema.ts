import { z } from "zod";
import { matchesEstimatedDifficulty } from "./problem-archive";
import { physicsTopicLabels, physicsTagAliases } from "./physics-taxonomy";
import { getProblemTags, tagLabel } from "./problem-tags";

export const arenaProvenance = {
  sourceArchive: "Physcratic Arena Problems",
  representation: "Editable text and LaTeX; only original physics diagrams are images, not embedded PDFs.",
  qualifications: "Source assumptions and qualifications are preserved.",
  reviewStatus: "Independent physics review pending.",
  grading: "Unrated self-review; no marks or ELO awarded.",
} as const;

export const arenaTopics = physicsTopicLabels;
export const arenaProblemSchema = z.object({
  id: z.string().regex(/^arena-[a-z]+(?:-[a-z]+)*$/),
  title: z.string().min(1),
  topic: z.enum(arenaTopics),
  tags: z.array(z.string().min(1)).min(2).max(5),
  summary: z.string().min(20),
  statement: z.string().min(100),
  solution: z.string().min(100),
  // The source PDFs of the first 18 problems. An original Physcratic problem has none.
  statementFile: z.string().endsWith("_Problem.pdf").optional(),
  solutionFile: z.string().endsWith("_Solution.pdf").optional(),
  /** Written for Physcratic, with no source document. The reader says so and never names a PDF. */
  original: z.literal(true).optional(),
  importedOn: z.string().date(),
  /** Three hints for each lettered part, from a nudge to the last step before the answer. Keyed by the part letter. */
  hints: z.record(z.string().regex(/^[a-z]$/), z.array(z.string().min(20)).length(3)).optional(),
});
export type ArenaProblem = z.infer<typeof arenaProblemSchema>;
export type ArenaSeed = Omit<ArenaProblem, "importedOn" | "solutionFile"> & { solutionFile?: string; importedOn?: string };
/** The figure a card shows. It is the first image of the statement, never a solution image, and it is a public static file. */
export const arenaCardImageSchema = z.object({
  src: z.string().regex(/^\/corpus\/arena\/figures\/[a-z0-9-]+-statement\.(?:png|svg)$/),
  /** A short description of the figure for a screen reader, not a file name. */
  alt: z.string().min(10).max(90),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type ArenaCardImage = z.infer<typeof arenaCardImageSchema>;
export type ArenaCatalogEntry = Omit<ArenaProblem, "statement" | "solution"> & { path: string; image?: ArenaCardImage };

export function filterArena(problems: ArenaCatalogEntry[], { query = "", topic = "all", difficulty = "all" }: { query?: string; topic?: string; difficulty?: string }) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return problems.filter((problem) => {
    const tags = getProblemTags(problem);
    const searchable = [problem.title, problem.summary, ...tags.flatMap((tag) => physicsTagAliases(tag))].join(" ").toLocaleLowerCase();
    return matchesEstimatedDifficulty(problem.id, difficulty) && (topic === "all" || tags.includes(tagLabel(topic))) && words.every((word) => searchable.includes(word));
  });
}
