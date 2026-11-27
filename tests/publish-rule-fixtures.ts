// One valid draft, and one change per schema rule that breaks only that rule.
// Shared by lib/problem-authoring-codes.test.ts and tests/publish-blockers.test.ts.
import { randomUUID } from "node:crypto";
import type { IssueCode } from "../lib/problem-authoring-codes";
import type { EditorDraft } from "../lib/problem-authoring-editor";

const text = (t: string) => ({ id: randomUUID(), kind: "text" as const, spans: [{ kind: "text" as const, text: t }] });
const image = (alt: string, mediaId = randomUUID()) => ({ id: randomUUID(), kind: "image" as const, mediaId, alt, caption: "" });

export function validDraft(): EditorDraft {
  const a = randomUUID();
  const b = randomUUID();
  return {
    problemId: randomUUID(), version: 1, state: "draft", slug: "",
    content: {
      title: "Block on a Slope", topicTags: ["mechanics"], methodTags: ["energy-methods"], estimatedDifficulty: "1200",
      context: [text("A block slides down a slope.")],
      sections: [{ id: randomUUID(), title: "", blocks: [], parts: [
        { id: a, label: "a", answerMode: "numeric", blocks: [text("Find the acceleration.")] },
        { id: b, label: "b", answerMode: "expression", blocks: [text("Find the speed.")] },
      ] }],
      provenance: { kind: "original", source: "", rightsDeclaration: "I wrote this problem." },
      attachments: [],
    },
    privateParts: [
      { partId: a, key: { kind: "numeric", value: 9.8, units: "m/s^2", absTol: 0, relTol: 0.01 }, hints: [], solution: [text("Resolve gravity.")] },
      { partId: b, key: { kind: "expression", expected: "sqrt(2*g*h)", variables: [{ name: "g", domain: "real", assumptions: ["positive"] }, { name: "h", domain: "real", assumptions: [] }], angleUnit: "radians", exclusions: [] }, hints: [], solution: [] },
    ],
  } as EditorDraft;
}

type Expression = Extract<NonNullable<EditorDraft["privateParts"][number]["key"]>, { kind: "expression" }>;
const expression = (d: EditorDraft) => d.privateParts[1].key as Expression;
const partA = (d: EditorDraft) => d.content.sections[0].parts[0];
const big = (spans: number) => ({ ...text(""), spans: Array.from({ length: spans }, () => ({ kind: "text" as const, text: "x".repeat(11_000) })) });

/** Each schema code, with a change that breaks that rule and no other. */
export const BREAKS: Record<Exclude<IssueCode, "unknown">, (d: EditorDraft) => void> = {
  "missing-title-or-rights": (d) => void (d.content.title = " "),
  "missing-statement": (d) => {
    d.content.context = [];
    d.content.sections[0].parts.forEach((p) => (p.blocks = []));
  },
  "image-needs-alt": (d) => {
    const img = image("");
    partA(d).blocks.push(img);
    d.content.attachments.push({ id: img.mediaId, purpose: "statement-image" });
  },
  "part-needs-key": (d) => void (d.privateParts[1].key = null),
  "missing-difficulty": (d) => void (d.content.estimatedDifficulty = null),
  "duplicate-tag": (d) => void (d.content.topicTags = ["mechanics", "mechanics"]),
  "duplicate-id": (d) => void (d.content.sections[0].id = d.content.context[0].id),
  "duplicate-media": (d) => {
    const id = randomUUID();
    d.content.attachments.push({ id, purpose: "statement-pdf" }, { id, purpose: "statement-pdf" });
  },
  "image-needs-media": (d) => void partA(d).blocks.push(image("A ramp")),
  "document-too-large": (d) => void d.content.context.push(big(25)),
  "reserved-variable": (d) => void (expression(d).variables[1].name = "pi"),
  "reversed-variable-bounds": (d) => Object.assign(expression(d).variables[1], { min: 2, max: 1 }),
  "empty-variable-domain": (d) => Object.assign(expression(d).variables[0], { max: -1 }),
  "duplicate-variable": (d) => void (expression(d).variables[1].name = "g"),
  "mismatched-private-part": (d) => void (d.privateParts[0].key = { kind: "manual" }),
  "duplicate-private-id": (d) => {
    const block = text("Hint");
    d.privateParts[0].hints = [block, { ...block }];
  },
  "draft-too-large": (d) => void (d.privateParts[0].solution = [big(25), big(25)]),
};

export function broken(code: keyof typeof BREAKS): EditorDraft {
  const d = validDraft();
  BREAKS[code](d);
  return d;
}
export const payload = (d: EditorDraft) => ({ problemId: d.problemId, version: d.version, content: d.content, privateParts: d.privateParts });
