// First-time-user check. Run against a local production build with no database:
//   BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 SHOT_DIR=/some/dir node tests/first-time-user.browser.mjs
// AUTHORING_BROWSER_TOOLS and CHROMIUM_PATH work as in the other browser tests. Not run by CI.
// Fixtures: tests/fixtures/first-time-user.json. Grading is the real /api/archive-grade route.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const require = process.env.AUTHORING_BROWSER_TOOLS
  ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"))
  : createRequire(import.meta.url);
const { chromium } = require("playwright");
const fixtures = JSON.parse(readFileSync(new URL("./fixtures/first-time-user.json", import.meta.url), "utf8"));
const origin = process.env.BROWSER_TEST_ORIGIN || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const shotDir = process.env.SHOT_DIR;
if (shotDir) mkdirSync(shotDir, { recursive: true });
const themes = (process.env.THEMES || "light").split(",");

let checks = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});

/** Types into a MathLive field the way a person does. MathLive needs a moment after a click before it takes keys. */
async function typeMath(page, field, keys) {
  await field.click();
  await page.waitForTimeout(500);
  for (const key of keys) {
    if (key.length > 1 && /^(Arrow|Backspace|Enter|Tab)/.test(key)) await page.keyboard.press(key);
    else await page.keyboard.type(key, { delay: 30 });
  }
}

async function noSidewaysScroll(page, where) {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok(scroll <= inner, `${where}: page scrolls sideways (${scroll} > ${inner})`);
}
async function tapTarget(locator, where) {
  const box = await locator.first().boundingBox();
  ok(box && box.height >= 43.5 && box.width >= 43.5, `${where}: tap target is ${box?.width}x${box?.height}, needs 44x44`);
}
// Arena "Mind the Gap" has two parts: a is an expression (always a math field) and b is a plain numeric textbox.
async function answerArenaRight(page, input, practice) {
  const mathField = page.locator("#step-answer math-field").first();
  await mathField.waitFor({ state: "attached", timeout: 30000 });
  await mathField.evaluate((field, latex) => {
    field.setValue(latex);
    field.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }, String.raw`\sqrt{\frac{m\lambda}{1/R_1-1/R_0}}`);
  await input.fill(practice.rightAnswer);
}
// The math field and its Math Pad are both still there, and the plain fallback box is not.
async function mathFieldIsThere(page, where) {
  const field = page.locator("#step-answer math-field").first();
  await field.waitFor({ state: "attached", timeout: 30000 });
  ok(await page.locator("#step-answer math-field").count() === 1, `${where}: part a is a math field`);
  ok(await page.locator("#step-answer").getByText("The math editor could not load").count() === 0, `${where}: no plain fallback box`);
  ok(await page.locator('#step-answer [aria-label="Insert symbols and functions"]').first().isVisible(), `${where}: the Math Pad is shown`);
  return field.evaluate((element) => element.value);
}
async function shot(page, name) {
  if (shotDir) await page.screenshot({ path: join(shotDir, `${name}.png`), fullPage: true });
}

try {
  for (const theme of themes) for (const width of fixtures.widths) {
    const tag = `${width}-${theme}`;
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript((value) => { try { localStorage.setItem("theme", value); } catch {} }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    // 1. Library: open it and find problems.
    await page.goto(origin + fixtures.library.path);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await noSidewaysScroll(page, `library ${tag}`);
    // MathLive is loaded only where there is an answer box. The library and the lobby have none.
    ok(await page.evaluate(() => !customElements.get("math-field")), `MathLive is not loaded on the library (${tag})`);
    await page.goto(`${origin}/dashboard`);
    await page.getByRole("heading", { name: "Recommended problem" }).waitFor();
    await page.waitForTimeout(1500);
    ok(await page.evaluate(() => !customElements.get("math-field")), `MathLive is not loaded on the lobby (${tag})`);
    await page.goto(origin + fixtures.library.path);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await shot(page, `01-library-${tag}`);

    // 2. Library: filter by a topic with the chips.
    const group = page.getByRole("group", { name: "Topic" });
    const chip = group.getByRole("button", { name: fixtures.library.topic, exact: true });
    await chip.waitFor();
    await tapTarget(chip, `topic chip ${tag}`);
    const row = group.locator("div.overflow-x-auto");
    const [rowScroll, rowWidth] = await row.evaluate((el) => [el.scrollWidth, el.clientWidth]);
    if (width <= 430) {
      ok(rowScroll > rowWidth, `chip row scrolls inside its own box at ${width}px (${rowScroll} > ${rowWidth})`);
      await group.getByTestId("topic-fade-end").waitFor();
      ok(await group.getByTestId("topic-fade-start").count() === 0, `no start fade before scrolling (${tag})`);
      // Keyboard: Tab from the first chip to the last one. The row scrolls to show it and a start fade appears.
      await group.getByRole("button").first().focus();
      const chipCount = await group.getByRole("button").count();
      for (let i = 1; i < chipCount; i++) await page.keyboard.press("Tab");
      const last = group.getByRole("button").last();
      ok(await last.evaluate((el) => el === document.activeElement), `last chip reached with the keyboard (${tag})`);
      await last.evaluate((el) => new Promise((resolve) => {
        const start = Date.now();
        const tick = () => { const a = el.getBoundingClientRect(), b = el.parentElement.getBoundingClientRect(); if ((a.right <= b.right + 1 && a.left >= b.left - 1) || Date.now() - start > 3000) resolve(); else requestAnimationFrame(tick); };
        tick();
      }));
      const inside = await last.evaluate((el) => { const a = el.getBoundingClientRect(), b = el.parentElement.getBoundingClientRect(); return a.right <= b.right + 1 && a.left >= b.left - 1; });
      ok(inside, `focused chip is scrolled into view (${tag})`);
      await group.getByTestId("topic-fade-start").waitFor();
    } else {
      ok(rowScroll <= rowWidth + 1, `all chips fit at ${width}px (${tag})`);
    }
    await noSidewaysScroll(page, `library chips ${tag}`);
    // Tab order: each library card is one tab stop. Show all topics, then walk from card to card with the keyboard.
    await group.getByRole("button", { name: "All topics" }).click();
    await page.locator("[data-problem-card]").nth(2).waitFor({ timeout: 20000 });
    const cards = page.locator("[data-problem-card]");
    for (let i = 0; i < 3; i++) {
      const controls = await cards.nth(i).locator("a[href], button:not([disabled]), input, select, textarea, summary, [tabindex]:not([tabindex='-1'])").count();
      // One Open problem action, plus one real button for each tag, so a tag can filter the list.
      const tagButtons = await cards.nth(i).locator("button[aria-label^='Filter by ']").count();
      ok(controls === 1 + tagButtons, `library card ${i + 1} has one Open problem action and a button per tag (${tagButtons}), found ${controls} tab stops (${tag})`);
    }
    await cards.nth(0).getByRole("link", { name: /^Open problem:/ }).focus();
    // Tab goes through the tags of card 1, then lands on Open problem in card 2.
    const tagsInCard1 = await cards.nth(0).locator("button[aria-label^='Filter by ']").count();
    for (let i = 0; i < tagsInCard1; i++) {
      await page.keyboard.press("Tab");
      ok(await page.evaluate(() => /^Filter by /.test(document.activeElement?.getAttribute("aria-label") ?? "")), `Tab reaches a tag button of card 1 (${tag})`);
    }
    await page.keyboard.press("Tab");
    ok(await cards.nth(1).evaluate((el) => el.contains(document.activeElement)), `Tab from card 1 lands in card 2 (${tag})`);
    ok(await page.evaluate(() => /^Open problem:/.test(document.activeElement?.getAttribute("aria-label") ?? "")), `the focused control is Open problem (${tag})`);
    const tagsInCard2 = await cards.nth(1).locator("button[aria-label^='Filter by ']").count();
    for (let i = 0; i < tagsInCard2; i++) await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    ok(await cards.nth(2).evaluate((el) => el.contains(document.activeElement)), `Tab from card 2 lands in card 3 (${tag})`);
    await group.getByRole("button", { name: fixtures.library.topic, exact: true }).click();

    await chip.click();
    ok(await chip.getAttribute("aria-pressed") === "true", `topic chip is pressed (${tag})`);
    ok(await group.getByRole("button", { name: "All topics" }).getAttribute("aria-pressed") === "false", `All topics is not pressed (${tag})`);
    await page.locator("#arena-results").waitFor();
    await page.locator("[data-problem-card]").first().waitFor({ timeout: 20000 });
    await noSidewaysScroll(page, `library filtered ${tag}`);
    await shot(page, `02-library-filtered-${tag}`);

    // 3. Arena problem: open, read the steps, check a wrong answer.
    await page.goto(`${origin}/dashboard/problems/${fixtures.arena.id}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.getByRole("list", { name: "Steps" }).waitFor();
    await page.getByRole("button", { name: "Check answer" }).waitFor();
    // The worked solution stays on its own tab until it is asked for, as before.
    const statementTab = page.getByRole("tab", { name: "Problem statement", exact: true });
    const solutionTab = page.getByRole("tab", { name: "Worked solution", exact: true });
    await tapTarget(solutionTab, `arena solution tab ${tag}`);
    ok(await page.locator('[role="tabpanel"]:visible').count() === 1, `only the statement panel is visible at first (${tag})`);
    // Lettered parts such as (a) keep their letter as text and get a colour chip.
    const partChips = page.locator(".arena-document h3 > span");
    ok(await partChips.count() > 0, `lettered parts have chips (${tag})`);
    ok(/^\([a-z]\)$/.test((await partChips.first().innerText()).trim()), `part chip keeps its letter (${tag})`);
    const arenaField = page.locator("#step-answer math-field").first();
    await arenaField.waitFor({ timeout: 20000 });
    ok(await page.evaluate(() => Boolean(customElements.get("math-field"))), `MathLive loads on a problem with an answer box (${tag})`);
    await typeMath(page, arenaField, [fixtures.arena.wrongAnswer]);
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.locator('#step-answer [aria-live="polite"]').getByText(/Not correct|to revisit|Could not/).first().waitFor();
    await noSidewaysScroll(page, `arena ${tag}`);
    await shot(page, `03-arena-wrong-${tag}`);
    await solutionTab.click();
    await page.locator('[role="tabpanel"]:visible').getByText("Contains spoilers", { exact: false }).waitFor();
    await noSidewaysScroll(page, `arena solution ${tag}`);
    await shot(page, `03a-arena-solution-${tag}`);
    await statementTab.click();

    // 3a. arena-a-grin-and-a-wiggle part (a): one answer composed with the palette, one typed. Both are marked correct.
    {
      const partA = "a.trajectory";
      const resultOf = () => page.locator(`[id$="${partA}-result"]`);
      const openPartA = async () => {
        await page.goto(`${origin}/dashboard/problems/arena-a-grin-and-a-wiggle`);
        const field = page.locator("#step-answer math-field").first();
        await field.waitFor({ timeout: 20000 });
        const fieldId = await field.getAttribute("id");
        return { field, palette: page.locator(`[data-field="${fieldId}"] [data-palette]`), fieldId };
      };
      const checkPartA = async () => {
        await page.getByRole("button", { name: "Check answer" }).click();
        await resultOf().waitFor({ timeout: 20000 });
      };
      // With the palette: fraction, theta0, next box, k, out of the fraction, sin, k, z, out of the brackets, +, r0, cos, k, z.
      {
        const { field, palette, fieldId } = await openPartA();
        await field.click();
        await page.waitForTimeout(500);
        const pad = page.locator(`[data-field="${fieldId}"] [data-math-pad]`);
        // The pad opens on the Problem tab. A button on another tab is found by opening the tabs one by one.
        const inField = (name) => ({
          click: async () => {
            const button = pad.locator(`button[aria-label="${name}"]`);
            if (!(await button.count())) for (const tab of await pad.getByRole("tab").all()) { await tab.click(); if (await button.count()) break; }
            await button.first().click();
          },
        });
        ok(await pad.isVisible(), `the pad opens under the field being typed in (${tag})`);
        assert.deepEqual(await pad.getByRole("tab").allTextContents(), ["Problem", "Operations", "Greek", "Trig", "Other"]); checks++;
        ok(await pad.getByRole("tab", { name: "Problem" }).getAttribute("aria-selected") === "true", `the Problem tab is first and open (${tag})`);
        const labels = await palette.evaluateAll((els) => els.slice(0, 4).map((el) => el.getAttribute("aria-label")));
        assert.deepEqual(labels, ["r₀ symbol", "k symbol", "z symbol", "θ₀ symbol"]); checks++;
        await inField("a/b fraction").click();
        await inField("θ₀ symbol").click();
        await page.keyboard.press("ArrowRight");
        await inField("k symbol").click();
        await page.keyboard.press("ArrowRight");
        await inField("sin sine").click();
        await inField("k symbol").click();
        await inField("z symbol").click();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.type("+");
        await inField("r₀ symbol").click();
        await inField("cos cosine").click();
        await inField("k symbol").click();
        await inField("z symbol").click();
        const composed = await field.evaluate((el) => el.value);
        ok(/\\frac\{\\theta_\{?0\}?\}\{k\}\\sin.*kz.*\+r_\{?0\}?\\cos.*kz/.test(composed.replace(/\\left|\\right/g, "")), `the palette composed the answer: ${composed} (${tag})`);
        await checkPartA();
        ok(/^Correct/.test((await resultOf().innerText()).trim()), `part (a) entered with the palette is marked correct (${tag})`);
        await shot(page, `03b-arena-part-a-palette-${tag}`);
      }
      // By typing, as in the solution: r_0 cos(kz) + theta_0 sin(kz) / k.
      {
        const { field } = await openPartA();
        await typeMath(page, field, ["r", "_", "0", "ArrowRight", "cos(kz)", "+", "theta", "_", "0", "ArrowRight", "sin(kz)", "/", "k"]);
        const typed = await field.evaluate((el) => el.value);
        ok(/\\theta/.test(typed) && /\\frac/.test(typed) && /\\cos/.test(typed), `typing built the answer: ${typed} (${tag})`);
        await checkPartA();
        ok(/^Correct/.test((await resultOf().innerText()).trim()), `part (a) entered by typing is marked correct (${tag})`);
        await shot(page, `03c-arena-part-a-typed-${tag}`);
      }
      // The same part with the letter o is refused, naming the symbol, next to the answer.
      {
        const { field } = await openPartA();
        await typeMath(page, field, ["r", "_", "o", "ArrowRight", "cos(kz)"]);
        // A moment after typing stops, the same words appear under the field, before anything is checked.
        await page.locator(`[data-field] [role="status"]`).filter({ hasText: "r_o isn't used here. Did you mean r₀?" }).first().waitFor({ timeout: 8000 });
        ok(true, `the symbol hint appears under the field before checking (${tag})`);
        await checkPartA();
        const text = (await resultOf().innerText()).trim();
        ok(/r_o isn't used here\. Did you mean r₀\?/.test(text), `the checker's message about the letter o is shown next to the answer: ${text} (${tag})`);
      }
    }

    // 3b. Olympiad archive reader: steps are labelled and the solution tab stays closed until asked for.
    await page.goto(`${origin}/dashboard/problems/${fixtures.archive.id}`);
    const archiveTabs = page.getByRole("tablist", { name: "Problem steps" });
    await archiveTabs.waitFor({ timeout: 30000 });
    const tabNames = await archiveTabs.getByRole("tab").allInnerTexts();
    // The unified workspace (#137) keeps Your solution on the page as step 2, so the tabs are the statement (1) and the worked solution (4).
    ok(tabNames.length === 2 && /^1\s*Problem statement/.test(tabNames[0].replace(/\n/g, " ")) && /^4\s*Worked solution/.test(tabNames[1].replace(/\n/g, " ")), `archive tabs follow the steps (${tag})`);
    await tapTarget(archiveTabs.getByRole("tab").first(), `archive tab ${tag}`);
    ok(await page.getByRole("region", { name: "Your solution", exact: true }).count() === 1, `Your solution stays on the page, named (${tag})`);
    await noSidewaysScroll(page, `archive ${tag}`);
    await shot(page, `03b-archive-${tag}`);

    // 4. Retained Arena numerical check, recovery, worked solution and next problem.
    const practice = fixtures.practice;
    await page.goto(`${origin}/dashboard/problems/${practice.id}`);
    const input = page.getByRole("textbox", { name: /Fitted lens radius/ });
    await input.waitFor();
    const check = page.getByRole("button", { name: "Check answer" });
    await shot(page, `04-arena-start-${tag}`);
    // Step 3 left a draft in part a, so it is restored non-empty. It must still open as a math field.
    ok((await mathFieldIsThere(page, `restored draft (${tag})`)) !== "", `the restored draft is in the math field (${tag})`);
    await answerArenaRight(page, input, practice);
    await input.fill(practice.wrongAnswer);
    await tapTarget(input, `Arena answer input ${tag}`);
    await tapTarget(check, `Arena check ${tag}`);
    await check.click();
    await page.getByText(/Not correct/).first().waitFor();
    ok(await input.inputValue() === practice.wrongAnswer, `wrong Arena work retained (${tag})`);
    ok((await mathFieldIsThere(page, `after a wrong check (${tag})`)).includes("sqrt"), `part a keeps its value after a wrong check (${tag})`);
    await shot(page, `05-arena-wrong-${tag}`);
    await input.fill(practice.rightAnswer);
    await check.click();
    await page.getByText("Correct", { exact: true }).first().waitFor();
    await page.reload({ waitUntil: "networkidle" });
    // A part checked correct is not kept as a saved answer (#148), so the box is empty after a reload. Enter it again to check.
    ok(await input.inputValue() === "", `a correct Arena part is not kept as a draft after reload (${tag})`);
    await mathFieldIsThere(page, `after reload (${tag})`);
    await answerArenaRight(page, input, practice);
    await check.click();
    await page.getByRole("link", { name: "Next problem", exact: true }).waitFor();
    const solution = page.getByRole("tab", { name: "Worked solution", exact: true });
    await solution.click();
    await page.getByText("Contains spoilers", { exact: false }).waitFor();
    await tapTarget(solution, `Arena solution tab ${tag}`);
    await noSidewaysScroll(page, `Arena answer ${tag}`);
    const here = new URL(page.url()).pathname;
    await page.getByRole("link", { name: "Next problem", exact: true }).click();
    await page.waitForURL(url => url.pathname !== here && url.pathname.startsWith("/dashboard/problems/arena-"));
    await page.getByRole("heading", { level: 1 }).waitFor();
    await shot(page, `08-next-arena-${tag}`);
    // 5. Contests. The contest list and the sign-in session come from database-backed APIs, so only /api/dashboard
    // (the shape of DashboardData in lib/dashboard-data.ts) and a signed-out /api/auth/get-session are mocked here.
    // Nothing else is stubbed.
    await page.route("**/api/auth/get-session*", (route) => route.fulfill({ json: null }));
    const day = 86_400_000;
    const contest = (id, name, offset, ids) => ({ id, name, description: `${name} description.`, startsAt: new Date(Date.now() + offset).toISOString(), durationMinutes: 120, rated: false, registrationOpen: true, problemIds: ids, creators: ["Physcratic"], participants: 12, registered: false });
    await page.route("**/api/dashboard", (route) => route.fulfill({ json: { user: null, savedAttempts: 0, practiceAttempts: 0, solvedProblems: 0, archiveReviewed: 0, ratings: [], contests: [contest("c-up", "Autumn contest", 3 * day, []), contest("c-past", "Spring contest", -30 * day, [practice.id, fixtures.arena.id])] } }));
    await page.goto(`${origin}/dashboard?view=contests`);
    await page.getByRole("heading", { name: "Spring contest" }).waitFor();
    await tapTarget(page.getByRole("link", { name: "Sign in to register" }), `contest sign in ${tag}`);
    await page.getByText("Practice 2 problems").click();
    await tapTarget(page.getByRole("link", { name: "Problem 1" }), `contest problem link ${tag}`);
    await noSidewaysScroll(page, `contests ${tag}`);
    await shot(page, `09-contests-${tag}`);
    assert.deepEqual(errors, []);
    await context.close();
  }
  // An open Guided exercise is the whole page, so its title is the one h1 and "Problems" steps aside.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(origin + "/dashboard?view=problems&collection=pilot");
    await page.getByRole("heading", { level: 1, name: "Problems" }).waitFor();
    await page.getByRole("button", { name: /^Open problem:/ }).first().click();
    await page.getByRole("heading", { name: "Step 1: Read the problem" }).waitFor();
    const titles = await page.getByRole("heading", { level: 1 }).allInnerTexts();
    ok(titles.length === 1 && titles[0].trim() !== "Problems" && titles[0].trim().length > 3, `an open Guided exercise has its title as the only h1 (${JSON.stringify(titles)})`);
    await context.close();
  }
  // Screenshots for the Learn guides. Only when GUIDE_SHOT_DIR is set. Light mode, 1280px wide, no database.
  if (process.env.GUIDE_SHOT_DIR) {
    mkdirSync(process.env.GUIDE_SHOT_DIR, { recursive: true });
    const context = await browser.newContext({ viewport: { width: fixtures.guide.width, height: fixtures.guide.height }, deviceScaleFactor: 1 });
    await context.addInitScript(() => { try { localStorage.setItem("theme", "light"); } catch {} });
    const page = await context.newPage();
    const save = (name) => page.screenshot({ path: join(process.env.GUIDE_SHOT_DIR, `${name}.png`) });
    const top = (locator) => locator.evaluate((el) => { window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 16); });
    // Without a database the collection reports that community problems are unavailable. Clear only that flag so the
    // guide picture shows the library as readers see it. The problems themselves are the real response.
    await page.route("**/api/arena/collection*", async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      json.authoredUnavailable = false;
      await route.fulfill({ response, json });
    });
    await page.goto(origin + fixtures.library.path);
    const group = page.getByRole("group", { name: "Topic" });
    await group.getByRole("button", { name: fixtures.guide.topic, exact: true }).click();
    await page.locator("[data-problem-card]").nth(2).waitFor({ timeout: 20000 });
    await top(page.getByRole("heading", { name: "Search & filters" }));
    await save("library-topic");
    await page.goto(`${origin}/dashboard/problems/${fixtures.practice.id}`);
    await page.getByRole("textbox", { name: /Fitted lens radius/ }).fill(fixtures.practice.wrongAnswer);
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.getByText(/Not correct/).first().waitFor();
    await top(page.locator("#step-answer"));
    await save("practice-steps-feedback");
    await page.goto(`${origin}/dashboard/problems/${fixtures.arena.id}`);
    await page.locator(".arena-document h3 > span").first().waitFor();
    await top(page.locator(".arena-document h3 > span").first().locator("xpath=ancestor::section[1]"));
    await save("arena-parts");
    await page.goto(origin + "/dashboard?view=problems&collection=pilot");
    await page.getByRole("button", { name: /^Open problem:/ }).first().click();
    await page.getByRole("heading", { name: "Step 1: Read the problem" }).waitFor();
    await top(page.getByRole("list", { name: "Steps" }));
    await save("guided-reader");
    await context.close();
  }
  console.log(`first-time-user: ${checks} checks passed`);
} finally {
  await browser.close();
}
