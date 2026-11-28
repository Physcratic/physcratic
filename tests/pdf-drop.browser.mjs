// PDF drops on Problem Studio, in the real workspace, API and disposable PostgreSQL of tests/problem-authoring.browser.mjs.
// My drafts: one PDF makes a draft with its statement, two ask which is the statement, more or wrong files are refused,
// and a failed save leaves no draft and no file. The editor: a drop attaches to the open draft, and Delete old uploads
// removes the file it replaced. At 375 and 1440 in light and dark, with axe, the keyboard and no sideways scroll.
import assert from "node:assert/strict";
import { autoConfirm } from "./confirm-sheet.mjs";
import { statementPdfFixture, png } from "./author-media-fixtures.ts";

const pdfBytes = statementPdfFixture();

/** Drops files on a drop zone the way a browser does, with a DataTransfer. */
async function drop(page, zone, files) {
  const handle = await page.evaluateHandle((list) => {
    const data = new DataTransfer();
    for (const f of list) data.items.add(new File([new Uint8Array(f.bytes)], f.name, { type: f.type }));
    return data;
  }, files.map((f) => ({ ...f, bytes: [...f.bytes] })));
  await zone.dispatchEvent("dragover", { dataTransfer: handle });
  await zone.dispatchEvent("drop", { dataTransfer: handle });
}
const file = (name, bytes = pdfBytes, type = "application/pdf") => ({ name, bytes, type });

export async function runPdfDropBrowser({ browser, origin, pool, AxeBuilder, storage, setFail }) {
  let n = 9500;
  for (const width of [375, 1440]) for (const theme of ["light", "dark"]) {
    const tag = `${width} ${theme}`;
    const owner = `pdf-studio-${n++}-${theme}`;
    await pool.query('INSERT INTO "user"(id) VALUES($1) ON CONFLICT DO NOTHING', [owner]);
    const context = await browser.newContext({ viewport: { width, height: width === 375 ? 800 : 1000 } });
    await context.addCookies([{ name: "studio_author", value: owner, url: origin }]);
    await context.addInitScript((t) => {
      localStorage.setItem("physcratic.tour.studio.v1", "seen");
      addEventListener("DOMContentLoaded", () => document.documentElement.classList.toggle("dark", t === "dark"), { once: true });
    }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await autoConfirm(page);
    const axe = async (label) => {
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((x) => x.target).join(" ")}`), [], `${tag} ${label}: axe`);
    };
    const noSideways = async (label) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${tag} ${label}: no sideways scroll`);
    const problems = async () => (await pool.query("SELECT count(*)::int AS n FROM authored_problem WHERE owner_id=$1", [owner])).rows[0].n;
    const files = async () => (await pool.query("SELECT count(*)::int AS n FROM author_media m JOIN authored_problem p ON p.id=m.problem_id WHERE p.owner_id=$1", [owner])).rows[0].n;
    const attachments = async (id) => (await pool.query("SELECT d.content->'attachments' AS a FROM authored_draft d WHERE d.problem_id=$1", [id])).rows[0].a;
    const status = (zone) => zone.locator("p[role=status], p[role=alert]").last();

    await page.goto(origin);
    await page.getByRole("heading", { level: 1, name: "Problem Studio", exact: true }).waitFor();
    const zone = page.locator("[data-pdf-drop]");
    const choose = zone.getByRole("button", { name: "Choose PDFs", exact: true });
    await choose.waitFor();
    assert.ok((await choose.boundingBox()).height >= 44, `${tag}: the button is at least 44px`);
    assert.ok(parseFloat(await zone.locator("p").first().evaluate((el) => getComputedStyle(el).fontSize)) >= 16, `${tag}: the words are at least 16px`);
    await noSideways("drafts page");
    await axe("drafts page");

    // Refused drops say why next to the zone, and make nothing.
    const refusals = [
      [[file("a.pdf"), file("b.pdf"), file("c.pdf")], "Drop one or two PDFs."],
      [[file("diagram.png", png, "image/png")], "diagram.png is not a PDF. Drop a PDF file."],
      [[file("big.pdf", Buffer.concat([pdfBytes, Buffer.alloc(3 * 1024 * 1024)]))], "big.pdf is over 3 MiB. Drop a PDF up to 3 MiB."],
      [[file("renamed.pdf", png)], "renamed.pdf does not open as a PDF. Save it as a PDF again and drop that file."],
    ];
    for (const [list, message] of refusals) {
      await drop(page, zone, list);
      await zone.getByRole("alert").filter({ hasText: message }).waitFor();
    }
    // A file dropped just outside the zone does not open in the tab. A text drag is left alone.
    // Drops a file, or text, on the page body or on a file input outside the zone, and says whether the browser's own drop was cancelled.
    const outside = (types, onInput = false) => page.evaluate(([files, input]) => {
      const data = new DataTransfer();
      if (files) data.items.add(new File(["%PDF-"], "missed.pdf", { type: "application/pdf" }));
      else data.setData("text/plain", "words");
      const target = input ? [...document.querySelectorAll('input[type="file"]')].find((el) => !el.closest("[data-pdf-drop]")) : document.body;
      if (!target) throw new Error("no file input outside the zone");
      const event = new DragEvent("drop", { dataTransfer: data, bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    }, [types, onInput]);
    assert.equal(await outside(true), true, `${tag}: a missed file drop is kept in Studio`);
    assert.equal(await outside(false), false, `${tag}: a text drop is not touched`);
    assert.equal(await problems(), 0, `${tag}: a refused drop makes no draft`);
    assert.equal(await files(), 0, `${tag}: and no file`);
    await axe("drafts page with an error");

    // A failed save after both uploads went through takes them away again: no draft and no file are left.
    setFail(1);
    await drop(page, zone, [file("statement.pdf"), file("solution.pdf")]);
    const sheet = page.getByRole("alertdialog", { name: "Which PDF is the statement?" });
    await sheet.waitFor();
    await sheet.getByRole("button", { name: "statement.pdf", exact: true }).click();
    await zone.getByRole("alert").filter({ hasText: "No draft was made." }).waitFor({ timeout: 20000 });
    setFail(0);
    assert.equal(await problems(), 0, `${tag}: no half-made draft`);
    assert.equal(await files(), 0, `${tag}: no orphan file`);

    // Two PDFs ask which one is the statement. Cancel makes nothing. The sheet is a bottom sheet on a phone.
    await drop(page, zone, [file("first.pdf"), file("second.pdf")]);
    await sheet.waitFor();
    const box = await sheet.boundingBox();
    if (width < 640) assert.ok(Math.abs(box.y + box.height - 800) < 2, `${tag}: the sheet sits at the bottom`);
    assert.deepEqual(await sheet.getByRole("button").allInnerTexts(), ["first.pdf", "second.pdf", "Cancel"], `${tag}: never a guess, both files and Cancel`);
    await axe("two PDF sheet");
    await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    await sheet.waitFor({ state: "detached" });
    assert.equal(await problems(), 0, `${tag}: Cancel makes nothing`);

    // Two PDFs, the second chosen as the statement: one draft, the other file is the private solution PDF, and it opens.
    // Each upload is held back a moment, so the busy words can be read: which file and how far.
    const slow = async (route) => { if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 700)); await route.continue().catch(() => {}); };
    await page.route("**/media", slow);
    await drop(page, zone, [file("first.pdf"), file("second.pdf")]);
    await sheet.getByRole("button", { name: "second.pdf", exact: true }).click();
    await status(zone).filter({ hasText: "Uploading 1 of 2, second.pdf" }).waitFor();
    await status(zone).filter({ hasText: "Uploading 2 of 2, first.pdf" }).waitFor();
    await page.waitForURL((url) => url.searchParams.has("draft"), { timeout: 20000 });
    const twoId = new URL(page.url()).searchParams.get("draft");
    await page.unroute("**/media", slow);
    assert.equal(await problems(), 1, `${tag}: one draft`);
    const two = await attachments(twoId);
    const names = (await pool.query("SELECT id,filename FROM author_media WHERE problem_id=$1", [twoId])).rows;
    const nameOf = (id) => names.find((r) => r.id === id)?.filename;
    assert.deepEqual(two.map((a) => [a.purpose, nameOf(a.id)]).sort(), [["solution-pdf", "first.pdf"], ["statement-pdf", "second.pdf"]], `${tag}: the chosen file is the statement`);
    await page.getByRole("link", { name: "Open or download Statement PDF", exact: true }).waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: "Back to drafts", exact: true }).click();
    await page.getByRole("heading", { level: 1, name: "Problem Studio", exact: true }).waitFor();

    // The keyboard: Tab to the button, Enter opens the file chooser, one PDF is the statement. It waits while the list loads.
    // The file chooser is caught only once something listens for it, so the listener is set before the key is pressed.
    const chosen = page.waitForEvent("filechooser");
    await page.waitForFunction(() => document.querySelector("[data-pdf-drop] button")?.disabled === false);
    await choose.focus();
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Choose PDFs");
    await page.keyboard.press("Enter");
    const chooser = await chosen;
    assert.equal(chooser.isMultiple(), true, `${tag}: two files can be chosen`);
    await chooser.setFiles([{ name: "only.pdf", mimeType: "application/pdf", buffer: pdfBytes }]);
    await page.waitForURL((url) => url.searchParams.get("draft") && url.searchParams.get("draft") !== twoId, { timeout: 20000 });
    const oneId = new URL(page.url()).searchParams.get("draft");
    assert.deepEqual((await attachments(oneId)).map((a) => a.purpose), ["statement-pdf"], `${tag}: one PDF is the statement`);
    assert.equal(await problems(), 2);

    // In the editor, a drop attaches to the open draft. No second draft. With a statement already there, one PDF asks
    // whether it replaces the statement or is the solution, so a solution never becomes public by mistake.
    const editorZone = page.locator('section[aria-label="Problem PDFs"] [data-pdf-drop]');
    await editorZone.waitFor({ timeout: 20000 });
    // A file dropped straight on one of the editor's own file inputs is that input's, as before. Beside the zone it is kept.
    assert.equal(await outside(true, true), false, `${tag}: a drop on a file input is the input's`);
    assert.equal(await outside(true), true, `${tag}: a drop beside the zone is still kept in Studio`);
    const statement = (await attachments(oneId))[0].id;
    const role = page.getByRole("alertdialog", { name: "better.pdf" });
    const filesBefore = await files();
    await drop(page, editorZone, [file("better.pdf")]);
    await role.waitFor();
    assert.deepEqual(await role.getByRole("button").allInnerTexts(), ["Replace the statement", "Add as the solution", "Cancel"], `${tag}: three choices, never a guess`);
    await axe("role sheet");
    await role.getByRole("button", { name: "Cancel", exact: true }).click();
    await role.waitFor({ state: "detached" });
    assert.equal(await files(), filesBefore, `${tag}: Cancel uploads nothing`);
    await drop(page, editorZone, [file("answer.pdf")]);
    await page.getByRole("alertdialog", { name: "answer.pdf" }).getByRole("button", { name: "Add as the solution", exact: true }).click();
    await status(editorZone).filter({ hasText: "Attached answer.pdf as the solution." }).waitFor({ timeout: 20000 });
    await page.getByText("All changes saved").first().waitFor({ timeout: 20000 });
    let now = await attachments(oneId);
    assert.deepEqual(now.map((a) => a.purpose).sort(), ["solution-pdf", "statement-pdf"]);
    assert.equal(now.find((a) => a.purpose === "statement-pdf").id, statement, `${tag}: the statement is unchanged`);
    await drop(page, editorZone, [file("better.pdf")]);
    await role.getByRole("button", { name: "Replace the statement", exact: true }).click();
    await status(editorZone).filter({ hasText: "Attached better.pdf as the statement." }).waitFor({ timeout: 20000 });
    await page.getByText("All changes saved").first().waitFor({ timeout: 20000 });
    now = await attachments(oneId);
    assert.notEqual(now.find((a) => a.purpose === "statement-pdf").id, statement, `${tag}: the statement was replaced`);
    assert.equal(await problems(), 2, `${tag}: no second draft`);
    await noSideways("editor");
    await axe("editor with a drop zone");

    // Delete old uploads lists only files older than 24 hours. The statement replaced a second ago is not listed.
    const more = page.locator('summary[aria-label="More options for the whole problem"]');
    const openMore = async () => { if (!(await more.evaluate((el) => el.parentElement.open))) await more.click(); };
    await openMore();
    await page.waitForTimeout(1500);
    assert.equal(await page.getByRole("button", { name: "Delete old uploads", exact: true }).count(), 0, `${tag}: a file uploaded a second ago is not offered`);
    // A day later it is, and the files in use stay.
    await pool.query("UPDATE author_media SET created_at=now()-interval '25 hours' WHERE id=$1", [statement]);
    await page.reload();
    await editorZone.waitFor({ timeout: 20000 });
    await openMore();
    const remove = page.getByRole("button", { name: "Delete old uploads", exact: true });
    await remove.waitFor({ timeout: 20000 });
    await remove.click();
    await page.getByRole("status").filter({ hasText: "Deleted 1 of 1." }).waitFor({ timeout: 20000 });
    const left = (await pool.query("SELECT id FROM author_media WHERE problem_id=$1", [oneId])).rows.map((r) => r.id).sort();
    assert.deepEqual(left, now.map((a) => a.id).sort(), `${tag}: only the files in use are left`);

    // The editor locks while the role sheet is open, here by another upload in progress. The choice then uploads nothing.
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const hold = async (route) => { if (route.request().method() === "POST") await gate; await route.continue().catch(() => {}); };
    await page.route("**/media", hold);
    await drop(page, editorZone, [file("late.pdf")]);
    const late = page.getByRole("alertdialog", { name: "late.pdf" });
    await late.waitFor();
    const lockedBefore = { files: await files(), statement: (await attachments(oneId)).find((a) => a.purpose === "statement-pdf").id };
    // The part's own image upload, found by its label: the sheet makes the rest of the page hidden to roles.
    const imageInput = await page.evaluate(() => [...document.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith("Upload image to"))?.htmlFor);
    assert.ok(imageInput, "the part has its own image upload");
    await page.locator(`[id="${imageInput}"]`).setInputFiles({ name: "lock.png", mimeType: "image/png", buffer: png });
    await page.waitForFunction(() => document.querySelector("[data-pdf-drop] button")?.disabled === true);
    await late.getByRole("button", { name: "Replace the statement", exact: true }).click();
    await late.waitFor({ state: "detached" });
    await page.waitForTimeout(800);
    assert.equal(await files(), lockedBefore.files, `${tag}: a choice made after the editor locked uploads nothing`);
    release();
    await page.unroute("**/media", hold);
    await page.getByText("All changes saved").first().waitFor({ timeout: 20000 });
    assert.equal((await attachments(oneId)).find((a) => a.purpose === "statement-pdf").id, lockedBefore.statement, `${tag}: and the statement is unchanged`);

    // With no drop zone on the page, a missed drop is the browser's again.
    await page.getByRole("button", { name: "Back to drafts", exact: true }).click();
    await page.getByRole("button", { name: "New problem", exact: true }).click();
    await page.getByRole("heading", { level: 2, name: "Question", exact: true }).waitFor();
    assert.equal(await outside(true), false, `${tag}: the listener goes with the zone`);
    assert.deepEqual(errors, [], `${tag}: no page errors`);
    await context.close();
  }
  // Rollback when a step fails: a failed upload, a failed storage delete, and deletes refused by the write limit.
  {
    const owner = "pdf-studio-9590-light";
    await pool.query('INSERT INTO "user"(id) VALUES($1) ON CONFLICT DO NOTHING', [owner]);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([{ name: "studio_author", value: owner, url: origin }]);
    await context.addInitScript(() => localStorage.setItem("physcratic.tour.studio.v1", "seen"));
    const page = await context.newPage();
    await autoConfirm(page);
    const rows = async () => ({
      drafts: (await pool.query("SELECT d.problem_id AS id, d.content->'attachments' AS a FROM authored_draft d JOIN authored_problem p ON p.id=d.problem_id WHERE p.owner_id=$1", [owner])).rows,
      media: (await pool.query("SELECT m.state, m.pathname FROM author_media m JOIN authored_problem p ON p.id=m.problem_id WHERE p.owner_id=$1 ORDER BY m.created_at", [owner])).rows,
    });
    await page.goto(origin);
    const zone = page.locator("[data-pdf-drop]");
    await zone.getByRole("button", { name: "Choose PDFs", exact: true }).waitFor();
    const chooseStatement = async (name) => { const sheet = page.getByRole("alertdialog", { name: "Which PDF is the statement?" }); await sheet.waitFor(); await sheet.getByRole("button", { name, exact: true }).click(); };

    // A failed upload: no draft is left, and no file bytes are stored. The server keeps a retired record of the
    // reservation, which its cleanup sweep removes.
    storage.failPut = true;
    await drop(page, zone, [file("lost.pdf")]);
    await zone.getByRole("alert").filter({ hasText: "No draft was made." }).waitFor({ timeout: 20000 });
    storage.failPut = false;
    let now = await rows();
    assert.deepEqual(now.drafts, [], "a failed upload leaves no draft");
    assert.ok(now.media.every((m) => m.state === "deleting" && !storage.objects.has(m.pathname)), `a failed upload leaves no file, only a retired record: ${JSON.stringify(now.media)}`);
    const retired = now.media.length;

    // A failed storage delete after a failed save: the draft is kept, with its two files named, and nothing else.
    setFail(1);
    storage.failDelete = true;
    await drop(page, zone, [file("one.pdf"), file("two.pdf")]);
    await chooseStatement("one.pdf");
    await zone.getByRole("alert").filter({ hasText: "Temporary save failure. Your work is retained. The 2 uploaded files are kept in a new draft in My drafts." }).waitFor({ timeout: 20000 });
    storage.failDelete = false;
    setFail(0);
    now = await rows();
    assert.equal(now.drafts.length, 1, "exactly one draft is kept");
    assert.deepEqual(now.drafts[0].a, [], "with no attachment");
    assert.equal(now.media.length - retired, 2, "and the two files named in the message");

    // Deletes refused by the write limit: the files are kept in that draft, and the words say where and how to remove them.
    setFail(1);
    const limited = (route) => (route.request().method() === "DELETE" ? route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "Authoring write limit reached. Retry next minute." }) }) : route.continue());
    await page.route("**/media/*", limited);
    await drop(page, zone, [file("three.pdf"), file("four.pdf")]);
    await chooseStatement("three.pdf");
    await zone.getByRole("alert").filter({ hasText: "The 2 uploaded files are kept in a new draft in My drafts. Delete old uploads in its More options removes them after 24 hours." }).waitFor({ timeout: 20000 });
    await page.unroute("**/media/*", limited);
    setFail(0);
    now = await rows();
    assert.equal(now.drafts.length, 2, "the limited rollback keeps its draft");
    assert.equal(now.media.filter((m) => m.state === "ready").length, 2, "its two files stay ready, for Delete old uploads");
    await context.close();
  }
  console.log("PASS PDF drop: one PDF, two with the statement chosen, Cancel, more than two, wrong type, over 3 MiB, no %PDF-, failed save leaves nothing, keyboard, editor drop replaces the statement, role sheet when a statement exists, Uploading 1 of 2, missed drops kept in Studio, Delete old uploads after 24 hours, rollback on failed upload, failed delete and write limit, 375 and 1440 light and dark, axe.");
}
