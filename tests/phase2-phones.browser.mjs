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
    ok(await palette.count() > 20, `${name}: the full palette opens under the field`);
    ok(await page.evaluate(() => !(window.mathVirtualKeyboard && window.mathVirtualKeyboard.visible)), `${name}: MathLive's own keyboard is not opened`);
    ok(await page.locator(".ML__keyboard:visible, .MLK__plate:visible").count() === 0, `${name}: no MathLive keyboard is on screen`);

    // Typing works.
    await page.keyboard.type("kz", { delay: 40 });
    assert.equal(await value(), "kz"); checks++;

    // Every button is at least 44px square, and the row can be reached by touch.
    const boxes = await palette.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    ok(boxes.every(([w, h]) => w >= 44 && h >= 44), `${name}: every palette button is at least 44px (${JSON.stringify(boxes.filter(([w, h]) => w < 44 || h < 44))})`);

    // The palette inserts at the cursor: put the cursor between k and z, then tap a symbol.
    await page.keyboard.press("ArrowLeft");
    await palette.filter({ hasText: "θ₀" }).first().tap();
    const inserted = await value();
    ok(/^k\\theta_\{?0\}?z$/.test(inserted), `${name}: the symbol went in at the cursor: ${inserted}`);
    ok(await focused(), `${name}: tapping the palette keeps the cursor in the field`);

    // Structure buttons: a fraction with the typed text, then fill the box.
    await palette.filter({ has: page.locator("xpath=self::*[@aria-label='a/b fraction']") }).first().tap();
    ok(/\\frac/.test(await value()), `${name}: the fraction button inserts a fraction`);
    if (shotDir) await page.screenshot({ path: join(shotDir, `phone-${name.replace(/ /g, "-")}-field.png`) });
    assert.deepEqual(errors, []); checks++;
    await context.close();
  }
  console.log(`phase2-phones: ${checks} checks passed`);
} finally {
  await browser.close();
}
