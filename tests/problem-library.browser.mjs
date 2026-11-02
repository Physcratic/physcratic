// Run against a local Next server. AUTHORING_BROWSER_TOOLS selects external Playwright tooling.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = process.env.AUTHORING_BROWSER_TOOLS
  ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"))
  : createRequire(import.meta.url);
const { chromium } = require("playwright");
const origin = process.env.BROWSER_TEST_ORIGIN || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
let checks = 0;
try {
  for (const width of [1440, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // Isolate navigation from database availability. No authenticated requests or writes.
    await page.route("**/api/authored-problems/library**", (route) => route.fulfill({
      json: { problems: [], nextCursor: null },
    }));
    const selected = (name) => page.getByRole("tab", { name }).getAttribute("aria-selected");
    const waitSelected = async (name) => {
      await page.getByRole("tab", { name }).and(page.locator('[aria-selected="true"]')).waitFor();
      assert.equal(await selected(name), "true");
      checks++;
    };
    for (const suffix of ["", "&collection=practice", "&collection=unknown"]) {
      await page.goto(`${origin}/dashboard?view=problems${suffix}`);
      await waitSelected(/Physcratic Arena/);
      assert.equal(await page.getByRole("tab", { name: /Quick practice/ }).count(), 0);
      assert.equal(await page.getByRole("tab").count(), 4);
      await page.locator("#arena-results").waitFor();
    }
    await page.goto(`${origin}/dashboard?view=problems&collection=practice&topic=Mechanics&q=force#results`);
    await waitSelected(/Physcratic Arena/);
    await page.getByRole("tab", { name: /Physcratic Arena/ }).focus();
    await page.keyboard.press("ArrowRight");
    await waitSelected(/Olympiad archive/);
    const persisted = new URL(page.url());
    assert.equal(persisted.searchParams.get("collection"), "catalog");
    assert.equal(persisted.searchParams.get("topic"), "Mechanics");
    assert.equal(persisted.searchParams.get("q"), "force");
    assert.equal(persisted.hash, "#results");
    await page.reload();
    await waitSelected(/Olympiad archive/);
    assert.equal(await page.getByLabel("Find a problem", { exact: true }).inputValue(), "force");
    for (const [name, value] of [[/Guided exercises/, "pilot"], [/Authored problems/, "authored"], [/Physcratic Arena/, "arena"]]) {
      await page.getByRole("tab", { name }).click();
      await waitSelected(name);
      assert.equal(new URL(page.url()).searchParams.get("collection"), value);
      await page.reload();
      await waitSelected(name);
    }
    await page.getByRole("tab", { name: /Physcratic Arena/ }).focus();
    await page.keyboard.press("End");
    await waitSelected(/Authored problems/);
    await page.keyboard.press("Home");
    await waitSelected(/Physcratic Arena/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const tabs = await page.getByRole("tab").all();
    for (const tab of tabs) {
      const bounds = await tab.boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width, "tabs fit the viewport");
    }
    // A same-page history transition must update the controlled collection too.
    await page.evaluate(() => history.pushState(null, "", "/dashboard?view=problems&collection=catalog"));
    await waitSelected(/Olympiad archive/);
    await page.goBack();
    await waitSelected(/Physcratic Arena/);
    await page.goForward();
    await waitSelected(/Olympiad archive/);
    // Existing practice routes, content and return links remain usable.
    await page.goto(`${origin}/dashboard/problems/incline`);
    await page.locator("#practice-title").waitFor();
    await page.getByRole("link", { name: "Back to collection" }).click();
    await waitSelected(/Physcratic Arena/);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(`Problem library: ${checks} navigation checks passed at 1440px and 375px, including keyboard, URL reload/history and legacy practice links.`);
} finally {
  await browser.close();
}
