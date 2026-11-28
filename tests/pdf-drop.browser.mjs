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
      [[file("a.pdf"), file("b.pdf"), file("c.pdf")], "Drop one PDF for the statement, or two PDFs for the statement and the solution."],
      [[file("diagram.png", png, "image/png")], "diagram.png is not a PDF. Drop a PDF file."],
      [[file("big.pdf", Buffer.concat([pdfBytes, Buffer.alloc(3 * 1024 * 1024)]))], "big.pdf is over 3 MiB. Drop a PDF up to 3 MiB."],
      [[file("renamed.pdf", png)], "renamed.pdf does not open as a PDF. Save it as a PDF again and drop that file."],
    ];
    for (const [list, message] of refusals) {
      await drop(page, zone, list);
      await zone.getByRole("alert").filter({ hasText: message }).waitFor();
    }
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
    await drop(page, zone, [file("first.pdf"), file("second.pdf")]);
    await sheet.getByRole("button", { name: "second.pdf", exact: true }).click();
    await page.waitForURL((url) => url.searchParams.has("draft"), { timeout: 20000 });
    const twoId = new URL(page.url()).searchParams.get("draft");
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

    // In the editor, a drop attaches to the open draft and takes the place of its statement. No second draft.
    const editorZone = page.locator('section[aria-label="Problem PDFs"] [data-pdf-drop]');
    await editorZone.waitFor({ timeout: 20000 });
    const before = (await attachments(oneId))[0].id;
    await drop(page, editorZone, [file("better.pdf")]);
    await status(editorZone).filter({ hasText: "Attached better.pdf." }).waitFor({ timeout: 20000 });
    await page.getByText("All changes saved").first().waitFor({ timeout: 20000 });
    const after = await attachments(oneId);
    assert.equal(after.length, 1);
    assert.notEqual(after[0].id, before, `${tag}: the statement was replaced`);
    assert.equal(await problems(), 2, `${tag}: no second draft`);
    await noSideways("editor");
    await axe("editor with a drop zone");

    // Delete old uploads, in the problem's More options: the replaced statement goes, the one in use stays.
    const more = page.locator('summary[aria-label="More options for the whole problem"]');
    if (!(await more.evaluate((el) => el.parentElement.open))) await more.click();
    const remove = page.getByRole("button", { name: "Delete old uploads", exact: true });
    await remove.waitFor({ timeout: 20000 });
    await remove.click();
    await page.getByRole("status").filter({ hasText: "Deleted 1 of 1." }).waitFor({ timeout: 20000 });
    const left = (await pool.query("SELECT id FROM author_media WHERE problem_id=$1", [oneId])).rows.map((r) => r.id);
    assert.deepEqual(left, [after[0].id], `${tag}: only the file in use is left`);
    assert.deepEqual(errors, [], `${tag}: no page errors`);
    await context.close();
  }
  console.log("PASS PDF drop: one PDF, two with the statement chosen, Cancel, more than two, wrong type, over 3 MiB, no %PDF-, failed save leaves nothing, keyboard, editor drop replaces the statement, Delete old uploads, 375 and 1440 light and dark, axe.");
}
