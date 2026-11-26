// The Colour group of Appearance in real Chromium. Checks the theme is on the page before first paint, an unknown stored value shows Ink,
// the choice is kept on this device only and survives a reload, it works with Light and Dark, each preview shows its own theme, and axe is clean.
// Run: node --import tsx tests/colour-themes.browser.mjs   (AUTHORING_BROWSER_TOOLS and CHROMIUM_PATH optional)
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { colourStorageKey } from "../lib/colour-theme.ts";
const require = createRequire(import.meta.url);
const browserTools = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json")) : require;
const { chromium } = browserTools("playwright");
const { default: AxeBuilder } = browserTools("@axe-core/playwright");
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const temp = await mkdtemp(join(tmpdir(), "physcratic-colour-themes-"));
let browser, server;
try {
  await build({
    entryPoints: ["tests/colour-themes-harness.tsx"], outfile: join(temp, "bundle.js"), bundle: true, platform: "browser", jsx: "automatic",
    alias: { "@": process.cwd() }, define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" }, logLevel: "silent",
  });
  execFileSync("node_modules/.bin/tailwindcss", ["-i", "app/globals.css", "-o", join(temp, "style.css")], { stdio: "pipe" });
  server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/bundle.js" || path === "/style.css") {
      res.setHeader("Content-Type", path.endsWith("js") ? "application/javascript" : "text/css");
      return res.end(await readFile(join(temp, basename(path))));
    }
    if (path === "/colour-theme.js") { res.setHeader("Content-Type", "application/javascript"); return res.end(await readFile("public/colour-theme.js")); }
    res.setHeader("Content-Type", "text/html");
    // The stylesheet and the colour script are in the head, as in the app. The second script records what the page looked like at that moment.
    res.end(`<!doctype html><html lang="en" class="bg-background"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Colour themes test</title><link rel="stylesheet" href="/style.css"><script src="/colour-theme.js"></script><script>window.__first={colour:document.documentElement.getAttribute("data-colour"),primary:getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()}</script></head><body class="bg-background text-foreground"><div id="root"></div><script src="/bundle.js"></script></body></html>`);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true, args: ["--no-sandbox"] });
  const errors = [];
  const shots = process.env.COLOUR_SHOTS;
  if (shots) await mkdir(shots, { recursive: true });
  const primaryOf = (page, colour, dark) => page.evaluate(([c, d]) => {
    const probe = document.createElement("div"); probe.setAttribute("data-colour", c);
    if (d) document.documentElement.classList.add("dark");
    document.body.append(probe); const v = getComputedStyle(probe).getPropertyValue("--primary").trim(); probe.remove(); return v;
  }, [colour, dark]);
  const open = async (stored, width = 1000, scheme = "light") => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
    if (stored !== undefined) await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [colourStorageKey, stored]);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin);
    await page.getByRole("heading", { name: "Appearance" }).waitFor();
    return { context, page };
  };

  // First paint: the colour is on the page by the time the head script has run, before any of the app code.
  const expected = {};
  {
    const { context, page } = await open();
    for (const c of ["paper", "ink", "sky"]) expected[c] = await primaryOf(page, c, false);
    assert.equal(new Set(Object.values(expected)).size, 3, "the three themes have three different main actions");
    await context.close();
  }
  for (const [stored, shown] of [[undefined, "ink"], ["ink", "ink"], ["paper", "paper"], ["sky", "sky"], ["neon", "ink"], ["", "ink"], ["PAPER", "ink"]]) {
    const { context, page } = await open(stored);
    const first = await page.evaluate(() => window.__first);
    assert.equal(first.colour, shown, `stored ${JSON.stringify(stored)} is on the page before first paint as ${shown}`);
    assert.equal(first.primary, expected[shown], `stored ${JSON.stringify(stored)} already uses the ${shown} main action at that moment`);
    assert.equal(await page.getByRole("radio", { name: new RegExp(`^${shown}$`, "i") }).isChecked(), true, `the ${shown} radio is checked`);
    await context.close();
  }

  // Choosing a colour applies at once, stays on this device, survives a reload and works with Light and Dark.
  for (const scheme of ["light", "dark"]) {
    const { context, page } = await open(undefined, 1000, scheme);
    if (scheme === "dark") await page.getByRole("radio", { name: "Dark" }).check();
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains("dark")), scheme === "dark");
    for (const c of ["paper", "sky", "ink"]) {
      await page.getByRole("radio", { name: c[0].toUpperCase() + c.slice(1), exact: true }).check();
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-colour")), c);
      assert.equal(await page.evaluate((k) => localStorage.getItem(k), colourStorageKey), c);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()), await primaryOf(page, c, scheme === "dark"), `${scheme} ${c}: the page uses the ${c} main action`);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains("dark")), scheme === "dark", "the colour choice does not change Light or Dark");
    }
    await page.getByRole("radio", { name: "Sky", exact: true }).check();
    await page.reload();
    await page.getByRole("heading", { name: "Appearance" }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-colour")), "sky", `${scheme}: the choice survives a reload`);
    assert.equal(await page.getByRole("radio", { name: "Sky", exact: true }).isChecked(), true);
    assert.equal(await page.evaluate(() => document.cookie), "", "nothing is saved in a cookie, only on this device");
    await context.close();
  }

  // Each preview shows its own theme's main action, and the radios are 44px tall targets with their names.
  for (const scheme of ["light", "dark"]) {
    const { context, page } = await open(undefined, 390, scheme);
    if (scheme === "dark") await page.getByRole("radio", { name: "Dark" }).check();
    for (const c of ["paper", "ink", "sky"]) {
      const colours = await page.locator(`[data-colour="${c}"][aria-hidden="true"]`).evaluate((el) => {
        const b = el.querySelector("span"), s = getComputedStyle(b); return { button: s.backgroundColor, text: s.color };
      });
      const probe = await page.evaluate(([c2]) => { const p = document.createElement("span"); p.setAttribute("data-colour", c2); p.className = "bg-primary text-primary-foreground"; document.body.append(p); const s = getComputedStyle(p); const r = { button: s.backgroundColor, text: s.color }; p.remove(); return r; }, [c]);
      assert.deepEqual(colours, probe, `${scheme}: the ${c} preview shows the ${c} main action`);
    }
    const heights = await page.getByRole("radio").evaluateAll((els) => els.map((e) => e.closest("label").getBoundingClientRect().height));
    assert.ok(heights.every((h) => h >= 44), "every option is a 44px target");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${scheme}: no sideways scroll at 390px`);
    if (shots) await page.locator("#appearance-settings").screenshot({ path: join(shots, `appearance-390-ink-${scheme}.png`) });
    await context.close();
  }

  // Axe on the section, in every theme, light and dark, at 390px and desktop.
  for (const [width, scheme, c] of [[1000, "light", "paper"], [1000, "light", "ink"], [1000, "light", "sky"], [390, "dark", "paper"], [390, "dark", "ink"], [390, "dark", "sky"], [390, "light", "ink"], [1000, "dark", "sky"]]) {
    const { context, page } = await open(c, width, scheme);
    if (scheme === "dark") await page.getByRole("radio", { name: "Dark" }).check();
    const violations = (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }));
    assert.deepEqual(violations, [], `axe: ${c} ${scheme} ${width}px`);
    await context.close();
  }
  assert.deepEqual(errors, [], "no page errors");
  console.log("PASS colour themes: on the page before first paint, unknown stored values show Ink, choice kept on the device and survives a reload, works with Light and Dark, previews show their own theme, axe clean in all three themes.");
} finally {
  await browser?.close();
  server?.close();
  await rm(temp, { recursive: true, force: true });
}
