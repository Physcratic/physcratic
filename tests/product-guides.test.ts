import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LearnPage from "../app/learn/page";
import LearnArticlePage, { generateStaticParams, generateMetadata } from "../app/learn/[slug]/page";
import { articles } from "../lib/learn/articles";

Object.assign(globalThis, { React });

test("the existing Learn hub and article renderer publish both product guides without a false reviewer", async () => {
  const hub = renderToStaticMarkup(React.createElement(LearnPage));
  for (const slug of ["how-to-use-physcratic", "how-to-write-a-problem"]) {
    assert.ok(generateStaticParams().some((p) => p.slug === slug));
    assert.ok(hub.includes(`/learn/${slug}`));
    const props = { params: Promise.resolve({ slug }) };
    const html = renderToStaticMarkup(await LearnArticlePage(props));
    assert.match(html, /Product documentation\. No independent human review is recorded\./);
    assert.doesNotMatch(html, /Reviewed by|reviewedBy|Arrow Dunatos|sources-heading/);
    assert.match(html, /href="\/dashboard/);
    const metadata = await generateMetadata(props);
    assert.deepEqual(metadata.alternates, { canonical: `/learn/${slug}` });
    assert.equal(metadata.description, articles.find((a) => a.slug === slug)!.description);
  }
  const old = renderToStaticMarkup(await LearnArticlePage({ params: Promise.resolve({ slug: "start-preparing-physics-olympiad" }) }));
  assert.match(old, /Reviewed by/);
  assert.match(old, /Arrow Dunatos/);
  assert.match(old, /sources-heading/);
});
