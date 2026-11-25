// Problem Studio opens on My drafts. New problem opens a blank editor, back returns to the list, ?draft= opens that draft.
// Runs in the real workspace, API and disposable PostgreSQL of tests/problem-authoring.browser.mjs.
import assert from "node:assert/strict";
import { autoConfirm, setConfirmMode, confirmsAsked } from "./confirm-sheet.mjs";

const newProblem = (page) => page.getByRole("button", { name: "New problem", exact: true });
const editorMarks = (page) => [page.getByRole("button", { name: "Save now", exact: true }), page.getByRole("textbox", { name: "What's the question?" }).first()];

async function author(browser, origin, pool, id, width = 1440) {
  await pool.query('INSERT INTO "user"(id) VALUES($1) ON CONFLICT DO NOTHING', [id]);
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await context.addCookies([{ name: "studio_author", value: id, url: origin }]);
  // The Studio tour belongs to the editor. Mark it seen so it never covers the page under test.
  await context.addInitScript(() => localStorage.setItem("physcratic.tour.studio.v1", "seen"));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await autoConfirm(page);
  return { context, page, errors };
}
async function noEditor(page, label) {
  for (const mark of editorMarks(page)) assert.equal(await mark.count(), 0, `${label}: the editor is not on the page`);
  assert.equal(await page.locator("#simple-title").count(), 0, `${label}: no title field`);
}
async function saveDraft(page, title) {
  await newProblem(page).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.waitForURL((url) => url.searchParams.has("draft"));
  const id = new URL(page.url()).searchParams.get("draft");
  await page.getByText("All changes saved").first().waitFor();
  await page.getByRole("button", { name: "Back to drafts", exact: true }).click();
  await page.getByRole("heading", { level: 2, name: title, exact: true }).waitFor();
  return id;
}

export async function runStudioLandingBrowser({ browser, origin, pool }) {
  // 1. No drafts: a loading line first, then the empty state that points at New problem. No editor.
  {
    const { context, page, errors } = await author(browser, origin, pool, "pdf-studio-9101-light");
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route((url) => url.pathname === "/api/authored-problems/drafts", async (route) => {
      if (route.request().method() === "GET") await gate;
      await route.continue();
    });
    await page.goto(origin);
    await page.getByRole("heading", { level: 1, name: "Problem Studio", exact: true }).waitFor();
    await page.getByText("Loading your drafts", { exact: false }).first().waitFor();
    assert.equal(await newProblem(page).isDisabled(), true, "New problem waits for the list");
    await noEditor(page, "loading");
    release();
    await page.getByText("Press New problem above to write your first one.", { exact: true }).waitFor();
    await page.getByRole("heading", { level: 2, name: "No drafts yet", exact: true }).waitFor();
    assert.equal(await newProblem(page).isEnabled(), true);
    assert.ok((await newProblem(page).boundingBox()).height >= 44, "New problem keeps its 44px target");
    assert.equal(await page.getByRole("button", { name: /^(Create|Start|Write)/ }).count(), 0, "the empty state adds no button");
    assert.equal(new URL(page.url()).searchParams.has("draft"), false);
    await noEditor(page, "empty");
    await page.unroute((url) => url.pathname === "/api/authored-problems/drafts");
    // 2. New problem opens a blank editor with nothing to continue, and back returns to the list.
    await newProblem(page).click();
    await page.getByRole("button", { name: "Save now", exact: true }).waitFor();
    assert.equal(await page.locator("#simple-title").inputValue(), "", "the editor is blank");
    assert.equal(await page.getByRole("button", { name: /^Continue your last draft/ }).count(), 0);
    await page.getByRole("button", { name: "Back to drafts", exact: true }).click();
    await page.getByText("Press New problem above to write your first one.", { exact: true }).waitFor();
    await noEditor(page, "back from an unsaved blank editor");
    assert.deepEqual(errors, []);
    await context.close();
  }

  // 3. With drafts: the list and no editor. New problem is blank and still offers the last draft. ?draft= opens that draft.
  {
    const { context, page, errors } = await author(browser, origin, pool, "pdf-studio-9102-light");
    await page.goto(origin);
    await newProblem(page).waitFor();
    const first = await saveDraft(page, "Landing One");
    const second = await saveDraft(page, "Landing Two");
    assert.notEqual(first, second);
    await page.goto(origin);
    await page.getByRole("heading", { level: 1, name: "Problem Studio", exact: true }).waitFor();
    await page.getByText("2 drafts loaded", { exact: true }).waitFor();
    await page.getByRole("heading", { level: 2, name: "Landing One", exact: true }).waitFor();
    await page.getByRole("heading", { level: 2, name: "Landing Two", exact: true }).waitFor();
    await newProblem(page).waitFor();
    // Last edited first: the draft saved second is on top.
    assert.deepEqual(await page.locator("article h2").allInnerTexts(), ["Landing Two", "Landing One"], "newest first");
    assert.equal(new URL(page.url()).searchParams.has("draft"), false, "opening Studio does not pick a draft");
    await noEditor(page, "with drafts");
    assert.equal(await page.getByText("No drafts yet", { exact: true }).count(), 0, "no empty state when there are drafts");
    // New problem: blank, and the last draft is offered.
    await newProblem(page).click();
    await page.getByRole("button", { name: "Save now", exact: true }).waitFor();
    assert.equal(await page.locator("#simple-title").inputValue(), "", "New problem is blank, not the last draft");
    // The last edited draft is the one it offers.
    await page.getByRole("button", { name: /^Continue your last draft: Landing Two$/ }).waitFor();
    // Back returns to the list, reloaded.
    await page.getByRole("button", { name: "Back to drafts", exact: true }).click();
    await page.getByRole("heading", { level: 2, name: "Landing One", exact: true }).waitFor();
    await noEditor(page, "back to the list");
    // ?draft= opens that draft directly, with no list in between.
    await page.goto(`${origin}/?draft=${first}`);
    await page.locator("#simple-title").waitFor();
    assert.equal(await page.locator("#simple-title").inputValue(), "Landing One");
    assert.equal(await page.getByText("2 drafts loaded", { exact: false }).count(), 0, "the list is not shown");
    assert.equal(new URL(page.url()).searchParams.get("draft"), first);
    // A save moves the draft to the top of the list on its next load.
    const question = page.getByRole("textbox", { name: "What's the question?" }).first();
    await question.click();
    await question.pressSequentially("Edited last.");
    await page.getByText("All changes saved").first().waitFor();
    await page.getByRole("button", { name: "Back to drafts", exact: true }).click();
    await page.getByRole("heading", { level: 2, name: "Landing One", exact: true }).waitFor();
    assert.deepEqual(await page.locator("article h2").allInnerTexts(), ["Landing One", "Landing Two"], "the draft just saved is on top");
    // A draft that cannot be opened leaves the message above the drafts, not an empty page.
    await page.goto(`${origin}/?draft=00000000-0000-4000-8000-000000000000`);
    await page.getByRole("alert").first().waitFor();
    await page.getByRole("heading", { level: 2, name: "Landing Two", exact: true }).waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  }

  // 4. 375px wide: the list fits, and New problem is still a 44px target.
  {
    const { context, page } = await author(browser, origin, pool, "pdf-studio-9102-light", 375);
    await page.goto(origin);
    await page.getByRole("heading", { level: 2, name: "Landing One", exact: true }).waitFor();
    assert.ok((await newProblem(page).boundingBox()).height >= 44);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "no sideways scroll at 375");
    await noEditor(page, "375");
    await context.close();
  }
  console.log("PASS Studio landing: My drafts first (loading, empty state, list), New problem blank, back to the list, ?draft= direct, unknown draft, 44px target, 375px.");
}
