import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
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

test("the approved Mechanics guide is publicly discoverable without reviewer attribution", async () => {
  assert.equal(article.published, true);
  assert.equal(article.reviewedBy, null);
  assert.equal(findArticle(slug), article);
  assert.equal(dynamicParams, false);
  assert.ok(generateStaticParams().some(p => p.slug === slug));
  assert.equal(publishedArticles.length, 7);
  assert.equal(indexableRoutes.length, 148);
  assert.ok(publicRoutes.some(r => r.path === learnPath(slug) && r.indexable));
  for (const text of [renderToStaticMarkup(React.createElement(LearnPage)), llmsIndex("https://physcratic.com"), llmsFull("https://physcratic.com")]) {
    assert.ok(text.includes(slug));
  }
});

test("an unpublished article is excluded during fresh registry initialization", () => {
  const child = spawnSync(process.execPath, ["--require", "./tests/server-only-register.cjs", "--import", "tsx", "-e", `
    const assert = require("node:assert/strict");
    const React = require("react");
    globalThis.React = React;
    const { renderToStaticMarkup } = require("react-dom/server");
    const { mechanicsProblemSolving } = require("./lib/learn/guides/mechanics-problem-solving.ts");
    // In-memory only, before any registry or discovery consumer is initialized.
    mechanicsProblemSolving.published = false;
    const { publishedArticles, findArticle } = require("./lib/learn/articles.ts");
    const { publicRoutes } = require("./lib/seo/public-routes.ts");
    const { llmsIndex, llmsFull } = require("./lib/seo/llms.ts");
    const sitemap = require("./app/sitemap.ts").default;
    const Hub = require("./app/learn/page.tsx").default;
    const { default: Page, generateStaticParams, generateMetadata } = require("./app/learn/[slug]/page.tsx");
    (async () => {
      const slug = mechanicsProblemSolving.slug;
      assert.equal(findArticle(slug), null);
      assert.ok(publishedArticles.every(a => a.published && a.slug !== slug));
      assert.ok(!generateStaticParams().some(p => p.slug === slug));
      const props = { params: Promise.resolve({ slug }) };
      assert.deepEqual(await generateMetadata(props), {});
      await assert.rejects(Page(props), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
      for (const text of [renderToStaticMarkup(React.createElement(Hub)), JSON.stringify(publicRoutes), JSON.stringify(sitemap()), llmsIndex("https://physcratic.com"), llmsFull("https://physcratic.com")]) {
        assert.ok(!text.includes(slug));
      }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `], { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
  assert.equal(child.status, 0, child.stderr || child.stdout || String(child.error));
});

test("the existing server renderer produces equations, citations and real Mechanics problem anchors", () => {
  const html = renderToStaticMarkup(React.createElement(ArticleBody, { blocks: article.body, sources: article.sources }));
  const figures = article.body.filter(b => b.type === "image");
  assert.equal(figures.length, 2);
  for (const figure of figures) {
    assert.ok(html.includes(figure.alt));
    assert.ok(html.includes(figure.caption!));
    assert.ok(html.includes(encodeURIComponent(figure.src)));
  }
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

test("the published article retains canonical metadata and pending-review markup", async () => {
  const fixture = article;
  const previousOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://physcratic.com";
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
    if (previousOrigin === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousOrigin;
  }
  assert.equal(article.published, true);
  assert.equal(findArticle(slug), article);
});
