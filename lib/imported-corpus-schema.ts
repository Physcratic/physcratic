import { z } from "zod";

const localAsset = z
  .string()
  .regex(/^\/corpus\/[a-zA-Z0-9/_.-]+$/)
  .refine((value) => !value.includes(".."));
export const importedTags = [
  "p",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "sub",
  "sup",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "ol",
  "ul",
  "li",
  "blockquote",
  "br",
  "hr",
  "figure",
  "figcaption",
  "pre",
  "code",
  "img",
] as const;
export type ImportedNode =
  | { type: "text"; text: string }
  | {
      type: "element";
      tag: (typeof importedTags)[number];
      children?: ImportedNode[];
      src?: string;
      alt?: string;
    };

const importedNodeSchema: z.ZodType<ImportedNode> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal("text"), text: z.string() }),
    z
      .object({
        type: z.literal("element"),
        tag: z.enum(importedTags),
        children: z.array(importedNodeSchema).optional(),
        src: localAsset.optional(),
        alt: z.string().optional(),
      })
      .refine(
        (node) => node.tag !== "img" || Boolean(node.src && node.alt),
        "Images require a local source and alternative text",
      ),
  ]),
);

export const importedPdfSchema = z.object({
  format: z.literal("pdf"),
  pdf: localAsset,
  pages: z
    .array(
      z.object({
        src: localAsset,
        width: z.number().positive(),
        height: z.number().positive(),
      }),
    ),
  text: z.string().min(80),
  textExtraction: z.enum(["available", "image-only"]).optional(),
  shared: z.boolean(),
  sourcePages: z.array(z.number().int().positive()).min(1),
  initialPage: z.number().int().positive().default(1),
});
const documentSchema = z.union([
  importedPdfSchema.extend({ appendix: importedPdfSchema.optional() }),
  z.object({
    format: z.literal("html"),
    nodes: z.array(importedNodeSchema).min(1),
    text: z.string().min(80),
    figures: z.array(localAsset),
    shared: z.boolean(),
  }),
]);
export const importedProblemSchema = z.object({
  id: z.string().regex(/^(ipho|apho|eupho)-\d{4}-t\d+$/),
  importedOn: z.string().date(),
  language: z.enum(["en", "ru"]),
  statement: documentSchema,
  solution: documentSchema,
  sources: z
    .array(
      z.object({
        url: z.string(),
        kind: z.enum(["statement", "solution"]),
        archiveMember: z.string().optional(),
        urls: z.array(z.string().url()).optional(),
        note: z.string().optional(),
      }),
    )
    .length(2),
});
export type ImportedProblem = z.infer<typeof importedProblemSchema>;
export type ImportedDocument = ImportedProblem["statement"];
