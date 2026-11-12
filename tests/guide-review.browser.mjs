// Verify review attribution on the real static guide, including initial HTML/JSON-LD and no-JS rendering.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
const require = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"));
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const origin = process.env.BROWSER_TEST_ORIGIN ?? "http://127.0.0.1:3125";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const path = "/learn/how-olympiad-solutions-are-marked";
const pending = "Editorial review pending. No independent human review is recorded for this revision.";
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const response = await fetch(origin + path);
const html = await response.text();
ok(response.status === 200, "changed guide remains public");
ok(html.includes(pending), "pending review is server-rendered");
ok(!/Reviewed by|reviewedBy|Arrow Dunatos|bronze medallist/.test(html), "no personal review attribution in HTML or flight data");
const graph = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1]));
const webpage = graph.find(node => node["@type"] === "WebPage");
const article = graph.find(node => node["@type"] === "Article");
ok(webpage && !("reviewedBy" in webpage), "no invented reviewer in structured data");
ok(article?.author?.["@type"] === "Organization", "article retains its organization author");
assert.deepEqual(article.citation.map(citation => citation.url), [
  "https://www.ipho-new.org/statutes-syllabus/",
  "https://olimpicos.net/files/ipho/IPhO_2026_TheoryInstructions.pdf",
], "both exact original source citations retained"); checks++;
ok(!/<meta name="robots" content="[^"]*noindex/.test(html), "guide index policy unchanged");
for (const slug of ["start-preparing-physics-olympiad", "ipho-apho-eupho-differences", "physics-olympiad-books-and-resources"]) {
  const existing = await (await fetch(`${origin}/learn/${slug}`)).text();
  ok(/Reviewed by/.test(existing) && /Arrow Dunatos/.test(existing) && /"reviewedBy"/.test(existing), `existing reviewed guide attribution preserved: ${slug}`);
}
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  for (const theme of ["light", "dark"]) for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
    await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(origin + path, { waitUntil: "networkidle" });
    ok(await page.getByText(pending, { exact: true }).isVisible(), "current revision review status visible");
    ok(await page.getByRole("heading", { name: "A worked example: Mind the Gap", exact: true }).count() === 1, "existing worked example retained");
    ok(await page.locator(".katex").count() === 2, "both existing mathematical explanations rendered");
    const links = await page.locator('section[aria-labelledby="sources-heading"] a').evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
    for (const citation of article.citation) ok(links.includes(citation.url), "source citation link retained");
    ok(await page.locator("h1").count() === 1 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "one heading and no mobile overflow");
    ok((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.length === 0, "guide accessibility");
    await context.close();
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 1000 } });
  const page = await context.newPage();
  await page.goto(origin + path);
  ok(await page.getByText(pending, { exact: true }).isVisible(), "pending attribution available without JavaScript");
  await context.close();
  console.log(`guide-review.browser: ${checks} checks passed`);
} finally { await browser.close(); }
