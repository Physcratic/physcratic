import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProblemDocumentTabs, ProblemFrame } from "../components/physics/problem-frame";
import { StudentWorkspace } from "../components/authored/student-workspace";
import { publicStudentRevision } from "../lib/authored-student";
import { publicSolutionPolicy } from "../lib/authored-solution-policy";

Object.assign(globalThis, { React });

const problemId = "11111111-1111-4111-8111-111111111111", revisionId = "22222222-2222-4222-8222-222222222222", partId = "33333333-3333-4333-8333-333333333333";
const raw = (policy: boolean) => ({
  id: revisionId, problemId, number: 1, schemaVersion: 1, publishedAt: "2026-11-01T00:00:00.000Z",
  ...(policy ? { solutionPolicy: publicSolutionPolicy } : {}),
  content: { title: "Harmonic Trap", topicTags: [], methodTags: [], estimatedDifficulty: "1200", context: [],
    sections: [{ id: "44444444-4444-4444-8444-444444444444", title: "", blocks: [], parts: [{ id: partId, label: "a", answerMode: "numeric", blocks: [] }] }],
    attachments: [], provenance: { kind: "original", source: "", rightsDeclaration: "Synthetic test content" } },
});
const workspace = (policy: boolean, enabled = true) => renderToStaticMarkup(createElement(StudentWorkspace, {
  problemId, viewer: { state: "guest" }, initialRevision: publicStudentRevision(raw(policy), problemId), publicSolutionsEnabled: enabled,
}));
const tabs = (html: string) => [...html.matchAll(/role="tab"[^>]*>([^<]*(?:<[^>]*>[^<]*)*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]*>/g, ""));

test("the frame puts the answer column after the document, in one column until xl and 23rem from xl", () => {
  const html = renderToStaticMarkup(createElement(ProblemFrame, { document: createElement("p", null, "DOC"), answer: createElement("p", null, "ANSWER") }));
  assert.match(html, /^<div class="grid min-w-0 items-start gap-6 xl:grid-cols-\[minmax\(0,1fr\)_23rem\]">/);
  assert.ok(html.indexOf("DOC") < html.indexOf("ANSWER"));
});

test("the document tabs show the Worked solution tab only when a solution label is given", () => {
  const props = { value: "statement", onValueChange() {}, statementLabel: "Problem statement", statement: createElement("p", null, "STATEMENT") };
  const without = renderToStaticMarkup(createElement(ProblemDocumentTabs, props));
  assert.deepEqual(tabs(without), ["Problem statement"]);
  assert.match(without, /STATEMENT/);
  const withSolution = renderToStaticMarkup(createElement(ProblemDocumentTabs, { ...props, solutionLabel: "Worked solution", solution: createElement("p", null, "SOLUTION") }));
  assert.deepEqual(tabs(withSolution), ["Problem statement", "Worked solution"]);
  assert.doesNotMatch(withSolution, /SOLUTION/, "an inactive solution is not mounted");
  assert.match(renderToStaticMarkup(createElement(ProblemDocumentTabs, { ...props, value: "solution", solutionLabel: "Worked solution", solution: createElement("p", null, "SOLUTION") })), /SOLUTION/);
  // Every tab is a 44px target.
  assert.ok((withSolution.match(/min-h-11/g) ?? []).length >= 2);
});

test("a public-solutions revision shows both tabs and a legacy revision shows only the statement", () => {
  assert.deepEqual(tabs(workspace(true)), ["Problem statement", "Worked solution"]);
  assert.deepEqual(tabs(workspace(false)), ["Problem statement"]);
  assert.doesNotMatch(workspace(false), /Worked solution/, "a legacy revision gets no solution tab or text");
});

test("the community page keeps its statement, sign-in card and answer column inside the frame", () => {
  const html = workspace(false);
  assert.match(html, /xl:grid-cols-\[minmax\(0,1fr\)_23rem\]/);
  assert.ok(html.indexOf("Harmonic Trap") < html.indexOf("Sign in to practise"), "the sign-in card comes after the statement");
  assert.match(html, /Sign in to submit/);
});

test("a public revision with the flag off shows no solution text", () => {
  const html = workspace(true, false);
  assert.deepEqual(tabs(html), ["Problem statement", "Worked solution"]);
  assert.doesNotMatch(html, /Public worked solution/);
});
