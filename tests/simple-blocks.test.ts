import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { authoredDraftSchema, publishableDraftSchema } from "../lib/problem-authoring";
import { draftPayload, editorDraftSchema, newProblem, type EditorBlock, type EditorDraft } from "../lib/problem-authoring-editor";
import {
  advancedNote,
  allParts,
  applyAnswer,
  blocksSpans,
  captionOf,
  ensureSimpleShape,
  extraBlocks,
  privateFor,
  readAnswer,
  setDifficulty,
  setQuestion,
  setQuestionBlocks,
  setRights,
  setSolution,
  setSolutionBlocks,
  sharedSetupBlocks,
  simpleIssues,
  withBlocksSpans,
  withExtraBlocks,
  withFirstCaption,
  withSharedSetupBlocks,
} from "../components/authoring/simple-model";

createRequire(import.meta.url)("./server-only-register.cjs");

const uuid = () => crypto.randomUUID();
const text = (t: string): EditorBlock => ({ id: uuid(), kind: "text", spans: [{ kind: "text", text: t }, { kind: "math", latex: "v_0" }, { kind: "text", text: " end" }] });
const math = (latex: string): EditorBlock => ({ id: uuid(), kind: "math", latex });
const image = (alt: string, caption = ""): EditorBlock => ({ id: uuid(), kind: "image", mediaId: uuid(), alt, caption });
const imagesIn = (blocks: readonly EditorBlock[]) => blocks.filter((b): b is Extract<EditorBlock, { kind: "image" }> => b.kind === "image");

/** A draft with every block type at every level: the problem, a section, a part, the hints and the worked solution. */
function everyBlock(): EditorDraft {
  const d: EditorDraft = { problemId: uuid(), version: 1, state: "draft", slug: "", ...structuredClone(newProblem()) };
  d.content.title = "Every block";
  d.content.context = [text("Main question"), math("E=mc^2"), image("A ramp", "Figure 1"), text("More setup"), image("A second picture")];
  d.content.sections = [
    { id: uuid(), title: "Setup", blocks: [text("Section text"), math("F=ma"), image("A pulley", "Pulley")], parts: [
      { id: uuid(), label: "a", answerMode: "manual", blocks: [text("Question a"), image("Diagram a", "Diagram"), math("x=1"), text("Extra a"), image("Extra picture a")] },
      { id: uuid(), label: "b", answerMode: "manual", blocks: [math("y=2"), text("Only text b"), math("z=3")] },
    ] },
    { id: uuid(), title: "Second", blocks: [image("Second section picture"), text("Second text")], parts: [{ id: uuid(), label: "c", answerMode: "manual", blocks: [text("Question c")] }] },
  ];
  d.privateParts = allParts(d).map(({ part }) => ({ partId: part.id, key: { kind: "manual" as const }, hints: [text(`Hint ${part.label}`), math("h=1"), image("Hint picture")], solution: [text(`Solution ${part.label}`), math("s=1"), image("Solution picture", "Solution"), text("Solution end")] }));
  const allImages = [...d.content.context, ...d.content.sections.flatMap((s) => [...s.blocks, ...s.parts.flatMap((p) => p.blocks)])].flatMap((b) => (b.kind === "image" ? [{ id: b.mediaId, purpose: "statement-image" as const }] : []));
  d.content.attachments = allImages;
  return d;
}
const content = (d: EditorDraft) => structuredClone({ content: d.content, privateParts: d.privateParts });
/** What the editor does: the server schema accepts the payload, the answer comes back as JSON and the editor reads it again. */
function saveAndReopen(d: EditorDraft): EditorDraft {
  const saved = authoredDraftSchema.parse({ problemId: d.problemId, version: d.version, ...draftPayload(d) });
  return editorDraftSchema.parse(JSON.parse(JSON.stringify({ ...saved, state: "draft", slug: "problem-x" })));
}
/** Opening in Simple, and every read and write back that Simple's own fields do when nothing is typed in them. */
function openInSimple(d: EditorDraft) {
  ensureSimpleShape(d);
  d.content.context = withSharedSetupBlocks(d.content.context, sharedSetupBlocks(d.content.context));
  d.content.context = withBlocksSpans(d.content.context, blocksSpans(d.content.context));
  d.content.context = withFirstCaption(d.content.context, captionOf(d.content.context));
  for (const section of d.content.sections) section.blocks = withExtraBlocks(section.blocks, extraBlocks(section.blocks));
  for (const { part } of allParts(d)) {
    part.blocks = withExtraBlocks(part.blocks, extraBlocks(part.blocks));
    part.blocks = withBlocksSpans(part.blocks, blocksSpans(part.blocks));
    part.blocks = withFirstCaption(part.blocks, captionOf(part.blocks));
    setQuestionBlocks(d, part.id, part.blocks);
    const entry = privateFor(d, part.id);
    setSolutionBlocks(d, part.id, withExtraBlocks(entry.solution, extraBlocks(entry.solution, false), false));
    setSolution(d, part.id, blocksSpans(entry.solution));
  }
}

test("opening a draft in Simple and saving it without touching a block leaves every block identical, in the same order", () => {
  const d = everyBlock();
  const before = content(d);
  const kinds = new Set<string>();
  for (const list of [d.content.context, ...d.content.sections.flatMap((s) => [s.blocks, ...s.parts.map((p) => p.blocks)]), ...d.privateParts.flatMap((p) => [p.hints, p.solution])]) for (const block of list) kinds.add(block.kind);
  assert.deepEqual([...kinds].sort(), ["image", "math", "text"], "the fixture has every block type");
  openInSimple(d);
  assert.deepEqual(content(d), before, "after open");
  const reopened = saveAndReopen(d);
  assert.deepEqual(content(reopened), before, "after save and reopen");
  openInSimple(reopened);
  assert.deepEqual(content(saveAndReopen(reopened)), before, "after a second round");
});

test("each list keeps its own blocks: what Simple shows and what is extra together are the whole list", () => {
  const d = everyBlock();
  const lists: [string, EditorBlock[], boolean][] = [
    ["context", d.content.context, true],
    ["section", d.content.sections[0].blocks, true],
    ["question", d.content.sections[0].parts[0].blocks, true],
    ["solution", d.privateParts[0].solution, false],
  ];
  for (const [name, blocks, picture] of lists) {
    const extra = extraBlocks(blocks, picture);
    assert.equal(withExtraBlocks(blocks, extra, picture).length, blocks.length, name);
    assert.deepEqual(withExtraBlocks(blocks, extra, picture), blocks, name);
    const firstText = blocks.findIndex((b) => b.kind === "text");
    const firstImage = blocks.findIndex((b) => b.kind === "image");
    const own = new Set([firstText, picture ? firstImage : -1].filter((i) => i >= 0));
    assert.equal(extra.length, blocks.length - own.size, `${name}: only the blocks Simple's fields own are left out`);
  }
});

test("a block of each type can be added, edited, moved and removed in the extras, and the blocks Simple owns do not move", () => {
  for (const picture of [true, false]) {
    const base: EditorBlock[] = picture ? [text("Question"), image("Picture"), math("a=b")] : [text("Solution"), math("a=b")];
    const ownIds = base.filter((b, i) => i === base.findIndex((x) => x.kind === "text") || (picture && i === base.findIndex((x) => x.kind === "image"))).map((b) => b.id);
    const add = [text("More text"), math("c=d"), image("More picture")];
    let blocks = withExtraBlocks(base, [...extraBlocks(base, picture), ...add], picture);
    assert.equal(blocks.length, base.length + 3);
    // Edit: change the equation and the caption of the added picture.
    const shown = extraBlocks(blocks, picture).map((b) => (b.kind === "math" && b.latex === "c=d" ? { ...b, latex: "c=e" } : b.kind === "image" && b.alt === "More picture" ? { ...b, caption: "Figure" } : b));
    blocks = withExtraBlocks(blocks, shown, picture);
    assert.ok(blocks.some((b) => b.kind === "math" && b.latex === "c=e"));
    assert.ok(imagesIn(blocks).some((b) => b.caption === "Figure"));
    // Move the last extra up and the first extra down, then remove one.
    const moved = [...extraBlocks(blocks, picture)];
    [moved[moved.length - 2], moved[moved.length - 1]] = [moved[moved.length - 1], moved[moved.length - 2]];
    blocks = withExtraBlocks(blocks, moved, picture);
    assert.deepEqual(extraBlocks(blocks, picture).map((b) => b.id), moved.map((b) => b.id));
    blocks = withExtraBlocks(blocks, moved.slice(1), picture);
    assert.equal(blocks.length, base.length + 2);
    for (const id of ownIds) assert.equal(blocks.findIndex((b) => b.id === id), base.findIndex((b) => b.id === id), `a block Simple owns stays in its place (${picture ? "question" : "solution"})`);
  }
});

test("a text block added before there is any text becomes an empty own text first, so it does not vanish from the extras", () => {
  const added = text("Extra");
  const blocks = withExtraBlocks([], [added], true);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].kind, "text");
  assert.deepEqual(blocksSpans(blocks), [{ kind: "text", text: "" }]);
  assert.deepEqual(extraBlocks(blocks, true), [added]);
});

test("the caption of the first picture is set without touching any other block", () => {
  const blocks = [text("Q"), image("One", "x"), image("Two", "y"), math("a")];
  const out = withFirstCaption(blocks, "New");
  assert.equal(captionOf(out), "New");
  assert.deepEqual(out.filter((b) => b.id !== (blocks[1] as { id: string }).id), blocks.filter((b) => b.id !== (blocks[1] as { id: string }).id));
  assert.equal(imagesIn(out)[1].caption, "y");
  assert.equal(captionOf([text("only")]), "");
});

function ready(): EditorDraft {
  const d: EditorDraft = { problemId: uuid(), version: 1, state: "draft", slug: "", ...structuredClone(newProblem()) };
  ensureSimpleShape(d);
  const id = allParts(d)[0].part.id;
  d.content.title = "Block on a slope";
  setQuestion(d, id, [{ kind: "text", text: "Find the acceleration." }]);
  applyAnswer(d, id, readAnswer("9.8"), "9.8");
  setSolution(d, id, [{ kind: "text", text: "Use gravity along the slope." }]);
  setRights(d, true);
  setDifficulty(d, "2100");
  return d;
}
const serverIssues = (d: EditorDraft) => publishableDraftSchema.safeParse({ problemId: d.problemId, version: 1, ...draftPayload(d) }).error?.issues ?? [];
const ALT = "Every image requires descriptive alternative text before publication";

test("a rule for a block is the server's: Simple and the server agree on pictures in the new groups, and on the size limits", () => {
  const base = ready();
  assert.deepEqual(serverIssues(base), [], "the base draft publishes");
  assert.deepEqual(simpleIssues(base), []);
  for (const where of ["question", "solution"] as const) {
    // A second picture without a description, in the group Simple now has for it.
    const draft = ready();
    const part = allParts(draft)[0].part;
    if (where === "question") {
      const first = image("First picture"), second = image("");
      draft.content.attachments.push({ id: (first as { mediaId: string }).mediaId, purpose: "statement-image" }, { id: (second as { mediaId: string }).mediaId, purpose: "statement-image" });
      setQuestionBlocks(draft, part.id, [...part.blocks, first, second]);
    } else setSolutionBlocks(draft, part.id, [...privateFor(draft, part.id).solution, image("")]);
    assert.ok(serverIssues(draft).some((i) => i.message === ALT), `${where}: the server asks for a description`);
    assert.ok(simpleIssues(draft).some((i) => i.field === `options:${part.id}`), `${where}: Simple points at the part's More options`);
    assert.ok(!simpleIssues(draft).some((i) => /Classic/.test(i.message)), `${where}: no message sends the author to Classic`);
    const described = (blocks: EditorBlock[]) => blocks.map((b) => (b.kind === "image" ? { ...b, alt: b.alt || "Described" } : b));
    if (where === "question") setQuestionBlocks(draft, part.id, described(allParts(draft)[0].part.blocks));
    else setSolutionBlocks(draft, part.id, described(privateFor(draft, part.id).solution));
    assert.ok(!serverIssues(draft).some((i) => i.message === ALT), `${where}: described, the server is satisfied`);
    assert.deepEqual(simpleIssues(draft), [], `${where}: described, Simple is satisfied`);
  }
  // The block limits are the schema's own: the document schema is what refuses a 101st block and an overlong equation.
  const many = ready();
  const target = allParts(many)[0].part;
  setQuestionBlocks(many, target.id, Array.from({ length: 101 }, () => math("a")));
  assert.equal(authoredDraftSchema.safeParse({ problemId: many.problemId, version: 1, ...draftPayload(many) }).success, false, "101 blocks");
  setQuestionBlocks(many, target.id, [math("x".repeat(2001))]);
  assert.equal(authoredDraftSchema.safeParse({ problemId: many.problemId, version: 1, ...draftPayload(many) }).success, false, "an equation over 2000 characters");
  setQuestionBlocks(many, target.id, [math("x".repeat(2000))]);
  assert.equal(authoredDraftSchema.safeParse({ problemId: many.problemId, version: 1, ...draftPayload(many) }).success, true, "2000 characters");
});

test("copy that sent authors to the Classic editor for blocks now points at More options", () => {
  const d = ready();
  const part = allParts(d)[0].part;
  const first = image("First"), second = image("");
  d.content.attachments.push({ id: (first as { mediaId: string }).mediaId, purpose: "statement-image" }, { id: (second as { mediaId: string }).mediaId, purpose: "statement-image" });
  setQuestionBlocks(d, part.id, [...part.blocks, first, second]);
  setSolutionBlocks(d, part.id, [...privateFor(d, part.id).solution, image("")]);
  const said = simpleIssues(d).map((i) => i.message);
  assert.ok(said.includes("Describe each image, in More options."));
  assert.ok(said.includes("Describe each image in the worked solution, in More options."));
  assert.ok(said.every((m) => !/Classic/.test(m)));
  const full = everyBlock();
  assert.doesNotMatch(advancedNote(full), /more blocks/);
  assert.equal(advancedNote(ready()), "");
});
