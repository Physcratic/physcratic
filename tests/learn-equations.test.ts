import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArticleBody } from "../components/learn/article-body";
import { articles } from "../lib/learn/articles";
Object.assign(globalThis, { React });
test("every Learn equation retains server MathML in a named keyboard-scrollable group", () => {
  for (const article of articles) {
    const html = renderToStaticMarkup(React.createElement(ArticleBody, { blocks: article.body, sources: article.sources }));
    const count = article.body.filter(b => b.type === "math").length;
    assert.equal((html.match(/tabindex="0" role="group" aria-label="Equation"/g) ?? []).length, count);
    assert.equal((html.match(/<math /g) ?? []).length, count);
    if (count) assert.match(html, /focus-visible:outline-foreground/);
    assert.doesNotMatch(html, /role="region" aria-label="Equation"|katex-error/);
  }
});
