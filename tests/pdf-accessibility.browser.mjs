// Real production PDF pages. No mocked document, rendered tree or axe exclusions.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
const require = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"));
const { chromium } = require("playwright");
const { default: AxeBuilder } = require("@axe-core/playwright");
const origin = process.env.BROWSER_TEST_ORIGIN;
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const evidence = process.env.PDF_EVIDENCE ?? "/tmp/physcratic-pdf-accessibility";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ["--no-sandbox"] });
console.log(`PDF browser: ${await browser.version()}`);
const cases = [
  ...[375, 1440].flatMap(width => ["light", "dark"].map(theme => ({ id: "ipho-2010-t1", width, theme }))),
  ...["ipho-2009-t1", "ipho-2016-t1", "ipho-2025-t1"].map(id => ({ id, width: 375, theme: "light" })),
  ...(process.env.LIBRARY_SESSION_A ? [{ id: "ipho-2010-t1", width: 375, theme: "dark", member: true }] : []),
];
const results = [];
const hash = value => createHash("sha256").update(value).digest("hex");
async function loaded(page, number) {
  const pdf = page.locator(`.react-pdf__Page[data-page-number="${number}"]`);
  await pdf.waitFor();
  await page.locator('[data-pdf-rendered="true"]').waitFor();
  await page.waitForFunction(number => document.querySelector(`.react-pdf__Page[data-page-number="${number}"] .textLayer`)?.textContent?.trim().length > 0, number);
  // Structure extraction resolves separately from canvas/text rendering. Never audit a missing tree as clean.
  if (page.url().endsWith("/ipho-2010-t1")) {
    await pdf.locator(".react-pdf__Page__structTree").waitFor({ state: "attached" });
    assert.ok(await pdf.locator(".structTree [aria-owns]").count() > 0);
  }
  return pdf;
}
async function fingerprint(pdf) {
  const data = await pdf.evaluate(e => ({
    text: e.querySelector(".textLayer").textContent,
    owners: [...e.querySelectorAll(".structTree [aria-owns]")].map(n => n.getAttribute("aria-owns")),
    cells: [...e.querySelectorAll('.structTree [role="row"]')].map(n => n.querySelectorAll('[role="cell"],[role="columnheader"],[role="rowheader"]').length),
    canvas: e.querySelector("canvas").toDataURL(),
  }));
  return { text: data.text, textHash: hash(data.text), owners: data.owners, cells: data.cells, canvasHash: hash(data.canvas) };
}
try {
  for (const item of cases) {
    const context = await browser.newContext({ viewport: { width: item.width, height: 900 }, colorScheme: item.theme });
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await context.addInitScript(theme => localStorage.setItem("theme", theme), item.theme);
    if (item.member) await context.addCookies([{ name: "better-auth.session_token", value: process.env.LIBRARY_SESSION_A, url: origin }]);
    const page = await context.newPage();
    const response = await page.goto(`${origin}/dashboard/problems/${item.id}`, { waitUntil: "networkidle" });
    assert.equal(response.status(), 200);
    const pdf = await loaded(page, 1);
    const initial = await fingerprint(pdf);
    if (item.id === "ipho-2010-t1") {
      assert.deepEqual(initial.cells, [2, 1]);
      for (const id of ["p3R_mc22", "p3R_mc27"]) {
        assert.ok(initial.owners.includes(id));
        assert.equal(await pdf.locator(".textLayer").evaluate((e, id) => e.querySelector(`[id="${id}"]`)?.textContent, id), "");
      }
    }
    const axe = await new AxeBuilder({ page }).analyze();
    const violations = axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, failure: n.failureSummary })) }));
    // Selection must still use the untouched PDF text layer, not a copied accessibility-only replacement.
    const selected = await pdf.locator(".textLayer").evaluate(e => { const r = document.createRange(); r.selectNodeContents(e); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return s.toString(); });
    assert.ok(selected.length > 0);
    assert.equal(selected.replace(/\s/g, ""), initial.text.replace(/\s/g, ""));
    await page.evaluate(() => getSelection().removeAllRanges());
    assert.ok(await pdf.locator("canvas").isVisible());
    assert.ok(await page.locator("body").evaluate(e => e.scrollWidth <= innerWidth));
    const open = page.getByRole("link", { name: "Open PDF", exact: true }).first();
    const download = page.getByRole("link", { name: "Download PDF", exact: true }).first();
    const sourceURL = await download.getAttribute("href");
    const source = await page.request.get(new URL(sourceURL, origin).href);
    assert.equal(source.status(), 200);
    assert.ok((await source.body()).subarray(0, 4).equals(Buffer.from("%PDF")));
    assert.ok((await open.getAttribute("href")).startsWith(sourceURL));
    const pages = [];
    if (item.id === "ipho-2010-t1" && item.width === 375 && item.theme === "light") {
      const cdp = await context.newCDPSession(page);
      await writeFile(join(evidence, "accessibility-tree.json"), JSON.stringify(await cdp.send("Accessibility.getFullAXTree"), null, 2));
      pages.push({ kind: "statement", number: 1, ...initial });
      for (const number of [2, 3]) {
        const next = page.getByRole("button", { name: /Next .*page/ }).first();
        await next.focus(); await page.keyboard.press("Enter");
        pages.push({ kind: "statement", number, ...await fingerprint(await loaded(page, number)) });
      }
      for (const number of [2, 1]) {
        const previous = page.getByRole("button", { name: /Previous .*page/ }).first();
        await previous.focus(); await page.keyboard.press("Enter");
        await loaded(page, number);
      }
      assert.deepEqual(await fingerprint(page.locator('.react-pdf__Page[data-page-number="1"]')), initial);
      const solution = page.getByRole("tab", { name: "Worked solution", exact: true });
      assert.equal(await solution.getAttribute("aria-selected"), "false");
      await solution.focus(); await page.keyboard.press("Enter");
      assert.equal(await solution.getAttribute("aria-selected"), "true");
      for (let number = 1; number <= 8; number++) {
        if (number > 1) await page.getByRole("button", { name: /Next .*page/ }).first().click();
        pages.push({ kind: "solution", number, ...await fingerprint(await loaded(page, number)) });
      }
      await page.getByRole("tab", { name: "Problem statement", exact: true }).click();
      await loaded(page, 1);
      assert.deepEqual(await fingerprint(page.locator('.react-pdf__Page[data-page-number="1"]')), initial);
    }
    await page.screenshot({ path: join(evidence, `${item.id}-${item.width}-${item.theme}-${item.member ? "member" : "guest"}.png`), fullPage: true });
    results.push({ ...item, ...initial, sourceHash: hash(await source.body()), selected: true, violations, pages });
    await writeFile(join(evidence, "results.json"), JSON.stringify(results, null, 2));
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results.map(({ id, width, theme, member, violations, pages }) => ({ id, width, theme, member: !!member, violations, navigatedPages: pages.length })), null, 2));
assert.deepEqual(results.flatMap(r => r.violations), [], "Full-page axe audits must be clean, including the real PDF structure tree");
console.log(`PDF accessibility: ${results.length} cases pass`);
