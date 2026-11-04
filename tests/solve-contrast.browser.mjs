// Contrast check for the solving screens in both themes at 375 and 1440. Run against a local build with no database:
//   BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 node tests/solve-contrast.browser.mjs
// Text must reach 4.5:1 (3:1 for large text), inputs, cards and disclosure boxes need a 3:1 border. Disabled controls
// are exempt (WCAG 1.4.3). Only /api/dashboard and a signed-out /api/auth/get-session are mocked, for Contests.
// Fixtures: tests/fixtures/first-time-user.json. Not run by CI.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const require = process.env.AUTHORING_BROWSER_TOOLS
  ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"))
  : createRequire(import.meta.url);
const { chromium } = require("playwright");
const fixtures = JSON.parse(readFileSync(new URL("./fixtures/first-time-user.json", import.meta.url), "utf8"));
const origin = process.env.BROWSER_TEST_ORIGIN || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });

/** Runs in the page. Returns the lowest text ratio, the lowest border ratio and every failure. */
function measure() {
  const parse = (value) => { const m = value.match(/[\d.]+/g); return m ? { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] } : { r: 0, g: 0, b: 0, a: 0 }; };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const backdrop = (element) => {
    const chain = [];
    for (let node = element; node; node = node.parentElement) chain.push(node);
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (const node of chain.reverse()) { const bg = parse(getComputedStyle(node).backgroundColor); if (bg.a > 0) base = over(bg, base); }
    return base;
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0; };
  const disabled = (el) => el.closest(":disabled, [aria-disabled='true'], fieldset:disabled") !== null;
  const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(/\s+/).slice(0, 3).join(".") : ""}`;
  let minText = 99, minBorder = 99; const fails = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim(); const el = node.parentElement;
    if (!text || !el || el.closest("script,style,noscript,.katex-mathml,[aria-hidden='true'] svg") || !visible(el) || disabled(el)) continue;
    const style = getComputedStyle(el); const size = parseFloat(style.fontSize); const bold = Number(style.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const fg = over(parse(style.color), backdrop(el)); const value = ratio(fg, backdrop(el));
    minText = Math.min(minText, need === 3 ? Math.max(value, 4.5) : value);
    if (value < need) fails.push({ kind: "text", ratio: +value.toFixed(2), need, el: label(el), text: text.slice(0, 40) });
  }
  for (const el of document.querySelectorAll("input:not([type=hidden]),textarea")) {
    if (!visible(el) || disabled(el) || !el.placeholder) continue;
    const color = parse(getComputedStyle(el, "::placeholder").color); const value = ratio(over(color, backdrop(el)), backdrop(el));
    minText = Math.min(minText, value);
    if (value < 4.5) fails.push({ kind: "placeholder", ratio: +value.toFixed(2), need: 4.5, el: label(el), text: el.placeholder.slice(0, 40) });
  }
  const boxes = "input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select,[role=combobox],details,[data-problem-card],.bg-card.border,.rounded-xl.border,.rounded-lg.border,button.rounded-full.border";
  for (const el of document.querySelectorAll(boxes)) {
    // Tinted and outlined text badges are labels, so the text carries the meaning. Not counted as borders.
    if (!visible(el) || disabled(el) || (el.tagName === "DIV" && el.classList.contains("inline-flex"))) continue;
    const style = getComputedStyle(el); if (parseFloat(style.borderTopWidth) < 1 || style.borderTopStyle === "none") continue;
    const parent = backdrop(el.parentElement ?? el); const border = over(parse(style.borderTopColor), parent);
    const value = ratio(border, parent); minBorder = Math.min(minBorder, value);
    if (value < 3) fails.push({ kind: "border", ratio: +value.toFixed(2), need: 3, el: label(el), text: "" });
  }
  return { minText, minBorder, fails };
}

const stages = [
  ["library", async (page) => { await page.goto(origin + fixtures.library.path); await page.getByRole("group", { name: "Topic" }).waitFor(); await page.getByRole("button", { name: fixtures.library.topic, exact: true }).click(); await page.locator("[data-problem-card]").first().waitFor({ timeout: 20000 }); }],
  ["practice, start", async (page) => { await page.goto(`${origin}/dashboard/problems/${fixtures.practice.id}`); await page.getByRole("list", { name: "Steps" }).waitFor(); }],
  ["practice, wrong answer and hint", async (page) => { await page.goto(`${origin}/dashboard/problems/${fixtures.practice.id}`); await page.getByRole("textbox", { name: /Final answer/ }).fill(fixtures.practice.wrongAnswer); await page.getByRole("button", { name: "Check answer" }).click(); await page.getByText("Not correct yet").waitFor(); await page.getByRole("button", { name: "See hint" }).click(); await page.locator("#problem-hint").waitFor(); }],
  ["practice, correct and solution", async (page) => { await page.goto(`${origin}/dashboard/problems/${fixtures.practice.id}`); await page.getByRole("textbox", { name: /Final answer/ }).fill(fixtures.practice.rightAnswer); await page.getByRole("button", { name: "Check answer" }).click(); await page.locator("#worked-solution").waitFor(); }],
  ["arena statement and wrong answer", async (page) => { await page.goto(`${origin}/dashboard/problems/${fixtures.arena.id}`); await page.getByRole("button", { name: "Check answer" }).waitFor(); await page.locator("#step-answer input").first().fill(fixtures.arena.wrongAnswer); await page.getByRole("button", { name: "Check answer" }).click(); await page.getByText(/to revisit|Not correct/).first().waitFor(); }],
  ["arena worked solution", async (page) => { await page.goto(`${origin}/dashboard/problems/${fixtures.arena.id}`); await page.getByRole("tab", { name: "Worked solution", exact: true }).click(); await page.getByText("Contains spoilers", { exact: false }).waitFor(); }],
  ["archive reader", async (page) => { await page.goto(`${origin}/dashboard/problems/${fixtures.archive.id}`); await page.getByRole("tablist", { name: "Problem steps" }).waitFor({ timeout: 30000 }); }],
  ["guided reader", async (page) => { await page.goto(origin + "/dashboard?view=problems&collection=pilot"); await page.getByRole("button", { name: /^Exercise:/ }).first().click(); await page.getByRole("heading", { name: "Step 1: Read the problem" }).waitFor(); }],
  ["contests", async (page) => {
    const contest = (id, name, offset, ids) => ({ id, name, description: `${name} description.`, startsAt: new Date(Date.now() + offset).toISOString(), durationMinutes: 120, rated: false, registrationOpen: true, problemIds: ids, creators: ["Physcratic"], participants: 12, registered: false });
    await page.route("**/api/auth/get-session*", (route) => route.fulfill({ json: null }));
    await page.route("**/api/dashboard", (route) => route.fulfill({ json: { user: null, savedAttempts: 0, practiceAttempts: 0, solvedProblems: 0, archiveReviewed: 0, ratings: [], contests: [contest("c-up", "Autumn contest", 3 * 86_400_000, []), contest("c-past", "Spring contest", -30 * 86_400_000, [fixtures.practice.id])] } }));
    await page.goto(`${origin}/dashboard?view=contests`); await page.getByRole("heading", { name: "Spring contest" }).waitFor();
  }],
];

let lowestText = 99, lowestBorder = 99, failures = 0;
const perTheme = { light: { text: 99, border: 99 }, dark: { text: 99, border: 99 } };
try {
  for (const theme of ["light", "dark"]) for (const width of fixtures.widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript((value) => { try { localStorage.setItem("theme", value); } catch {} }, theme);
    for (const [name, run] of stages) {
      const page = await context.newPage();
      await run(page);
      await page.waitForTimeout(400);
      const result = await page.evaluate(measure);
      lowestText = Math.min(lowestText, result.minText); lowestBorder = Math.min(lowestBorder, result.minBorder);
      perTheme[theme].text = Math.min(perTheme[theme].text, result.minText); perTheme[theme].border = Math.min(perTheme[theme].border, result.minBorder);
      for (const fail of result.fails) { failures++; console.log(`FAIL ${theme} ${width} ${name}: ${fail.kind} ${fail.ratio}:1 (needs ${fail.need}) ${fail.el} "${fail.text}"`); }
      await page.close();
    }
    await context.close();
  }
  for (const theme of ["light", "dark"]) console.log(`${theme}: lowest text ${perTheme[theme].text.toFixed(2)}:1, lowest border ${perTheme[theme].border.toFixed(2)}:1`);
  console.log(`contrast: lowest text ${lowestText.toFixed(2)}:1, lowest border ${lowestBorder.toFixed(2)}:1, ${failures} failures`);
  assert.equal(failures, 0);
} finally { await browser.close(); }
