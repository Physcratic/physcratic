// Registry and route retirement verification against a local production build. No credentials or writes.
// BROWSER_TEST_ORIGIN=http://127.0.0.1:3123 pnpm exec tsx --conditions=react-server tests/legacy-practice.live.mts
import assert from "node:assert/strict";
import { retiredPracticeIds, ARENA_LIBRARY_HREF } from "../lib/legacy-practice";
import { allProblemPages, topicsWithProblems } from "../lib/seo/problem-pages";
import { indexableRoutes } from "../lib/seo/public-routes";
import { publishedArticles } from "../lib/learn/articles";
import arena from "../lib/arena/index.json";

const origin = process.env.BROWSER_TEST_ORIGIN ?? "http://127.0.0.1:3123";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
let checks = 0;
const ok = (value: unknown, message: string) => { assert.ok(value, message); checks++; };
const pages = allProblemPages();
const retiredPaths = retiredPracticeIds.map(id => `/dashboard/problems/${id}`);
const target = new URL(ARENA_LIBRARY_HREF, origin);
for (const path of retiredPaths) {
  for (const suffix of ["", "?utm_source=legacy", "?view=overview&collection=pilot", "/"]) {
    let url = new URL(path + suffix, origin);
    const visited = new Set<string>();
    let redirected = false;
    let completed = false;
    for (let hop = 0; hop < 4; hop++) {
      ok(!visited.has(url.href), `no loop for ${path}${suffix}`); visited.add(url.href);
      const response = await fetch(url, { redirect: "manual" });
      if (response.status === 308) {
        redirected = true;
        ok(Boolean(response.headers.get("location")), "permanent retirement response has Location");
        url = new URL(response.headers.get("location")!, url);
        continue;
      }
      ok(redirected && response.status === 200, `retired URL reaches a working library: ${path}${suffix}`);
      ok(url.origin === origin && url.pathname === target.pathname, "retirement stays at the Arena library");
      ok(url.searchParams.get("view") === "problems" && url.searchParams.get("collection") === "arena", "source query cannot override Arena destination");
      const html = await response.text();
      ok(/noindex/.test(html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? ""), "dashboard library remains noindex");
      ok(!/<link rel="canonical"[^>]+\/dashboard\/problems\//.test(html), "no retired problem canonical");
      completed = true;
      break;
    }
    ok(completed && url.pathname === target.pathname && redirected, `redirect completed: ${path}${suffix}`);
  }
}
for (const id of ["incline-extra", "not-a-problem", "00000000-0000-4000-8000-000000000001"]) {
  ok((await fetch(`${origin}/dashboard/problems/${id}`, { redirect: "manual" })).status === 404, `unknown identity is not redirected: ${id}`);
}
const discoveryPaths = ["/", "/problems", "/problems/archive", "/llms.txt", "/llms-full.txt", "/sitemap.xml", "/learn", ...topicsWithProblems().map(t => `/problems/topics/${t.slug}`), ...publishedArticles.map(a => `/learn/${a.slug}`)];
for (const path of discoveryPaths) {
  const response = await fetch(origin + path);
  ok(response.status === 200, `discovery status ${path}`);
  const html = await response.text();
  for (const retired of retiredPaths) ok(!html.includes(retired), `no retired URL in ${path}: ${retired}`);
}
const xml = await (await fetch(origin + "/sitemap.xml")).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
ok(urls.length === indexableRoutes.length, "sitemap count derives from indexable registry");
ok(new Set(urls).size === urls.length, "sitemap has no duplicates");
for (const route of indexableRoutes) ok(urls.includes(route.path), `sitemap retained route: ${route.path}`);
for (const page of pages) {
  const response = await fetch(origin + page.path, { redirect: "manual" });
  ok(response.status === 200, `retained reader works: ${page.id}`);
  const html = await response.text();
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  ok(canonical && new URL(canonical).pathname === page.path, `retained canonical: ${page.id}`);
  const noindex = /noindex/.test(html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? "");
  ok(noindex === !page.indexable, `retained indexing policy: ${page.id}`);
  for (const retired of retiredPaths) ok(!html.includes(retired), `reader related links exclude legacy: ${page.id}`);
  const graphs = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1]));
  const resource = graphs.find(g => g["@type"] === "LearningResource");
  ok(resource && new URL(resource.url).pathname === page.path, `structured resource retains identity: ${page.id}`);
}
console.log(`legacy-practice.live: ${checks} checks passed; ${retiredPracticeIds.length} retired, ${pages.length} retained (${arena.problems.length} Arena), ${urls.length} sitemap URLs`);
