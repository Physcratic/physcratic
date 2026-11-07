import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { describe, it } from "node:test";
import nextConfig from "../next.config";
import { GET as llms } from "../app/llms.txt/route";
import { GET as llmsFull } from "../app/llms-full.txt/route";
import robots, { CRAWLERS } from "../app/robots";
import sitemap from "../app/sitemap";
import { publishedArticles } from "./learn/articles";
import { allProblemPages, findProblemPage } from "./seo/problem-pages";
import { indexableRoutes } from "./seo/public-routes";

const entries = sitemap();
const urls = entries.map((e) => e.url);
const path = (url: string) => new URL(url).pathname;

describe("sitemap", () => {
  it("lists every indexable page once and nothing else", () => {
    assert.equal(urls.length, indexableRoutes.length);
    assert.equal(new Set(urls).size, urls.length);
    for (const route of indexableRoutes) assert.ok(urls.includes(`${new URL(urls[0]).origin}${route.path}`), route.path);
  });
  it("has every problem that can be indexed, every Learn page and every coaching page", () => {
    const paths = new Set(urls.map(path));
    for (const page of allProblemPages()) assert.equal(paths.has(page.path), page.indexable, page.id);
    assert.ok(paths.has("/learn"));
    for (const article of publishedArticles) assert.ok(paths.has(`/learn/${article.slug}`), article.slug);
    for (const p of ["/coaching", "/coaching/consultation", "/coaching/become-a-tutor", "/problems", "/problems/archive", "/"]) assert.ok(paths.has(p), p);
  });
  it("has no ?view= or ?topic= URL, no query string at all, and not the signed-in app", () => {
    for (const url of urls) {
      assert.equal(new URL(url).search, "", url);
      assert.notEqual(path(url), "/dashboard");
      assert.doesNotMatch(url, /[?]|view=|topic=/);
    }
  });
  it("takes lastmod from the data and leaves it out where there is none", () => {
    for (const entry of entries) {
      if (entry.lastModified === undefined) continue;
      assert.match(String(entry.lastModified), /^\d{4}-\d{2}-\d{2}$/, entry.url);
    }
    const byPath = new Map(entries.map((e) => [path(e.url), e.lastModified]));
    assert.equal(byPath.get("/dashboard/problems/arena-mind-the-gap"), findProblemPage("arena-mind-the-gap")!.lastmod);
    assert.ok(findProblemPage("arena-mind-the-gap")!.lastmod);
    assert.equal(byPath.has("/dashboard/problems/ipho-2025-t2"), false, "archive pages are out while ARCHIVE_INDEXABLE is false");
    assert.equal(byPath.get("/coaching"), undefined);
    for (const article of publishedArticles) assert.equal(byPath.get(`/learn/${article.slug}`), article.updated);
    const dated = entries.filter((e) => e.lastModified).length;
    assert.ok(dated >= 24, `${dated} dated entries`);
  });
});

describe("llms.txt and llms-full.txt", () => {
  const linksOf = (body: string) => [...body.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => path(m[1]));
  it("keeps llms.txt a short index of pages that are in the sitemap", async () => {
    const body = await llms().text();
    const sitemapPaths = new Set(urls.map(path));
    for (const p of linksOf(body)) if (p !== "/terms") assert.ok(sitemapPaths.has(p), `llms.txt has ${p}, which is not in the sitemap`);
    // A plain URL, not a markdown link, because scripts/check-seo.mjs loads every linked page as HTML.
    assert.match(body, /Every problem page, one line each: https?:\/\/\S+\/llms-full\.txt/);
    assert.ok(Buffer.byteLength(body, "utf8") < 5120, "stays under 5 KB");
    assert.doesNotMatch(body, /[?]view=|[?]topic=/);
    assert.match(body, /free physics olympiad practice with IPhO, APhO and EuPhO problems and checked answers/);
  });
  it("lists every page in the sitemap in llms-full.txt, and nothing else", async () => {
    const body = await llmsFull().text();
    const linked = new Set(linksOf(body));
    const sitemapPaths = new Set(urls.map(path));
    for (const p of sitemapPaths) if (p !== "/") assert.ok(linked.has(p), `llms-full.txt is missing ${p}`);
    for (const p of linked) assert.ok(sitemapPaths.has(p), `llms-full.txt has ${p}, which is not in the sitemap`);
    assert.doesNotMatch(body, /[?]view=|[?]topic=/);
  });
});

describe("crawl access", () => {
  it("allows Googlebot, Bingbot, OAI-SearchBot, GPTBot, ClaudeBot and PerplexityBot in production", () => {
    const before = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    try {
      const result = robots();
      const rules = (Array.isArray(result.rules) ? result.rules : [result.rules]) as { userAgent: string; allow?: string; disallow?: string[] }[];
      assert.deepEqual(CRAWLERS, ["Googlebot", "Bingbot", "OAI-SearchBot", "GPTBot", "ClaudeBot", "PerplexityBot"]);
      for (const bot of CRAWLERS) {
        const rule = rules.find((r) => r.userAgent === bot);
        assert.ok(rule, bot);
        assert.equal(rule.allow, "/");
        assert.ok(!(rule.disallow ?? []).includes("/"), `${bot} must not be disallowed from /`);
        for (const blocked of rule.disallow ?? []) assert.ok(!/^\/(problems|learn|coaching|dashboard\/problems)/.test(blocked), `${bot}: ${blocked}`);
      }
      assert.ok(rules.some((r) => r.userAgent === "*"));
      assert.match(String(result.sitemap), /\/sitemap\.xml$/);
    } finally {
      if (before === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = before;
    }
  });
  it("has no middleware or bot check, and only the API sends noindex", async () => {
    for (const file of ["middleware.ts", "middleware.js", "src/middleware.ts", "proxy.ts"]) assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), false, file);
    const rules = await nextConfig.headers!();
    for (const rule of rules) {
      const robotsHeader = rule.headers.find((h) => h.key.toLowerCase() === "x-robots-tag");
      if (robotsHeader) assert.equal(rule.source, "/api/:path*");
      assert.equal(rule.headers.some((h) => h.key.toLowerCase() === "content-security-policy"), false, "the CSP is report-only, so it blocks no crawler");
    }
  });
});
