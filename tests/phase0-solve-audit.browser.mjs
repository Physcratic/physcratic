// Phase 0 baseline: every visible element, in order, on the four solving screens at 375 and 1440, and the clicks and
// keystrokes to read, answer, check and see the solution. Read only. Run against a local production build with no database:
//   BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 OUT=/some/dir node tests/phase0-solve-audit.browser.mjs
// The authored screen needs the throwaway PostgreSQL and is measured by tests/phase0-authoring.browser.mjs.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const origin = process.env.BROWSER_TEST_ORIGIN || "http://127.0.0.1:3100";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const out = process.env.OUT || "phase0-out";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });

/** Runs in the page. Visible elements in document order, with runs of text and equations merged. */
function inventory() {
  const rows = [];
  const closedDetails = (el) => { const d = el.parentElement?.closest("details:not([open])"); return Boolean(d) && !(el.tagName === "SUMMARY" && el.parentElement === d); };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0" && !closedDetails(el); };
  const label = (el) => (el.getAttribute("aria-label") || el.labels?.[0]?.innerText || (el.getAttribute("aria-labelledby") && document.getElementById(el.getAttribute("aria-labelledby"))?.innerText) || el.innerText || el.getAttribute("placeholder") || el.getAttribute("alt") || el.id || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const size = (el) => { const r = el.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; };
  let run = null;
  const flush = () => { if (run) { rows.push(`text    ${run.paras} text blocks, ${run.math} equations, ${run.chars} characters, starts "${run.start}"`); run = null; } };
  const interactive = "a[href],button,input,textarea,select,summary,math-field,[role=tab],[role=button],[role=switch]";
  const walk = (node) => {
    for (const el of node.children) {
      if (!visible(el) && el.tagName !== "INPUT") continue;
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "NOSCRIPT" || el.closest(".katex-mathml")) continue;
      if (/^H[1-6]$/.test(el.tagName)) { flush(); rows.push(`${el.tagName.toLowerCase().padEnd(7)} ${label(el)}`); continue; }
      if (el.matches(interactive)) {
        if (!visible(el)) continue;
        flush();
        const type = el.tagName === "MATH-FIELD" ? "input:math" : el.tagName === "INPUT" ? `input:${el.type}` : el.getAttribute("role") === "tab" ? "tab" : el.tagName.toLowerCase();
        rows.push(`${type.padEnd(7)} ${label(el)} [${size(el)}]${el.disabled ? " (disabled)" : ""}`);
        continue;
      }
      if (el.tagName === "IMG" || el.tagName === "SVG" && el.getAttribute("role") === "img") { flush(); rows.push(`image   ${label(el)} [${size(el)}]`); continue; }
      if (el.matches("p,li,blockquote,pre,.katex-display,figcaption,code,dd,dt,label") && !el.querySelector(interactive)) {
        const text = el.innerText.replace(/\s+/g, " ").trim();
        if (!text && !el.querySelector(".katex")) continue;
        run ??= { paras: 0, math: 0, chars: 0, start: text.slice(0, 40) };
        run.paras++; run.chars += text.length; run.math += el.querySelectorAll(".katex-display, .katex").length;
        continue;
      }
      walk(el);
    }
  };
  walk(document.body);
  flush();
  return rows;
}

const screens = [
  { id: "practice", name: "Practice problem (incline)", open: async (page) => { await page.goto(`${origin}/dashboard/problems/incline`); await page.getByRole("heading", { level: 1 }).waitFor(); } },
  { id: "arena", name: "Arena problem (arena-a-grin-and-a-wiggle)", open: async (page) => { await page.goto(`${origin}/dashboard/problems/arena-a-grin-and-a-wiggle`); await page.getByRole("heading", { level: 1 }).waitFor(); await page.getByRole("button", { name: "Check answer" }).waitFor(); } },
  { id: "guided", name: "Olympiad archive Guided reader (pilot collection, first problem)", open: async (page) => { await page.goto(`${origin}/dashboard?view=problems&collection=pilot`); await page.getByRole("button", { name: /^Open problem:/ }).first().click(); await page.getByRole("heading", { name: "Step 1: Read the problem" }).waitFor(); } },
];

const report = [];
for (const width of [375, 1440]) for (const screen of screens) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch {} });
  const page = await context.newPage();
  await screen.open(page);
  await page.waitForTimeout(screen.id === "guided" ? 600 : 3000);
  const rows = await page.evaluate(inventory);
  const pageHeight = await page.evaluate(() => Math.round(document.documentElement.scrollHeight));
  const firstView = await page.evaluate(() => [...document.querySelectorAll("h1,button,a[href],input,textarea,summary,[role=tab]")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight; }).length);
  // Flow: count clicks and keystrokes. Read costs nothing when the statement is on screen at load.
  const counts = { read: { clicks: 0, keys: 0 }, answer: { clicks: 0, keys: 0 }, check: { clicks: 0, keys: 0 }, solution: { clicks: 0, keys: 0 }, notes: [] };
  const statementVisible = await page.evaluate(() => document.body.innerText.length > 400);
  counts.read.notes = statementVisible ? "statement is on the page at load" : "statement is not on the page at load";
  // The answer box is a MathLive field once it has loaded (Phase 2 and later), and a plain text box before that.
  const mathField = page.locator("#step-answer math-field").first();
  const useMath = screen.id !== "guided" && (await mathField.count()) > 0;
  const answerBox = screen.id === "guided" ? page.getByLabel("Your working", { exact: true }) : useMath ? mathField : page.locator("#step-answer input[type=text], #step-answer input:not([type])").first();
  // Keyboard-only path: Tab presses from the top of the page to the answer box (Guided reader: the working box).
  {
    const handle = (await answerBox.count()) ? await answerBox.elementHandle() : null;
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    let tabs = 0;
    if (handle) for (; tabs < 120; tabs++) {
      if (await page.evaluate((el) => document.activeElement === el, handle)) break;
      await page.keyboard.press("Tab");
    }
    counts.tabsToAnswer = tabs >= 120 ? ">120" : tabs;
  }
  const wrong = "1";
  if ((await answerBox.count()) && !useMath && (await answerBox.isDisabled())) counts.notes.push("the answer box is disabled when signed out");
  else if (await answerBox.count()) {
    await answerBox.click(); counts.answer.clicks++;
    if (useMath) { await page.waitForTimeout(500); await page.keyboard.type(wrong); } else { await answerBox.fill(""); await answerBox.pressSequentially(wrong); }
    counts.answer.keys += wrong.length;
    const check = page.getByRole("button", { name: "Check answer" }).first();
    if (screen.id === "guided") counts.notes.push("self-review only: no Check button");
    else if (await check.count()) { await check.click(); counts.check.clicks++; await page.locator('#step-answer [aria-live="polite"]').getByText(/Not correct|to revisit|Could not|Correct/).first().waitFor({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(300); }
    else counts.notes.push("no Check answer button");
  } else counts.notes.push(screen.id === "guided" ? "no working box for a signed-out visitor" : "no text answer box on the screen");
  const feedback = await page.locator('#step-answer [aria-live="polite"]').allInnerTexts();
  counts.feedback = feedback.join(" | ").replace(/\s+/g, " ").slice(0, 140);
  // Solution: the control that reveals it, if any.
  const reveal = screen.id === "guided" ? page.locator("summary", { hasText: "Reveal official solution" }).first() : page.getByRole("tab", { name: /Worked solution/ }).or(page.getByRole("button", { name: /Show solution|Show worked solution|Worked solution/ })).first();
  if (await reveal.count()) { counts.solution.control = (await reveal.innerText()).trim(); await reveal.click(); counts.solution.clicks++; } else counts.notes.push("no solution control found");
  report.push({ screen: screen.name, width, elements: rows.length, interactive: rows.filter((r) => /^(a|button|tab|input|textarea|select|summary)/.test(r)).length, pageHeight, interactiveInFirstView: firstView, counts, rows });
  await context.close();
}
await browser.close();
writeFileSync(join(out, "solve-audit.json"), JSON.stringify(report, null, 1));
for (const r of report) {
  console.log(`\n=== ${r.screen} at ${r.width}: ${r.elements} listed items, ${r.interactive} controls, page ${r.pageHeight}px tall, ${r.interactiveInFirstView} controls in first screenful`);
  console.log(`    read: ${JSON.stringify(r.counts.read)}  answer: ${JSON.stringify(r.counts.answer)}  check: ${JSON.stringify(r.counts.check)}  solution: ${JSON.stringify(r.counts.solution)}  notes: ${JSON.stringify(r.counts.notes)}`);
  console.log(`    feedback: ${r.counts.feedback}  tabs to answer box: ${r.counts.tabsToAnswer}`);
}
console.log(`\nfull lists written to ${join(out, "solve-audit.json")}`);
