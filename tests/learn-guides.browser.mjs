// The two product guides on a local production build, no database:
//   BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 SHOT_DIR=/some/dir node tests/learn-guides.browser.mjs
// Checks 375 and 1440 in light and dark: one h1, no sideways scroll, every image loads with alt text, no reviewer
// line. Also checks the Learn hub, sitemap.xml and llms.txt. Not run by CI.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const require = process.env.AUTHORING_BROWSER_TOOLS
  ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"))
  : createRequire(import.meta.url);
const { chromium } = require("playwright");
const origin = process.env.BROWSER_TEST_ORIGIN || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const shotDir = process.env.SHOT_DIR;
if (shotDir) mkdirSync(shotDir, { recursive: true });
const guides = [
  { slug: "how-to-write-a-problem", title: "How to write a problem in Problem Studio", images: 4 },
  { slug: "how-to-use-physcratic", title: "How to use Physcratic", images: 4 },
];
let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  for (const theme of ["light", "dark"]) for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript((value) => { try { localStorage.setItem("theme", value); } catch {} }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const guide of guides) {
      const tag = `${guide.slug} ${width} ${theme}`;
      const response = await page.goto(`${origin}/learn/${guide.slug}`, { waitUntil: "networkidle" });
      ok(response.status() === 200, `${tag}: status ${response.status()}`);
      ok(await page.getByRole("heading", { level: 1 }).count() === 1, `${tag}: one h1`);
      ok((await page.getByRole("heading", { level: 1 }).innerText()).includes(guide.title), `${tag}: h1 is the title`);
      ok(await page.locator("html.dark").count() === (theme === "dark" ? 1 : 0), `${tag}: theme is ${theme}`);
      const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      ok(scroll <= inner, `${tag}: page scrolls sideways (${scroll} > ${inner})`);
      // Images load lazily, so scroll each into view before checking it.
      for (const img of await page.locator("img[src*='learn']").all()) await img.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const loaded = await page.locator("img[src*='learn']").evaluateAll((list) => list.map((img) => ({ loaded: img.complete && img.naturalWidth > 0, alt: img.alt })));
      ok(loaded.length === guide.images, `${tag}: expected ${guide.images} images, found ${loaded.length}`);
      ok(loaded.every((img) => img.loaded && img.alt.split(/\s+/).length >= 6), `${tag}: every image loads and has alt text`);
      const body = await page.locator("main").innerText();
      ok(!/reviewed by/i.test(body), `${tag}: no reviewer line`);
      ok(!/partly correct/i.test(body), `${tag}: no "Partly correct"`);
      if (shotDir) await page.screenshot({ path: join(shotDir, `${guide.slug}-${width}-${theme}.png`), fullPage: true });
    }
    // The Learn hub lists both guides.
    await page.goto(`${origin}/learn`, { waitUntil: "networkidle" });
    for (const guide of guides) ok(await page.getByRole("link", { name: new RegExp(guide.title) }).count() > 0, `hub lists ${guide.slug} (${width} ${theme})`);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
  const llms = await (await fetch(`${origin}/llms.txt`)).text();
  for (const guide of guides) {
    ok(sitemap.includes(`/learn/${guide.slug}`), `sitemap.xml lists ${guide.slug}`);
    ok(llms.includes(`/learn/${guide.slug}`) && llms.includes(guide.title), `llms.txt lists ${guide.slug}`);
  }
  console.log(`learn-guides: ${checks} checks passed`);
} finally {
  await browser.close();
}
