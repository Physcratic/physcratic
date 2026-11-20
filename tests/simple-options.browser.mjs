// Simple More options in real Chromium, against the real SimpleEditor with an in-memory draft (no API, no database).
// Checks the answer box never unmounts while it is typed in or cleared, the hand-graded choice, the default
// tolerances after switching modes, the locked symbol name and 16px text inside More options.
// Run: node --import tsx tests/simple-options.browser.mjs   (CHROMIUM_PATH optional)
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
const require = createRequire(import.meta.url);
const browserTools = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json")) : require;
const { chromium } = browserTools("playwright");
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const temp = await mkdtemp(join(tmpdir(), "physcratic-simple-options-"));
let browser, server;
try {
  await build({
    entryPoints: ["tests/simple-options-harness.tsx"], outfile: join(temp, "bundle.js"), bundle: true, platform: "browser", jsx: "automatic",
    alias: { "@": process.cwd() }, define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" }, logLevel: "silent",
  });
  execFileSync("node_modules/.bin/tailwindcss", ["-i", "app/globals.css", "-o", join(temp, "style.css")], { stdio: "pipe" });
  server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/bundle.js" || path === "/style.css") {
      res.setHeader("Content-Type", path.endsWith("js") ? "application/javascript" : "text/css");
      return res.end(await readFile(join(temp, basename(path))));
    }
    if (path.startsWith("/api/")) { res.writeHead(404); return res.end("{}"); }
    res.setHeader("Content-Type", "text/html");
    res.end('<!doctype html><html lang="en" class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Simple options test</title><style>:root{--font-plex-sans:Arial,sans-serif}body{font-family:Arial,sans-serif}</style><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ["--no-sandbox"] });
  let checks = 0;
  const errors = [];
  async function open(state = "draft") {
    const context = await browser.newContext({ viewport: { width: 1000, height: 1200 } });
    const page = await context.newPage();
    const dialogs = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => { dialogs.push(d.message()); void d.accept(); });
    await page.goto(`${origin}/?state=${state}`);
    await page.locator('math-field[id$="-a"]').waitFor();
    return { context, page, dialogs };
  }
  const key = (page) => page.evaluate(() => window.__draft.privateParts[0].key);
  const boxFocused = (page) => page.evaluate(() => document.activeElement?.tagName === "MATH-FIELD");
  const moreOptions = async (page) => { const s = page.locator('summary[aria-label="More options"]'); if (!(await s.evaluate((el) => el.parentElement.open))) await s.click(); };
  const answerType = (page) => page.getByLabel("Answer type", { exact: true });

  // 1. Clearing the box keeps the box, on a draft and on a published problem, and Publish asks for the answer.
  for (const state of ["draft", "published"]) {
    const { context, page } = await open(state);
    const box = await page.locator('math-field[id$="-a"]').elementHandle();
    await page.locator('math-field[id$="-a"]').click();
    await page.keyboard.type("9.8");
    await page.waitForFunction(() => window.__draft.privateParts[0].key?.kind === "numeric");
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Backspace");
    await page.waitForFunction(() => window.__draft.privateParts[0].key?.kind === "manual");
    assert.equal(await box.evaluate((el) => el.isConnected), true, `${state}: the box stays mounted after it is cleared`);
    assert.equal(await boxFocused(page), true, `${state}: focus stays in the box`);
    await page.getByText("Publish needs a final answer here.").waitFor();
    assert.equal(await page.getByText("Students explain this part and nothing is checked automatically.").count(), 0);
    await page.getByRole("button", { name: /^Publish/ }).last().click();
    await page.getByRole("alert").filter({ hasText: "Add the final answer." }).waitFor();
    // Marking it hand-graded clears the message, and the inverse brings the box back with focus.
    await page.getByRole("button", { name: "Students explain, no automatic check" }).click();
    await page.getByText("Students explain this part and nothing is checked automatically.").waitFor();
    assert.equal(await page.getByRole("alert").filter({ hasText: "Add the final answer." }).count(), 0, `${state}: marked parts publish`);
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Type a final answer instead");
    await page.getByRole("button", { name: "Type a final answer instead" }).click();
    await page.locator('math-field[id$="-a"]').waitFor();
    await page.waitForFunction(() => document.activeElement?.tagName === "MATH-FIELD");
    await page.getByRole("alert").filter({ hasText: "Add the final answer." }).waitFor();
    checks++;
    await context.close();
  }

  // 2. Expression picked in More options: the box keeps the answer while it is typed, with focus.
  {
    const { context, page, dialogs } = await open();
    await moreOptions(page);
    await answerType(page).selectOption("expression");
    assert.deepEqual(dialogs, [], "nothing was configured, so no confirm");
    await page.waitForFunction(() => window.__draft.privateParts[0].key?.kind === "expression");
    const box = await page.locator('math-field[id$="-a"]').elementHandle();
    await page.locator('math-field[id$="-a"]').click();
    for (const ch of "x+1") {
      await page.keyboard.type(ch);
      assert.equal(await box.evaluate((el) => el.isConnected), true, `box mounted after ${ch}`);
      assert.equal(await boxFocused(page), true, `focus kept after ${ch}`);
      assert.equal(await page.getByLabel("Expected expression").count(), 0, "the panel never takes over the expected expression");
    }
    await page.waitForFunction(() => window.__draft.privateParts[0].key?.expected === "x+1");
    // The symbol name is locked, and add or remove is not offered.
    const symbol = page.getByLabel("Symbol", { exact: true });
    assert.equal(await symbol.getAttribute("readonly"), "");
    assert.equal(await page.getByRole("button", { name: /Add variable|Remove variable/ }).count(), 0);
    // Exactly one worked solution editor.
    assert.equal(await page.getByText(/^Worked solution/).count(), 1);
    // Every piece of text inside More options is at least 16px.
    const small = await page.locator('summary[aria-label="More options"] + div').evaluate((root) => {
      const out = [];
      for (const el of root.querySelectorAll("*")) {
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
        if (own && el.getClientRects().length && parseFloat(getComputedStyle(el).fontSize) < 16) out.push(`${el.tagName} ${getComputedStyle(el).fontSize} ${el.textContent.trim().slice(0, 30)}`);
      }
      return out;
    });
    assert.deepEqual(small, []);
    checks++;
    await context.close();
  }

  // 3. Students explain, then Numeric, then 3e8 in the box: the box's default tolerances.
  {
    const { context, page } = await open();
    await moreOptions(page);
    await answerType(page).selectOption("manual");
    await page.getByText("Students explain this part and nothing is checked automatically.").waitFor();
    await answerType(page).selectOption("numeric");
    await page.locator('math-field[id$="-a"]').waitFor();
    await page.locator('math-field[id$="-a"]').click();
    await page.keyboard.type("3e8");
    await page.waitForFunction(() => window.__draft.privateParts[0].key?.value === 3e8);
    const k = await key(page);
    assert.deepEqual({ absTol: k.absTol, relTol: k.relTol }, { absTol: 1e-9, relTol: 0.01 });
    checks++;
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`Simple options browser checks passed: ${checks}`);
} finally {
  await browser?.close();
  server?.close();
  await rm(temp, { recursive: true, force: true });
}
