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

async function noSidewaysScroll(page, where) {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok(scroll <= inner, `${where}: page scrolls sideways (${scroll} > ${inner})`);
}
async function tapTarget(locator, where) {
  const box = await locator.first().boundingBox();
  ok(box && box.height >= 43.5 && box.width >= 43.5, `${where}: tap target is ${box?.width}x${box?.height}, needs 44x44`);
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
    const arenaInput = page.locator("#step-answer input[type=text], #step-answer input:not([type])").first();
    await arenaInput.fill(fixtures.arena.wrongAnswer);
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.locator('#step-answer [aria-live="polite"]').getByText(/Not correct|to revisit|Could not/).first().waitFor();
    await noSidewaysScroll(page, `arena ${tag}`);
    await shot(page, `03-arena-wrong-${tag}`);
    await solutionTab.click();
    await page.locator('[role="tabpanel"]:visible').getByText("Contains spoilers", { exact: false }).waitFor();
    await noSidewaysScroll(page, `arena solution ${tag}`);
    await shot(page, `03a-arena-solution-${tag}`);
    await statementTab.click();

    // 3b. Olympiad archive reader: steps are labelled and the solution tab stays closed until asked for.
    await page.goto(`${origin}/dashboard/problems/${fixtures.archive.id}`);
    const archiveTabs = page.getByRole("tablist", { name: "Problem steps" });
    await archiveTabs.waitFor({ timeout: 30000 });
    const tabNames = await archiveTabs.getByRole("tab").allInnerTexts();
    ok(tabNames.length === 3 && /^1\s*Problem statement/.test(tabNames[0].replace(/\n/g, " ")), `archive tabs follow the steps (${tag})`);
    await tapTarget(archiveTabs.getByRole("tab").first(), `archive tab ${tag}`);
    ok(await page.getByRole("tab", { name: "Your solution", exact: true }).count() === 1, `Your solution tab keeps its name (${tag})`);
    await noSidewaysScroll(page, `archive ${tag}`);
    await shot(page, `03b-archive-${tag}`);

    // 4. Practice problem: wrong answer, hint, right answer, solution, next problem.
    const practice = fixtures.practice;
    await page.goto(`${origin}/dashboard/problems/${practice.id}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const steps = page.getByRole("list", { name: "Steps" }).getByRole("listitem");
    assert.equal(await steps.count(), 4); checks++;
    await shot(page, `04-practice-start-${tag}`);
    const check = page.getByRole("button", { name: "Check answer" });
    ok(await check.isDisabled(), `Check answer is off until something is typed (${tag})`);
    const input = page.getByRole("textbox", { name: /Final answer/ });
    await tapTarget(input, `answer input ${tag}`);
    await input.fill(practice.wrongAnswer);
    await tapTarget(check, `Check answer ${tag}`);
    await check.click();
    const live = page.locator('#step-answer [aria-live="polite"]');
    await live.getByText("Not correct yet").waitFor();
    ok(await live.locator("svg").count() > 0, `feedback has an icon (${tag})`);
    ok(await page.locator("#step-answer").getByText("Not correct.").count() > 0, `answer box shows words next to the input (${tag})`);
    await live.getByRole("button", { name: "Try again" }).waitFor();
    ok(await input.inputValue() === practice.wrongAnswer, `answer kept before Try again (${tag})`);
    await live.getByRole("button", { name: "Try again" }).click();
    ok(await input.evaluate((el) => el === document.activeElement), `Try again focuses the answer without clearing it (${tag})`);
    ok(await input.inputValue() === practice.wrongAnswer, `Try again keeps the answer (${tag})`);
    await shot(page, `05-practice-wrong-${tag}`);

    ok(await page.locator("#problem-hint").count() === 0, `hint is collapsed at first (${tag})`);
    await live.getByRole("button", { name: "See hint" }).click();
    await page.locator("#problem-hint").waitFor();
    ok((await page.locator("#problem-hint").innerText()).trim().length > 0, `hint has text (${tag})`);
    ok(await page.locator("#worked-solution").count() === 0, `solution is collapsed until asked for or solved (${tag})`);
    await shot(page, `06-practice-hint-${tag}`);

    await input.fill(practice.rightAnswer);
    await check.click();
    await live.getByText("Correct", { exact: true }).waitFor();
    await page.locator("#worked-solution").waitFor();
    await shot(page, `07-practice-correct-${tag}`);
    const solutionToggle = page.getByRole("button", { name: /(Show|Hide) solution/ });
    await solutionToggle.click();
    await page.locator("#worked-solution").waitFor({ state: "detached" });
    await solutionToggle.click();
    await page.locator("#worked-solution").waitFor();
    await tapTarget(solutionToggle, `solution button ${tag}`);
    await noSidewaysScroll(page, `practice ${tag}`);

    const here = new URL(page.url()).pathname;
    await live.getByRole("link", { name: "Next problem" }).click();
    await page.waitForURL((url) => url.pathname !== here && url.pathname.startsWith("/dashboard/problems/"));
    await page.getByRole("heading", { level: 1 }).waitFor();
    await shot(page, `08-next-problem-${tag}`);
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
    await page.getByRole("textbox", { name: /Final answer/ }).fill(fixtures.practice.wrongAnswer);
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.getByText("Not correct yet").waitFor();
    await top(page.locator("#step-answer"));
    await save("practice-steps-feedback");
    await page.goto(`${origin}/dashboard/problems/${fixtures.arena.id}`);
    await page.locator(".arena-document h3 > span").first().waitFor();
    await top(page.locator(".arena-document h3 > span").first().locator("xpath=ancestor::section[1]"));
    await save("arena-parts");
    await page.goto(origin + "/dashboard?view=problems&collection=pilot");
    await page.getByRole("button", { name: /^Exercise:/ }).first().click();
    await page.getByRole("heading", { name: "Step 1: Read the problem" }).waitFor();
    await top(page.getByRole("list", { name: "Steps" }));
    await save("guided-reader");
    await context.close();
  }
  console.log(`first-time-user: ${checks} checks passed`);
} finally {
  await browser.close();
}
