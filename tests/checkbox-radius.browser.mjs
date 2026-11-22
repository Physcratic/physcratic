// The shared checkbox in real Chromium: a 4px corner on the 16px box, in light and dark, unchecked, checked, focused, indeterminate,
// invalid and disabled. Not wired into CI. Run: AUTHORING_BROWSER_TOOLS=/path node --import tsx tests/checkbox-radius.browser.mjs
// CHECKBOX_SHOTS=/dir also writes one screenshot per theme.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdtemp, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
const require = createRequire(import.meta.url);
const tools = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json")) : require;
const { chromium } = tools("playwright");
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const temp = await mkdtemp(join(tmpdir(), "physcratic-checkbox-"));
await build({ entryPoints: ["tests/checkbox-radius-harness.tsx"], outfile: join(temp, "bundle.js"), bundle: true, platform: "browser", jsx: "automatic", alias: { "@": process.cwd() }, define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" }, logLevel: "silent" });
execFileSync("node_modules/.bin/tailwindcss", ["-i", "app/globals.css", "-o", join(temp, "style.css")], { stdio: "pipe" });
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  if (path === "/bundle.js" || path === "/style.css") { res.setHeader("Content-Type", path.endsWith("js") ? "application/javascript" : "text/css"); return res.end(await readFile(join(temp, basename(path)))); }
  res.setHeader("Content-Type", "text/html");
  res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Checkbox</title><style>:root{--font-plex-sans:Arial,sans-serif}body{font-family:Arial,sans-serif}</style><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), headless: true, args: ["--no-sandbox"] });
if (process.env.CHECKBOX_SHOTS) await mkdir(process.env.CHECKBOX_SHOTS, { recursive: true });
try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 720, height: 140 }, deviceScaleFactor: 3 });
    if (theme === "dark") await context.addInitScript(() => { const set = () => document.documentElement && document.documentElement.classList.add("dark"); set(); new MutationObserver(set).observe(document, { childList: true, subtree: true }); });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin);
    await page.locator("#unchecked").waitFor();
    // Keyboard focus, so :focus-visible and the ring show.
    await page.locator("#unchecked").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "focus");
    const boxes = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[role="checkbox"]')].map((el) => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return [el.id, { w: r.width, h: r.height, radius: s.borderTopLeftRadius, state: el.getAttribute("data-state"), ring: s.boxShadow !== "none", icon: !!el.querySelector("svg") }];
    })));
    for (const [id, box] of Object.entries(boxes)) {
      assert.equal(box.w, 16, `${theme} ${id} width`);
      assert.equal(box.h, 16, `${theme} ${id} height`);
      assert.equal(box.radius, "4px", `${theme} ${id} radius`);
      assert.ok(parseFloat(box.radius) < box.w / 2, `${theme} ${id}: not a circle`);
    }
    assert.equal(boxes.focus.ring, true, `${theme}: the focus ring shows`);
    assert.equal(boxes.checked.state, "checked");
    assert.equal(boxes.checked.icon, true);
    assert.equal(boxes.unchecked.icon, false);
    assert.deepEqual(errors, []);
    if (process.env.CHECKBOX_SHOTS) await page.screenshot({ path: join(process.env.CHECKBOX_SHOTS, `checkbox-${theme}.png`) });
    console.log(theme, JSON.stringify(Object.fromEntries(Object.entries(boxes).map(([id, b]) => [id, `${b.w}x${b.h} radius ${b.radius} ${b.state}${b.ring ? " ring" : ""}`]))));
    await context.close();
  }
  console.log("PASS checkbox: 16px box, 4px radius, not a circle, ring on focus, light and dark.");
} finally {
  await browser.close();
  server.close();
}
