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


test("the changed marking guide records pending review without attributing the new worked example", async () => {
  const props = { params: Promise.resolve({ slug: "how-olympiad-solutions-are-marked" }) };
  const html = renderToStaticMarkup(await LearnArticlePage(props));
  assert.match(html, /Editorial review pending\. No independent human review is recorded for this revision\./);
  assert.doesNotMatch(html, /Reviewed by|reviewedBy|Arrow Dunatos|bronze medallist|Product documentation/);
  assert.match(html, /A worked example: Mind the Gap/);
  assert.match(html, /class="katex"/);
  assert.match(html, /sources-heading/);
  const article = articles.find(a => a.slug === "how-olympiad-solutions-are-marked")!;
  assert.equal(article.reviewedBy, null);
  for (const source of article.sources) assert.ok(html.includes(source.url));
  const metadata = await generateMetadata(props);
  assert.deepEqual(metadata.alternates, { canonical: "/learn/how-olympiad-solutions-are-marked" });
});
