import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthorMediaProvider } from "../components/authoring/media-controls";
import { SimpleEditor } from "../components/authoring/simple-editor";
import { SIMPLE_TEXT_SCOPE } from "../components/authoring/simple-more-options";
import {
  PROBLEM_MESSAGES,
  addSection,
  allParts,
  applyAnswer,
  ensureSimpleShape,
  issueTarget,
  readAnswer,
  setDifficulty,
  setQuestion,
  setRights,
  setSolution,
  simpleIssues,
} from "../components/authoring/simple-model";
import { newProblem, type EditorDraft } from "../lib/problem-authoring-editor";

createRequire(import.meta.url)("./server-only-register.cjs");
Object.assign(globalThis, { React });

function draft(state: EditorDraft["state"] = "draft"): EditorDraft {
  const d: EditorDraft = { problemId: crypto.randomUUID(), version: 1, state, slug: "", ...structuredClone(newProblem()) };
  ensureSimpleShape(d);
  return d;
}
const render = (d: EditorDraft, onUnpublish?: () => void) =>
  renderToStaticMarkup(
    React.createElement(
      AuthorMediaProvider as React.ComponentType<Record<string, unknown>>,
      { problemId: d.problemId, disabled: false, pending: () => {} },
      React.createElement(SimpleEditor, { draft: d, userId: "u", edit: () => {}, locked: false, provisional: false, otherIssues: [], onPublish: () => {}, publishing: false, onUnpublish }),
    ),
  );
const WHOLE = 'aria-label="More options for the whole problem"';
const opened = (html: string) => new RegExp(`<details[^>]*\\sopen(=""|\\s|>)[^>]*>\\s*<summary[^>]*${WHOLE}`).test(html);
const block = (text: string) => ({ id: crypto.randomUUID(), kind: "text" as const, spans: [{ kind: "text" as const, text }] });

test("More options for the whole problem is one closed row of 44px, below the parts and above Publish", () => {
  const html = render(draft());
  assert.equal(opened(html), false);
  assert.equal(html.split(WHOLE).length - 1, 1, "one row, not one per section");
  assert.match(html, new RegExp(`<summary[^>]*${WHOLE}[^>]*min-h-11`));
  assert.ok(html.indexOf("Add part b") < html.indexOf(WHOLE) && html.indexOf(WHOLE) < html.lastIndexOf(">Publish<"), "after the parts, before Publish");
  assert.equal(opened(render((() => { const d = draft(); setRights(d, true); return d; })())), false, "the tick next to Publish is not saved content");
});

test("it opens by itself for saved sections, tags, custom rights, PDFs and extra setup", () => {
  const cases: [string, (d: EditorDraft) => void][] = [
    ["a second section", (d) => addSection(d)],
    ["a section title", (d) => void (d.content.sections[0].title = "Setup")],
    ["a method tag", (d) => void (d.content.methodTags = ["energy-methods"])],
    ["custom rights", (d) => void (d.content.provenance = { kind: "original", source: "", rightsDeclaration: "In my own words." })],
    ["a PDF", (d) => void (d.content.attachments = [{ id: crypto.randomUUID(), purpose: "statement-pdf" }])],
    ["extra setup blocks", (d) => void (d.content.context = [block("a"), { id: crypto.randomUUID(), kind: "math", latex: "x" }])],
  ];
  for (const [name, change] of cases) {
    const d = draft();
    change(d);
    assert.equal(opened(render(d)), true, name);
  }
});

test("everything for the whole problem is inside it, with Upload PDFs instead moved in", () => {
  const html = render(draft());
  const inside = html.slice(html.indexOf(WHOLE));
  for (const text of ["Upload PDFs instead", "Shared setup", "Sections", "Method tags", "Source and rights in your own words", "Add a section"]) assert.ok(inside.includes(text), text);
  assert.equal(html.slice(0, html.indexOf(WHOLE)).includes("Upload PDFs instead"), false, "no longer in the header");
  assert.ok(inside.includes("Content provenance"), "the free text source and rights");
  assert.ok(html.indexOf("Where&#x27;s it from?") < html.indexOf(WHOLE), "the source choice with the tick stays outside");
});

test("Unpublish and solution access appear only when the problem is published", () => {
  const draftHtml = render(draft("draft"), () => {});
  assert.doesNotMatch(draftHtml, /Unpublish problem|Danger zone|Student worked-solution access/);
  const published = render(draft("published"), () => {});
  assert.match(published, /Unpublish problem/);
  assert.match(published, /Student worked-solution access/);
  assert.ok(published.indexOf(WHOLE) < published.indexOf("Unpublish problem"), "inside More options");
  assert.doesNotMatch(render(draft("published")), /Unpublish problem/, "nothing to call, nothing shown");
  const decided = draft("published");
  decided.publishedSolutionPolicy = "private" as never;
  assert.doesNotMatch(render(decided, () => {}), /Student worked-solution access/);
});

test("the outline lists sections only when there are two or more", () => {
  const one = draft();
  assert.doesNotMatch(render(one), /Sections outline|simple-section-/);
  addSection(one);
  const two = render(one);
  assert.match(two, /aria-label="Sections outline"/);
  assert.equal(two.split("href=\"#simple-section-").length - 1, 2);
  assert.match(two, /<a[^>]*min-h-11[^>]*href="#simple-section-|<a[^>]*href="#simple-section-[^>]*min-h-11/);
});

test("the 16px scope class wraps everything inside More options", () => {
  const html = render(draft("published"), () => {});
  assert.ok(html.slice(html.indexOf(WHOLE)).includes(SIMPLE_TEXT_SCOPE.replaceAll("&", "&amp;")));
});

/** A draft that only needs what the problem-level options are asked about. */
function ready(state: EditorDraft["state"] = "draft"): EditorDraft {
  const d = draft(state);
  const id = allParts(d)[0].part.id;
  d.content.title = "Block on a slope";
  setQuestion(d, id, [{ kind: "text", text: "Find the acceleration." }]);
  applyAnswer(d, id, readAnswer("9.8"), "9.8");
  setSolution(d, id, [{ kind: "text", text: "Use gravity along the slope." }]);
  setRights(d, true);
  setDifficulty(d, "2100");
  return d;
}
const picture = (alt: string) => ({ id: crypto.randomUUID(), kind: "image" as const, mediaId: crypto.randomUUID(), alt, caption: "" });
const withPictures = (d: EditorDraft) => {
  const blocks = [...d.content.context, ...d.content.sections.flatMap((s) => [...s.blocks, ...s.parts.flatMap((p) => p.blocks)])];
  d.content.attachments = blocks.flatMap((b) => (b.kind === "image" ? [{ id: b.mediaId, purpose: "statement-image" as const }] : []));
};
const many = (n: number) => Array.from({ length: n }, (_, i) => `tag ${i}`);

/** Every message Simple can raise for the whole problem, with a draft that raises it and what the author must be able to reach. */
const scenarios: { message: string; field: string; change: (d: EditorDraft) => void; reach: (string | RegExp)[] }[] = [
  { message: PROBLEM_MESSAGES.images, field: "options:problem", change: (d) => void (d.content.sections[0].blocks = [picture("")]), reach: ["Section 1 context image 1 alt text"] },
  { message: PROBLEM_MESSAGES.images, field: "options:problem", change: (d) => { addSection(d); d.content.sections[1].blocks = [picture(" ")]; }, reach: ["Section 2 context image 1 alt text"] },
  { message: PROBLEM_MESSAGES.images, field: "options:problem", change: (d) => void (d.content.context = [{ id: crypto.randomUUID(), kind: "text", spans: [{ kind: "text", text: "Setup" }] }, picture("Described"), picture("")]), reach: ["Shared setup blocks image 1 alt text"] },
  { message: PROBLEM_MESSAGES.source, field: "options:problem", change: (d) => void (d.content.provenance = { kind: "authorized", source: "", rightsDeclaration: "By permission." }), reach: ["Source / permission reference", "Rights declaration"] },
  { message: PROBLEM_MESSAGES.methodRepeated, field: "options:problem", change: (d) => void (d.content.methodTags = ["a", "a"]), reach: ["Selected methods"] },
  { message: PROBLEM_MESSAGES.methodOther, field: "options:problem", change: (d) => void (d.content.methodTags = many(31)), reach: ["Selected methods"] },
  { message: PROBLEM_MESSAGES.topicRepeated, field: "topics", change: (d) => void (d.content.topicTags = ["mechanics", "mechanics"]), reach: ['data-simple-field="topics"'] },
  { message: PROBLEM_MESSAGES.topicOther, field: "topics", change: (d) => void (d.content.topicTags = many(31)), reach: ['data-simple-field="topics"'] },
];

test("every message for the whole problem has a field Simple renders for it, in every state", () => {
  const named = new Set(scenarios.map((s) => s.message));
  for (const message of Object.values(PROBLEM_MESSAGES)) assert.ok(named.has(message), `a scenario for: ${message}`);
  for (const state of ["draft", "published"] as const)
    for (const { message, field, change, reach } of scenarios) {
      const d = ready(state);
      change(d);
      withPictures(d);
      // The editor opens in PDF mode for a draft that has images, and judges it that way.
      const issues = simpleIssues(d, {}, d.content.attachments.length > 0);
      assert.ok(issues.some((i) => i.field === field && i.message === message), `${state}: ${message}`);
      const html = render(d, () => {});
      const whole = html.slice(html.indexOf(WHOLE));
      for (const issue of issues) assert.ok(html.includes(`data-simple-field="${issueTarget(issue.field)}"`), `${state}: ${issue.field} has a place to show it`);
      for (const want of reach) assert.ok(typeof want === "string" ? html.includes(want) : want.test(html), `${state}: ${message} -> ${want}`);
      // What is inside More options is inside it, and the author can reach each field there.
      if (field === "options:problem") for (const want of reach) assert.ok(String(want).startsWith("data-") || whole.includes(String(want)), `${state}: ${want} is inside More options`);
    }
});

test("one section with a title or shared text shows its fields, and with nothing it shows none", () => {
  const plain = render(ready());
  assert.doesNotMatch(plain, /Section 1 title/);
  const titled = ready();
  titled.content.sections[0].title = "Setup";
  assert.match(render(titled), /Section 1 title/);
  assert.match(render(titled), /Section 1 context/);
  assert.doesNotMatch(render(titled), /Delete section 1|Move section 1 down/, "no order controls for a single section");
  assert.doesNotMatch(render(titled), /Sections outline/);
});

test("Add a section says why it is off at 30 sections and at 50 parts", () => {
  const some = ready();
  assert.doesNotMatch(render(some), /simple-add-section-why/);
  const sections = ready();
  while (sections.content.sections.length < 30) addSection(sections);
  const atSections = render(sections);
  assert.match(atSections, /<button[^>]*disabled=""[^>]*aria-describedby="simple-add-section-why"[^>]*>(?:(?!<\/button>)[\s\S])*Add a section/);
  assert.match(atSections, /id="simple-add-section-why"[^>]*>A problem can have up to 30 sections\./);
  const parts = ready();
  while (allParts(parts).length < 50) parts.content.sections[0].parts.push({ id: crypto.randomUUID(), label: "x", blocks: [], answerMode: "manual" });
  const atParts = render(parts);
  assert.match(atParts, /<button[^>]*disabled=""[^>]*aria-describedby="simple-add-section-why"[^>]*>(?:(?!<\/button>)[\s\S])*Add a section/);
  assert.match(atParts, /up to 50 parts/);
});

test("the error line for the whole problem can take focus and is an alert", () => {
  // The line itself needs a Publish attempt. The pieces Publish relies on are the id and the tab index, set where it is drawn.
  const source = readFileSync(new URL("../components/authoring/simple-more-options.tsx", import.meta.url), "utf8");
  assert.match(source, /id=\{PROBLEM_OPTIONS_ERROR_ID\} role="alert" tabIndex=\{-1\}/);
});
