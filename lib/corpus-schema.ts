import { z } from "zod";
import { legacyPhysicsTopicLabels, physicsTopicLabels } from "./physics-taxonomy";

export const corpusBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), value: z.string().min(1) }),
  z.object({
    type: z.literal("math"),
    value: z.string().regex(/^\$\$[\s\S]+\$\$$/),
  }),
]);

export const corpusPartSchema = z.object({
  id: z.string().min(1),
  section: z.string().min(1),
  title: z.string().min(1),
  points: z.number().positive(),
  page: z.number().int().positive(),
  solutionPage: z.number().int().positive(),
  prompt: z.string().min(20),
  model: z.string().optional(),
  items: z.array(z.string()).optional(),
});

export const corpusProblemSchema = z
  .object({
    id: z.string().regex(/^(ipho|apho|eupho)-\d{4}-t[1-9]\d*$/),
    competition: z.enum(["IPhO", "APhO", "EuPhO"]),
    year: z.number().int().min(1967),
    code: z.string().regex(/^T[1-9]\d*$/),
    totalPoints: z.number().positive(),
    documents: z.object({
      questions: z.object({
        pdf: z.string().regex(/^\/(?!\/)[\w/-]+\.pdf$/),
        images: z.array(z.string().regex(/^\/(?!\/)[\w/-]+\.webp$/)).min(1),
      }),
      solutions: z.object({
        pdf: z.string().regex(/^\/(?!\/)[\w/-]+\.pdf$/),
        images: z.array(z.string().regex(/^\/(?!\/)[\w/-]+\.webp$/)).min(1),
      }),
    }),
    title: z.string().min(1),
    topics: z
      .array(
        z.enum([...legacyPhysicsTopicLabels, ...physicsTopicLabels]),
      )
      .min(1),
    tags: z.array(z.string()).min(1),
    summary: z.string().min(20),
    attribution: z.string().min(20),
    sourceUrl: z.string().url().startsWith("https://"),
    pages: z.number().int().positive(),
    solutionPages: z.number().int().positive(),
    sections: z.array(z.object({ id: z.string(), title: z.string() })).min(1),
    context: z.array(corpusBlockSchema).min(1),
    parts: z.array(corpusPartSchema).min(1),
  })
  .superRefine((problem, context) => {
    const sectionIds = new Set(problem.sections.map((section) => section.id));
    if (
      new Set(problem.parts.map((part) => part.id)).size !==
      problem.parts.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate subpart identifier",
      });
    }
    if (sectionIds.size !== problem.sections.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate section identifier",
      });
    }
    if (
      problem.id !==
      `${problem.competition.toLowerCase()}-${problem.year}-${problem.code.toLowerCase()}`
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Problem identity does not match its competition, year and code",
      });
    }
    if (
      problem.documents.questions.images.length !== problem.pages ||
      problem.documents.solutions.images.length !== problem.solutionPages
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Document asset count does not match declared page count",
      });
    }
    if (
      Math.abs(
        problem.parts.reduce((sum, part) => sum + part.points, 0) -
          problem.totalPoints,
      ) > 0.001
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Subpart marks must equal the paper’s declared original total",
      });
    }
    for (const part of problem.parts) {
      if (
        part.page > problem.pages ||
        part.solutionPage > problem.solutionPages ||
        !sectionIds.has(part.section)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid source mapping: ${part.id}`,
        });
      }
    }
  });

export type CorpusProblem = z.infer<typeof corpusProblemSchema>;
export type CorpusPart = z.infer<typeof corpusPartSchema>;
