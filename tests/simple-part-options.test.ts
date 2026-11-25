import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthorMediaProvider } from "../components/authoring/media-controls";
import { PartOptions } from "../components/authoring/advanced-part-options";
import { SimpleEditor } from "../components/authoring/simple-editor";
import { allParts, ensureSimpleShape, privateFor, simpleIssues } from "../components/authoring/simple-model";
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
  assert.match(html, /Publish needs a final answer here\./);
  assert.match(html, />Students explain, no automatic check</);
  assert.doesNotMatch(html, /Leave this empty/);
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

test("an empty manual part on a published problem keeps the box until the author marks it", () => {
  const d = draft();
  d.state = "published";
  const html = render(d);
  assert.doesNotMatch(html, /Students explain this part and nothing is checked automatically\./);
  assert.match(html, /Final Answer \(Solution\)<\/label>/);
  assert.match(html, /Publish needs a final answer here\./);
  assert.equal(optionsOpen(html), false);
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

// S3b fixes. The marked set lives in localStorage, so these tests give it one.
function withMarked<T>(d: EditorDraft, ids: string[], run: () => T): T {
  const store: Record<string, string> = { [`physcratic.studio.explain.v1:u:${d.problemId}`]: JSON.stringify(ids) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } });
  try { return run(); } finally { if (previous) Object.defineProperty(globalThis, "localStorage", previous); else delete (globalThis as { localStorage?: unknown }).localStorage; }
}
const solutionEditors = (html: string) => (html.match(/>Worked solution( \(required\))?</g) ?? []).length;
const HINT = /Publish needs a final answer here\./;

test("the empty box hint shows exactly when simpleIssues asks for the final answer", () => {
  for (const state of ["draft", "published"] as const) {
    const d = draft();
    d.state = state;
    const id = allParts(d)[0].part.id;
    const asks = (marked: string[]) => simpleIssues(d, {}, false, new Set(marked)).some((i) => i.field === `answer:${id}` && i.message === "Add the final answer.");
    assert.equal(HINT.test(render(d)), true, state);
    assert.equal(asks([]), true, state);
    const marked = withMarked(d, [id], () => render(d));
    assert.equal(HINT.test(marked), false, state);
    assert.match(marked, /Students explain this part and nothing is checked automatically\./);
    assert.match(marked, />Type a final answer instead</);
    assert.equal(asks([id]), false, state);
  }
});

test("there is exactly one worked solution editor in every state, and (required) only before the first publish", () => {
  const states: [string, (d: EditorDraft) => void][] = [
    ["new", () => {}],
    ["numeric", (d) => { setKey(d, { kind: "numeric", value: 9.8, units: "", absTol: 1e-9, relTol: 0.01 }); d.content.sections[0].parts[0].answerMode = "numeric"; }],
    ["expression", (d) => { setKey(d, expression("x+1", { variables: [{ name: "x", domain: "real", assumptions: [] }] })); d.content.sections[0].parts[0].answerMode = "expression"; }],
    ["unreadable", (d) => { setKey(d, expression("log(x)")); d.content.sections[0].parts[0].answerMode = "expression"; }],
  ];
  for (const [name, setup] of states)
    for (const state of ["draft", "published"] as const)
      for (const marked of [false, true]) {
        const d = draft();
        d.state = state;
        setup(d);
        const html = withMarked(d, marked ? [allParts(d)[0].part.id] : [], () => render(d));
        assert.equal(solutionEditors(html), 1, `${name} ${state} marked=${marked}`);
        assert.equal(/>Worked solution \(required\)</.test(html), state === "draft", `${name} ${state}`);
      }
});

test("the Symbol name is locked while the box owns the answer, and editable for a key the box cannot read", () => {
  const symbolInput = (html: string) => /<label[^>]*>Symbol<\/label><input[^>]*>/.exec(html)?.[0] ?? "";
  const owned = draft();
  setKey(owned, expression("x+1", { variables: [{ name: "x", domain: "real", assumptions: [] }] }));
  owned.content.sections[0].parts[0].answerMode = "expression";
  const html = render(owned);
  assert.match(symbolInput(html), /readOnly/);
  assert.match(html, /Set by the final answer above\./);
  assert.doesNotMatch(html, /Add variable|Remove variable/);
  const unreadable = draft();
  setKey(unreadable, expression("log(x)", { variables: [{ name: "x", domain: "real", assumptions: [] }] }));
  unreadable.content.sections[0].parts[0].answerMode = "expression";
  const other = render(unreadable);
  assert.ok(symbolInput(other));
  assert.doesNotMatch(symbolInput(other), /readOnly/);
  assert.match(other, /Add variable/);
});

test("More options in Simple sets its text to 16px, and Advanced keeps its sizes", () => {
  assert.match(render(draft()), /class="mt-5 \[&amp;_\.text-sm\]:text-base \[&amp;_\.text-xs\]:text-base"/);
  const d = draft();
  const part = allParts(d)[0].part;
  const html = renderToStaticMarkup(React.createElement(PartOptions, { part, si: 0, pi: 0, entry: privateFor(d, part.id), hasPrivate: true, edit: () => {} }));
  assert.match(html, /<div class="mt-5">/);
});
