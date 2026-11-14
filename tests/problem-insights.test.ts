import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
require("./server-only-register.cjs");
const { problemInsights } = require("../lib/problem-insights") as typeof import("../lib/problem-insights");
const { PublishedProblemInsight, ProblemInsightContent } = require("../components/problems/problem-insight") as typeof import("../components/problems/problem-insight");
Object.assign(globalThis, { React });
test("draft content never reaches the public supplement", () => {
  for (const id of [...problemInsights.map(i => i.problemId), "ipho-2016-t1", "unknown"]) {
    assert.equal(renderToStaticMarkup(React.createElement(PublishedProblemInsight, { problemId: id })), "");
  }
});
test("editorial render has native closed spoiler disclosure and server-rendered accessible maths", () => {
  for (const insight of problemInsights) {
    const html = renderToStaticMarkup(React.createElement(ProblemInsightContent, { insight }));
    assert.equal((html.match(/<details/g) ?? []).length, 1);
    assert.doesNotMatch(html, /<details[^>]*\bopen\b|expert-reviewed|Reviewed by|role="region" aria-label="Equation"/i);
    assert.match(html, /spoilers/);
    assert.match(html, /No independent human review is recorded/);
    assert.equal((html.match(/<math /g) ?? []).length, 2);
    assert.equal((html.match(/tabindex="0" role="group" aria-label="Equation"/g) ?? []).length, 2);
    for (let i = 1; i <= 2; i++) assert.ok(html.includes(`href="#source-${i}"`) && html.includes(`id="source-${i}"`));
    for (const source of insight.sources) assert.ok(html.includes(source.url));
    assert.match(html, /\/problems\/topics\//);
    assert.match(html, /\/learn\//);
  }
});

test("the publication gate can render an approved fixture without exposing other drafts", () => {
  for (const insight of problemInsights) {
    try {
      insight.published = true;
      const html = renderToStaticMarkup(React.createElement(PublishedProblemInsight, { problemId: insight.problemId }));
      assert.ok(html.includes(insight.title));
      for (const other of problemInsights.filter(i => i !== insight)) assert.ok(!html.includes(other.title));
    } finally { insight.published = false; }
  }
});
