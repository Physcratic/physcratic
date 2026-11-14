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

// Conversion that does not depend on key presses. After any input the field looks at what it holds, and plain letters that
// spell a function or Greek name become the command: the text set directly (as a phone keyboard does), one letter at a time,
// a whole word at once (autocomplete, predictive text, dictation) and a real paste. Names that a longer one starts with (sin,
// as sinh may follow) wait a moment. A declared symbol next to a name stays (sinx with x declared). The cursor ends right after.
const grin = "arena-a-grin-and-a-wiggle";
const atom = "arena-an-atom-with-stage-fright";
const convertCases = [
  { text: "sin", problem: grin, expected: "\\sin" },
  { text: "theta", problem: grin, expected: "\\theta" },
  { text: "sinx", problem: atom, field: "d.function", expected: "\\sin x" },
  { text: "sin(kz)", problem: grin, expected: "\\sin(kz)" },
  { text: "sinh", problem: grin, expected: "\\sinh" },
  { text: "cos(theta)", problem: grin, expected: "\\cos(\\theta)" },
];
const stripLeftRight = (value) => value.replace(/\\left|\\right/g, "");
for (const name of Object.keys(profiles)) {
  for (const way of ["set directly", "one letter at a time", "whole word", "paste"]) {
    for (const { text, problem, field: fieldId, expected } of convertCases) {
      const context = await browser.newContext({ ...profiles[name], permissions: ["clipboard-read", "clipboard-write"] });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${origin}/dashboard/problems/${problem}`);
      const field = fieldId ? page.locator(`#step-answer math-field[id$="${fieldId}"]`) : page.locator("#step-answer math-field").first();
      await field.waitFor({ timeout: 30000 });
      await field.scrollIntoViewIfNeeded();
      await (name === "desktop" ? field.click() : field.tap());
      await page.waitForTimeout(700);
      if (way === "set directly") await field.evaluate((el, value) => { el.value = value; el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value })); }, text);
      else if (way === "one letter at a time") for (const ch of text) { await page.keyboard.insertText(ch); await page.waitForTimeout(40); }
      else if (way === "whole word") await (await context.newCDPSession(page)).send("Input.insertText", { text });
      else { await page.evaluate((value) => navigator.clipboard.writeText(value), text); await page.keyboard.press("Control+V"); }
      // A name that a longer one starts with waits a moment, so wait past it.
      await page.waitForTimeout(1000);
      const state = await field.evaluate((el) => ({ value: el.value, position: el.position, last: el.lastOffset }));
      ok(stripLeftRight(state.value) === expected, `${name}, ${way}: ${JSON.stringify(text)} became ${state.value}, expected ${expected}`);
      ok(state.position === state.last, `${name}, ${way}: ${JSON.stringify(text)} leaves the cursor at the end (${state.position} of ${state.last})`);
      ok(errors.length === 0, `${name}, ${way}: ${JSON.stringify(text)} page errors ${errors}`);
      await context.close();
    }
  }
}

// Never twice: more input after a conversion leaves the command alone, and typing on goes after it. sinh typed letter by
// letter is sinh, not sin and h.
for (const name of Object.keys(profiles)) {
  const { context, page, field } = await openField(name);
  await field.evaluate((el) => { el.value = "sin"; el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "n" })); });
  await page.waitForTimeout(1000);
  await field.evaluate((el) => el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: "n" })));
  await page.waitForTimeout(300);
  ok(await field.evaluate((el) => el.value) === "\\sin", `${name}: input again after a conversion leaves \\sin as one command`);
  await page.keyboard.insertText("(");
  await page.keyboard.insertText("k");
  await page.waitForTimeout(300);
  ok(stripLeftRight(await field.evaluate((el) => el.value)).startsWith("\\sin(k"), `${name}: typing on goes after the command`);
  await context.close();
}
for (const name of Object.keys(profiles)) {
  const { context, page, field } = await openField(name);
  for (const ch of "sinh") { await page.keyboard.insertText(ch); await page.waitForTimeout(80); }
  await page.waitForTimeout(1000);
  ok(await field.evaluate((el) => el.value) === "\\sinh", `${name}: sinh typed one letter at a time is one command`);
  await context.close();
}

// A longer word is left alone, and a name inside a longer word is not taken out of it.
for (const word of ["tangent", "using"]) {
  const { context, page, field } = await openField("iPhone 13");
  await field.evaluate((el, value) => { el.value = value; el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value })); }, word);
  await page.waitForTimeout(1000);
  ok(await field.evaluate((el) => el.value) === word, `${word} is left as typed`);
  await context.close();
}

await browser.close();
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`math-typing: ${checks} checks passed`);
