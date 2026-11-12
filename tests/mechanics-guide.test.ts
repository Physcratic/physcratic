import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LearnPage from "../app/learn/page";
import LearnArticlePage, { dynamicParams, generateMetadata, generateStaticParams } from "../app/learn/[slug]/page";
import { ArticleBody } from "../components/learn/article-body";
import { articles, findArticle, learnPath, publishedArticles } from "../lib/learn/articles";
import { practiceProblemIds } from "../lib/learn/practice-links";
import { visibleStrings } from "../lib/learn/reading";
import { articleGraph } from "../lib/seo/json-ld";
import { llmsFull, llmsIndex } from "../lib/seo/llms";
import { findProblemPage } from "../lib/seo/problem-pages";
import { indexableRoutes, publicRoutes } from "../lib/seo/public-routes";

Object.assign(globalThis, { React });
const slug = "mechanics-olympiad-problem-solving";
const article = articles.find(a => a.slug === slug)!;
const props = () => ({ params: Promise.resolve({ slug }) });

test("the Mechanics editorial pilot is registered but has no public route or discovery entry", async () => {
  assert.ok(article);
  assert.equal(article.published, false);
  assert.equal(article.reviewedBy, null);
  assert.equal(findArticle(slug), null);
  assert.equal(dynamicParams, false);
  assert.equal(generateStaticParams().some(p => p.slug === slug), false);
  assert.deepEqual(await generateMetadata(props()), {});
  await assert.rejects(LearnArticlePage(props()), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  const discovery = JSON.stringify([
    renderToStaticMarkup(React.createElement(LearnPage)), publicRoutes,
    llmsIndex("https://physcratic.com"), llmsFull("https://physcratic.com"),
  ]);
  for (const text of [slug, article.title, "Example 1: A slider on a moving ramp"]) {
    assert.ok(!discovery.includes(text), text);
  }
  assert.equal(publishedArticles.length, 6);
  assert.equal(indexableRoutes.length, 138);
});

test("the existing server renderer produces equations, citations and real Mechanics problem anchors", () => {
  const html = renderToStaticMarkup(React.createElement(ArticleBody, { blocks: article.body, sources: article.sources }));
  const formulaCount = article.body.filter(b => b.type === "math").length;
  assert.equal(formulaCount, 10);
  assert.equal((html.match(/class="katex"/g) ?? []).length, formulaCount);
  assert.equal((html.match(/<math /g) ?? []).length, formulaCount);
  assert.doesNotMatch(html, /katex-error/);
  const links = article.body.filter(b => b.type === "problemLink");
  assert.deepEqual(links.map(b => b.problemId), practiceProblemIds[slug]);
  for (const link of links) {
    const page = findProblemPage(link.problemId)!;
    assert.ok(page.indexable);
    assert.equal(page.topic, "Mechanics");
    assert.ok(html.includes(`href="${page.path}"`), page.path);
  }
  for (let i = 1; i <= article.sources.length; i++) assert.ok(html.includes(`href="#source-${i}"`));
  for (const text of [article.title, article.description, ...visibleStrings(article.body)]) {
    assert.doesNotMatch(text, /[\u2013\u2014;]/u);
  }
});

test("a future publication fixture uses existing canonical metadata and pending-review markup", async () => {
  // In-memory only. Never modify the source publication flag or public route registry.
  const fixture = { ...article, published: true };
  const previousOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://physcratic.com";
  publishedArticles.push(fixture);
  try {
    const metadata = await generateMetadata(props());
    assert.equal(metadata.title, article.title);
    assert.equal(metadata.description, article.description);
    assert.deepEqual(metadata.alternates, { canonical: learnPath(slug) });
    assert.equal(metadata.openGraph?.url, learnPath(slug));
    assert.ok(`${article.title} | Physcratic`.length <= 60);
    const html = renderToStaticMarkup(await LearnArticlePage(props()));
    assert.match(html, /Editorial review pending/);
    assert.doesNotMatch(html, /Reviewed by|reviewedBy|Arrow Dunatos|bronze medallist/);
    for (const source of article.sources) assert.ok(html.includes(source.url));
    const graph = articleGraph(fixture);
    assert.equal(graph[1].url, `https://physcratic.com${learnPath(slug)}`);
    assert.equal(graph[2].mainEntityOfPage, graph[1].url);
    assert.equal(graph[2].citation?.length, 6);
  } finally {
    publishedArticles.pop();
    if (previousOrigin === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousOrigin;
  }
  assert.equal(article.published, false);
  assert.equal(findArticle(slug), null);
});
