// The "drunk user" pass: each task a first-time visitor has, driven at 375px with touch taps, counting every tap.
// A tap is one tap on a button, link, tab, checkbox or field (a field counts once to focus it, typing is free).
//   BROWSER_TEST_ORIGIN=http://127.0.0.1:3100 node tests/drunk-user.browser.mjs
//   SESSION_COOKIE="name=value" adds the signed-in task (write and publish a problem). It needs the throwaway
//   PostgreSQL described in tests/solve-contrast.browser.mjs, never a real database.
// Exits 1 if a task fails, or needs more taps than its budget. The budget is the "after" number of Phase 9.
// Not run by CI. It needs a production build and a browser.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";
const arenaIds = JSON.parse(readFileSync(new URL("../lib/arena/index.json", import.meta.url), "utf8")).problems.map(p => p.id);

const require = process.env.AUTHORING_BROWSER_TOOLS ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json")) : createRequire(import.meta.url);
const { chromium } = require("playwright");
const origin = process.env.BROWSER_TEST_ORIGIN || "http://127.0.0.1:3000";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const sessionCookie = process.env.SESSION_COOKIE;

/** Taps before Phase 9, measured on 6b6abab. */
const BEFORE = { understand: 3, topic: 2, solve: 4, hint: 1, signUp: 6, publish: 8, coaching: 3 };
/** Taps allowed now. A task over its budget fails the run. */
// Account creation follows the restored Lobby menu, Sign in and Create an account path.
const BUDGET = { understand: 1, topic: 2, solve: 4, hint: 1, signUp: 8, publish: 8, coaching: 2 };

const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { executablePath: "/opt/pw-browsers/chromium" }) });
const results = [];

async function task(name, label, run, { signedIn = false } = {}) {
  if (signedIn && !sessionCookie) { results.push({ name, label, taps: "skipped (no SESSION_COOKIE)", ok: true }); return; }
  const context = await browser.newContext({ viewport: { width: 375, height: 760 }, hasTouch: true, isMobile: true });
  if (signedIn) { const [cookieName, ...value] = sessionCookie.split("="); await context.addCookies([{ name: cookieName, value: value.join("="), url: origin }]); }
  await context.addInitScript(ids => localStorage.setItem("physcratic.solved.v1", JSON.stringify(ids)), arenaIds.slice(1));
  if (!signedIn) {
    await context.route("**/api/auth/sign-up/email", route => route.fulfill({ status: 400, json: { message: "Synthetic test stops before account creation." } }));
    await context.route("**/api/auth/get-session*", route => route.fulfill({ json: null }));
    await context.route("**/api/dashboard", route => route.fulfill({ json: { user: null, savedAttempts: 0, practiceAttempts: null, solvedProblems: null, archiveReviewed: 0, ratings: [], contests: [] } }));
  }
  const page = await context.newPage();
  let taps = 0;
  const log = [];
  /** One tap. Fails loudly if the target is under another element or off the visible page after scrolling. */
  const tap = async (locator, what) => {
    await locator.first().waitFor({ timeout: 15000 });
    await locator.first().scrollIntoViewIfNeeded();
    await locator.first().tap({ timeout: 8000 });
    taps++; log.push(what);
    // A tap can start a navigation. Let it begin and finish, so the next step does not find a page that is going away.
    await page.waitForTimeout(500);
    await page.waitForLoadState("networkidle").catch(() => {});
  };
  try {
    await run({ page, tap, context });
    const budget = BUDGET[name];
    const ok = budget == null || taps <= budget;
    results.push({ name, label, taps, ok, log, note: ok ? "" : `over budget ${budget}` });
  } catch (error) {
    results.push({ name, label, taps, ok: false, log, note: String(error.message).split("\n")[0].slice(0, 200) });
  } finally { await context.close(); }
}

const home = async (page) => { await page.goto(origin + "/", { waitUntil: "networkidle" }); };

await task("understand", "Arrive at / and open a problem to try", async ({ page, tap }) => {
  await home(page);
  assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
  await tap(page.getByRole("link", { name: "Solve problem", exact: true }), "Solve problem");
  await page.waitForURL(/\/dashboard\/problems\//);
  await page.getByRole("button", { name: "Check answer" }).waitFor();
});

await task("topic", "Arrive at / and open a Waves problem", async ({ page, tap }) => {
  await home(page);
  const waves = page.locator('nav[aria-label="Practice and guides"]').getByRole("link", { name: "Waves", exact: true });
  const box = await waves.boundingBox();
  assert.ok(box && box.y + box.height <= 667, `the topic links are below the fold at 375x667 (Waves bottom at ${box && Math.round(box.y + box.height)}px)`);
  await tap(waves, "Waves link");
  await tap(page.locator("main a[href*='/dashboard/problems/']").first(), "first Waves problem");
  await page.waitForURL(/\/dashboard\/problems\//);
  await page.getByRole("heading", { level: 1 }).waitFor();
});

await task("solve", "Wrong answer, then the right one", async ({ page, tap }) => {
  await page.goto(`${origin}/dashboard/problems/arena-mind-the-gap`, { waitUntil: "networkidle" });
  const field = page.getByRole("textbox", { name: /Fitted lens radius/ });
  await tap(field, "answer field"); await page.keyboard.type("1");
  await tap(page.getByRole("button", { name: "Check answer" }), "Check answer");
  await page.getByText(/Not correct/).first().waitFor();
  await tap(field, "answer field again"); await page.keyboard.press("Control+A"); await page.keyboard.type("0.90");
  await tap(page.getByRole("button", { name: "Check answer" }), "Check answer");
  await page.getByText("Correct.", { exact: true }).first().waitFor();
  // Arena recovery keeps typed work, including a correct checked value, without resubmitting on reload.
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await field.inputValue(), "0.90", "checked Arena work survives reload");
  await field.fill("7");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await field.inputValue(), "7", "typed Arena work survives reload");

});

await task("hint", "Open the Arena worked solution", async ({ page, tap }) => {
  await page.goto(`${origin}/dashboard/problems/arena-mind-the-gap`, { waitUntil: "networkidle" });
  await tap(page.getByRole("tab", { name: "Worked solution", exact: true }), "Worked solution");
  await page.getByText("Contains spoilers", { exact: false }).waitFor();
});

await task("signUp", "Create an account (up to the Create account tap)", async ({ page, tap }) => {
  await home(page);
  await tap(page.getByRole("button", { name: "Menu", exact: true }), "Menu");
  await tap(page.getByRole("dialog").getByRole("link", { name: "Sign in", exact: true }), "Sign in");
  await tap(page.getByRole("link", { name: "Create an account", exact: true }), "Create an account");
  await page.waitForURL(/\/sign-up/);
  await tap(page.getByLabel("Name"), "name"); await page.keyboard.type("Test Person");
  await tap(page.getByLabel("Email"), "email"); await page.keyboard.type("test.person@example.invalid");
  await tap(page.getByLabel("Password", { exact: false }).first(), "password"); await page.keyboard.type("a long throwaway passphrase 1");
  await tap(page.getByRole("checkbox"), "terms");
  await tap(page.getByRole("button", { name: "Create account" }), "Create account");
});

await task("publish", "From the dashboard, write a problem and publish it", async ({ page, tap }) => {
  await page.goto(`${origin}/dashboard`, { waitUntil: "networkidle" });
  const menu = page.getByRole("button", { name: "Menu" });
  await tap(menu, "menu");
  await tap(page.getByRole("link", { name: /^Problem Studio/ }), "Problem Studio");
  await page.waitForURL(/\/dashboard\/author/);
  await tap(page.getByRole("textbox", { name: "What's the question?" }), "question");
  await page.keyboard.type("A 2 kg cart accelerates at 5 m/s2 on a frictionless track. Find the net force.", { delay: 2 });
  await tap(page.getByRole("textbox", { name: "Worked solution (required)" }), "worked solution");
  await page.keyboard.type("Newton's second law gives F = m a = 2 kg times 5 m/s2 = 10 N.", { delay: 2 });
  await tap(page.locator("[data-tour*='studio-answer'] math-field").first(), "final answer");
  await page.waitForTimeout(400);
  await page.keyboard.type("m*a");
  await tap(page.getByRole("radio", { name: /^Beginner/ }), "difficulty");
  await tap(page.getByLabel(/I wrote this problem and I'm happy to share it on Physcratic/), "rights");
  await page.getByText("All changes saved").first().waitFor({ timeout: 20000 });
  await tap(page.getByRole("button", { name: "Publish", exact: true }), "Publish");
  await page.getByText(/published|Published/).first().waitFor({ timeout: 20000 });
}, { signedIn: true });

await task("studioBack", "Studio: type, tap Back at once, reopen, the text is still there", async ({ page, tap }) => {
  await page.goto(`${origin}/dashboard/author`, { waitUntil: "networkidle" });
  const question = page.getByRole("textbox", { name: "What's the question?" }).first();
  await question.tap();
  await page.keyboard.type("Back test: a 3 kg block slides down a 30 degree ramp. Find its acceleration.", { delay: 2 });
  // Straight away, before the autosave timer fires. Back saves first, then leaves.
  await page.getByRole("button", { name: "← My drafts", exact: true }).tap();
  await page.getByRole("button", { name: /^Open/ }).first().waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /^Open/ }).first().tap();
  const again = page.getByRole("textbox", { name: "What's the question?" }).first();
  await again.waitFor({ timeout: 20000 });
  assert.match(await again.innerText(), /Back test: a 3 kg block slides down a 30 degree ramp/);
}, { signedIn: true });

await task("coaching", "Book a consultation", async ({ page, tap, context }) => {
  await home(page);
  await tap(page.getByRole("link", { name: "Coaching" }).first(), "Coaching");
  await page.waitForURL(/\/coaching/);
  await page.waitForLoadState("networkidle");
  const book = page.getByRole("link", { name: /^Book a consultation$/ });
  if (!(await book.count())) await tap(page.getByRole("radio").first(), "choose where you are");
  const popup = context.waitForEvent("page", { timeout: 8000 }).catch(() => null);
  await tap((await book.count()) ? book : page.getByRole("link", { name: /^Continue/ }), "booking button");
  const tab = await popup;
  assert.ok(tab, "the booking button opened no tab");
  // The booking button is above the fold at 375x667 (an iPhone SE), before any scrolling.
  await page.setViewportSize({ width: 375, height: 667 }); await page.reload({ waitUntil: "networkidle" });
  const box = await page.getByRole("link", { name: /^Book a consultation$/ }).first().boundingBox();
  assert.ok(box && box.y + box.height <= 667, `the booking button is below the fold (bottom at ${box && Math.round(box.y + box.height)}px)`);
  // A blocked tab shows the message and a button that opens the form.
  await page.evaluate(() => { window.open = () => null; });
  await page.getByRole("link", { name: /^Book a consultation$/ }).first().tap();
  await page.getByText("The booking form didn't load. Open it in a new tab.").waitFor({ timeout: 4000 });
  const again = context.waitForEvent("page", { timeout: 4000 }).catch(() => null);
  await page.getByRole("link", { name: "Open the booking form in a new tab" }).tap();
  assert.ok(await again, "the fallback button opened no tab");
  assert.match(tab.url(), /^https:\/\/tally\.so\/r\/XxZBr4|^about:blank|^chrome-error/);
});

await browser.close();
let failed = 0;
console.log("\ntask".padEnd(12) + "before".padEnd(8) + "after".padEnd(8) + "result");
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.name.padEnd(11)} ${String(BEFORE[r.name] ?? "-").padEnd(7)} ${String(r.taps).padEnd(7)} ${r.ok ? "ok" : "FAIL"} ${r.note ?? ""}\n    ${r.label}${r.log ? ": " + r.log.join(" > ") : ""}`);
}
process.exit(failed ? 1 : 0);
