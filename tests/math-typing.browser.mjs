// Typing shortcuts in an answer field: sin, cos, tan, ln, log, theta and \theta become maths, on desktop and in iPhone and
// Pixel emulation, with hardware keys (keydown) and with a phone keyboard (text without key presses). Also \ commands
// finishing on Space, Enter and Tab. Run against a local production build with no database:
//   BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 node tests/math-typing.browser.mjs
// AUTHORING_BROWSER_TOOLS and CHROMIUM_PATH work as in the other browser tests. Not run by CI.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json")) : createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const origin = process.env.BROWSER_TEST_ORIGIN || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
let checks = 0;
const failures = [];
const ok = (condition, message) => { checks++; if (!condition) failures.push(message); };

const profiles = {
  desktop: { viewport: { width: 1440, height: 900 } },
  "iPhone 13": (({ defaultBrowserType, ...p }) => p)(devices["iPhone 13"]),
  "Pixel 7": (({ defaultBrowserType, ...p }) => p)(devices["Pixel 7"]),
};
// What each typed text becomes. A trailing space finishes a LaTeX command.
const cases = [
  ["sin", "\\sin"], ["cos", "\\cos"], ["tan", "\\tan"], ["ln", "\\ln"], ["log", "\\log"], ["log10", "\\log_{10}"], ["theta", "\\theta"], ["pi", "\\pi"],
  ["sqrt", "\\sqrt"], ["infinity", "\\infty"], ["omega", "\\omega"], ["Delta", "\\Delta"], ["arcsin", "\\arcsin"], ["sinh", "\\sinh"],
  ["\\theta ", "\\theta"], ["\\omega ", "\\omega"], ["\\frac ", "\\frac"], ["\\sqrt ", "\\sqrt"],
];

async function openField(name) {
  const context = await browser.newContext(profiles[name]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${origin}/dashboard/problems/arena-a-grin-and-a-wiggle`);
  const field = page.locator("#step-answer math-field").first();
  await field.waitFor({ timeout: 30000 });
  await field.scrollIntoViewIfNeeded();
  await (name === "desktop" ? field.click() : field.tap());
  await page.waitForTimeout(700);
  return { context, page, field, errors };
}

for (const name of Object.keys(profiles)) {
  for (const way of ["keys", "phone keyboard"]) {
    for (const [typed, expected] of cases) {
      const { context, page, field, errors } = await openField(name);
      if (way === "keys") await page.keyboard.type(typed, { delay: 35 });
      else for (const ch of typed) { await page.keyboard.insertText(ch); await page.waitForTimeout(35); }
      const value = (await field.evaluate((el) => el.value)).replace(/\\left|\\right/g, "");
      ok(value.startsWith(expected), `${name}, ${way}: ${JSON.stringify(typed)} became ${value}, expected ${expected}`);
      ok(errors.length === 0, `${name}, ${way}: page errors ${errors}`);
      await context.close();
    }
  }
}

// Click and type at once: MathLive focuses its keyboard sink 60 ms after a click, so the first key used to be lost.
// The click puts the cursor in the field now, so every key counts. Hardware keys and phone keyboard text both.
for (const name of Object.keys(profiles)) {
  for (const way of ["keys", "phone keyboard"]) {
    for (const [typed, expected] of [["sin", "\\sin"], ["theta", "\\theta"], ["\\theta ", "\\theta"], ["kz", "kz"], ["ln", "\\ln"]]) {
      const context = await browser.newContext(profiles[name]);
      const page = await context.newPage();
      await page.goto(`${origin}/dashboard/problems/arena-a-grin-and-a-wiggle`);
      const field = page.locator("#step-answer math-field").first();
      await field.waitFor({ timeout: 30000 });
      await field.scrollIntoViewIfNeeded();
      await (name === "desktop" ? field.click() : field.tap());
      // No wait. The first key goes in straight after the click.
      if (way === "keys") await page.keyboard.type(typed);
      else for (const ch of typed) await page.keyboard.insertText(ch);
      const value = (await field.evaluate((el) => el.value)).replace(/\\left|\\right/g, "");
      ok(value.startsWith(expected), `${name}, ${way}, typed at once: ${JSON.stringify(typed)} became ${value}, expected ${expected}`);
      await context.close();
    }
  }
}

// \theta finishes on Enter and on Tab as well, and Enter does not send the form.
for (const name of Object.keys(profiles)) {
  for (const key of ["Enter", "Tab"]) {
    const { context, page, field } = await openField(name);
    await page.keyboard.type("\\omega", { delay: 35 });
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
    const value = await field.evaluate((el) => el.value);
    ok(value === "\\omega", `${name}: \\omega then ${key} became ${value}`);
    ok(await page.getByRole("button", { name: "Check answer" }).isVisible(), `${name}: ${key} did not send the form`);
    await context.close();
  }
}

// A symbol typed with a number stays a symbol: kz is two letters, not a function.
{
  const { context, page, field } = await openField("desktop");
  await page.keyboard.type("kz+sin(z)", { delay: 35 });
  const value = (await field.evaluate((el) => el.value)).replace(/\\left|\\right/g, "");
  ok(value === "kz+\\sin(z)", `a mix of symbols and a function: ${value}`);
  await context.close();
}

await browser.close();
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`math-typing: ${checks} checks passed`);
