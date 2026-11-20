import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthorMediaProvider } from "../components/authoring/media-controls";
import { PartOptions } from "../components/authoring/advanced-part-options";
import { SimpleEditor } from "../components/authoring/simple-editor";
import { allParts, ensureSimpleShape, privateFor } from "../components/authoring/simple-model";
import { newProblem, type EditorDraft } from "../lib/problem-authoring-editor";

createRequire(import.meta.url)("./server-only-register.cjs");
Object.assign(globalThis, { React });

const block = (text: string) => ({ id: crypto.randomUUID(), kind: "text" as const, spans: [{ kind: "text" as const, text }] });
function draft(): EditorDraft {
  const d: EditorDraft = { problemId: crypto.randomUUID(), version: 1, state: "draft", slug: "", ...structuredClone(newProblem()) };
  ensureSimpleShape(d);
  return d;
}
const render = (d: EditorDraft) =>
  renderToStaticMarkup(
    React.createElement(
      AuthorMediaProvider as React.ComponentType<Record<string, unknown>>,
      { problemId: d.problemId, disabled: false, pending: () => {} },
      React.createElement(SimpleEditor, { draft: d, userId: "u", edit: () => {}, locked: false, provisional: false, otherIssues: [], onPublish: () => {}, publishing: false }),
    ),
  );
const optionsOpen = (html: string) => /<details[^>]*\sopen(=""|\s|>)[^>]*>\s*<summary[^>]*aria-label="More options/.test(html);
const NOTE = "This part uses answer settings in More options.";
const setKey = (d: EditorDraft, key: EditorDraft["privateParts"][number]["key"]) => { privateFor(d, allParts(d)[0].part.id); d.privateParts[0].key = key; };
const expression = (expected: string, extra: Record<string, unknown> = {}) => ({ kind: "expression" as const, expected, variables: [], angleUnit: "radians" as const, exclusions: [], ...extra });

test("a new part shows the answer box and a closed More options row of 44px with a name", () => {
  const html = render(draft());
  assert.match(html, /<summary[^>]*aria-label="More options"[^>]*min-h-11[^>]*>/);
  assert.equal(optionsOpen(html), false);
  assert.doesNotMatch(html, new RegExp(NOTE));
  assert.match(html, /Final Answer \(Solution\)/);
  assert.match(html, /Leave this empty if students should explain, with no automatic check\./);
  assert.match(html, /Set by the final answer above/);
});

test("an answer the box cannot read is replaced by one line and a button, and More options opens", () => {
  const d = draft();
  setKey(d, expression("log(x)"));
  d.content.sections[0].parts[0].answerMode = "expression";
  const html = render(d);
  assert.match(html, new RegExp(NOTE));
  assert.match(html, />Show answer settings</);
  assert.equal(optionsOpen(html), true);
  assert.match(html, /Expected expression/, "the panel edits the text the box cannot");
  assert.doesNotMatch(html, /Symbols we found|Unit \(optional\)/);
});

test("a hand-graded part on a published problem shows the note, not the box, and More options is open", () => {
  const d = draft();
  d.state = "published";
  const html = render(d);
  assert.match(html, /Students explain this part and nothing is checked automatically\. You can change that in More options\./);
  assert.match(html, />Show answer settings</);
  assert.equal(optionsOpen(html), true);
  assert.match(html, /Students explain, no automatic check/);
  assert.doesNotMatch(html, /Leave this empty if students should explain/);
});

test("a readable answer stays in the box, and the panel hides the fields the box owns", () => {
  const d = draft();
  setKey(d, { kind: "numeric", value: 9.8, units: "m/s^2", absTol: 0.5, relTol: 0.01 });
  d.content.sections[0].parts[0].answerMode = "numeric";
  const html = render(d);
  assert.doesNotMatch(html, new RegExp(NOTE));
  assert.equal(optionsOpen(html), true, "a changed tolerance is saved content");
  assert.match(html, /Absolute tolerance/);
  assert.match(html, /Unit \(optional\)/);
  assert.doesNotMatch(html, /Expected value|>Units</);
  assert.equal((html.match(/Worked solution/g) ?? []).length, 1, "the worked solution has one editor");
});

test("More options opens by itself for hints, and not for the defaults", () => {
  const d = draft();
  assert.equal(optionsOpen(render(d)), false);
  d.privateParts[0].hints = [block("Try energy")];
  assert.equal(optionsOpen(render(d)), true);
});

test("the Advanced part options render as before when the Simple props are not passed", () => {
  const d = draft();
  const part = allParts(d)[0].part;
  const html = renderToStaticMarkup(React.createElement(PartOptions, { part, si: 0, pi: 0, entry: privateFor(d, part.id), hasPrivate: true, colour: 0, edit: () => {} }));
  assert.match(html, /Answer key, hints and solution for part/);
  assert.doesNotMatch(html, /<details[^>]*\sopen/);
  assert.match(html, /Manual \/ ungraded/);
  assert.match(html, /Worked solution/);
});
