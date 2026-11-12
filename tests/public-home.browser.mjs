// Focused public-home UX against a local production build. No live providers or writes.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs BROWSER_TEST_ORIGIN=http://127.0.0.1:3122 node tests/public-home.browser.mjs
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const arena = JSON.parse(await readFile(new URL("../lib/arena/index.json", import.meta.url), "utf8")).problems;
const selected = arena[1];
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
  ok(html.includes(`href="/dashboard/problems/${arena[0].id}"`), "server-rendered Arena reader link");
  ok(html.includes('"@type":"WebSite"') && html.includes('"@type":"Organization"'), "home structured data");
  const visible = body => body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const crawler = await fetch(origin, { headers: { "user-agent": "Googlebot" } });
  ok(visible(await crawler.text()) === visible(html), "crawler and anonymous person receive same public content");
  for (const theme of ["light", "dark"]) {
    for (const width of [375, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
      await context.addInitScript(({ theme, solved }) => {
        localStorage.setItem("theme", theme);
        localStorage.setItem("physcratic.tour.welcome.v1", "seen");
        localStorage.setItem("physcratic.solved.v1", JSON.stringify(solved));
      }, { theme, solved: arena.filter(p => p.id !== selected.id).map(p => p.id) });
      await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      // Synthetic healthy guest data exercises the normal empty Lobby. Session isolation uses real local sessions separately.
      await context.route("**/api/auth/get-session*", route => route.fulfill({ json: null }));
      await context.route("**/api/dashboard", route => route.fulfill({ json: { user: null, savedAttempts: 0, practiceAttempts: null, solvedProblems: null, archiveReviewed: 0, ratings: [], contests: [] } }));
      const page = await context.newPage();
      const hydrationErrors = [];
      page.on("console", message => { if (/hydration|did not match|server rendered HTML/i.test(message.text())) hydrationErrors.push(message.text()); });
      page.on("pageerror", error => hydrationErrors.push(error.message));
      await page.goto(origin, { waitUntil: "networkidle" });
      ok(hydrationErrors.length === 0, `no hydration errors: ${hydrationErrors.join("\n")}`);
      ok(await page.getByRole("link", { name: "Solve problem", exact: true }).getAttribute("href") === `/dashboard/problems/${selected.id}`, "existing unsolved selection runs after hydration");
      ok(await page.locator("h1").count() === 1, "one h1");
      ok(await page.locator("header").first().evaluate(el => { const style = getComputedStyle(el); return style.zIndex === "40" && style.position === "sticky"; }), "public sticky header retains tour layer 40");
      ok(await page.locator("h1").textContent() === "Lobby", "meaningful h1");
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
      for (const href of ["/problems", "/problems/archive", "/learn", "/coaching", "/dashboard?view=contests", "/dashboard?view=problems&collection=arena", `/dashboard/problems/${selected.id}`]) {
        ok(await page.locator(`main a[href="${href}"]`).count() > 0, `public action ${href}`);
      }
      const primary = page.getByRole("navigation", { name: "Practice and guides", exact: true });
      const secondary = page.getByRole("navigation", { name: "Problems by topic", exact: true });
      ok(await primary.getByRole("link").count() === 4, "four primary discovery links");
      ok(await primary.locator('a[href^="/problems/topics/"]').count() === 0, "topics do not clutter the primary navigation");
      ok(await secondary.getByRole("link").count() === 6, "all six topic anchors in secondary navigation");
      ok(await secondary.evaluate(nav => {
        const history = document.querySelector('section[aria-label="Your problem history"]');
        return history && (nav.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
      }), "secondary navigation follows the full Lobby content");
      await page.keyboard.press("Tab");
      ok(await page.evaluate(() => document.activeElement?.textContent?.includes("Skip to content")), "skip link first");
      await page.keyboard.press("Enter");
      ok(await page.evaluate(() => document.activeElement?.id === "main-content"), "skip link focuses main");
      ok(await page.locator("h1").evaluate(el => el.getBoundingClientRect().top >= 72), "skip target heading clears public header");
      if (width < 1024) {
        ok(await page.getByRole("button", { name: "Menu", exact: true }).evaluate(el => { const menu = el.getBoundingClientRect(); const header = document.querySelector("header").getBoundingClientRect(); return menu.top >= header.top && menu.bottom <= header.bottom; }), "mobile menu stays inside header after skip");
        if (width >= 640) ok(await page.getByRole("button", { name: "Menu", exact: true }).evaluate(el => el.getBoundingClientRect().right <= document.querySelector('nav[aria-label="Breadcrumb"]').getBoundingClientRect().left), "tablet menu clears breadcrumb");
      }
      const practice = page.getByRole("link", { name: "Solve problem", exact: true });
      await practice.focus();
      ok(await practice.evaluate(el => { const s = getComputedStyle(el); return s.boxShadow !== "none" || s.outlineStyle !== "none"; }), "visible practice focus");
      await page.screenshot({ path: `${evidence}/home-${width}-${theme}.png`, fullPage: true });
      const lobbyHeadings = await page.locator("main h2").allTextContents();
      const cardGeometry = await page.locator("main .bg-card").evaluateAll(cards => cards.map(card => {
        const rect = card.getBoundingClientRect();
        return { x: rect.x, width: rect.width, height: rect.height };
      }));
      const reference = await context.newPage();
      await reference.goto(`${origin}/dashboard`, { waitUntil: "networkidle" });
      ok(JSON.stringify(await reference.locator("main h2").allTextContents()) === JSON.stringify(lobbyHeadings), "same Lobby sections and order as dashboard");
      const referenceGeometry = await reference.locator("main .bg-card").evaluateAll(cards => cards.map(card => {
        const rect = card.getBoundingClientRect();
        return { x: rect.x, width: rect.width, height: rect.height };
      }));
      ok(cardGeometry.length === referenceGeometry.length && cardGeometry.length === 5, "same five original Lobby cards");
      ok(cardGeometry.every((card, index) => ["x", "width", "height"].every(key => Math.abs(card[key] - referenceGeometry[index][key]) < 1)), "original Lobby card widths, heights and columns preserved");
      await reference.screenshot({ path: `${evidence}/dashboard-${width}-${theme}.png`, fullPage: true });
      await reference.close();
      await practice.click();
      await page.waitForURL(`${origin}/dashboard/problems/${selected.id}`);
      ok(await page.locator("h1").textContent() === selected.title, "guest practice opens actual reader");
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
      await page.getByRole("link", { name: "Guides", exact: true }).click();
      await page.waitForURL(`${origin}/learn`);
      await page.getByRole("link", { name: /Physcratic.*home/ }).click();
      await page.waitForURL(`${origin}/`);
      ok(await page.locator("[data-public-home]").count() === 1, "brand returns to public product home");
      // The practice action survives account/session API failure.
      await context.route("**/api/auth/get-session**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Synthetic unavailable" }) }));
      await page.reload({ waitUntil: "networkidle" });
      ok(await page.getByRole("link", { name: "Solve problem", exact: true }).isVisible(), "practice remains available with failed account API");
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
  ok(await page.getByRole("link", { name: "Solve problem", exact: true }).isVisible(), "no-JS practice link");
  ok(await page.getByRole("link", { name: "Solve problem", exact: true }).getAttribute("href") === `/dashboard/problems/${arena[0].id}`, "stable Arena recommendation in HTML");
  ok(await page.locator('main a[href^="/problems/topics/"]').count() === 6, "six no-JS topic links");
  ok(await page.getByRole("navigation", { name: "Problems by topic", exact: true }).getByRole("link").count() === 6, "secondary topic anchors remain available without JavaScript");
  await page.getByRole("link", { name: "Solve problem", exact: true }).click();
  ok(page.url() === `${origin}/dashboard/problems/${arena[0].id}`, "no-JS practice navigation");
  await context.close();
  const defaultContext = await browser.newContext();
  await defaultContext.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const dashboard = await defaultContext.newPage();
  await dashboard.goto(`${origin}/dashboard`, { waitUntil: "networkidle" });
  ok(await dashboard.locator("header").first().evaluate(el => { const style = getComputedStyle(el); return style.zIndex === "40" && style.position === "relative"; }), "default dashboard header retains relative position and tour layer 40");
  await defaultContext.close();
  console.log(`public-home.browser: ${checks} checks passed`);
} finally { await browser.close(); }
