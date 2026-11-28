/**
 * What blocks Publish, as stable codes, for the step flow and the "what is left" bar.
 * The rules are the server's own: the draft is parsed with publishableDraftSchema and each issue is read
 * through codeOfIssue. Nothing here restates a rule. Where a rule does not say which part or image it is
 * about, the same schema is asked again about one part or one image at a time.
 * Only what the server refuses is listed. Simple's own asks, such as the worked solution, stay nudges.
 */
import { codeOfIssue, type IssueCode } from "@/lib/problem-authoring-codes";
import { publishableDraftSchema } from "@/lib/problem-authoring";
import { draftPayload, type EditorBlock, type EditorDraft } from "@/lib/problem-authoring-editor";

export const PUBLISH_STEPS = ["question", "answer", "worked-solution", "details", "review"] as const;
export type PublishStep = (typeof PUBLISH_STEPS)[number];
export type PublishBlocker = {
  code: IssueCode;
  partId?: string;
  blockId?: string;
  /** For a tag issue, which list it is in. */
  list?: "topicTags" | "methodTags";
  step: PublishStep;
  /** The server's own words, for a rule Simple has no message of its own for. */
  message?: string;
};

/** The step each code is fixed in. An image in a hint or worked solution is fixed in the worked solution step instead. */
export const STEP_OF_CODE: Record<IssueCode, PublishStep> = {
  "missing-statement": "question",
  "image-needs-alt": "question",
  "part-needs-key": "answer",
  "reserved-variable": "answer",
  "reversed-variable-bounds": "answer",
  "empty-variable-domain": "answer",
  "duplicate-variable": "answer",
  "mismatched-private-part": "answer",
  "missing-title-or-rights": "details",
  "missing-difficulty": "details",
  "duplicate-tag": "details",
  "image-needs-media": "review",
  "duplicate-id": "review",
  "duplicate-media": "review",
  "duplicate-private-id": "review",
  "document-too-large": "review",
  "draft-too-large": "review",
  unknown: "review",
};

type Payload = ReturnType<typeof draftPayload> & { problemId: string; version: number };
type Issue = { message: string; path: readonly PropertyKey[] };
const payloadOf = (d: EditorDraft): Payload => ({ problemId: d.problemId, version: d.version, ...draftPayload(d) });
const issuesOf = (p: Payload): Issue[] => publishableDraftSchema.safeParse(p).error?.issues ?? [];
const has = (p: Payload, code: IssueCode) => issuesOf(p).some((i) => codeOfIssue(i) === code);
const copy = (p: Payload): Payload => structuredClone(p);

/** The part an issue's path points into, from the draft's own structure. */
function partOfPath(p: Payload, path: readonly PropertyKey[]): string | undefined {
  if (path[0] === "privateParts" && typeof path[1] === "number") return p.privateParts[path[1]]?.partId;
  if (path[0] === "content" && path[1] === "sections" && typeof path[2] === "number" && path[3] === "parts" && typeof path[4] === "number")
    return p.content.sections[path[2]]?.parts[path[4]]?.id;
  return undefined;
}

/** Where an image is edited: the main question's picture box, a part's question, its hints or worked solution, or the problem's More options. */
type Where = "main" | "part" | "solution" | "problem";
type Image = { block: Extract<EditorBlock, { kind: "image" }>; partId?: string; where: Where };
function imagesOf(p: Payload): Image[] {
  const pick = (blocks: readonly EditorBlock[], partId: string | undefined, where: Where) =>
    blocks.flatMap((block) => (block.kind === "image" ? [{ block, partId, where }] : []));
  // Only the main question's first picture has its own box. Any other shared setup image is in the problem's More options.
  const context = pick(p.content.context, undefined, "problem");
  if (context[0]) context[0] = { ...context[0], where: "main" };
  return [
    ...context,
    ...p.content.sections.flatMap((s) => [...pick(s.blocks, undefined, "problem"), ...s.parts.flatMap((part) => pick(part.blocks, part.id, "part"))]),
    ...p.privateParts.flatMap((e) => [...pick(e.hints, e.partId, "solution"), ...pick(e.solution, e.partId, "solution")]),
  ];
}
const STEP_OF_WHERE: Record<Where, PublishStep> = { main: "question", part: "question", solution: "worked-solution", problem: "details" };

/** Each part the key rule is about: the schema is asked about a draft that holds only that part. */
function partsNeedingKey(p: Payload): string[] {
  const ids = p.content.sections.flatMap((s) => s.parts.map((part) => part.id));
  return ids.filter((id) => {
    const probe = copy(p);
    probe.content.sections = probe.content.sections.map((s) => ({ ...s, parts: s.parts.filter((part) => part.id === id) }));
    probe.privateParts = probe.privateParts.filter((e) => e.partId === id);
    return has(probe, "part-needs-key");
  });
}

/** Each part a broken private entry is for: the schema is asked about a draft that keeps only that entry. */
function partsWithMismatchedKey(p: Payload): string[] {
  return p.privateParts.flatMap((entry, i) => {
    const probe = copy(p);
    probe.privateParts = [probe.privateParts[i]];
    return has(probe, "mismatched-private-part") ? [entry.partId] : [];
  });
}

/** Each image the description rule is about: the schema is asked again with every other image described. */
function imagesNeedingAlt(p: Payload): Image[] {
  const images = imagesOf(p);
  return images.filter((_, index) => {
    const probe = copy(p);
    imagesOf(probe).forEach((image, i) => {
      if (i !== index) image.block.alt = "described";
    });
    return has(probe, "image-needs-alt");
  });
}

/** Everything that blocks Publish, ordered by step and then by the schema's own order. Empty exactly when the server accepts the draft. */
export function publishBlockers(d: EditorDraft): PublishBlocker[] {
  const p = payloadOf(d);
  const blockers: PublishBlocker[] = [];
  const seen = new Set<IssueCode>();
  for (const issue of issuesOf(p)) {
    const code = codeOfIssue(issue);
    if (code === "mismatched-private-part") {
      if (seen.has(code)) continue;
      seen.add(code);
      const ids = [...new Set(partsWithMismatchedKey(p))];
      blockers.push(...(ids.length ? ids.map((partId) => ({ code, partId, step: STEP_OF_CODE[code], message: issue.message })) : [{ code, step: STEP_OF_CODE[code], message: issue.message }]));
      continue;
    }
    if (code === "part-needs-key" || code === "image-needs-alt") {
      // These rules repeat or summarise. Each part or image they are about is listed once.
      if (seen.has(code)) continue;
      seen.add(code);
      const located: PublishBlocker[] =
        code === "part-needs-key"
          ? partsNeedingKey(p).map((partId) => ({ code, partId, step: STEP_OF_CODE[code], message: issue.message }))
          : imagesNeedingAlt(p).map((image) => ({
              code,
              blockId: image.block.id,
              ...(image.partId ? { partId: image.partId } : {}),
              // The image is fixed where it is edited.
              step: STEP_OF_WHERE[image.where],
              message: issue.message,
            }));
      blockers.push(...(located.length ? located : [{ code, step: STEP_OF_CODE[code], message: issue.message }]));
      continue;
    }
    const partId = partOfPath(p, issue.path);
    const list = issue.path[0] === "content" && (issue.path[1] === "topicTags" || issue.path[1] === "methodTags") ? issue.path[1] : undefined;
    // A tag issue is fixed with the tags, in Details, whatever its code.
    blockers.push({ code, ...(partId ? { partId } : {}), ...(list ? { list } : {}), step: list ? "details" : STEP_OF_CODE[code], message: issue.message });
  }
  const rank = (b: PublishBlocker) => PUBLISH_STEPS.indexOf(b.step);
  return blockers.map((b, i) => ({ b, i })).sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i).map(({ b }) => b);
}

/** The Simple field a blocker is shown at, in the same form simpleIssues uses. issueTarget turns it into a data-simple-field. */
export function blockerField(b: PublishBlocker, d: EditorDraft): string {
  switch (b.code) {
    case "missing-statement": {
      const first = d.content.sections.flatMap((s) => s.parts)[0];
      return first ? `question:${first.id}` : "parts";
    }
    case "image-needs-alt": {
      // The main question's first picture has its own box. Every other shared setup or section image is in the problem's More options.
      if (!b.partId) return d.content.context.find((x) => x.kind === "image")?.id === b.blockId ? "picture:main" : "options:problem";
      const entry = d.privateParts.find((x) => x.partId === b.partId);
      // An image in the hints or the worked solution is in the More options on Worked solution.
      if (entry && [...entry.hints, ...entry.solution].some((x) => x.id === b.blockId)) return `solution-options:${b.partId}`;
      const part = d.content.sections.flatMap((s) => s.parts).find((x) => x.id === b.partId);
      // Simple shows a part's first picture in its picture box. Every other one is in the part's More options on Question.
      return part?.blocks.find((x) => x.kind === "image")?.id === b.blockId ? `picture:${b.partId}` : `options:${b.partId}`;
    }
    case "missing-title-or-rights":
      // One rule covers three fields. Focus goes to the first one that is empty.
      return !d.content.title.trim() ? "title" : !d.content.provenance.rightsDeclaration.trim() ? "rights" : "source";
    case "missing-difficulty":
      return "difficulty";
    case "duplicate-tag":
      return b.list === "topicTags" ? "topics" : "options:problem";
    default:
      if (b.list === "topicTags") return "topics";
      if (b.list === "methodTags") return "options:problem";
      // A rule Simple has no field for is listed on the Review step.
      if (b.step === "review") return "review";
      if (b.partId && b.step === "answer") return `answer:${b.partId}`;
      return b.partId ? `options:${b.partId}` : "options:problem";
  }
}
