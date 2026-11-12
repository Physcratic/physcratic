// Real Next production routes and collection API. All identities and account data are disposable fixtures.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { allProblemPages, topicsWithProblems } from "../lib/seo/problem-pages.ts";
import { corpusProblems } from "../lib/corpus-pilot.ts";
import { retiredPracticeIds } from "../lib/legacy-practice.ts";
const require = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"));
const { chromium } = require("playwright");
const { default: AxeBuilder } = await import(require.resolve("@axe-core/playwright"));
const origin = process.env.BROWSER_TEST_ORIGIN;
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const evidence = process.env.LIBRARY_SCREENSHOTS ?? "/tmp/physcratic-p3-screenshots";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ["--no-sandbox"] });
let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };
const errors = [];
async function contextFor(width = 1440, theme = "light", javaScriptEnabled = true) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme, javaScriptEnabled, reducedMotion: "reduce" });
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  if (javaScriptEnabled) await context.addInitScript(theme => { localStorage.setItem("theme", theme); localStorage.setItem("physcratic:tours:v1", JSON.stringify({ welcome: true })); }, theme);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  return { context, page };
}
try {
  for (const theme of ["light", "dark"]) for (const width of [375, 768, 1440]) {
    const { context, page } = await contextFor(width, theme);
    await page.goto(`${origin}/problems`);
    await page.locator('[data-problem-card^="arena:"]').first().waitFor();
    ok(await page.locator('h1').count() === 1, "one page heading");
    ok(await page.locator('h1').textContent() === "Problem library", "library heading");
    ok(await page.locator('[data-problem-card^="arena:"]').count() === 18, "all 18 Arena entries");
    ok(await page.getByText("Community problems could not be loaded, so this list is incomplete.", { exact: true }).count() === 0, "actual community collection query succeeds");
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}/${theme} fits viewport`);
    ok((await page.locator('link[rel="canonical"]').getAttribute("href")) === "https://physcratic.com/problems", "unchanged canonical");
    const axe = await new AxeBuilder({ page }).analyze();
    ok(axe.violations.filter(v => ["serious", "critical"].includes(v.impact)).length === 0, JSON.stringify(axe.violations));
    await page.keyboard.press("Tab");
    ok(await page.evaluate(() => document.activeElement?.textContent?.includes("Skip to content")), "skip link first");
    await page.keyboard.press("Enter");
    ok(await page.evaluate(() => document.activeElement?.id === "main-content"), "skip link focuses main");
    const robots = page.locator('meta[name="robots"]');
    const policy = await robots.count() ? await robots.getAttribute("content") : "";
    ok(!/noindex|none/i.test(policy), "public library remains indexable (default index/follow when the tag is absent)");
    await page.screenshot({ path: `${evidence}/library-${width}-${theme}.png`, fullPage: false });
    await context.close();
  }

  // Both entry routes use the same URL-driven library, including initially supplied dashboard filters.
  for (const entry of ["/problems", "/dashboard?view=problems&topic=Mechanics&q=clock"]) {
    const { context, page } = await contextFor();
    await page.goto(origin + entry);
    await page.getByLabel("Find a problem", { exact: true }).waitFor();
    if (entry.startsWith("/dashboard")) {
      await page.getByRole("button", { name: "Clear tag filter", exact: true }).click();
      ok(await page.getByLabel("Tag", { exact: true }).inputValue() === "", "initial dashboard topic clears");
      await page.getByLabel("Find a problem", { exact: true }).fill("");
    }
    await page.getByRole("tab", { name: /Olympiad archive/ }).click();
    await page.locator('#catalog-results').waitFor();
    if (entry === "/problems") {
      const retained = new Set();
      while (true) {
        for (const id of await page.locator('#catalog-results [data-problem-card]').evaluateAll(cards => cards.map(card => card.dataset.problemCard))) retained.add(id);
        const next = page.getByRole("navigation", { name: "Catalog pages (top)", exact: true }).getByRole("button", { name: "Next", exact: true });
        if (await next.isDisabled()) break;
        await next.click();
      }
      ok(retained.size === 103, "all 103 imported archive problems remain reachable through pagination");
      await page.getByRole("tab", { name: /Physcratic Arena/ }).click();
      await page.getByRole("tab", { name: /Olympiad archive/ }).click();
    }
    await page.getByLabel("Find a problem", { exact: true }).fill("Cox");
    await page.getByLabel("Competition", { exact: true }).fill("IPhO 2025");
    ok(await page.locator('#catalog-results [data-problem-card]').count() === 1, "search and competition apply together");
    if (entry === "/problems") {
      const link = page.locator('#catalog-results a[href="/dashboard/problems/ipho-2025-t2"]');
      await link.click();
      await page.waitForURL(`${origin}/dashboard/problems/ipho-2025-t2`);
      await page.goBack();
      await page.getByLabel("Find a problem", { exact: true }).waitFor();
      ok(await page.getByLabel("Find a problem", { exact: true }).inputValue() === "Cox", "reader back restores library filters");
    }
    await page.getByLabel("Rating band", { exact: true }).click();
    await page.getByRole("option", { name: /^Advanced/ }).click();
    ok(new URL(page.url()).searchParams.get("difficulty") === "advanced", "rating band has a shareable URL");
    await page.goBack();
    await page.waitForFunction(() => document.querySelector("#difficulty-filter")?.textContent === "All ratings");
    ok(await page.getByLabel("Rating band", { exact: true }).textContent() === "All ratings", "back restores previous rating");
    await page.goForward();
    await page.waitForFunction(() => document.querySelector("#difficulty-filter")?.textContent.includes("Advanced"));
    ok((await page.getByLabel("Rating band", { exact: true }).textContent()).includes("Advanced"), "forward restores rating");
    await page.reload();
    ok(await page.getByLabel("Find a problem", { exact: true }).inputValue() === "Cox", "reload restores query");
    ok(await page.getByLabel("Competition", { exact: true }).inputValue() === "IPhO 2025", "reload restores competition");
    await page.getByLabel("Find a problem", { exact: true }).fill("no-such-physics-problem");
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    ok(await page.getByLabel("Find a problem", { exact: true }).inputValue() === "", "clear removes query including initial dashboard prop");
    ok(await page.getByLabel("Competition", { exact: true }).inputValue() === "", "clear removes competition");
    await page.getByLabel("Tag", { exact: true }).fill("Modern physics");
    await page.reload();
    ok(await page.getByLabel("Tag", { exact: true }).inputValue() === "Modern physics", "multiword topic survives typing and reload");
    await page.getByRole("button", { name: "Clear tag filter", exact: true }).click();
    await page.getByRole("tab", { name: /Guided exercises/ }).click();
    ok(await page.locator('#guided-results [data-problem-card]').count() === corpusProblems.length, "all existing Guided exercises retained");
    await page.locator('#guided-results').getByRole("button", { name: /^Open problem/ }).first().click();
    ok(new URL(page.url()).searchParams.has("exercise"), "guided reader is in URL");
    await page.goBack();
    await page.locator('#guided-results').waitFor();
    await page.goForward();
    await page.locator('#corpus-title').waitFor();
    await page.reload();
    await page.locator('#corpus-title').waitFor();
    ok(await page.locator('h1').count() === 1, "guided reader retains one h1");
    await context.close();
  }

  {
    const { context, page } = await contextFor();
    let fail = true;
    await context.route("**/api/arena/collection?*", route => {
      if (fail) { fail = false; return route.fulfill({ status: 503, json: { error: "Synthetic transient failure" } }); }
      return route.continue();
    });
    await page.goto(`${origin}/problems`);
    await page.getByRole("button", { name: "Retry collection", exact: true }).click();
    await page.locator('[data-problem-card^="arena:"]').first().waitFor();
    ok(await page.locator('[data-problem-card^="arena:"]').count() === 18, "collection retry restores actual results");
    await page.getByRole("group", { name: "Topic", exact: true }).getByRole("button", { name: "Waves", exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-problem-card^="arena:"]').length > 0 && document.querySelectorAll('[data-problem-card^="arena:"]').length < 18);
    ok(new URL(page.url()).searchParams.get("tag") === "Waves", "topic chips filter the real collection");
    await context.close();
  }

  if (process.env.LIBRARY_SESSION_A && process.env.LIBRARY_SESSION_B) {
    const { context, page } = await contextFor();
    await context.addCookies([{ name: "better-auth.session_token", value: process.env.LIBRARY_SESSION_A, url: origin }]);
    await page.goto(`${origin}/problems?collection=pilot&exercise=${corpusProblems[0].id}`);
    await page.waitForFunction(() => document.querySelector("#corpus-working")?.value === "P3 synthetic private note A");
    await page.locator("#corpus-working").fill("P3 unsaved private draft A");
    await context.clearCookies();
    await context.addCookies([{ name: "better-auth.session_token", value: process.env.LIBRARY_SESSION_B, url: origin }]);
    // Same-origin tab notification follows Better Auth's real cross-tab session refresh path.
    const otherTab = await context.newPage();
    await otherTab.goto(`${origin}/learn`);
    await otherTab.evaluate(() => localStorage.setItem("better-auth.message", JSON.stringify({ event: "session", data: { trigger: "sign-in" }, timestamp: Date.now() })));
    await page.waitForFunction(() => document.querySelector("#corpus-working")?.value === "P3 synthetic private note B");
    ok(!(await page.content()).includes("P3 unsaved private draft A"), "mounted account switch clears prior account drafts");
    await context.clearCookies();
    await otherTab.evaluate(() => localStorage.setItem("better-auth.message", JSON.stringify({ event: "session", data: { trigger: "sign-out" }, timestamp: Date.now() })));
    await page.locator("#corpus-working").waitFor({ state: "detached" });
    ok(!(await page.content()).includes("P3 synthetic private note B"), "guest receives no previous member progress");
    await context.close();
  }

  // No JavaScript: expandable directory, full retained coverage, real reader navigation, no retired links.
  const { context, page } = await contextFor(375, "light", false);
  await page.goto(`${origin}/problems`);
  for (const problem of allProblemPages()) ok(await page.locator(`main a[href="${problem.path}"]`).count() > 0, `SSR reader ${problem.id}`);
  for (const topic of topicsWithProblems()) ok(await page.locator(`main a[href="/problems/topics/${topic.slug}"]`).count() === 1, `SSR topic ${topic.slug}`);
  for (const id of retiredPracticeIds) ok(await page.locator(`a[href="/dashboard/problems/${id}"]`).count() === 0, `retired ${id} excluded`);
  await page.getByText("All 121 Arena and archive problems", { exact: true }).click();
  const reader = page.locator('main a[href="/dashboard/problems/arena-mind-the-gap"]');
  ok(await reader.isVisible(), "directory expands without JavaScript");
  await reader.click();
  await page.waitForURL(`${origin}/dashboard/problems/arena-mind-the-gap`);
  ok((await page.locator('main').textContent()).includes("Mind the Gap"), "reader works without JavaScript");
  await context.close();
  ok(errors.length === 0, `browser errors: ${errors.join("; ")}`);
  console.log(`public-library.browser: ${checks} checks passed; screenshots: ${evidence}`);
} finally { await browser.close(); }
