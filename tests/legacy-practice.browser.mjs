// Public retirement UX against a local production server. Real reader/checker/collection requests.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const require = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"));
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const origin = process.env.BROWSER_TEST_ORIGIN ?? "http://127.0.0.1:3123";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const arena = JSON.parse(readFileSync(new URL("../lib/arena/index.json", import.meta.url), "utf8")).problems;
const retired = ["incline", "circuit", "string", "projectile", "spring", "resistors", "power", "wave", "echo", "heat", "gas", "first-law"];
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  for (const theme of ["light", "dark"]) for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
    await context.addInitScript(theme => { localStorage.setItem("theme", theme); localStorage.setItem("physcratic.tour.welcome.v1", "seen"); }, theme);
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await context.route("**/api/auth/get-session*", route => route.fulfill({ json: null }));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${origin}/dashboard?view=problems`, { waitUntil: "networkidle" });
    ok(await page.getByRole("tab", { name: "Physcratic Arena", exact: true }).getAttribute("aria-selected") === "true", "Arena is the default collection");
    await page.locator('[data-problem-card] a[href^="/dashboard/problems/arena-"]').first().waitFor();
    const links = await page.locator("main a").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
    for (const id of retired) ok(!links.includes(`/dashboard/problems/${id}`), `no retired library link: ${id}`);
    ok(await page.getByRole("tab", { name: /Guided exercises/i }).count() === 1, "separate Guided exercises retained");
    await page.getByRole("tab", { name: /Guided exercises/i }).click();
    await page.getByRole("button", { name: /^Open problem:/ }).first().click();
    await page.getByRole("heading", { name: "Step 1: Read the problem", exact: true }).waitFor();
    ok(true, "retained Guided exercise opens its actual reader");
    for (const path of ["/problems", "/problems/topics/mechanics", "/learn/how-to-use-physcratic"]) {
      await page.goto(origin + path, { waitUntil: "networkidle" });
      ok(await page.locator("h1").count() === 1, `one heading at ${path}`);
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no overflow at ${path}`);
      ok((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.length === 0, `accessible retained discovery ${path}`);
    }
    await page.goto(`${origin}/dashboard/problems/incline`, { waitUntil: "networkidle" });
    const landed = new URL(page.url());
    ok(landed.pathname === "/dashboard" && landed.searchParams.get("collection") === "arena", "direct retired visit reaches Arena");
    ok(await page.getByRole("tab", { name: "Physcratic Arena", exact: true }).getAttribute("aria-selected") === "true", "redirect activates Arena tab");
    await page.goto(`${origin}/dashboard/problems/${arena[0].id}`, { waitUntil: "networkidle" });
    const field = page.getByRole("textbox", { name: /Fitted lens radius/ });
    await field.fill("1");
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await page.getByText(/Not correct/).first().waitFor();
    await field.fill("0.90");
    await page.locator("#step-answer math-field").first().evaluate((field, latex) => {
      field.setValue(latex);
      field.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }, String.raw`\sqrt{\frac{m\lambda}{1/R_1-1/R_0}}`);

    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await page.getByText("Correct", { exact: true }).first().waitFor();
    ok(await field.inputValue() === "0.90", "retained Arena checker works");
    await page.reload({ waitUntil: "networkidle" });
    ok(await field.inputValue() === "0.90", "retained Arena recovery works");
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await page.getByRole("link", { name: "Next problem", exact: true }).waitFor();
    await page.getByRole("tab", { name: "Worked solution", exact: true }).click();
    await page.getByText("Contains spoilers", { exact: false }).waitFor();
    ok(true, "retained worked solution opens");
    await page.getByRole("link", { name: "Next problem", exact: true }).click();
    await page.waitForURL(`${origin}/dashboard/problems/${arena[1].id}`);
    ok(await page.locator("h1").textContent() === arena[1].title, "retained next reader identity");
    ok(errors.length === 0, `no runtime errors: ${errors.join("\n")}`);
    await context.close();
  }
  console.log(`legacy-practice.browser: ${checks} checks passed`);
} finally { await browser.close(); }
