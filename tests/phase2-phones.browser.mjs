// Phase 2: phone emulation of the maths answer field. Playwright's iPhone and Pixel profiles (touch, small screen,
// mobile user agent) in Chromium. Checks that a tap focuses the field, typing works, MathLive's own keyboard stays
// closed, and the palette inserts at the cursor without taking focus away. This is emulation. A real phone still
// needs checking, because Chromium's emulation does not open a phone's own keyboard.
//   BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 SHOT_DIR=/some/dir node tests/phase2-phones.browser.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const require = process.env.AUTHORING_BROWSER_TOOLS
  ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"))
  : createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const origin = process.env.BROWSER_TEST_ORIGIN || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const shotDir = process.env.SHOT_DIR;
if (shotDir) mkdirSync(shotDir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };

try {
  for (const name of ["iPhone 13", "Pixel 7"]) {
    const { defaultBrowserType, ...profile } = devices[name];
    const context = await browser.newContext(profile);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/dashboard/problems/arena-a-grin-and-a-wiggle`);
    const field = page.locator("math-field").first();
    await field.waitFor({ timeout: 30000 });
    const value = () => field.evaluate((el) => el.value);
    const focused = () => page.evaluate(() => document.activeElement?.tagName === "MATH-FIELD");

    // A tap focuses the field and the palette opens under it.
    await field.scrollIntoViewIfNeeded();
    await field.tap();
    await page.waitForTimeout(600);
    ok(await focused(), `${name}: tapping the field focuses it`);
    const fieldId = await field.getAttribute("id");
    const palette = page.locator(`[data-field="${fieldId}"] [data-palette]`);
    const pad = page.locator(`[data-field="${fieldId}"] [data-math-pad]`);
    ok(await pad.isVisible(), `${name}: the pad opens under the field`);
    ok(await pad.getByRole("tab").count() >= 4 && await pad.getByRole("tab").first().innerText() === "Problem", `${name}: the pad has tabs, Problem first`);
    // The phone's own keyboard: the sink MathLive types into must allow it, with the typing helpers off.
    const sink = await field.evaluate((el) => { const s = el.shadowRoot.querySelector(".ML__keyboard-sink"); return Object.fromEntries(["inputmode", "autocapitalize", "autocorrect", "autocomplete", "spellcheck"].map((a) => [a, s.getAttribute(a)])); });
    assert.deepEqual(sink, { inputmode: "text", autocapitalize: "off", autocorrect: "off", autocomplete: "off", spellcheck: "false" }); checks++;
    ok(await page.evaluate(() => !(window.mathVirtualKeyboard && window.mathVirtualKeyboard.visible)), `${name}: MathLive's own keyboard is not opened`);
    ok(await page.locator(".ML__keyboard:visible, .MLK__plate:visible").count() === 0, `${name}: no MathLive keyboard is on screen`);

    // Typing works.
    await page.keyboard.type("kz", { delay: 40 });
    assert.equal(await value(), "kz"); checks++;

    // Every button is at least 44px square, and the row can be reached by touch.
    await pad.getByRole("tab", { name: "Greek" }).tap();
    ok(await pad.getByRole("button", { name: "Show more" }).isVisible(), `${name}: Greek has Show more for capitals`);
    await pad.getByRole("tab", { name: "Problem" }).tap();
    const boxes = await pad.locator("button").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    ok(boxes.every(([w, h]) => w >= 44 && h >= 44), `${name}: every palette button is at least 44px (${JSON.stringify(boxes.filter(([w, h]) => w < 44 || h < 44))})`);

    // The palette inserts at the cursor: put the cursor between k and z, then tap a symbol.
    await page.keyboard.press("ArrowLeft");
    await palette.filter({ hasText: "θ₀" }).first().tap();
    const inserted = await value();
    ok(/^k\\theta_\{?0\}?z$/.test(inserted), `${name}: the symbol went in at the cursor: ${inserted}`);
    ok(await focused(), `${name}: tapping the palette keeps the cursor in the field`);

    // Structure buttons: a fraction with the typed text, then fill the box.
    await pad.getByRole("tab", { name: "Operations" }).tap();
    await pad.locator("button[aria-label='a/b fraction']").tap();
    ok(/\\frac/.test(await value()), `${name}: the fraction button inserts a fraction`);
    // A phone keyboard is simulated by a visualViewport 300px shorter than the window. The pad docks above it and the field stays clear.
    await page.evaluate(() => {
      const target = new EventTarget();
      const fake = Object.assign(target, { height: window.innerHeight - 300, offsetTop: 0, width: window.innerWidth });
      Object.defineProperty(window, "visualViewport", { configurable: true, get: () => fake });
      window.__fakeViewport = fake;
      fake.dispatchEvent(new Event("resize"));
    });
    // The hook reads window.visualViewport when the field gets focus, so focus it again.
    await page.evaluate(() => document.activeElement?.blur());
    await field.tap();
    await page.locator(`[data-field="${fieldId}"] [data-docked]`).waitFor({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    const dock = await page.evaluate((id) => {
      const wrap = document.querySelector(`[data-field="${id}"]`);
      const box = wrap.querySelector("[data-docked]");
      const f = wrap.querySelector("math-field").getBoundingClientRect();
      const p = box?.getBoundingClientRect();
      return { docked: !!box, padTop: p?.top, padBottom: p?.bottom, fieldBottom: f.bottom, fieldTop: f.top, keyboardTop: window.visualViewport.height };
    }, fieldId);
    ok(dock.docked && Math.abs(dock.padBottom - dock.keyboardTop) <= 2, `${name}: the pad sits right above the keyboard (${JSON.stringify(dock)})`);
    ok(dock.fieldBottom <= dock.padTop && dock.fieldTop >= 0, `${name}: the pad never covers the field (${JSON.stringify(dock)})`);
    await page.evaluate(() => { window.__fakeViewport.height = window.innerHeight; window.__fakeViewport.dispatchEvent(new Event("resize")); });
    await page.waitForTimeout(300);
    ok(await page.locator(`[data-field="${fieldId}"] [data-docked]`).count() === 0, `${name}: with the keyboard closed the pad is back under the field`);
    if (shotDir) await page.screenshot({ path: join(shotDir, `phone-${name.replace(/ /g, "-")}-field.png`) });
    // The three-line menu button stays on top of the header and clickable after scrolling down and back up, and the menu opens above everything.
    await page.goto(`${origin}/dashboard`);
    const menuButton = page.getByRole("button", { name: "Open navigation" });
    await menuButton.waitFor({ timeout: 30000 });
    const onTop = () => menuButton.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && (top === el || el.contains(top)); });
    ok(await onTop(), `${name}: the menu button is on top of the header at the top of the page`);
    for (const y of [900, 2400, 0, 600, 0]) {
      await page.evaluate((to) => { document.querySelector("main")?.scrollTo?.(0, to); window.scrollTo(0, to); }, y);
      await page.waitForTimeout(150);
      ok(await onTop(), `${name}: the menu button is on top after scrolling to ${y}`);
    }
    await menuButton.tap();
    const menu = page.getByRole("dialog");
    await menu.waitFor({ timeout: 5000 });
    await page.waitForTimeout(700); // the menu slides in
    const menuOnTop = await menu.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + 40); return !!top && el.contains(top); });
    ok(menuOnTop, `${name}: the menu opens above the header and the page`);
    assert.deepEqual(errors, []); checks++;
    await context.close();
  }
  console.log(`phase2-phones: ${checks} checks passed`);
} finally {
  await browser.close();
}
