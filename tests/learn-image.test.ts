import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("a guide image block renders as a figure with its alt text and caption", async () => {
  // The Next.js server component relies on the automatic JSX runtime. Under tsx it needs React in scope.
  (globalThis as { React?: unknown }).React = React;
  const { ArticleBody } = await import("../components/learn/article-body");
  const html = renderToStaticMarkup(
    React.createElement(ArticleBody, {
      blocks: [{ type: "image", src: "/learn/x/a.webp", alt: "The library with the Mechanics topic chosen", width: 1280, height: 800, caption: "The library." }],
      sources: [],
    }),
  );
  assert.match(html, /<figure/);
  assert.match(html, /alt="The library with the Mechanics topic chosen"/);
  assert.match(html, /The library\./);
});
