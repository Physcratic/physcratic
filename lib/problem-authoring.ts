import { z } from "zod";
import { physicsTagLabels } from "./physics-taxonomy";
import { parseRating } from "./rating-bands";

// Data contracts only. Grading/evaluation and authorization belong to server services.
// Normalize before parent refinements so comparisons and stored JSON match PostgreSQL uuid.
const id = z.uuid().transform(value => value.toLowerCase());
const bounded = (max: number) => z.string().max(max);
const mode = z.enum(["numeric", "expression", "manual"]);
const inline = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("text"), text: bounded(12_000) }),
  z.strictObject({ kind: z.literal("math"), latex: bounded(2_000) }),
]);
export const authoredBlockSchema = z.discriminatedUnion("kind", [
  z.strictObject({ id, kind: z.literal("text"), spans: z.array(inline).max(100) }),
  z.strictObject({ id, kind: z.literal("math"), latex: bounded(2_000) }),
  z.strictObject({ id, kind: z.literal("image"), mediaId: id, alt: bounded(500), caption: bounded(2_000) }),
]);
const blocks = z.array(authoredBlockSchema).max(100);
const partSchema = z.strictObject({ id, label: bounded(80), blocks, answerMode: mode });
const tagList = z.array(z.string().trim().min(1).max(80)).max(30).refine(v => new Set(v).size === v.length, "Duplicate tags");
export const authoredDocumentSchema = z.strictObject({
  title: bounded(200), topicTags: tagList, methodTags: tagList,
  estimatedDifficulty: bounded(80).nullable(), context: blocks,
  sections: z.array(z.strictObject({ id, title: bounded(200), blocks, parts: z.array(partSchema).max(50) })).max(30),
  provenance: z.strictObject({ kind: z.enum(["original", "authorized"]), source: bounded(2_000), rightsDeclaration: bounded(4_000) }),
  attachments: z.array(z.strictObject({ id, purpose: z.enum(["statement-image", "statement-pdf", "solution-pdf"]) })).max(100),
}).superRefine((doc, ctx) => {
  const seen = new Set<string>();
  const unique = (value: string) => {
    if (seen.has(value)) ctx.addIssue({ code: "custom", message: "Duplicate section, part or block ID" });
    seen.add(value);
  };
  doc.context.forEach(b => unique(b.id));
  doc.sections.forEach(s => { unique(s.id); s.blocks.forEach(b => unique(b.id)); s.parts.forEach(p => { unique(p.id); p.blocks.forEach(b => unique(b.id)); }); });
  if (new Set(doc.attachments.map(a => a.id)).size !== doc.attachments.length) ctx.addIssue({ code: "custom", message: "Duplicate media reference" });
  const images = [...doc.context, ...doc.sections.flatMap(s => [...s.blocks, ...s.parts.flatMap(p => p.blocks)])].filter(b => b.kind === "image");
  images.forEach(b => { if (!doc.attachments.some(a => a.id === b.mediaId && a.purpose === "statement-image")) ctx.addIssue({ code: "custom", message: "Image requires statement-image reference" }); });
  if (JSON.stringify(doc).length > 250_000) ctx.addIssue({ code: "custom", message: "Document exceeds total size limit" });
});
const variableSchema = z.strictObject({
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/).refine(v => !["pi", "e", "sin", "cos", "tan", "exp", "log", "sqrt", "constructor", "__proto__", "prototype"].includes(v), "Reserved variable"),
  domain: z.literal("real"), min: z.number().finite().optional(), max: z.number().finite().optional(),
  assumptions: z.array(z.enum(["positive", "nonnegative", "nonzero"])).max(3),
}).superRefine((v, ctx) => {
  if (v.min !== undefined && v.max !== undefined && v.min > v.max) ctx.addIssue({ code: "custom", message: "Reversed variable bounds" });
  if ((v.assumptions.includes("positive") && v.max !== undefined && v.max <= 0) || (v.assumptions.includes("nonnegative") && v.max !== undefined && v.max < 0) || (v.assumptions.includes("nonzero") && v.min === 0 && v.max === 0)) ctx.addIssue({ code: "custom", message: "Empty variable domain" });
});
export const authoredKeySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("numeric"), value: z.number().finite(), units: bounded(80), absTol: z.number().finite().nonnegative(), relTol: z.number().finite().nonnegative() }),
  z.strictObject({ kind: z.literal("expression"), expected: z.string().trim().min(1).max(180), variables: z.array(variableSchema).max(20).refine(v => new Set(v.map(x => x.name)).size === v.length, "Duplicate variables"), angleUnit: z.enum(["radians", "degrees"]), exclusions: z.array(z.string().min(1).max(180)).max(20) }),
  z.strictObject({ kind: z.literal("manual") }),
]);
export const privatePartSchema = z.strictObject({ partId: id, key: authoredKeySchema.nullable(), hints: blocks, solution: blocks });
export const authoredDraftSchema = z.strictObject({
  problemId: id, version: z.number().int().positive(), content: authoredDocumentSchema,
  privateParts: z.array(privatePartSchema).max(1_500),
}).superRefine((draft, ctx) => {
  const parts = draft.content.sections.flatMap(s => s.parts);
  const seen = new Set(parts.map(p => p.id)); // Private IDs may not collide with statement IDs.
  draft.content.context.forEach(b => seen.add(b.id));
  draft.content.sections.forEach(s => { seen.add(s.id); s.blocks.forEach(b => seen.add(b.id)); s.parts.forEach(p => p.blocks.forEach(b => seen.add(b.id))); });
  const keys = new Set<string>();
  for (const entry of draft.privateParts) {
    const part = parts.find(p => p.id === entry.partId);
    if (!part || keys.has(entry.partId) || (entry.key && entry.key.kind !== part.answerMode)) ctx.addIssue({ code: "custom", message: "Missing, duplicate or mismatched private part" });
    keys.add(entry.partId);
    for (const block of [...entry.hints, ...entry.solution]) {
      if (seen.has(block.id)) ctx.addIssue({ code: "custom", message: "Duplicate private block ID" });
      seen.add(block.id);
    }
  }
  if (JSON.stringify(draft).length > 500_000) ctx.addIssue({ code: "custom", message: "Draft exceeds total size limit" });
});
export const publishableDraftSchema = authoredDraftSchema.superRefine((draft, ctx) => {
  const doc = draft.content;
  const meaningful = (bs: z.infer<typeof blocks>) => bs.some(b => b.kind === "text" ? b.spans.some(s => (s.kind === "text" ? s.text : s.latex).trim()) : b.kind === "math" && b.latex.trim());
  const parts = doc.sections.flatMap(s => s.parts);
  if (!doc.title.trim() || !doc.provenance.rightsDeclaration.trim() || (doc.provenance.kind === "authorized" && !doc.provenance.source.trim())) ctx.addIssue({ code: "custom", message: "Title and rights provenance required" });
  if (!parts.length || ![doc.context, ...doc.sections.map(s => s.blocks), ...parts.map(p => p.blocks)].some(meaningful)) ctx.addIssue({ code: "custom", message: "Native statement and at least one part required" });
  const images = [...doc.context, ...doc.sections.flatMap(s => [...s.blocks, ...s.parts.flatMap(p => p.blocks)]), ...draft.privateParts.flatMap(p => [...p.hints, ...p.solution])].filter(b => b.kind === "image");
  if (images.some(b => !b.alt.trim())) ctx.addIssue({ code: "custom", message: "Every image requires descriptive alternative text before publication" });
  for (const part of parts) if (!draft.privateParts.find(p => p.partId === part.id)?.key) ctx.addIssue({ code: "custom", message: "Every published part requires a key or explicit manual mode" });
  if (parseRating(doc.estimatedDifficulty ?? "") === null) ctx.addIssue({ code: "custom", message: "Add a difficulty rating from 0 to 4,000." });
});
export const authoredProblemSchema = z.strictObject({
  id, slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120), ownerId: z.string().min(1).max(256),
  state: z.enum(["draft", "published", "archived"]), publishedRevisionId: id.nullable(),
}).refine(p => p.state !== "published" || p.publishedRevisionId !== null, "Published state requires revision");
export const authoredRevisionSchema = z.strictObject({
  id, problemId: id, number: z.number().int().positive(), schemaVersion: z.literal(1),
  content: authoredDocumentSchema, publishedAt: z.iso.datetime(),
});

// Explicit DB-row adapter; accept Drizzle Dates and the existing ISO-string contract.
export function normalizeAuthoredRevisionRow(input: unknown) {
  return z.object({ id, problemId: id, number: z.number().int().positive(), schemaVersion: z.literal(1), content: z.unknown(),
    publishedAt: z.union([z.date().transform(value => value.toISOString()), z.iso.datetime()]),
  }).parse(input);
}

export function publicAuthoredContent(input: unknown) {
  const content = authoredDocumentSchema.parse(input);
  return { ...content, topicTags: physicsTagLabels(content.topicTags, "topic"),
    methodTags: physicsTagLabels(content.methodTags, "method"),
    attachments: content.attachments.filter(a => a.purpose !== "solution-pdf") };
}

// Serialization is not authorization: callers must establish published visibility first.
// Explicit mapping: even an over-fetched row must never forward private fields or solution attachments.
export function publicAuthoredRevision(input: unknown) {
  const row = normalizeAuthoredRevisionRow(input);
  const content = publicAuthoredContent(row.content);
  return { id: row.id, problemId: row.problemId, number: row.number, schemaVersion: row.schemaVersion,
    publishedAt: row.publishedAt, content };
}
export type AuthoredDocument = z.infer<typeof authoredDocumentSchema>;
export type PrivatePart = z.infer<typeof privatePartSchema>;
export type AuthoredKey = z.infer<typeof authoredKeySchema>;

// The discovery projection is a subset of the same public document contract.
// No statement, attachment, owner or private-part fields are forwarded.
export const publicAuthoredMetadataSchema = z.object({
  title: authoredDocumentSchema.shape.title, topicTags: authoredDocumentSchema.shape.topicTags,
  methodTags: authoredDocumentSchema.shape.methodTags, estimatedDifficulty: authoredDocumentSchema.shape.estimatedDifficulty,
  provenance: authoredDocumentSchema.shape.provenance,
});
export function publicAuthoredMetadata(input: unknown) {
  const row = publicAuthoredMetadataSchema.parse(input);
  return { title: row.title, topicTags: physicsTagLabels(row.topicTags, "topic"), methodTags: physicsTagLabels(row.methodTags, "method"),
    estimatedDifficulty: row.estimatedDifficulty, provenance: row.provenance };
}
