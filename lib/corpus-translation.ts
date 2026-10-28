import { z } from "zod";
import { importedProblemSchema, type ImportedNode, type ImportedProblem } from "./imported-corpus-schema";

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

export const editorialSeedSchema = z.object({
  id: importedProblemSchema.shape.id,
  format: z.enum(["literal", "formula-tokens"]).default("literal"),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  statementSegments: z.array(z.string().min(1)),
  solutionSegments: z.array(z.string().min(1)).optional(),
}).superRefine((seed, context) => {
  if (seed.format === "formula-tokens" && !seed.sourceSha256) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Protected editorial seeds require an exact source hash" });
  }
});
export type EditorialSeed = z.infer<typeof editorialSeedSchema>;

export function russianSegments(nodes: ImportedNode[]): string[] {
  return nodes.flatMap((node) => node.type === "text" ? (containsRussian(node.text) ? [node.text] : []) : russianSegments(node.children ?? []));
}

export function protectSourceFormulas(text: string) {
  const formulas: string[] = [];
  const masked = text.replace(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$(?!\$)[^$]+?(?<!\\)\$/g, (formula) => {
    const token = `__PHYSICS_FORMULA_${formulas.length}__`;
    formulas.push(formula);
    return token;
  });
  return { masked, formulas };
}

export function restoreTranslatedSegment(source: string, translated: string): string {
  const protectedSource = protectSourceFormulas(normalizeSourceText(source));
  if (containsRussian(translated) || translated.includes("\uFFFD")) throw new Error("Untranslated or corrupted prose remains in the English segment");
  const tokens = (text: string) => text.match(/__PHYSICS_FORMULA_\d+__/g) ?? [];
  if (JSON.stringify(tokens(protectedSource.masked)) !== JSON.stringify(tokens(translated))) throw new Error("Translation changed, dropped, repeated or reordered an equation token");
  const numbers = (text: string) => text.replace(/__PHYSICS_FORMULA_\d+__/g, "").match(/\d+(?:[.,]\d+)?/g) ?? [];
  if (JSON.stringify(numbers(protectedSource.masked)) !== JSON.stringify(numbers(translated))) throw new Error("Translation changed source numbers");
  return translated.replace(/__PHYSICS_FORMULA_(\d+)__/g, (_, index: string) => protectedSource.formulas[Number(index)]);
}

export function editorialDictionary(source: ImportedProblem, seedInput: unknown, sourceSha256: string): Map<string, string> {
  const seed = editorialSeedSchema.parse(seedInput);
  if (seed.id !== source.id || (seed.sourceSha256 && seed.sourceSha256 !== sourceSha256)) throw new Error(`Seed no longer matches ${source.id}`);
  const dictionary = new Map<string, string>();
  for (const kind of ["statement", "solution"] as const) {
    const document = source[kind];
    if (document.format !== "html") throw new Error("Editorial segment translations require an HTML source");
    const segments = russianSegments(document.nodes);
    const translated = kind === "statement" ? seed.statementSegments : seed.solutionSegments;
    if (!translated) continue;
    if (segments.length !== translated.length) throw new Error(`Seed segment count no longer matches ${source.id} ${kind}`);
    segments.forEach((text, index) => {
      const key = normalizeSourceText(text);
      const value = seed.format === "formula-tokens" ? restoreTranslatedSegment(text, translated[index]) : translated[index];
      if (dictionary.has(key) && dictionary.get(key) !== value) throw new Error(`Inconsistent translation of a repeated source segment in ${source.id}`);
      dictionary.set(key, value);
    });
  }
  for (const kind of ["statement", "solution"] as const) {
    const document = source[kind];
    if (document.format === "html" && russianSegments(document.nodes).some((text) => !dictionary.has(normalizeSourceText(text)))) throw new Error(`Editorial seed leaves untranslated ${kind} segments in ${source.id}`);
  }
  return dictionary;
}
