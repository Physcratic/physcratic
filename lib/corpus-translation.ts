import { z } from "zod";
import { importedProblemSchema, type ImportedNode } from "./imported-corpus-schema";

export const translationSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  id: z.string(),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  translatedOn: z.string().date(),
  method: z.enum(["editorial", "ai-assisted"]),
  model: z.string().optional(),
  reviewStatus: z.literal("independent-physics-review-pending"),
  content: importedProblemSchema,
}).superRefine((record, context) => {
  if (record.id !== record.content.id || record.content.language !== "en") {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "English translation identity mismatch" });
  }
});
export type CorpusTranslation = z.infer<typeof translationSchema>;

export function sourceText(nodes: ImportedNode[]): string {
  return nodes.map((node) => node.type === "text" ? node.text : sourceText(node.children ?? [])).join(" ").replace(/\s+/g, " ").trim();
}

export function mapSourceText(nodes: ImportedNode[], translate: (text: string) => string): ImportedNode[] {
  return nodes.map((node) => node.type === "text" ? { ...node, text: translate(node.text) } : {
    ...node,
    ...(node.children ? { children: mapSourceText(node.children, translate) } : {}),
  });
}

export const normalizeSourceText = (text: string) => text.replace(/\s+/g, " ").trim();
export const containsRussian = (text: string) => /[А-Яа-яЁё]/.test(text);
