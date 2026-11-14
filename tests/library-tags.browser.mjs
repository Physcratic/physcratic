// The library: a tag on a problem card is a button that filters, pressing it again clears it, the filter is in the
// address, and the rating bands show on cards, in the filter and in the "What do the ratings mean?" popover.
// Run against a local production build with no database:
//   BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 node tests/library-tags.browser.mjs
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
const bands = ["Beginner", "Intermediate", "Advanced", "Mastery"];
const profiles = {
  desktop: { viewport: { width: 1440, height: 900 } },
  "iPhone 13": (({ defaultBrowserType, ...p }) => p)(devices["iPhone 13"]),
};

for (const [name, profile] of Object.entries(profiles)) {
  const touch = name !== "desktop";
  const context = await browser.newContext(profile);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const press = (locator) => (touch ? locator.tap() : locator.click());
  await page.goto(`${origin}/dashboard?view=problems`);
  const cards = page.locator("[data-problem-card]:visible");
  await cards.first().waitFor({ timeout: 30000 });
  const total = await cards.count();
  const tagUrl = () => new URL(page.url()).searchParams.get("tag");
  const tagInput = page.locator("#topic-filter");

  // Every tag on a card is a real button with an accessible name, at least 44px tall.
  const tagButtons = page.locator("[data-problem-card]:visible button[aria-label^='Filter by ']");
  ok(await tagButtons.count() > 0, `${name}: tags on cards are buttons`);
  const heights = await tagButtons.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  ok(heights.every((h) => h >= 44), `${name}: every tag button is at least 44px tall (${JSON.stringify([...new Set(heights)])})`);
  ok(await tagButtons.evaluateAll((els) => els.every((el) => el.tagName === "BUTTON" && el.getAttribute("aria-pressed") === "false")), `${name}: nothing is pressed at first`);

  // Pick a tag that narrows the list.
  const labels = [...new Set(await tagButtons.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label"))))];
  let chosen = null;
  let narrowed = total;
  for (const label of labels.slice(0, 12)) {
    await press(page.locator(`[data-problem-card]:visible button[aria-label="${label}"]`).first());
    await page.waitForTimeout(400);
    const count = await cards.count();
    if (count < total && count > 0) { chosen = label; narrowed = count; break; }
    await press(page.locator(`[data-problem-card]:visible button[aria-label="${label}"]`).first());
    await page.waitForTimeout(300);
  }
  ok(chosen !== null, `${name}: some tag narrows the list`);
  if (chosen) {
    const tag = chosen.replace("Filter by ", "");
    ok(tagUrl() !== null && tagUrl().toLowerCase() === tag.toLowerCase(), `${name}: the filter is in the address (${page.url()})`);
    ok((await tagInput.inputValue()).toLowerCase() === tag.toLowerCase(), `${name}: the Tag filter shows ${tag}`);
    ok(await page.getByText(`Showing problems tagged`).isVisible(), `${name}: the page says which tag is on`);
    ok(await cards.evaluateAll((els, label) => els.every((el) => el.querySelector(`button[aria-label="${label}"]`)), chosen), `${name}: every card left has the tag`);
    ok(await page.locator(`[data-problem-card]:visible button[aria-label="${chosen}"][aria-pressed="true"]`).count() === narrowed, `${name}: the tag shows as pressed on every card left`);

    // It can be shared: the address alone gives the same list.
    const shared = await context.newPage();
    await shared.goto(page.url());
    await shared.locator("[data-problem-card]:visible").first().waitFor({ timeout: 30000 });
    ok(await shared.locator("[data-problem-card]:visible").count() === narrowed, `${name}: the shared link gives the same ${narrowed} problems`);
    ok((await shared.locator("#topic-filter").inputValue()).toLowerCase() === tag.toLowerCase(), `${name}: the shared link shows the tag in the filter`);
    await shared.close();

    // Pressing it again clears it.
    await press(page.locator(`[data-problem-card]:visible button[aria-label="${chosen}"]`).first());
    await page.waitForTimeout(400);
    ok(await cards.count() === total && tagUrl() === null && (await tagInput.inputValue()) === "", `${name}: pressing the tag again clears the filter and the address`);

    // The clear button does the same.
    await press(page.locator(`[data-problem-card]:visible button[aria-label="${chosen}"]`).first());
    await page.waitForTimeout(400);
    await press(page.getByRole("button", { name: "Clear tag filter" }));
    await page.waitForTimeout(400);
    ok(await cards.count() === total && tagUrl() === null, `${name}: Clear tag filter removes it`);
  }

  // Ratings: the band name is on the card, the filter has the four bands, the popover has the table.
  const badge = page.locator("[data-problem-card]:visible [aria-label^='Rating ']").first();
  const badgeText = await badge.innerText();
  ok(bands.some((band) => badgeText.includes(band)), `${name}: a card shows its band next to the rating (${badgeText.replace(/\n/g, " ")})`);
  await press(page.locator("#difficulty-filter"));
  const options = await page.getByRole("option").allInnerTexts();
  for (const band of bands) ok(options.some((text) => text.startsWith(band)), `${name}: the rating filter lists ${band}`);
  await page.keyboard.press("Escape");
  await press(page.getByRole("button", { name: "What do the ratings mean?" }).first());
  const table = page.getByRole("table");
  await table.waitFor({ timeout: 5000 });
  const rows = await table.locator("tbody tr").allInnerTexts();
  ok(rows.length === 4, `${name}: the popover table has four bands`);
  const text = rows.join("\n");
  for (const [band, range, like] of [
    ["Beginner", "0 to 800", "Fundamental physics or first selection stage"],
    ["Intermediate", "801 to 1,800", "National finals level"],
    ["Advanced", "1,801 to 2,600", "IPhO level"],
    ["Mastery", "2,601+", "Hard IPhO, APhO and EuPhO problems"],
  ]) ok(text.includes(band) && text.includes(range) && text.includes(like), `${name}: the popover row for ${band}`);
  await page.keyboard.press("Escape");
  ok(errors.length === 0, `${name}: page errors ${errors}`);
  await context.close();
}

await browser.close();
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`library-tags: ${checks} checks passed`);
