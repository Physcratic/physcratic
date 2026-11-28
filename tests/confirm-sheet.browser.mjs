// The shared Studio confirm sheet in real Chromium: it opens, Escape and the backdrop and Cancel run nothing, focus goes back to the
// control that opened it, confirm runs the action once, and axe is clean with the sheet open on a wide screen and at 375px.
// Run: node --import tsx tests/confirm-sheet.browser.mjs   (AUTHORING_BROWSER_TOOLS and CHROMIUM_PATH optional)
import axeSettle from "./axe-settle.cjs";
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
const { default: AxeBuilder } = browserTools("@axe-core/playwright");
axeSettle.settleAxeBuilder(AxeBuilder);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const temp = await mkdtemp(join(tmpdir(), "physcratic-confirm-sheet-"));
let browser, server;
try {
  await build({
    entryPoints: ["tests/confirm-sheet-harness.tsx"], outfile: join(temp, "bundle.js"), bundle: true, platform: "browser", jsx: "automatic",
    alias: { "@": process.cwd() }, define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" }, logLevel: "silent",
  });
  execFileSync("node_modules/.bin/tailwindcss", ["-i", "app/globals.css", "-o", join(temp, "style.css")], { stdio: "pipe" });
  server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/bundle.js" || path === "/style.css") {
      res.setHeader("Content-Type", path.endsWith("js") ? "application/javascript" : "text/css");
      return res.end(await readFile(join(temp, basename(path))));
    }
    res.setHeader("Content-Type", "text/html");
    res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Confirm sheet test</title><link rel="stylesheet" href="/style.css"></head><body class="bg-background text-foreground"><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ["--no-sandbox"] });
  const errors = [];
  const ran = (page) => page.evaluate(() => ({ ...window.__ran }));
  const status = (page) => page.getByRole("status").innerText();
  // Radix hands focus back a tick after the sheet leaves, so wait for it instead of reading it at once.
  const focusReturns = (page, text, label) => page.waitForFunction((t) => document.activeElement?.textContent === t, text, { timeout: 3000 }).catch(() => assert.fail(label));
  const settled = (page) => page.evaluate(() => Promise.all(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime)).map((a) => a.finished)));

  for (const [width, height] of [[1440, 900], [375, 700]]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addInitScript((t) => addEventListener("DOMContentLoaded", () => document.documentElement.classList.toggle("dark", t === "dark")), theme);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(origin);
      const del = page.getByRole("button", { name: "Delete draft", exact: true });
      const pub = page.getByRole("button", { name: "Publish version", exact: true });
      const sheet = page.getByRole("alertdialog");
      const label = `${width}px ${theme}`;

      // Opens with its words, a warning icon for a destructive action, 44px buttons and focus on Cancel.
      await del.click();
      await sheet.waitFor();
      await settled(page);
      assert.equal(await sheet.getByRole("heading", { name: "Delete this draft?" }).count(), 1, `${label}: the title`);
      assert.match(await sheet.innerText(), /Saved working content is removed/, `${label}: the sentence`);
      assert.equal(await sheet.locator("svg").count() >= 1, true, `${label}: a destructive sheet has an icon beside its words`);
      const buttons = await sheet.getByRole("button").evaluateAll((els) => els.map((e) => ({ name: e.textContent, h: e.getBoundingClientRect().height, y: e.getBoundingClientRect().top })));
      assert.deepEqual(buttons.map((b) => b.name), ["Cancel", "Delete draft"], `${label}: Cancel first, the main action last`);
      assert.ok(buttons.every((b) => b.h >= 44), `${label}: buttons are at least 44px`);
      if (width < 640) {
        assert.ok(buttons[1].y > buttons[0].y, `${label}: the main action is at the bottom`);
        const box = await sheet.boundingBox();
        assert.ok(Math.abs(box.y + box.height - height) <= 1, `${label}: a bottom sheet sits on the bottom edge`);
      }
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Cancel", `${label}: a destructive sheet starts on Cancel`);
      const violations = (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }));
      assert.deepEqual(violations, [], `${label}: axe with the sheet open`);

      // Escape cancels, runs nothing, and focus goes back to the control that opened it.
      await page.keyboard.press("Escape");
      await sheet.waitFor({ state: "detached" });
      assert.deepEqual(await ran(page), { delete: 0, publish: 0 }, `${label}: Escape ran nothing`);
      assert.equal(await status(page), "Last answer: kept");
      await focusReturns(page, "Delete draft", `${label}: focus returns to the opener`);

      // The backdrop cancels. Cancel cancels.
      await del.click();
      await sheet.waitFor();
      await page.mouse.click(width / 2, 4);
      await sheet.waitFor({ state: "detached" });
      assert.deepEqual(await ran(page), { delete: 0, publish: 0 }, `${label}: the backdrop ran nothing`);
      await del.click();
      await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
      await sheet.waitFor({ state: "detached" });
      assert.deepEqual(await ran(page), { delete: 0, publish: 0 }, `${label}: Cancel ran nothing`);
      await focusReturns(page, "Delete draft", `${label}: focus returns after Cancel`);

      // A plain confirm starts on its main action. Confirm runs the action once.
      await pub.click();
      await sheet.waitFor();
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Publish", `${label}: a plain sheet starts on its main action`);
      assert.equal(await sheet.locator("svg").count(), 0, `${label}: a plain sheet has no warning icon`);
      await page.keyboard.press("Enter");
      await sheet.waitFor({ state: "detached" });
      assert.deepEqual(await ran(page), { delete: 0, publish: 1 }, `${label}: confirm ran the action once`);
      await del.click();
      await sheet.getByRole("button", { name: "Delete draft", exact: true }).dblclick().catch(() => {});
      await sheet.waitFor({ state: "detached" });
      assert.deepEqual(await ran(page), { delete: 1, publish: 1 }, `${label}: a double click still runs it once`);
      await context.close();
    }
  }
  // A picture that finishes uploading while the sheet is open is kept when the block is removed.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${origin}/?page=blocks`);
    await page.getByRole("button", { name: "Delete Blocks block 1", exact: true }).click();
    const sheet = page.getByRole("alertdialog");
    await sheet.waitFor();
    await page.evaluate(() => window.__addPicture());
    await page.waitForFunction(() => document.querySelector('[data-testid="ids"]')?.textContent === "text-1,picture-1");
    await sheet.getByRole("button", { name: "Remove block", exact: true }).click();
    await sheet.waitFor({ state: "detached" });
    assert.equal(await page.getByTestId("ids").innerText(), "picture-1", "the block is removed by id and the picture that landed meanwhile is kept");
    await context.close();
  }
  assert.deepEqual(errors, [], "no page errors");
  console.log("PASS confirm sheet: opens, Escape and backdrop and Cancel run nothing, focus returns, confirm runs once, a picture added while the sheet is open is kept, axe clean open at 1440px and 375px in light and dark.");
} finally {
  await browser?.close();
  server?.close();
  await rm(temp, { recursive: true, force: true });
}
