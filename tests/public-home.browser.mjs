// Focused public-home UX against a local production build. No live providers or writes.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs BROWSER_TEST_ORIGIN=http://127.0.0.1:3122 node tests/public-home.browser.mjs
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const origin = process.env.BROWSER_TEST_ORIGIN ?? "http://127.0.0.1:3122";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const evidence = process.env.HOME_EVIDENCE_DIR ?? "work/p2/screenshots";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"], headless: true });
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
try {
  const response = await fetch(origin);
  const html = await response.text();
  ok(response.status === 200, "public root status");
  ok(/private/.test(response.headers.get("cache-control") ?? "") && /no-store/.test(response.headers.get("cache-control") ?? ""), "root private/no-store");
  ok(html.includes(`rel="canonical" href="${process.env.HOME_CANONICAL_ORIGIN ?? "https://physcratic.com"}"`), "root canonical");
  ok(!/<meta name="robots" content="[^"]*noindex/.test(html), "root indexable");
  ok(html.includes('"@type":"WebSite"') && html.includes('"@type":"Organization"'), "home structured data");
  const visible = body => body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const crawler = await fetch(origin, { headers: { "user-agent": "Googlebot" } });
  ok(visible(await crawler.text()) === visible(html), "crawler and anonymous person receive same public content");
  for (const theme of ["light", "dark"]) {
    for (const width of [375, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
      await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
      await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      const page = await context.newPage();
      await page.goto(origin, { waitUntil: "networkidle" });
      ok(await page.locator("h1").count() === 1, "one h1");
      ok(await page.locator("h1").textContent() === "Free physics olympiad practice", "meaningful h1");
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
      for (const href of ["/problems", "/problems/archive", "/learn", "/coaching", "/dashboard?view=contests", "/dashboard/problems/incline"]) {
        ok(await page.locator(`main a[href="${href}"]`).count() > 0, `public action ${href}`);
      }
      await page.keyboard.press("Tab");
      ok(await page.evaluate(() => document.activeElement?.textContent?.includes("Skip to content")), "skip link first");
      await page.keyboard.press("Enter");
      ok(await page.evaluate(() => document.activeElement?.id === "main-content"), "skip link focuses main");
      ok(await page.locator("h1").evaluate(el => el.getBoundingClientRect().top >= 72), "skip target heading clears public header");
      if (width < 1024) {
        ok(await page.getByRole("button", { name: "Menu", exact: true }).evaluate(el => { const menu = el.getBoundingClientRect(); const header = document.querySelector("header").getBoundingClientRect(); return menu.top >= header.top && menu.bottom <= header.bottom; }), "mobile menu stays inside header after skip");
        if (width >= 640) ok(await page.getByRole("button", { name: "Menu", exact: true }).evaluate(el => el.getBoundingClientRect().right <= document.querySelector('nav[aria-label="Breadcrumb"]').getBoundingClientRect().left), "tablet menu clears breadcrumb");
      }
      const practice = page.getByRole("link", { name: "Try a problem", exact: true });
      await practice.focus();
      ok(await practice.evaluate(el => { const s = getComputedStyle(el); return s.boxShadow !== "none" || s.outlineStyle !== "none"; }), "visible practice focus");
      await page.screenshot({ path: `${evidence}/home-${width}-${theme}.png`, fullPage: true });
      await practice.click();
      await page.waitForURL(`${origin}/dashboard/problems/incline`);
      ok(await page.locator("h1").textContent() === "A block on an incline", "guest practice opens actual reader");
      await page.goto(origin);
      if (width < 1024) {
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        const menu = page.getByRole("dialog");
        ok(await menu.getByRole("link", { name: "Problem Studio", exact: true }).isVisible(), "mobile Studio access");
        ok(await menu.getByRole("link", { name: "Settings", exact: true }).isVisible(), "mobile settings access");
        await page.keyboard.press("Escape");
        await menu.waitFor({ state: "hidden" });
        ok(!await menu.isVisible(), "menu keyboard closes");
        ok(await page.getByRole("button", { name: "Menu", exact: true }).evaluate(el => { const menu = el.getBoundingClientRect(); const header = document.querySelector("header").getBoundingClientRect(); return menu.top >= header.top && menu.bottom <= header.bottom; }), "mobile menu stays inside header after focus restoration");
      }
      if (width === 1440) {
        await page.getByRole("button", { name: "Help: Welcome to Physcratic", exact: true }).click();
        await page.locator("[data-tour-card]").waitFor();
        await page.getByRole("button", { name: "Next", exact: true }).click();
        await page.getByRole("button", { name: "Next", exact: true }).click();
        await page.getByRole("button", { name: "Open one for me", exact: true }).waitFor();
        ok(true, "manual Help reaches root practice action");
        await page.keyboard.press("Escape");
      }
      await page.getByRole("link", { name: "All guides", exact: true }).click();
      await page.waitForURL(`${origin}/learn`);
      await page.getByRole("link", { name: /Physcratic.*home/ }).click();
      await page.waitForURL(`${origin}/`);
      ok(await page.locator("[data-public-home]").count() === 1, "brand returns to public product home");
      // The practice action survives account/session API failure.
      await context.route("**/api/auth/get-session**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Synthetic unavailable" }) }));
      await page.reload({ waitUntil: "networkidle" });
      ok(await page.getByRole("link", { name: "Try a problem", exact: true }).isVisible(), "practice remains available with failed account API");
      if (width < 640) await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page.getByRole("button", { name: "Retry account", exact: true }).first().waitFor();
      ok(await page.getByRole("button", { name: "Retry account", exact: true }).first().isVisible(), "account error has recovery");
      await context.close();
    }
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(origin);
  ok(await page.getByRole("link", { name: "Try a problem", exact: true }).isVisible(), "no-JS practice link");
  ok(await page.locator('main a[href^="/problems/topics/"]').count() === 6, "six no-JS topic links");
  await page.getByRole("link", { name: "Try a problem", exact: true }).click();
  ok(page.url() === `${origin}/dashboard/problems/incline`, "no-JS practice navigation");
  await context.close();
  console.log(`public-home.browser: ${checks} checks passed`);
} finally { await browser.close(); }
