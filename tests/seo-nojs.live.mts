// Fetches every page type from a running production build with a plain HTTP client, so no JavaScript runs, and
// checks what a crawler sees: the statement's first sentence, the title and description, the structured data
// against the visible text, the related links, the sitemap, llms.txt and robots.txt, and that each search and AI
// crawler user agent gets a normal 200.
//
//   VERCEL_ENV=production pnpm build && VERCEL_ENV=production pnpm exec next start -p 3100
//   BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 pnpm exec tsx --conditions=react-server tests/seo-nojs.live.mts
//
// Run the server from a clean worktree with no .env.local. Not run by CI (it needs a running server).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import arena from "../lib/arena/index.json";
import { parseArenaDocument } from "../lib/arena-document";
import { publishedArticles } from "../lib/learn/articles";
import { practiceProblemIds } from "../lib/learn/practice-links";
import { problems } from "../lib/physics";
import { allProblemPages, archiveStatementView, arenaStatementText, relatedProblems, topicsWithProblems } from "../lib/seo/problem-pages";
import { sentences } from "../lib/seo/statement-text";

const origin = (process.env.BROWSER_TEST_ORIGIN ?? "http://127.0.0.1:3000").replace(/\/$/, "");
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname), "run this against a local server");

const BOTS: Record<string, string> = {
  Googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  Bingbot: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "OAI-SearchBot": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
  GPTBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot",
  ClaudeBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  PerplexityBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
};
const PLAIN_UA = "Mozilla/5.0 (X11; Linux x86_64) physcratic-seo-check";

let checks = 0;
const ok = (value: unknown, message: string) => { assert.ok(value, message); checks++; };
const same = (actual: unknown, expected: unknown, message: string) => { assert.equal(actual, expected, message); checks++; };

async function get(path: string, userAgent = PLAIN_UA) {
  const response = await fetch(origin + path, { headers: { "user-agent": userAgent, accept: "text/html,application/xml,text/plain,*/*" }, redirect: "manual" });
  const body = await response.text();
  return { status: response.status, headers: response.headers, body };
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] ?? match);
/** The visible text of the server HTML: scripts, styles and comments removed first, so flight data never counts. */
const visible = (html: string) =>
  decode(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const tagText = (html: string, tag: string) => [...html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => visible(m[1]).trim());
const meta = (html: string, name: string) => decode(html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] ?? "");
const jsonLd = (html: string) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]) as any);
const hrefs = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => decode(m[1]));
const normal = (text: string) => text.replace(/\s+/g, " ").trim();

async function pool<T>(items: T[], size: number, work: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => { while (next < items.length) await work(items[next++]); }));
}

// 1. Home page for a signed-out visitor.
{
  const home = await get("/");
  same(home.status, 200, "home status");
  ok(/private/.test(home.headers.get("cache-control") ?? "") && /no-store/.test(home.headers.get("cache-control") ?? ""), `home is private, no-store: ${home.headers.get("cache-control")}`);
  const h1 = tagText(home.body, "h1");
  same(h1.length, 1, "home has one h1");
  same(h1[0], "Lobby", "home uses the existing Lobby heading");
  ok(visible(home.body).includes("Physcratic offers free physics Olympiad practice with Arena, IPhO, APhO and EuPhO problems."), "home sentence");
  const links = hrefs(home.body);
  ok(links.includes(`/dashboard/problems/${arena.problems[0].id}`), "Arena recommendation in initial HTML");
  for (const link of ["/problems", "/problems/archive", "/learn", "/coaching"]) ok(links.includes(link), `home links to ${link}`);
  const types = jsonLd(home.body).flat().map((n: any) => n["@type"]);
  ok(types.includes("WebSite") && types.includes("Organization"), `home JSON-LD: ${types}`);
  ok(!/noindex/.test(meta(home.body, "robots")), "home is indexable");
  ok(!/Welcome back|My attempts|Sign out/.test(visible(home.body)), "home shows no signed-in content");
}

// 2. The signed-in app is not indexed, and its links still work.
{
  const dashboard = await get("/dashboard");
  same(dashboard.status, 200, "dashboard status");
  ok(/noindex/.test(meta(dashboard.body, "robots")) && /follow/.test(meta(dashboard.body, "robots")), `dashboard robots: ${meta(dashboard.body, "robots")}`);
  const topic = await get("/dashboard?view=problems&topic=Mechanics");
  ok(/noindex/.test(meta(topic.body, "robots")), "old topic URL is noindex");
}

// 3. Library, archive and topic pages: real links to every problem.
const pages = allProblemPages();
const archiveIndexable = pages.filter((p) => p.kind === "archive" && !p.thin).length;
{
  const library = await get("/problems");
  same(library.status, 200, "library status");
  const links = hrefs(library.body);
  // The library lists practice and Arena problems and points to the archive and topic pages, which list the rest.
  for (const page of pages.filter((p) => p.kind !== "archive")) ok(links.includes(page.path), `library links to ${page.path}`);
  for (const link of ["/problems/archive", ...topicsWithProblems().map((t) => `/problems/topics/${t.slug}`)]) ok(links.includes(link), `library links to ${link}`);
  ok(jsonLd(library.body).flat().some((n: any) => n["@type"] === "CollectionPage"), "library JSON-LD");
  const archive = await get("/problems/archive");
  same(archive.status, 200, "archive status");
  const archiveLinks = hrefs(archive.body);
  for (const page of pages.filter((p) => p.kind === "archive")) ok(archiveLinks.includes(page.path), `archive links to ${page.path}`);
  for (const topic of topicsWithProblems()) {
    const response = await get(`/problems/topics/${topic.slug}`);
    same(response.status, 200, `${topic.slug} status`);
    const topicLinks = hrefs(response.body);
    for (const page of pages.filter((p) => p.topicSlug === topic.slug)) ok(topicLinks.includes(page.path), `${topic.slug} links to ${page.path}`);
    same(decode(response.body.match(/<link rel="canonical" href="([^"]+)"/)![1]).replace(origin, "").replace("http://localhost:3000", ""), `/problems/topics/${topic.slug}`, `${topic.slug} canonical`);
  }
  same((await get("/problems/topics/no-such-topic")).status, 404, "unknown topic is a 404");
}

// 4. Every problem page: statement in the HTML, metadata, structured data, source, related links.
const practiceById = new Map(problems.map((p) => [p.id, p]));
const arenaById = new Map(arena.problems.map((p) => [p.id, p]));
const firstSentences = new Map<string, number>();
await pool(pages, 8, async (page) => {
  const response = await get(page.path);
  const tag = page.id;
  same(response.status, 200, `${tag} status`);
  const text = visible(response.body);
  const h1 = tagText(response.body, "h1");
  same(h1.length, 1, `${tag} has one h1`);
  same(h1[0], page.title, `${tag} h1 is the title`);
  same(decode(response.body.match(/<title>([^<]*)<\/title>/)![1]), `${page.metaTitle} | Physcratic`, `${tag} <title>`);
  same(meta(response.body, "description"), page.description, `${tag} description`);
  same(decode(response.body.match(/<link rel="canonical" href="([^"]+)"/)![1]).replace(/^https?:\/\/[^/]+/, ""), page.path, `${tag} canonical`);
  same(/noindex/.test(meta(response.body, "robots")), !page.indexable, `${tag} robots`);

  // The statement's first sentence, from the data, found in the text of the HTML.
  let expected = "";
  if (page.kind === "practice") {
    const problem = practiceById.get(page.id)!;
    expected = problem.prompt.split(/(?<=[.!?])\s+(?=[A-Z])/u)[0];
    ok(!text.includes(problem.hint), `${tag} hint stays hidden`);
    ok(!problem.solution.some((step) => step.text.length > 30 && text.includes(step.text)), `${tag} solution stays hidden`);
  } else if (page.kind === "arena") {
    const source = arenaStatementText(page.id)!;
    const paragraph = parseArenaDocument(source).flatMap((s) => s.blocks).find((b) => b.type === "paragraph" && !b.text.startsWith("$$") && !b.text.startsWith("!["));
    expected = paragraph && paragraph.type === "paragraph" ? paragraph.text.split("$$")[0].trim() : "";
    const solution = (JSON.parse(readFileSync(join(process.cwd(), "public", arenaById.get(page.id)!.path), "utf8")) as { solution: string }).solution;
    const lead = parseArenaDocument(solution).flatMap((s) => s.blocks).find((b) => b.type === "paragraph" && b.text.length > 60 && !b.text.includes("$$"));
    if (lead && lead.type === "paragraph") ok(!text.includes(lead.text.slice(0, 60)), `${tag} solution stays hidden`);
    for (const [, alt] of source.matchAll(/!\[([^\]]+)\]\(\/corpus\/arena\/figures\/[a-z-]+\.(?:png|svg)\)/g)) ok(response.body.includes(`alt="${alt.replace(/'/g, "&#x27;")}"`), `${tag} figure alt "${alt}"`);
    if (source.includes("$$")) ok(/class="katex"/.test(response.body) && /<math/.test(response.body), `${tag} KaTeX HTML and MathML`);
  } else {
    const view = archiveStatementView(page)!;
    expected = sentences(view.paragraphs[0] ?? "")[0] ?? "";
    if (view.native) {
      // Native pages (IPhO 2026) render the full statement as HTML in place of the plain-text block, so they have no
      // "Statement as text" section and no source line. They still link the original statement PDF.
      ok(hrefs(response.body).includes(page.source!.officialUrl), `${tag} official link`);
      ok(/Problem statement/.test(text) && /Open original statement PDF/.test(text), `${tag} native statement and original PDF link`);
    } else {
      ok(text.includes(`${page.competition} ${page.year}, Problem ${page.number}. Official problem (PDF)`), `${tag} source line`);
      ok(hrefs(response.body).includes(page.source!.officialUrl), `${tag} official link`);
      ok(/Statement as text/.test(text), `${tag} statement section`);
    }
    for (const image of view.pageImages) ok(response.body.includes(`alt="${image.alt.replace(/'/g, "&#x27;")}"`), `${tag} page image alt`);
  }
  if (expected) {
    ok(text.includes(normal(expected)), `${tag}: first sentence not in the HTML: "${expected.slice(0, 80)}"`);
    firstSentences.set(page.id, expected.length);
  } else ok(page.thin || Boolean(archiveStatementView(page)?.native), `${tag}: only a page with too little text may have no statement`);

  // Structured data, matched to the visible text.
  const graph = jsonLd(response.body).flat();
  const crumbs = graph.find((n: any) => n["@type"] === "BreadcrumbList");
  const resource = graph.find((n: any) => n["@type"] === "LearningResource");
  ok(crumbs && resource, `${tag} has BreadcrumbList and LearningResource`);
  same(resource.name, h1[0], `${tag} LearningResource name is the h1`);
  same(resource.description, meta(response.body, "description"), `${tag} LearningResource description is the meta description`);
  const trail = [...(response.body.match(/<nav aria-label="breadcrumb">[\s\S]*?<\/nav>/)?.[0].matchAll(/<(?:a|span)[^>]*>([^<]+)<\/(?:a|span)>/g) ?? [])].map((m) => decode(m[1]).trim());
  assert.deepEqual(crumbs.itemListElement.map((i: any) => i.name), trail, `${tag} breadcrumb text matches BreadcrumbList`);
  checks++;
  if (page.source) {
    same(resource.isBasedOn.url, page.source.officialUrl, `${tag} isBasedOn is the official file`);
    if (!(page.kind === "archive" && archiveStatementView(page)?.native)) ok(text.includes(resource.isBasedOn.name), `${tag} isBasedOn name is visible: ${resource.isBasedOn.name}`);
  }

  // Related problems and the topic page, as real links.
  const related = response.body.match(/<nav aria-labelledby="related-problems-heading"[\s\S]*?<\/nav>/)?.[0] ?? "";
  const relatedLinks = hrefs(related);
  const expectedRelated = relatedProblems(page).map((p) => p.path);
  assert.deepEqual(relatedLinks.filter((l) => l.startsWith("/dashboard/problems/")), expectedRelated, `${tag} related links`);
  ok(expectedRelated.length >= 3 && expectedRelated.length <= 5, `${tag} has 3 to 5 related problems`);
  ok(relatedLinks.includes(`/problems/topics/${page.topicSlug}`), `${tag} links to its topic page`);
});

// 5. Learn: structured data, dates, and links to the specific problems.
for (const article of publishedArticles) {
  const response = await get(`/learn/${article.slug}`);
  same(response.status, 200, `${article.slug} status`);
  const graph = jsonLd(response.body).flat();
  const body = graph.find((n: any) => n["@type"] === "Article");
  ok(body, `${article.slug} has Article`);
  same(body.headline, tagText(response.body, "h1")[0], `${article.slug} headline is the h1`);
  same(body.dateModified, article.updated, `${article.slug} dateModified`);
  ok(visible(response.body).includes("Updated"), `${article.slug} shows its date`);
  ok(graph.some((n: any) => n["@type"] === "BreadcrumbList"), `${article.slug} BreadcrumbList`);
  if (article.reviewedBy) ok(visible(response.body).includes(article.reviewedBy.name) && graph.some((n: any) => n.reviewedBy?.name === article.reviewedBy!.name), `${article.slug} reviewer`);
  const links = hrefs(response.body);
  for (const id of practiceProblemIds[article.slug]) ok(links.includes(`/dashboard/problems/${id}`), `${article.slug} links to ${id}`);
}

// 6. Sitemap, llms.txt and robots.txt.
{
  const sitemap = await get("/sitemap.xml");
  same(sitemap.status, 200, "sitemap status");
  const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
  const lastmods = [...sitemap.body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  ok(locs.length >= archiveIndexable + publishedArticles.length, `sitemap has ${locs.length} URLs`);
  same(locs.filter((l) => /\/dashboard\/problems\/(ipho|apho|eupho)-/.test(l)).length, archiveIndexable, `${archiveIndexable} archive pages in the sitemap`);
  same(new Set(locs).size, locs.length, "sitemap URLs are unique");
  ok(!locs.some((l) => l.includes("?")), "sitemap has no query strings");
  ok(lastmods.every((l) => /^\d{4}-\d{2}-\d{2}$/.test(l)) && lastmods.length >= 120, `${lastmods.length} lastmod values`);
  await pool(locs, 8, async (loc) => {
    const response = await get(new URL(loc).pathname);
    same(response.status, 200, `${loc} resolves`);
    ok(!/noindex/.test(meta(response.body, "robots")), `${loc} is indexable`);
  });
  const llms = await get("/llms.txt");
  same(llms.status, 200, "llms.txt status");
  ok(Buffer.byteLength(llms.body) < 5120, "llms.txt is a short index");
  const full = await get("/llms-full.txt");
  same(full.status, 200, "llms-full.txt status");
  const llmsPaths = new Set([...full.body.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => new URL(m[1]).pathname));
  for (const loc of locs) { const path = new URL(loc).pathname; if (path !== "/") ok(llmsPaths.has(path), `llms-full.txt lists ${path}`); }
  const robots = await get("/robots.txt");
  same(robots.status, 200, "robots.txt status");
  for (const bot of Object.keys(BOTS)) {
    const group = robots.body.match(new RegExp(`User-Agent: ${bot}\\n([\\s\\S]*?)(?:\\n\\n|$)`, "i"));
    ok(group && /Allow: \//.test(group[1]) && !/Disallow: \/\n/.test(group[1]), `robots.txt allows ${bot}. Build and start with VERCEL_ENV=production (robots.txt is built at build time). Got: ${robots.body.slice(0, 200)}`);
  }
  ok(/Sitemap: .*\/sitemap\.xml/.test(robots.body), "robots.txt names the sitemap");
}

// 7. Each crawler gets the same pages as a browser: 200, no noindex header, no challenge page.
{
  const samples = ["/", "/problems", "/problems/archive", "/problems/topics/mechanics", "/dashboard/problems/ipho-2025-t2", "/dashboard/problems/arena-mind-the-gap", `/dashboard/problems/${arena.problems[1].id}`, `/learn/${publishedArticles[0].slug}`, "/learn", "/coaching", "/sitemap.xml", "/llms.txt", "/llms-full.txt", "/robots.txt"];
  for (const [bot, userAgent] of Object.entries(BOTS)) {
    for (const path of samples) {
      const response = await get(path, userAgent);
      same(response.status, 200, `${bot} ${path} status`);
      ok(!/noindex/i.test(response.headers.get("x-robots-tag") ?? ""), `${bot} ${path} has no noindex header`);
      ok(!/just a moment|captcha|access denied|verify you are human|enable javascript/i.test(visible(response.body)), `${bot} ${path} is not a challenge page`);
      if (path === "/dashboard/problems/ipho-2025-t2") ok(visible(response.body).includes("In 1765, British clockmaker James Cox"), `${bot} sees the statement`);
    }
  }
}

console.log(`seo-nojs.live: ${checks} checks passed on ${origin} (${pages.length} problem pages, ${publishedArticles.length} guides)`);
