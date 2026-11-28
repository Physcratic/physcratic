// Simple More options in real Chromium, against the real SimpleEditor with an in-memory draft (no API, no database).
// Checks the answer box never unmounts while it is typed in or cleared, the hand-graded choice, the default
// tolerances after switching modes, the locked symbol name and 16px text inside More options.
// Run: node --import tsx tests/simple-options.browser.mjs   (CHROMIUM_PATH optional)
import assert from "node:assert/strict";
import { autoConfirm, setConfirmMode, confirmsAsked } from "./confirm-sheet.mjs";
import { barStatus, goStep, studioBar } from "./studio-steps.helpers.mjs";
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
  // The editor opens on Question. Most checks here are about the answer box and the part's More options, on Answer.
  async function open(state = "draft", { fixture = "", width = 1000, extra = "", session = null, step = "Answer" } = {}) {
    const context = await browser.newContext({ viewport: { width, height: 1200 } });
    // A problem with a picture opens in the files view. This keeps the text view.
    if (session) await context.addInitScript(([k, v]) => sessionStorage.setItem(k, v), session);
    const page = await context.newPage();
    page.on("pageerror", (e) => { errors.push(e.message); if (process.env.DEBUG_ERRORS) console.error(e.message.slice(0, 300)); });
    await autoConfirm(page);
    await page.goto(`${origin}/?state=${state}${fixture ? `&fixture=${fixture}` : ""}${extra}`);
    await (extra ? page.locator("#simple-title") : page.locator('math-field[id$="-a"]').first()).waitFor({ state: "attached" });
    // A problem with a picture opens in the files view, which has no steps.
    if (await page.getByRole("navigation", { name: "Steps" }).count()) await goStep(page, step);
    return { context, page };
  }
  const key = (page) => page.evaluate(() => window.__draft.privateParts[0].key);
  const boxFocused = (page) => page.evaluate(() => document.activeElement?.tagName === "MATH-FIELD");
  const moreOptions = async (page) => { const s = page.locator('[data-studio-step]:not([hidden]) summary[aria-label="More options"]'); if (!(await s.evaluate((el) => el.parentElement.open))) await s.click(); };
  const answerType = (page) => page.getByLabel("Answer type", { exact: true });
  // Trying to publish: with nothing left on the server, Publish on Review. Otherwise the bar's item for what is left,
  // which opens its step and focuses its field the way Publish used to.
  const publish = async (page, item) => {
    // The files view keeps its own Publish button.
    if (!(await studioBar(page).count())) return page.getByRole("button", { name: /^Publish/ }).last().click();
    const status = await barStatus(page);
    if (status === "Ready to publish") {
      await goStep(page, "Review");
      await page.getByRole("button", { name: /^Publish/ }).last().click();
      return;
    }
    const toggle = studioBar(page).getByRole("button", { name: status, exact: true });
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
    const items = studioBar(page).getByRole("listitem").getByRole("button");
    await (item ? items.filter({ hasText: item }) : items).first().click();
  };

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
    // The box was typed in, so Simple asks for the answer next to it.
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

  // 1b. The final answer is Simple's own ask, not the server's, so the bar does not count it. Publish with nothing else
  // left still asks for it: it opens Answer, shows the message and puts focus in the box.
  for (const state of ["draft", "published"]) {
    const { context, page } = await open(state, { extra: "&ready=1" });
    // A saved answer opens as a plain box until it is edited.
    const answerBox = page.locator('[data-simple-field^="a:"]').getByRole("textbox").first();
    await answerBox.fill("");
    await page.waitForFunction(() => window.__draft.privateParts[0].key?.kind === "manual");
    await goStep(page, "Details");
    await page.getByLabel(/I wrote this problem and I'm happy to share it on Physcratic/).check();
    for (let i = 0; i < 50 && (await barStatus(page)) !== "Ready to publish"; i++) await page.waitForTimeout(100);
    assert.equal(await barStatus(page), "Ready to publish", `${state}: the final answer is not counted`);
    await goStep(page, "Review");
    await page.getByRole("button", { name: /^Publish/ }).last().click();
    await page.getByRole("heading", { level: 2, name: "Answer", exact: true }).waitFor();
    await page.getByRole("alert").filter({ hasText: "Add the final answer." }).waitFor();
    await page.waitForFunction(() => Boolean(document.activeElement?.closest('[data-simple-field^="a:"]')), null, { timeout: 5000 });
    checks++;
    await context.close();
  }

  // 2. Expression picked in More options: the box keeps the answer while it is typed, with focus.
  {
    const { context, page } = await open();
    await moreOptions(page);
    await answerType(page).selectOption("expression");
    assert.deepEqual(await confirmsAsked(page), [], "nothing was configured, so no confirm");
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
    assert.equal(await page.locator("p").filter({ hasText: /^Worked solution/ }).count(), 1);
    // Every piece of text inside More options is at least 16px.
    const small = await page.locator('[data-studio-step]:not([hidden]) summary[aria-label="More options"] + div').evaluate((root) => {
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

  // 4. Problem-level More options: closed by default, opens by itself for saved sections, Unpublish only when published.
  const whole = (page) => page.locator('summary[aria-label="More options for the whole problem"]');
  const isOpen = (page) => whole(page).evaluate((el) => el.parentElement.open);
  {
    const { context, page } = await open("draft", { step: "Details" });
    assert.equal(await isOpen(page), false, "closed on a new problem");
    assert.equal(await page.getByRole("navigation", { name: "Sections outline" }).count(), 0, "no outline with one section");
    await whole(page).click();
    assert.equal(await page.getByRole("button", { name: "Unpublish problem" }).count(), 0, "not published, no Unpublish");
    await page.getByRole("button", { name: "Add a section" }).click();
    await page.getByRole("navigation", { name: "Sections outline" }).waitFor();
    assert.equal(await page.evaluate(() => window.__draft.content.sections.length), 2);
    checks++;
    await context.close();
  }
  {
    const { context, page } = await open("published", { fixture: "saved", step: "Details" });
    assert.equal(await isOpen(page), true, "opens by itself with saved sections, a tag and custom rights");
    assert.equal(await page.getByRole("navigation", { name: "Sections outline" }).count(), 1);
    await page.getByRole("button", { name: "Unpublish problem" }).click();
    assert.equal(await page.evaluate(() => window.__unpublished), 1);
    checks++;
    await context.close();
  }

  // 5. At 390px nothing inside the problem-level More options is a target under 44px or text under 16px, in every state it can be in.
  const optionsAlert = (page) => page.locator("#simple-options-problem-error");
  const focused = (page) => page.evaluate(() => ({ id: document.activeElement?.id, role: document.activeElement?.getAttribute("role"), text: document.activeElement?.textContent }));
  for (const [label, state, extra, attempt] of [
    ["draft", "draft", "", false],
    ["published", "published", "", false],
    ["published, an image with no description", "published", "&image=single&ready=1", true],
    ["draft, thirty-one method tags", "draft", "&tags=many&ready=1", true],
    ["draft, rights with no source", "draft", "&provenance=nosource&ready=1", true],
    ["published, shared setup blocks", "published", "&context=1&ready=1", false],
  ]) {
    const { context, page } = await open(state, { fixture: "saved", width: 390, extra, step: "Details" });
    if (attempt) { await publish(page); await optionsAlert(page).waitFor(); }
    const found = await page.locator('summary[aria-label="More options for the whole problem"]').evaluate((summary) => {
      const root = summary.parentElement;
      const out = [];
      for (const el of root.querySelectorAll("*")) {
        if (!el.getClientRects().length) continue;
        const style = getComputedStyle(el);
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) && el.type !== "checkbox" && el.type !== "radio";
        // An exponent or a subscript is smaller than its equation by design, so an equation is judged by its own base size.
        const base = el.closest(".katex") ?? el.closest("math");
        const size = parseFloat(getComputedStyle(base ?? el).fontSize);
        if (own && size < 16) out.push(`text ${size}px ${el.tagName} ${el.textContent.trim().slice(0, 30)}`);
        if (el.matches("a[href],button,select,textarea,input:not([type=hidden]),summary,[role=button]")) {
          const box = (el.matches("input[type=checkbox],input[type=radio]") ? el.closest("label") ?? el : el).getBoundingClientRect();
          if (box.height < 43.5) out.push(`target ${Math.round(box.height)}px ${el.tagName} ${(el.getAttribute("aria-label") || el.textContent).trim().slice(0, 30)}`);
          if (!el.textContent.trim() && el.tagName === "BUTTON" && box.width < 43.5) out.push(`narrow ${Math.round(box.width)}px ${el.getAttribute("aria-label")}`);
        }
      }
      return out;
    });
    assert.deepEqual(found, [], `${label}: small text or targets in More options`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${label}: no sideways scroll`);
    checks++;
    await context.close();
  }

  // 6. A publish error that belongs inside More options opens it again, even after the author closed it, and focus lands on the error.
  {
    const { context, page } = await open("draft", { fixture: "saved", extra: "&image=undescribed&ready=1", step: "Details" });
    assert.equal(await isOpen(page), true, "saved content opens it");
    await whole(page).click();
    assert.equal(await isOpen(page), false, "the author can close it, even with saved content");
    await publish(page);
    await page.getByRole("alert").filter({ hasText: "Describe each image in the shared setup and sections" }).first().waitFor();
    assert.equal(await isOpen(page), true, "the error opened it");
    const first = await focused(page);
    assert.equal(first.id, "simple-options-problem-error", "focus is on the error, not the first field in More options");
    assert.equal(first.role, "alert", "the focused line is exposed as an alert");
    assert.match(first.text, /Describe each image in the shared setup and sections/);
    assert.equal(await page.getByRole("alert").filter({ hasText: "Describe each image in the shared setup" }).first().isVisible(), true);
    // A second Publish with it already open moves focus back to the error.
    await page.locator("#simple-title").focus();
    await publish(page);
    await page.waitForFunction(() => document.activeElement?.id === "simple-options-problem-error");
    assert.equal(await isOpen(page), true);
    assert.equal(await optionsAlert(page).count(), 1, "one error line, not one per attempt");
    checks++;
    await context.close();
  }

  // 7. Auto-open happens once per Publish attempt. Closing it and typing elsewhere never opens it again.
  {
    const { context, page } = await open("draft", { fixture: "saved", extra: "&provenance=nosource&ready=1", step: "Details" });
    assert.equal(await isOpen(page), true, "custom rights open it when the problem loads");
    await whole(page).click();
    await publish(page);
    await optionsAlert(page).waitFor();
    assert.equal(await isOpen(page), true, "Publish opened it");
    assert.equal((await focused(page)).id, "simple-options-problem-error");
    await whole(page).click();
    assert.equal(await isOpen(page), false);
    // Clearing the title hides the rights error under the title error. One letter brings it back. It must not open.
    await page.locator("#simple-title").fill("");
    await page.locator("#simple-title").pressSequentially("A");
    await page.waitForTimeout(400);
    assert.equal(await isOpen(page), false, "typing a title did not reopen it");
    assert.equal(await optionsAlert(page).isVisible(), false, "the error waits inside the closed section");
    await publish(page);
    await optionsAlert(page).waitFor();
    assert.equal(await isOpen(page), true, "the next Publish opens it again");
    checks++;
    await context.close();
  }

  // 8. One section holding an image with no description: the error names it and the field is there.
  {
    const { context, page } = await open("draft", { extra: "&image=single&ready=1", step: "Details" });
    assert.equal(await isOpen(page), true, "a section with shared text opens it");
    assert.equal(await page.getByRole("navigation", { name: "Sections outline" }).count(), 0, "one section has no outline");
    await publish(page);
    await optionsAlert(page).waitFor();
    assert.equal((await focused(page)).id, "simple-options-problem-error");
    const alt = page.getByLabel("Section 1 context image 1 alt text", { exact: true });
    await alt.waitFor();
    await alt.fill("A ramp");
    await page.waitForFunction(() => window.__draft.content.sections[0].blocks[0].alt === "A ramp");
    await publish(page);
    await page.waitForTimeout(200);
    assert.equal(await optionsAlert(page).count(), 0, "described, so the error is gone");
    assert.equal(await page.getByRole("button", { name: "Delete section 1", exact: true }).count(), 0, "the only section cannot be deleted");
    checks++;
    await context.close();
  }

  // 9. Each problem is shown once, with the real list of server messages passed in, not an empty one.
  for (const [name, extra, simple, server] of [
    ["a repeated method tag", "&tags=repeat", "Each method tag can only be used once, in More options.", "Duplicate tags"],
    ["thirty-one method tags", "&tags=many", "Check the method tags in More options.", "Too big"],
    ["a repeated topic", "&topics=repeat", "A topic is listed twice.", "Duplicate tags"],
    ["an image with no description", "&image=single", "Describe each image in the shared setup and sections, in More options.", "Every image requires descriptive alternative text"],
  ]) {
    const { context, page } = await open("draft", { extra: `${extra}&ready=1`, step: "Details" });
    await publish(page);
    await page.getByText(simple, { exact: false }).first().waitFor();
    assert.equal(await page.getByText(server, { exact: false }).count(), 0, `${name}: the server's wording is not shown beside Simple's`);
    checks++;
    await context.close();
  }

  // 10. The shared setup holds only what the main question does not. Editing it and closing leave the main question's block as it was.
  {
    const { context, page } = await open("draft", { fixture: "saved", extra: "&context=1&ready=1", step: "Details" });
    assert.equal(await isOpen(page), true, "extra shared setup opens it");
    const shared = page.locator('section[aria-labelledby="simple-setup-h"]');
    assert.equal(await shared.locator("textarea").count(), 2, "the equation and the second text block, not the main question");
    const before = await page.evaluate(() => structuredClone(window.__draft.content.context));
    await shared.getByLabel("Shared setup blocks text 2", { exact: true }).fill("Edited shared");
    await page.waitForFunction(() => window.__draft.content.context[2]?.spans?.[0]?.text === "Edited shared");
    await whole(page).click();
    await whole(page).click();
    const after = await page.evaluate(() => structuredClone(window.__draft.content.context));
    assert.deepEqual(after[0], before[0], "the main question's text block is identical");
    assert.deepEqual(after[1], before[1], "the equation is where it was");
    assert.equal(after.length, 3);
    checks++;
    await context.close();
  }

  // 11. The text this fix adds reaches 4.5:1 in the dark and the light theme, measured on the painted colours.
  {
    const { context, page } = await open("draft", { fixture: "saved", extra: "&topics=repeat&image=single&ready=1", step: "Details" });
    await publish(page, /Describe each image/);
    await optionsAlert(page).waitFor();
    for (const theme of ["dark", "light"]) {
      await page.evaluate((t) => document.documentElement.classList.toggle("dark", t === "dark"), theme);
      const rows = await page.evaluate(() => {
        const paint = (css) => { const c = document.createElement("canvas").getContext("2d", { willReadFrequently: true }); c.clearRect(0, 0, 1, 1); c.fillStyle = css; c.fillRect(0, 0, 1, 1); const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data; return [r, g, b, a / 255]; };
        const back = (el) => { let under = [255, 255, 255]; const chain = []; for (let n = el; n; n = n.parentElement) chain.unshift(n); for (const n of chain) { const [r, g, b, a] = paint(getComputedStyle(n).backgroundColor); if (a > 0) under = under.map((u, i) => u * (1 - a) + [r, g, b][i] * a); } return under; };
        const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const ratio = (el) => { const [r, g, b] = paint(getComputedStyle(el).color); const a = lum([r, g, b]), c = lum(back(el)); return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); };
        const targets = { "the error for the whole problem": "#simple-options-problem-error", "the topic error": '[data-simple-field="topics"] [role=alert] span', "the shared setup hint": 'section[aria-labelledby="simple-setup-h"] > p', "the section hint": 'section[aria-labelledby="simple-sections-h"] > p' };
        return Object.entries(targets).map(([name, selector]) => { const el = document.querySelector(selector); return [name, el ? Math.round(ratio(el) * 100) / 100 : 0]; });
      });
      for (const [name, value] of rows) assert.ok(value >= 4.5, `${theme}: ${name} is ${value}:1`);
    }
    checks++;
    await context.close();
  }
  // 12. Every block type can be edited in Simple at 390px, in the groups under More options, and opening and closing them changes nothing.
  {
    const { context, page } = await open("draft", { width: 390, extra: "&blocks=1", session: ["physcratic.studio.files.v1:browser-author:00000000-0000-4000-8000-000000000001", "text"] });
    const draftNow = () => page.evaluate(() => structuredClone({ content: window.__draft.content, privateParts: window.__draft.privateParts }));
    const untouched = await draftNow();
    const kinds = (blocks) => blocks.map((b) => b.kind);
    const group = (name) => page.locator("details", { has: page.locator("summary", { hasText: name }) }).last();
    const closed = async (name) => (await group(name).evaluate((el) => el.open)) === false;
    // The part's More options is split across the steps: the question group on Question, the solution group on Worked solution.
    // Both groups are closed until opened, and each one is named for its part. On any one step no two More options labels are the same.
    const partOptions = () => page.locator('[data-studio-step]:not([hidden]) summary[aria-label^="More options for part a"]');
    assert.equal(await closed("More question blocks for part a"), true, "the question group starts closed");
    assert.equal(await closed("More worked solution blocks for part a"), true, "the solution group starts closed");
    assert.equal(await page.locator('[data-studio-step="question"] summary', { hasText: "More question blocks for part a" }).count(), 1, "the question group is on Question");
    assert.equal(await page.locator('[data-studio-step="worked-solution"] summary', { hasText: "More worked solution blocks for part a" }).count(), 1, "the solution group is on Worked solution");
    const perStep = await page.evaluate(() => [...document.querySelectorAll("[data-studio-step]")].map((step) => [...step.querySelectorAll("summary")].map((el) => el.textContent.trim()).filter((t) => t.startsWith("More options"))));
    for (const labels of perStep) assert.equal(new Set(labels).size, labels.length, `no two More options labels are the same on a step: ${labels.join(" | ")}`);
    await goStep(page, "Worked solution");
    await partOptions().click();
    await page.getByText("More worked solution blocks for part a (3)", { exact: true }).waitFor();
    await group("More worked solution blocks for part a").locator("summary").click();
    await goStep(page, "Question");
    await partOptions().click();
    await page.getByText("More question blocks for part a (3)", { exact: true }).waitFor();
    await group("More question blocks for part a").locator("summary").click();
    await page.getByText("More question blocks for part a (3)", { exact: true }).click();
    await page.getByText("More question blocks for part a (3)", { exact: true }).click();
    assert.deepEqual(await draftNow(), untouched, "opening and closing the groups changes no block");
    const question = group("More question blocks for part a");
    const solution = group("More worked solution blocks for part a");
    const partA = () => page.evaluate(() => window.__draft.content.sections[0].parts[0].blocks);
    const before = await partA();
    // Edit a text block, an equation and a picture of the question.
    await question.getByLabel("Part a question text 2", { exact: true }).fill("Edited extra a");
    await page.waitForFunction(() => window.__draft.content.sections[0].parts[0].blocks[3].spans[0].text === "Edited extra a");
    await question.getByLabel("Part a question image 3 alt text", { exact: true }).fill("Edited alt");
    await question.getByLabel("Part a question image 3 caption", { exact: true }).fill("Edited caption");
    await page.waitForFunction(() => { const b = window.__draft.content.sections[0].parts[0].blocks[4]; return b.alt === "Edited alt" && b.caption === "Edited caption"; });
    const equation = question.getByLabel("Part a question equation 1", { exact: true });
    await equation.waitFor();
    let now = await partA();
    assert.deepEqual(now[0], before[0], "the question text is identical");
    assert.deepEqual(now[1], before[1], "the first picture is identical");
    assert.deepEqual(now[2], before[2], "the equation is identical until it is edited");
    // Move the text block up, then remove the picture, then add a text block and an equation.
    await question.getByRole("button", { name: "Move Part a question block 2 up", exact: true }).click();
    now = await partA();
    assert.deepEqual(kinds(now), ["text", "image", "text", "math", "image"], "the text moved above the equation, the question's own blocks stayed");
    await question.getByRole("button", { name: "Move Part a question block 1 down", exact: true }).click();
    await question.getByRole("button", { name: "Delete Part a question block 3", exact: true }).click();
    now = await partA();
    assert.deepEqual(kinds(now), ["text", "image", "math", "text"], "the picture is gone");
    await question.getByRole("button", { name: /Add text to part a question/ }).click();
    await question.getByRole("button", { name: /Add equation to part a question/ }).click();
    now = await partA();
    assert.deepEqual(kinds(now), ["text", "image", "math", "text", "text", "math"], "a text block and an equation were added at the end");
    await page.getByText("More question blocks for part a (4)", { exact: true }).waitFor();
    // The worked solution: edit a caption, move and remove, and the first text is left alone.
    await goStep(page, "Worked solution");
    const solutionBefore = await page.evaluate(() => window.__draft.privateParts[0].solution);
    await solution.getByLabel("Part a more solution image 2 caption", { exact: true }).fill("New solution caption");
    await page.waitForFunction(() => window.__draft.privateParts[0].solution[2].caption === "New solution caption");
    await solution.getByRole("button", { name: "Move Part a more solution block 3 up", exact: true }).click();
    let sol = await page.evaluate(() => window.__draft.privateParts[0].solution);
    assert.deepEqual(sol.map((b) => b.kind), ["text", "math", "text", "image"], "the last text moved above the picture");
    assert.deepEqual(sol[0], solutionBefore[0], "the worked solution's own text is identical");
    await solution.getByRole("button", { name: "Delete Part a more solution block 1", exact: true }).click();
    sol = await page.evaluate(() => window.__draft.privateParts[0].solution);
    assert.equal(sol.length, 3);
    assert.deepEqual(sol[0], solutionBefore[0]);
    // The caption of the main picture and of the part's first picture, closed when empty and open when there is one. They are on Question.
    await goStep(page, "Question");
    const main = page.locator('section[data-tour="studio-main"]');
    assert.equal(await main.locator("details", { has: page.locator("summary", { hasText: "Caption" }) }).evaluate((el) => el.open), true, "a caption that exists is shown");
    await main.getByLabel("Caption for the main question", { exact: true }).fill("Figure 2");
    await page.waitForFunction(() => window.__draft.content.context[1].caption === "Figure 2");
    const ctx = await page.evaluate(() => window.__draft.content.context);
    assert.deepEqual(kinds(ctx), ["text", "image", "math"], "the main picture's other fields are kept");
    // 44px targets and 16px text in the part's More options on every step it is on, no sideways scroll.
    const found = [];
    for (const name of ["Question", "Answer", "Worked solution"]) {
      await goStep(page, name);
      if (!(await partOptions().evaluate((el) => el.parentElement.open))) await partOptions().click();
      found.push(...(await partOptions().evaluate((summary) => {
      const out = [];
      for (const el of summary.parentElement.querySelectorAll("*")) {
        if (!el.getClientRects().length) continue;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) && el.type !== "checkbox" && el.type !== "radio";
        const base = el.closest(".katex") ?? el.closest("math");
        const size = parseFloat(getComputedStyle(base ?? el).fontSize);
        if (own && size < 16) out.push(`text ${size}px ${el.tagName} ${el.textContent.trim().slice(0, 30)}`);
        if (el.matches("button,select,textarea,input:not([type=hidden]),summary")) {
          const box = el.getBoundingClientRect();
          if (box.height < 43.5) out.push(`target ${Math.round(box.height)}px ${el.tagName} ${(el.getAttribute("aria-label") || el.textContent).trim().slice(0, 30)}`);
        }
      }
      return out;
    })).map((line) => `${name}: ${line}`));
    }
    assert.deepEqual(found, [], "small text or targets in the part's More options");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "no sideways scroll");
    checks++;
    await context.close();
  }

  // 12b. In the files view, which a problem with a picture opens in, the question's extra text and equations are under its pictures, and no picture has two editors.
  {
    const { context, page } = await open("draft", { width: 390, extra: "&blocks=1" });
    const untouched = await page.evaluate(() => structuredClone(window.__draft.content));
    await page.getByText("More question blocks for part a (2)", { exact: true }).click();
    await page.getByLabel("Part a question text 2", { exact: true }).fill("Edited in files view");
    await page.waitForFunction(() => window.__draft.content.sections[0].parts[0].blocks[3].spans[0].text === "Edited in files view");
    const after = await page.evaluate(() => window.__draft.content.sections[0].parts[0].blocks);
    for (const i of [0, 1, 2, 4]) assert.deepEqual(after[i], untouched.sections[0].parts[0].blocks[i], `block ${i} is identical`);
    // One editor for each picture: the description of every picture is in exactly one box, and the group has no upload.
    const alts = await page.evaluate(() => ["Diagram a", "Extra picture a"].map((alt) => [...document.querySelectorAll("input")].filter((el) => el.value === alt && el.getClientRects().length).length));
    assert.deepEqual(alts, [1, 1], "each picture has one description box");
    const group = page.locator("details", { has: page.locator("summary", { hasText: "More question blocks for part a" }) }).last();
    assert.equal(await group.locator('input[type="file"]').count(), 0, "the group cannot add a picture");
    assert.equal(await group.getByText(/Image \d/).count(), 0, "the group lists no picture");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "no sideways scroll");
    checks++;
    await context.close();
  }

  // 12c. A step that would put an extra text block above the question's text is disabled, and the question stays the question.
  {
    const { context, page } = await open("draft", { width: 390, extra: "&blocks=1&order=1", session: ["physcratic.studio.files.v1:browser-author:00000000-0000-4000-8000-000000000001", "text"], step: "Question" });
    await page.locator('[data-studio-step]:not([hidden]) summary[aria-label^="More options for part a"]').click();
    const group = page.locator("details", { has: page.locator("summary", { hasText: "More question blocks for part a" }) }).last();
    await group.locator("summary").click();
    assert.equal(await group.getByRole("button", { name: "Move Part a question block 2 up", exact: true }).isDisabled(), true, "the extra text cannot go above the question");
    assert.equal(await group.getByRole("button", { name: "Move Part a question block 1 down", exact: true }).isDisabled(), true, "and the equation cannot go below it");
    const read = () => page.evaluate(() => window.__draft.content.sections[0].parts[0].blocks.map((b) => b.spans?.[0]?.text ?? b.latex));
    assert.deepEqual(await read(), ["x=1", "QUESTION", "extra text"]);
    // Removing the equation above the question does not put the extra text in front of it.
    await group.getByRole("button", { name: "Delete Part a question block 1", exact: true }).click();
    assert.deepEqual(await read(), ["QUESTION", "extra text"], "the question is still first");
    checks++;
    await context.close();
  }

  // 12d. Opening a draft that has every block type, in either view, and saving it with and without an edit leaves the saved content equal to the original.
  for (const [view, session] of [["text view", ["physcratic.studio.files.v1:browser-author:00000000-0000-4000-8000-000000000001", "text"]], ["files view", null]]) {
    const { context, page } = await open("draft", { width: 390, extra: "&blocks=2", session });
    await page.waitForTimeout(600);
    const same = async (what) => {
      const [saved, original] = await page.evaluate(() => [window.__saved(), window.__original]);
      assert.deepEqual(saved, original, `${view}: ${what}`);
    };
    await same("opened and saved");
    await page.evaluate(() => window.__noopEdit());
    await same("after an edit that changes nothing");
    if (session) await page.locator('[data-studio-step]:not([hidden]) summary[aria-label^="More options for part a"]').click();
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
    await page.waitForTimeout(300);
    await same("with every group open");
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = false; }));
    await page.evaluate(() => window.__noopEdit());
    await same("with every group closed again");
    checks++;
    await context.close();
  }

  // 12e. The More options summary on each step counts the extra blocks that step holds, for several parts and for one,
  // and says nothing when there are none.
  {
    const { context, page } = await open("draft", { width: 390, extra: "&blocks=1", session: ["physcratic.studio.files.v1:browser-author:00000000-0000-4000-8000-000000000001", "text"], step: "Question" });
    const on = (step, name) => page.locator(`[data-studio-step="${step}"] summary[aria-label="${name}"]`);
    await on("question", "More options for part a (3 more blocks)").waitFor();
    await on("worked-solution", "More options for part a (3 more blocks)").waitFor({ state: "attached" });
    await on("answer", "More options for part a").waitFor({ state: "attached" });
    for (const step of ["question", "answer", "worked-solution"]) await on(step, "More options for part b").waitFor({ state: "attached" });
    assert.equal(await on("question", "More options for part a (3 more blocks)").innerText(), "More options for part a (3 more blocks)", "the visible words are the name");
    await context.close();
    const one = await open("draft", { width: 390, extra: "&blocks=1&single=1", session: ["physcratic.studio.files.v1:browser-author:00000000-0000-4000-8000-000000000001", "text"] });
    await one.page.locator('[data-studio-step="question"] summary[aria-label="More options (3 more blocks)"]').waitFor({ state: "attached" });
    await one.page.locator('[data-studio-step="worked-solution"] summary[aria-label="More options (3 more blocks)"]').waitFor({ state: "attached" });
    await one.context.close();
    const none = await open("draft", { width: 390 });
    await none.page.locator('[data-studio-step]:not([hidden]) summary[aria-label="More options"]').waitFor();
    await none.context.close();
    checks++;
  }

  // 12f. While the problem is not saved yet, the groups cannot upload a picture, and the caption fields have one name each.
  {
    const { context, page } = await open("draft", { width: 390, extra: "&blocks=1&provisional=1", session: ["physcratic.studio.files.v1:browser-author:00000000-0000-4000-8000-000000000001", "text"] });
    await page.locator('[data-studio-step]:not([hidden]) summary[aria-label^="More options for part a"]').click();
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
    const files = page.locator('details:has(> summary:text-matches("More (question|worked solution) blocks")) input[type="file"]');
    const n = await files.count();
    assert.ok(n >= 2, `the groups have upload controls (${n})`);
    for (let i = 0; i < n; i++) assert.equal(await files.nth(i).isDisabled(), true, `upload ${i} is disabled while the problem is not saved`);
    await context.close();
    const saved = await open("draft", { width: 390, extra: "&blocks=1", session: ["physcratic.studio.files.v1:browser-author:00000000-0000-4000-8000-000000000001", "text"] });
    await saved.page.locator('[data-studio-step]:not([hidden]) summary[aria-label^="More options for part a"]').click();
    await saved.page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
    const enabled = saved.page.locator('details:has(> summary:text-matches("More (question|worked solution) blocks")) input[type="file"]');
    assert.equal(await enabled.first().isDisabled(), false, "and enabled once it is");
    // Every caption input in the whole problem, on every step and in every group, has its own name.
    const names = await saved.page.evaluate(() => [...document.querySelectorAll("[data-studio-step] input")].map((el) => el.getAttribute("aria-label") || (el.labels?.[0]?.textContent ?? "")).filter((t) => /^Caption/.test(t)));
    assert.equal(new Set(names).size, names.length, `each caption input has its own name: ${names.join(" | ")}`);
    assert.ok(names.includes("Caption for the main question") && names.includes("Caption for part a"));
    await saved.context.close();
    checks++;
  }

  // 13. The only section can be given a title and shared text without adding a second section first.
  {
    const { context, page } = await open("draft", { width: 390, step: "Details" });
    await page.locator('summary[aria-label="More options for the whole problem"]').click();
    assert.equal(await page.getByLabel("Section 1 title", { exact: true }).count(), 0, "the empty only section shows no fields");
    await page.getByRole("button", { name: "Give the section a title or shared text", exact: true }).click();
    await page.getByLabel("Section 1 title", { exact: true }).fill("Setup");
    await page.waitForFunction(() => window.__draft.content.sections[0].title === "Setup");
    await page.getByRole("button", { name: /Add text to section 1 context/ }).click();
    await page.waitForFunction(() => window.__draft.content.sections[0].blocks.length === 1);
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
