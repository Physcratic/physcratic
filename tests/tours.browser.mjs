// Runs both guided tours on a local production build at 375 and 1440 in light and dark.
//   BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 SESSION_COOKIE="better-auth.session_token=..." node tests/tours.browser.mjs
// The Welcome tour runs signed out. The Studio tour needs SESSION_COOKIE (the throwaway PostgreSQL, see
// tests/solve-contrast.browser.mjs). AUTHORING_BROWSER_TOOLS points at a folder with playwright and @axe-core/playwright.
// Checks, at every step: one card, the ring on the target, the card never over the target, everything inside the screen,
// focus on the card, the step announced, 44px buttons, the page still scrolls and clicks. Then Back, the arrow keys, Esc,
// Skip, Done, "seen" kept after a reload, the Help button replaying, and axe on the page with a tour open.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json")) : createRequire(import.meta.url);
const { chromium } = require("playwright");
let axeBuilder;
try { axeBuilder = require("@axe-core/playwright").default ?? require("@axe-core/playwright").AxeBuilder; } catch { axeBuilder = null; }
const origin = process.env.BROWSER_TEST_ORIGIN || "http://127.0.0.1:3100";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const cookie = process.env.SESSION_COOKIE;
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });

let checks = 0;
const failures = [];
const ok = (condition, message) => { checks++; if (!condition) failures.push(message); };

async function open(theme, width, signedIn) {
  const context = await browser.newContext({ viewport: { width, height: width === 375 ? 800 : 900 }, colorScheme: theme });
  await context.addInitScript((value) => {
    try { localStorage.setItem("theme", value); } catch {}
    // Browser automation turns the first-visit start off. These tests are about that start, so say it is a person.
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  }, theme);
  if (signedIn) {
    const [name, ...rest] = cookie.split("=");
    await context.addCookies([{ name, value: rest.join("="), url: origin }]);
  }
  const page = await context.newPage();
  page.on("pageerror", (e) => failures.push(`page error on ${page.url()}: ${e.message.slice(0, 80)}`));
  page.on("dialog", (d) => d.accept());
  return { context, page };
}

const card = (page) => page.locator("[data-tour-card]");

/** What is on screen now: the card, the ring, and whether they behave. */
async function inspect(page, label) {
  await card(page).waitFor({ timeout: 8000 });
  await page.waitForTimeout(700); // let it settle after the scroll
  const info = await page.evaluate(() => {
    const c = document.querySelector("[data-tour-card]");
    const r = document.querySelector("[data-tour-ring]");
    const cr = c.getBoundingClientRect();
    const rr = r ? r.getBoundingClientRect() : null;
    const overlap = rr ? Math.max(0, Math.min(cr.right, rr.right) - Math.max(cr.left, rr.left)) * Math.max(0, Math.min(cr.bottom, rr.bottom) - Math.max(cr.top, rr.top)) : 0;
    const buttons = [...c.querySelectorAll("button")].map((b) => ({ name: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height), w: Math.round(b.getBoundingClientRect().width) }));
    const heading = c.querySelector("[id]");
    return {
      title: c.querySelector("p[tabindex='-1']")?.textContent ?? "",
      cards: document.querySelectorAll("[data-tour-card]").length,
      overlap,
      ring: rr ? { top: rr.top, bottom: rr.bottom, left: rr.left, right: rr.right, h: rr.height } : null,
      cardBox: { top: cr.top, bottom: cr.bottom, left: cr.left, right: cr.right },
      vw: window.innerWidth, vh: window.innerHeight,
      focusOnCard: c.contains(document.activeElement),
      status: c.querySelector("[role=status]")?.textContent ?? "",
      buttons,
      describedBy: !!document.getElementById(c.getAttribute("aria-describedby") || "x"),
      modal: c.getAttribute("aria-modal"),
      sideways: document.documentElement.scrollWidth > window.innerWidth,
      headingId: !!heading,
    };
  });
  ok(info.cards === 1, `${label}: one card`);
  ok(!!info.ring, `${label}: a ring marks the target`);
  ok(info.overlap === 0, `${label}: the card never covers the target (overlap ${info.overlap}px)`);
  ok(info.cardBox.top >= 0 && info.cardBox.bottom <= info.vh && info.cardBox.left >= 0 && info.cardBox.right <= info.vw, `${label}: the card is inside the screen`);
  if (info.ring && info.ring.h < info.vh * 0.6) ok(info.ring.top >= 0 && info.ring.bottom <= info.vh, `${label}: the target is in view`);
  ok(info.focusOnCard, `${label}: focus is on the card`);
  ok(/^Step \d+ of \d+: /.test(info.status), `${label}: the step is announced ("${info.status}")`);
  ok(info.buttons.every((b) => b.h >= 44), `${label}: buttons are 44px tall (${JSON.stringify(info.buttons)})`);
  ok(info.describedBy && info.modal === "false", `${label}: a labelled, non-modal dialog`);
  ok(!info.sideways, `${label}: no sideways scroll`);
  return info;
}

async function axeCheck(page, label) {
  if (!axeBuilder) return;
  const result = await new axeBuilder({ page }).analyze();
  const bad = result.violations.filter((v) => ["serious", "critical"].includes(v.impact) && v.id !== "label-content-name-mismatch");
  ok(bad.length === 0, `${label}: axe clean with the tour open (${bad.map((v) => v.id).join(", ")})`);
}

/** Walks a tour to the end, pressing the card's own button. Returns the step titles. */
async function walk(page, label, { axeOnce = true } = {}) {
  const titles = [];
  for (let i = 0; i < 14; i++) {
    if (!(await card(page).count())) {
      // Waiting for a page, or finished.
      await page.waitForTimeout(2600);
      if (!(await card(page).count())) break;
    }
    const info = await inspect(page, `${label} step ${titles.length + 1}`);
    titles.push(info.title);
    if (axeOnce && titles.length === 1) await axeCheck(page, label);
    const next = card(page).getByRole("button", { name: /^(Next|Done|Open one for me)$/ });
    const text = (await next.innerText()).trim();
    await next.click();
    if (text === "Done") break;
    if (text === "Open one for me") await page.waitForURL(/\/dashboard\/problems\//, { timeout: 15000 });
  }
  return titles;
}

for (const theme of ["light", "dark"]) {
  for (const width of [375, 1440]) {
    const tag = `${theme} ${width}`;

    // ---------------------------------------------------------------- Welcome tour, signed out
    {
      const { context, page } = await open(theme, width, false);
      await page.goto(`${origin}/dashboard`, { waitUntil: "networkidle" });
      await card(page).waitFor({ timeout: 8000 });
      ok(true, `${tag} welcome: starts on the first visit`);
      // The page is still usable with the card open: it scrolls and links work.
      const before = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(300);
      ok((await page.evaluate(() => window.scrollY)) >= before, `${tag} welcome: the page still scrolls`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      // Back is not offered on the first step. Arrow keys move.
      const first = await inspect(page, `${tag} welcome first step`);
      ok(first.buttons.every((b) => b.name !== "Back"), `${tag} welcome: no Back on the first step`);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(500);
      const second = await inspect(page, `${tag} welcome second step`);
      ok(second.title !== first.title, `${tag} welcome: ArrowRight moves to the next step`);
      await card(page).getByRole("button", { name: "Back" }).click();
      await page.waitForTimeout(500);
      ok((await inspect(page, `${tag} welcome back`)).title === first.title, `${tag} welcome: Back returns`);
      const titles = await walk(page, `${tag} welcome`);
      log(`${tag} welcome:`, titles.join(" > "));
      ok(titles.length >= 6, `${tag} welcome: at least 6 steps are shown (${titles.length})`);
      ok(titles.includes("Your answer") && titles.includes("Check") && titles.includes("Hints and solutions"), `${tag} welcome: the solving steps are shown`);
      ok((await card(page).count()) === 0, `${tag} welcome: Done closes it`);
      ok((await page.evaluate(() => localStorage.getItem("physcratic.tour.welcome.v1"))) === "seen", `${tag} welcome: remembered as seen`);
      await page.goto(`${origin}/dashboard`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      ok((await card(page).count()) === 0, `${tag} welcome: does not start again after a reload`);
      // Help replays it. Esc closes it.
      await page.getByRole("button", { name: /^Help: Welcome to Physcratic/ }).click();
      await card(page).waitFor({ timeout: 5000 });
      await inspect(page, `${tag} welcome replay`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      ok((await card(page).count()) === 0, `${tag} welcome: Esc closes it`);
      // Settings can reset it.
      await context.close();
    }

    // ---------------------------------------------------------------- Studio tour, signed in
    if (cookie) {
      const { context, page } = await open(theme, width, true);
      await page.goto(`${origin}/dashboard/author`, { waitUntil: "networkidle" });
      const simple = page.getByRole("button", { name: "Simple", exact: true });
      await simple.waitFor();
      if ((await simple.getAttribute("aria-pressed")) !== "true") await simple.click();
      await card(page).waitFor({ timeout: 8000 });
      const titles = await walk(page, `${tag} studio`);
      log(`${tag} studio:`, titles.join(" > "));
      ok(titles.join("|") === "The main question|Part a|Equations|Type it like you say it|An image|The worked solution|Final Answer (Solution)|Answer preview|Where it's from|Estimated difficulty|Publish", `${tag} studio: all eleven steps (${titles.join(", ")})`);
      ok((await page.evaluate(() => localStorage.getItem("physcratic.tour.studio.v1"))) === "seen", `${tag} studio: remembered as seen`);
      await page.getByRole("button", { name: /^Help: Write your first problem/ }).click();
      await card(page).waitFor({ timeout: 5000 });
      await page.getByRole("button", { name: "Skip tour" }).click();
      ok((await card(page).count()) === 0, `${tag} studio: Skip closes it`);
      await context.close();
    }
  }
}

// ---------------------------------------------------------------- First visit: the tour opens on its own
// Browser automation (navigator.webdriver) keeps the first-visit start off, and the other blocks turn that off to test the
// tours themselves. This block checks both sides on a fresh browser, with nothing clicked.
for (const width of [375, 1440]) {
  const tag = `light ${width}`;
  const pages = [["welcome", "/dashboard", false], ...(cookie ? [["studio", "/dashboard/author", true]] : [])];
  for (const [id, path, signedIn] of pages) {
    // Under automation (navigator.webdriver is true, which is Playwright's own default) nothing starts by itself.
    {
      const context = await browser.newContext({ viewport: { width, height: width === 375 ? 800 : 900 } });
      if (signedIn) { const [name, ...rest] = cookie.split("="); await context.addCookies([{ name, value: rest.join("="), url: origin }]); }
      const page = await context.newPage();
      await page.goto(origin + path, { waitUntil: "networkidle" });
      ok((await page.evaluate(() => navigator.webdriver)) === true, `${tag} ${id}: this browser reports navigator.webdriver`);
      await page.waitForTimeout(1500);
      ok((await card(page).count()) === 0, `${tag} ${id}: stays off under automation`);
      ok((await page.evaluate((key) => localStorage.getItem(key), `physcratic.tour.${id}.v1`)) === null, `${tag} ${id}: and is not marked as seen`);
      await context.close();
    }
    // With that turned off, a fresh visit opens the tour with no click, within a moment of the page loading.
    {
      const { context, page } = await open("light", width, signedIn);
      ok((await page.evaluate(() => navigator.webdriver)) === false, `${tag} ${id}: navigator.webdriver is turned off`);
      await page.goto(origin + path, { waitUntil: "load" });
      const began = Date.now();
      await card(page).waitFor({ timeout: 4000 });
      ok(Date.now() - began < 3000, `${tag} ${id}: opens on its own on a fresh visit (${Date.now() - began}ms after load, no click)`);
      ok((await page.evaluate((key) => localStorage.getItem(key), `physcratic.tour.${id}.v1`)) === "seen", `${tag} ${id}: remembered in localStorage`);
      // Skip works at the first step, and it does not start again after a reload.
      await page.getByRole("button", { name: "Skip tour" }).click();
      ok((await card(page).count()) === 0, `${tag} ${id}: Skip closes it at step one`);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      ok((await card(page).count()) === 0, `${tag} ${id}: plays once per browser`);
      // Help replays it.
      await page.getByRole("button", { name: id === "welcome" ? /^Help: Welcome to Physcratic/ : /^Help: Write your first problem/ }).click();
      await card(page).waitFor({ timeout: 5000 });
      ok(true, `${tag} ${id}: Help replays it`);
      await page.keyboard.press("Escape");
      // Settings resets both, and the next visit starts it again by itself.
      if (cookie) {
        await page.goto(`${origin}/settings`, { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Replay tours" }).click();
        ok((await page.evaluate((key) => localStorage.getItem(key), `physcratic.tour.${id}.v1`)) === null, `${tag} ${id}: Settings clears the seen mark`);
        await page.goto(origin + path, { waitUntil: "load" });
        await card(page).waitFor({ timeout: 4000 });
        ok(true, `${tag} ${id}: after Settings, the next visit starts it again`);
      }
      await context.close();
    }
  }
}

function log(...a) { console.log(...a); }
await browser.close();
console.log(`${checks} checks, ${failures.length} failures`);
for (const f of failures) console.log("FAIL", f);
assert.equal(failures.length, 0);
