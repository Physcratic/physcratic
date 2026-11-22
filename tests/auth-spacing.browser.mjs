// The sign-up and sign-in forms in real Chromium: every gap is on the 4, 8, 16, 24, 32 scale, the Terms checkbox lines up with
// its first line of text, the label is a 44px target, inputs are 16px, and the username hint fits one line from 520px wide.
// No database or API. Run: AUTHORING_BROWSER_TOOLS=/path node --import tsx tests/auth-spacing.browser.mjs   (CHROMIUM_PATH optional)
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdtemp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
const require = createRequire(import.meta.url);
const tools = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json")) : require;
const { chromium } = tools("playwright");
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const temp = await mkdtemp(join(tmpdir(), "physcratic-auth-spacing-"));
await build({ entryPoints: ["tests/auth-spacing-harness.tsx"], outfile: join(temp, "bundle.js"), bundle: true, platform: "browser", jsx: "automatic", alias: { "@": process.cwd() }, define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" }, logLevel: "silent" });
execFileSync("node_modules/.bin/tailwindcss", ["-i", "app/globals.css", "-o", join(temp, "style.css")], { stdio: "pipe" });
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  if (path === "/bundle.js" || path === "/style.css") { res.setHeader("Content-Type", path.endsWith("js") ? "application/javascript" : "text/css"); return res.end(await readFile(join(temp, basename(path)))); }
  if (path.startsWith("/api/")) { res.setHeader("Content-Type", "application/json"); return res.end("null"); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Auth spacing</title><style>:root{--font-plex-sans:Arial,sans-serif}body{font-family:Arial,sans-serif}</style><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), headless: true, args: ["--no-sandbox"] });

/** Every number comes from getBoundingClientRect. A label's text box is its content box, so padding is not counted as text. */
function measure() {
  const rect = (el) => el.getBoundingClientRect();
  const form = document.getElementById("account-form");
  const out = { fields: [], terms: null, viewport: innerWidth };
  let previousBottom = null;
  for (const field of form.querySelectorAll('[data-slot="field"]')) {
    if (field.getAttribute("data-orientation") === "horizontal") {
      const checkbox = field.querySelector('[role="checkbox"]'), label = field.querySelector("label"), description = field.querySelector('[data-slot="field-description"]');
      const style = getComputedStyle(label), padTop = parseFloat(style.paddingTop), padBottom = parseFloat(style.paddingBottom);
      const contentTop = rect(label).top + padTop, contentBottom = rect(label).bottom - padBottom, line = parseFloat(style.lineHeight);
      const button = document.querySelector('button[type="submit"]');
      out.terms = {
        aboveVisible: Math.min(contentTop, rect(checkbox).top) - previousBottom,
        checkboxMinusFirstLine: rect(checkbox).top + rect(checkbox).height / 2 - (contentTop + line / 2),
        labelToDescription: rect(description).top - contentBottom,
        belowToButton: rect(button).top - rect(field).bottom,
        labelBox: { w: rect(label).width, h: rect(label).height },
        checkbox: { w: rect(checkbox).width, h: rect(checkbox).height, radius: getComputedStyle(checkbox).borderRadius },
      };
      continue;
    }
    const label = field.querySelector("label"), input = field.querySelector("input"), hint = field.querySelector("p");
    const row = { name: label.textContent.trim(), labelToInput: rect(input).top - rect(label).bottom, inputH: rect(input).height, inputFont: parseFloat(getComputedStyle(input).fontSize), gapFromPrevious: previousBottom === null ? null : rect(label).top - previousBottom };
    if (hint) {
      const range = document.createRange(); range.selectNodeContents(hint);
      row.inputToHint = rect(hint).top - rect(input).bottom; row.hintFont = parseFloat(getComputedStyle(hint).fontSize);
      row.hintLines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
    }
    out.fields.push(row);
    previousBottom = rect(field).bottom;
  }
  out.cardWidth = rect(form.closest("div.rounded-lg")).width;
  return out;
}
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= 1, `${label}: ${actual} is not ${expected} within 1px`);
const rows = [];
async function at(path, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + path);
  await page.locator("form#account-form").waitFor();
  await page.waitForTimeout(200);
  const m = await page.evaluate(measure);
  assert.deepEqual(errors, []);
  await context.close();
  return m;
}
try {
  const cards = {};
  for (const path of ["/sign-up", "/sign-up-plain", "/sign-in"]) for (const width of [390, 1280]) {
    const tag = `${path} at ${width}`;
    const m = await at(path, width);
    cards[`${path}@${width}`] = m.cardWidth;
    m.fields.forEach((f, i) => {
      near(f.labelToInput, 8, `${tag}: ${f.name} label to input`);
      assert.equal(f.inputFont, 16, `${tag}: ${f.name} input text is 16px`);
      assert.ok(f.inputH >= 44, `${tag}: ${f.name} input is 44px high`);
      if (f.inputToHint !== undefined) { near(f.inputToHint, 4, `${tag}: ${f.name} input to hint`); assert.ok(f.hintFont >= 12, `${tag}: hint is at least 12px`); }
      if (i > 0) near(f.gapFromPrevious, 24, `${tag}: ${f.name} field to field`);
    });
    if (m.terms) {
      near(m.terms.aboveVisible, 24, `${tag}: field above to the Terms row`);
      near(m.terms.checkboxMinusFirstLine, 0, `${tag}: checkbox centre against the first line of text`);
      near(m.terms.labelToDescription, 4, `${tag}: Terms label to its description`);
      near(m.terms.belowToButton, 24, `${tag}: Terms row to the button`);
      assert.ok(m.terms.labelBox.h >= 43.5 && m.terms.labelBox.w >= 43.5, `${tag}: the Terms label is a 44px target`);
    }
    rows.push(`${tag}: ${m.fields.map((f) => `${f.name} ${f.labelToInput}/${f.inputToHint ?? "-"}/${f.gapFromPrevious ?? "-"}`).join(", ")}${m.terms ? `, Terms above ${m.terms.aboveVisible} centre ${m.terms.checkboxMinusFirstLine} desc ${m.terms.labelToDescription} below ${m.terms.belowToButton}, checkbox ${m.terms.checkbox.w}x${m.terms.checkbox.h} radius ${m.terms.checkbox.radius}` : ""}, card ${m.cardWidth}`);
  }
  // Sign-in and sign-up share one card width.
  assert.equal(cards["/sign-in@1280"], cards["/sign-up@1280"]);
  assert.equal(cards["/sign-in@390"], cards["/sign-up@390"]);
  // The username hint is one line from 520px wide, and wraps without overflow below that.
  for (const width of [520, 600, 1280]) assert.equal((await at("/sign-up", width)).fields[0].hintLines, 1, `username hint on one line at ${width}`);
  const narrow = await at("/sign-up", 390);
  assert.equal(narrow.fields[0].hintLines, 2);
  console.log(rows.join("\n"));
  console.log("PASS auth spacing: label 8, input to hint 4, field to field 24, Terms row 24 above and below, checkbox on the first line, 44px label, 16px inputs, hint on one line from 520px.");
} finally {
  await browser.close();
  server.close();
}
