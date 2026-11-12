// Typing shortcuts in an answer field: sin, cos, tan, ln, log, theta and \theta become maths, on desktop and in iPhone and
// Pixel emulation, with hardware keys (keydown) and with a phone keyboard (text without key presses): one character at a
// time, an IME composition that ends in the word (Input.imeSetComposition then Input.insertText over CDP, as Android
// keyboards do), and a whole word or word and space at once (autocomplete). Also \ commands
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
  for (const way of ["keys", "phone keyboard", "composition", "whole word", "word and space"]) {
    for (const [typed, expected] of cases) {
      const { context, page, field, errors } = await openField(name);
      if (way === "keys") await page.keyboard.type(typed, { delay: 35 });
      else if (way === "phone keyboard") for (const ch of typed) { await page.keyboard.insertText(ch); await page.waitForTimeout(35); }
      else {
        const cdp = await context.newCDPSession(page);
        const word = typed.replace(/ $/, "");
        if (way === "composition") {
          for (let i = 1; i <= word.length; i++) await cdp.send("Input.imeSetComposition", { text: word.slice(0, i), selectionStart: i, selectionEnd: i });
          await cdp.send("Input.insertText", { text: word });
          if (word !== typed) await cdp.send("Input.insertText", { text: " " });
        } else await cdp.send("Input.insertText", { text: way === "whole word" ? typed : `${word} ` });
      }
      await page.waitForTimeout(120);
      // \sqrt and \frac keep their empty slots, which are not typed text.
      const value = (await field.evaluate((el) => el.value)).replace(/\\left|\\right/g, "").replace(/\{(\\placeholder\{\})?\}/g, "");
      // The new ways must give the shortcut and nothing else: the word is never typed twice.
      ok(way === "keys" || way === "phone keyboard" ? value.startsWith(expected) : value === expected, `${name}, ${way}: ${JSON.stringify(typed)} became ${value}, expected ${expected}`);
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

// A bare log is refused with one message that names ln and log10, under the field and after Check.
{
  const { context, page } = await openField("desktop");
  await page.keyboard.type("log(kz)", { delay: 35 });
  const message = "Write ln for the natural log, or log₁₀ for base 10.";
  await page.locator('#step-answer [data-field] [role="status"]').filter({ hasText: message }).first().waitFor({ timeout: 8000 }).then(() => ok(true, ""), () => ok(false, "a bare log shows the ln or log10 hint under the field"));
  await page.getByRole("button", { name: "Check answer" }).click();
  const result = page.locator('[id$="a.trajectory-result"]');
  await result.waitFor({ timeout: 20000 });
  ok((await result.innerText()).includes(message), `a bare log is refused after Check with the ln or log10 message: ${await result.innerText()}`);
  await context.close();
}

// Saved answers: a wrong answer comes back after a reload, a part marked correct does not, and its field starts empty.
for (const name of Object.keys(profiles)) {
  const { context, page, field } = await openField(name);
  for (const key of ["r", "_", "0", "ArrowRight", "cos(kz)", "+", "theta", "_", "0", "ArrowRight", "sin(kz)", "/", "k"]) {
    if (key === "ArrowRight") await page.keyboard.press(key); else await page.keyboard.type(key, { delay: 35 });
  }
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator('[id$="a.trajectory-result"]').waitFor({ timeout: 20000 });
  ok(/^Correct/.test((await page.locator('[id$="a.trajectory-result"]').innerText()).trim()), `${name}: the typed answer is marked correct`);
  const second = page.locator("#step-answer math-field").nth(1);
  await (name === "desktop" ? second.click() : second.tap());
  await page.waitForTimeout(500);
  await page.keyboard.type("k+1", { delay: 35 });
  await page.reload();
  const first = page.locator("#step-answer math-field").first();
  await first.waitFor({ timeout: 30000 });
  ok((await first.evaluate((el) => el.id)).endsWith("a.trajectory") && (await first.evaluate((el) => el.value)) === "", `${name}: the correct part was cleared from the saved answers`);
  // A restored draft opens as a math field too, so its value is read from the field, with plain boxes as a fallback.
  await page.locator("#step-answer math-field").nth(1).waitFor({ timeout: 30000 });
  const restored = await page.locator("#step-answer math-field, #step-answer input[type=text], #step-answer input:not([type])").evaluateAll((els) => els.map((el) => el.value));
  ok(restored.some((value) => value.includes("k+1")), `${name}: the unfinished answer in another part survived the reload (${JSON.stringify(restored)})`);
  ok(await page.locator("#step-answer math-field").count() >= 2, `${name}: the restored part is a math field, not the plain box`);
  await context.close();
}

await browser.close();
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`math-typing: ${checks} checks passed`);
