import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { authoredDraftSchema, publishableDraftSchema } from "../lib/problem-authoring";
import { draftPayload, editorDraftSchema, newProblem, type EditorBlock, type EditorDraft } from "../lib/problem-authoring-editor";
import {
  advancedNote,
  allParts,
  applyAnswer,
  blocksSpans,
  captionOf,
  ensureSimpleShape,
  applyExtraEdit,
  extraBlocks,
  mergeExtraBlocks,
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
  tryExtraEdit,
  withBlocksSpans,
  withExtraBlocks,
  withFirstCaption,
  withSharedSetupBlocks,
} from "../components/authoring/simple-model";
import { CaptionField, ExtraBlocksGroup, moreBlocksText } from "../components/authoring/simple-blocks";
import { AuthorMediaProvider } from "../components/authoring/media-controls";

(globalThis as { React?: unknown }).React = React;

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
  d.content.context = [text("Main question"), math("E=mc^2"), image("A ramp", "Figure 1"), text("More setup"), image("A second picture"), { id: uuid(), kind: "text", spans: [] }];
  d.content.sections = [
    { id: uuid(), title: "Setup", blocks: [text("Section text"), math("F=ma"), image("A pulley", "Pulley")], parts: [
      { id: uuid(), label: "a", answerMode: "manual", blocks: [text("Question a"), image("Diagram a", "Diagram"), math("x=1"), text("Extra a"), image("Extra picture a")] },
      { id: uuid(), label: "b", answerMode: "manual", blocks: [math("y=2"), text("Only text b"), math("z=3"), { id: uuid(), kind: "text", spans: [] }] },
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
/**
 * Opening in Simple and saving without typing in a block: the effect that gives a problem its first part, then every group handler run
 * with the list it already shows, the way a no-op edit would. Simple's own fields write only when they are typed in, so they are not run.
 */
function openInSimple(d: EditorDraft) {
  ensureSimpleShape(d);
  d.content.context = withSharedSetupBlocks(d.content.context, sharedSetupBlocks(d.content.context));
  for (const section of d.content.sections) section.blocks = withExtraBlocks(section.blocks, extraBlocks(section.blocks));
  for (const { part } of allParts(d)) {
    const shown = extraBlocks(part.blocks, true);
    setQuestionBlocks(d, part.id, applyExtraEdit(part.blocks, shown, shown, true));
    const solution = privateFor(d, part.id).solution;
    const solutionShown = extraBlocks(solution, false);
    setSolutionBlocks(d, part.id, applyExtraEdit(solution, solutionShown, solutionShown, false));
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

// ---------------------------------------------------------------------------------------------------------------
// U7a fix: Simple's own blocks never change, a picture has one editor, two quick edits do not undo each other
// ---------------------------------------------------------------------------------------------------------------

const own = (blocks: readonly EditorBlock[], picture: boolean) => ({ text: blocks.find((b) => b.kind === "text")?.id, image: picture ? blocks.find((b) => b.kind === "image")?.id : undefined });
const idsOf = (blocks: readonly EditorBlock[]) => blocks.map((b) => b.id);
const moveAt = <T,>(list: T[], i: number, delta: -1 | 1) => { const out = [...list]; [out[i], out[i + delta]] = [out[i + delta], out[i]]; return out; };

test("moving an extra text block above the question's text is refused, and the question stays the question", () => {
  const blocks = [math("a"), text("QUESTION"), text("extra")];
  const shown = extraBlocks(blocks);
  assert.deepEqual(shown.map((b) => b.kind), ["math", "text"]);
  const moved = moveAt(shown, 1, -1);
  assert.equal(mergeExtraBlocks(blocks, moved), null, "the model refuses it");
  assert.deepEqual(withExtraBlocks(blocks, moved), blocks, "and returns the blocks unchanged");
  assert.deepEqual(applyExtraEdit(blocks, shown, moved), blocks);
  assert.equal(tryExtraEdit(blocks, shown, moved), null, "the move control reads this, so it is disabled");
  assert.equal(blocksSpans(applyExtraEdit(blocks, shown, moved))[0].kind, "text");
  assert.equal((blocksSpans(applyExtraEdit(blocks, shown, moved))[0] as { text: string }).text, "QUESTION");
});

test("moving an extra picture above the question's picture is refused", () => {
  const blocks = [math("m"), image("first"), image("second")];
  const shown = extraBlocks(blocks);
  assert.deepEqual(shown.map((b) => b.kind), ["math", "image"]);
  const moved = moveAt(shown, 1, -1);
  assert.equal(mergeExtraBlocks(blocks, moved), null);
  assert.deepEqual(applyExtraEdit(blocks, shown, moved), blocks);
});

test("the worked solution owns its first text only, so a picture can move first and a text cannot pass it", () => {
  const blocks = [math("m"), text("SOLUTION"), image("pic"), text("extra")];
  const shown = extraBlocks(blocks, false);
  assert.deepEqual(shown.map((b) => b.kind), ["math", "image", "text"]);
  assert.equal(mergeExtraBlocks(blocks, moveAt(shown, 2, -1), false) === null, false, "the text moves above the picture and stays below the solution's text");
  assert.equal(mergeExtraBlocks(blocks, [shown[2], shown[0], shown[1]], false), null, "the text cannot go above the solution's own text");
  const picAbove = withExtraBlocks(blocks, moveAt(shown, 1, -1), false);
  assert.equal(own(picAbove, false).text, own(blocks, false).text);
  assert.ok(picAbove.some((b) => b.kind === "image"), "the picture is kept");
});

test("removing and adding extras never changes the id of Simple's own text or picture, for questions and solutions", () => {
  for (const picture of [true, false]) {
    for (const base of [
      [math("a"), text("Q"), image("P"), text("x"), math("y"), image("z")],
      [image("P"), math("a"), text("Q"), text("x")],
      [text("Q"), math("a")],
      [math("a"), math("b"), text("Q"), image("P"), text("x")],
    ]) {
      const was = own(base, picture);
      const shown = extraBlocks(base, picture);
      // Remove each extra in turn.
      shown.forEach((_, i) => {
        const next = shown.filter((__, j) => j !== i);
        const out = withExtraBlocks(base, next, picture);
        assert.deepEqual(own(out, picture), was, `removing extra ${i} (${picture ? "question" : "solution"})`);
        assert.equal(out.length, base.length - 1, "removal removes exactly that block");
        assert.ok(!out.some((b) => b.id === shown[i].id));
      });
      // Add a block of each kind.
      for (const kind of ["text", "math", "image"] as const) {
        const added = kind === "text" ? text("n") : kind === "math" ? math("n") : image("n");
        const out = withExtraBlocks(base, [...shown, added], picture);
        // A first picture added where there is none becomes the picture box's, and nothing else about the own blocks changes.
        assert.deepEqual(own(out, picture), kind === "image" && picture && was.image === undefined ? { ...was, image: added.id } : was, `adding ${kind}`);
        assert.equal(out.length, base.length + 1);
      }
      // Every single move is either refused or keeps the own ids.
      shown.forEach((_, i) => {
        for (const delta of [-1, 1] as const) {
          if (i + delta < 0 || i + delta >= shown.length) continue;
          const out = mergeExtraBlocks(base, moveAt(shown, i, delta), picture);
          if (out) { assert.deepEqual(own(out, picture), was, "a move that is allowed keeps the own ids"); assert.deepEqual(idsOf(out).slice().sort(), idsOf(base).slice().sort()); }
        }
      });
    }
  }
});

test("removing the extra that sits above the question does not push a later extra text in front of it", () => {
  const blocks = [math("a"), text("QUESTION"), text("extra")];
  const out = withExtraBlocks(blocks, [blocks[2]]);
  assert.equal(out.length, 2);
  assert.equal(own(out, true).text, blocks[1].id);
  assert.deepEqual(idsOf(out), [blocks[1].id, blocks[2].id]);
});

test("a first text added where there is none is the field's own and the extra still shows, a first picture added where there is none becomes the picture", () => {
  const added = text("extra");
  const out = withExtraBlocks([], [added]);
  assert.equal(out.length, 2);
  assert.deepEqual(extraBlocks(out), [added]);
  const img = image("first");
  const withPicture = withExtraBlocks([text("Q")], [img]);
  assert.equal(own(withPicture, true).image, img.id);
  assert.equal(own(withPicture, true).text, withPicture[0].id);
});

test("in the files view the group lists no picture and every picture stays where it is", () => {
  const blocks = [text("Q"), image("first"), math("m1"), image("second"), text("t1"), image("third"), math("m2")];
  const shown = extraBlocks(blocks).filter((b) => b.kind !== "image");
  assert.deepEqual(shown.map((b) => b.kind), ["math", "text", "math"]);
  const pictures = (list: readonly EditorBlock[]) => list.map((b, i) => (b.kind === "image" ? [i, b.id] : null)).filter(Boolean);
  // Edit the text, move a block, remove one, add one: no picture changes id, content or place.
  const edits: EditorBlock[][] = [
    shown.map((b) => (b.kind === "text" ? { ...b, spans: [{ kind: "text" as const, text: "edited" }] } : b)),
    moveAt(shown, 1, 1),
    shown.slice(1),
    [...shown, text("added"), math("also")],
  ];
  for (const [n, next] of edits.entries()) {
    const out = applyExtraEdit(blocks, shown, next, true, true);
    assert.deepEqual(imagesIn(out).map((b) => b.id), imagesIn(blocks).map((b) => b.id), `edit ${n}: the pictures are the same blocks in the same order`);
    assert.deepEqual(imagesIn(out), imagesIn(blocks), `edit ${n}: and unchanged`);
    if (n === 0 || n === 1) assert.deepEqual(pictures(out), pictures(blocks), `edit ${n}: and in the same places`);
    assert.equal(own(out, true).text, own(blocks, true).text);
    assert.equal(own(out, true).image, own(blocks, true).image);
  }
  assert.deepEqual(withExtraBlocks(blocks, extraBlocks(blocks)), blocks);
});

test("two quick edits in one batch do not undo each other, and Simple's own text typed meanwhile is kept", () => {
  const first = text("one"), second = math("two");
  const original = [text("Q"), first, second];
  const shown = extraBlocks(original);
  // Both edits were made from the list drawn before either landed.
  const editOne = (latest: EditorBlock[]) => applyExtraEdit(latest, shown, shown.map((b) => (b.id === first.id ? { ...b, spans: [{ kind: "text" as const, text: "one edited" }] } : b)));
  const editTwo = (latest: EditorBlock[]) => applyExtraEdit(latest, shown, shown.map((b) => (b.kind === "math" ? { ...b, latex: "two edited" } : b)));
  let latest = editOne(original);
  // The question text is typed between the two.
  latest = withBlocksSpans(latest, [{ kind: "text", text: "Q typed" }]);
  latest = editTwo(latest);
  assert.equal((latest[1] as { spans: { text: string }[] }).spans[0].text, "one edited", "the first edit survives the second");
  assert.equal((latest[2] as { latex: string }).latex, "two edited");
  assert.equal((blocksSpans(latest)[0] as { text: string }).text, "Q typed", "the question text typed meanwhile is kept");
  // An add made from a stale list keeps what was added meanwhile, and a block removed meanwhile stays removed.
  const added = text("added meanwhile");
  const after = applyExtraEdit([...latest, added], shown, shown.map((b) => (b.id === first.id ? { ...b, spans: [{ kind: "text" as const, text: "again" }] } : b)));
  assert.ok(after.some((b) => b.id === added.id), "a block added meanwhile is kept");
  const removedMeanwhile = latest.filter((b) => b.id !== second.id);
  const kept = applyExtraEdit(removedMeanwhile, shown, shown.map((b) => (b.id === first.id ? { ...b, spans: [{ kind: "text" as const, text: "x" }] } : b)));
  assert.ok(!kept.some((b) => b.id === second.id), "a block removed meanwhile is not brought back");
});

const noop = () => {};
const markup = (node: React.ReactElement) => renderToStaticMarkup(node);

test("while a problem is not saved yet, the group cannot upload a picture", () => {
  const blocks = [text("Q")];
  const group = (uploadsDisabled: boolean) => markup(createElement(AuthorMediaProvider, { problemId: uuid(), disabled: false, pending: noop } as unknown as React.ComponentProps<typeof AuthorMediaProvider>, createElement(ExtraBlocksGroup, { summary: "More question blocks", label: "Question", blocks, update: noop, scope: "statement", picture: true, uploadsDisabled })));
  const files = (html: string) => [...html.matchAll(/<input[^>]*type="file"[^>]*>/g)].map((m) => m[0]);
  assert.ok(files(group(false)).length >= 1, "there is an upload when the problem is saved");
  for (const input of files(group(false))) assert.doesNotMatch(input, /disabled/);
  assert.ok(files(group(true)).length >= 1);
  for (const input of files(group(true))) assert.match(input, /disabled/, "disabled while provisional");
});

test("in the files view the group offers no upload at all, since the picture editor owns the pictures", () => {
  const html = markup(createElement(AuthorMediaProvider, { problemId: uuid(), disabled: false, pending: noop } as unknown as React.ComponentProps<typeof AuthorMediaProvider>, createElement(ExtraBlocksGroup, { summary: "More question blocks", label: "Question", blocks: [text("Q"), image("p"), math("m")], update: noop, scope: "statement", picture: true, hidePictures: true })));
  assert.doesNotMatch(html, /type="file"/);
  assert.doesNotMatch(html, /image 1/);
  assert.match(html, /Equation 1/);
});

test("the caption has one accessible name that says which picture, and the summary reads Caption", () => {
  const html = (name?: string) => markup(createElement(CaptionField, { id: "c", caption: "", onChange: noop, name }));
  assert.match(html(), /<summary[^>]*>Caption<\/summary>/);
  assert.match(html(), /aria-label="Caption"/);
  assert.match(html("Caption for part b"), /aria-label="Caption for part b"/);
  assert.doesNotMatch(html("Caption for part b"), /<label/);
  assert.doesNotMatch(html(), /Caption \(optional\)/);
});

test("the More options summary shows how many more blocks there are, and nothing when there are none", () => {
  assert.equal(moreBlocksText(0), "");
  assert.equal(moreBlocksText(1), " (1 more block)");
  assert.equal(moreBlocksText(3), " (3 more blocks)");
  const d = everyBlock();
  const part = allParts(d)[0].part;
  const count = extraBlocks(part.blocks, true).length + extraBlocks(privateFor(d, part.id).solution, false).length;
  assert.equal(count, 3 + 3);
  const plain = ready();
  const p = allParts(plain)[0].part;
  assert.equal(extraBlocks(p.blocks, true).length + extraBlocks(privateFor(plain, p.id).solution, false).length, 0);
});
