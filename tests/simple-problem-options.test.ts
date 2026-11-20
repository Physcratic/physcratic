import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthorMediaProvider } from "../components/authoring/media-controls";
import { SimpleEditor } from "../components/authoring/simple-editor";
import { SIMPLE_TEXT_SCOPE } from "../components/authoring/simple-more-options";
import { addSection, ensureSimpleShape, setRights } from "../components/authoring/simple-model";
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
