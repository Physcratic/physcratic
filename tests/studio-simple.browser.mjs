// Simple mode in Problem Studio, against the real editor and API on the throwaway PostgreSQL (loopback only).
// Publishes a one-part expression problem in Easy mode and fails if it takes more than the Phase 4 target
// (1 screen, at most 4 clicks, 0 selects, at most 4 typed fields). Then checks switching modes, the preview,
// Test an answer, the 375px layout, the carry-over of fast typing and the student side.
// Run: AUTHORING_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:PORT/physcratic_authoring_test CHROMIUM_PATH=/path/to/chrome node --require ./tests/server-only-register.cjs --import tsx tests/studio-easy.browser.mjs
import assert from "node:assert/strict";
import { numericUnitsHelp } from "../lib/authored-grading-contracts.ts";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { Pool } from "pg";
import { createAuthorMediaApi } from "../lib/author-media-api.ts";
import { memoryAuthorStorage, png, pdf } from "./author-media-fixtures.ts";
import { createAuthoredLibraryApi } from "../lib/authored-library-api.ts";
import { createUnifiedArenaApi } from "../lib/unified-arena-api.ts";
import { createAuthoredAttemptApi } from "../lib/authored-attempt-api.ts";
import { createAuthoredSolutionApi } from "../lib/authored-solution-api.ts";
import { createProblemAuthoringApi } from "../lib/problem-authoring-api.ts";
import { isAllowedSubmissionOrigin } from "../lib/submission-security.ts";
const require = createRequire(import.meta.url);
const browserTools = process.env.AUTHORING_BROWSER_TOOLS
  ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"))
  : require;
const { chromium, devices } = browserTools("playwright");
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const target = new URL(
  process.env.AUTHORING_TEST_DATABASE_URL || "http://invalid",
);
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.pathname, "/physcratic_authoring_test");
const pool = new Pool({ connectionString: target.href, max: 10 });
const temp = await mkdtemp(join(tmpdir(), "physcratic-editor-browser-"));
let browser,
  server,
  origin,
  failNext = 0,
  uploadGate;
const sessionUser = async (request) => ({
  id: request.headers.get("cookie")?.includes("viewer=workflow-student")
    ? "workflow-student"
    : "browser-author",
  emailVerified: true,
});
const api = createProblemAuthoringApi({
  pool,
  user: sessionUser,
  origin: (request) => isAllowedSubmissionOrigin(request, [origin]),
});
const mediaStorage = memoryAuthorStorage();
const mediaApi = createAuthorMediaApi({
  pool,
  storage: mediaStorage.storage,
  user: sessionUser,
  origin: (request) => isAllowedSubmissionOrigin(request, [origin]),
});
const libraryApi = createAuthoredLibraryApi(pool);
// The learner library lists authored problems through /api/arena/collection since the unified Arena change.
const collectionApi = createUnifiedArenaApi(pool);
const attemptApi = createAuthoredAttemptApi({
  pool,
  user: sessionUser,
  origin: (request) => isAllowedSubmissionOrigin(request, [origin]),
});
const solutionApi = createAuthoredSolutionApi({
  pool,
  user: sessionUser,
  origin: (request) => isAllowedSubmissionOrigin(request, [origin]),
  storage: mediaStorage.storage,
});
async function until(check, label) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error(`Timed out: ${label}`);
}
class Done extends Error {}
function until_(){}
try {
  await pool.query(
    "CREATE TABLE \"user\" (id text PRIMARY KEY); INSERT INTO \"user\" VALUES ('browser-author'),('workflow-student')",
  );
  for (const name of [
    "0001_problem_authoring",
    "0002_authored_write_limit",
    "0003_author_media",
    "0004_authored_attempts",
    "0005_authored_solution_access",
    "0006_authored_discovery",
  ])
    await pool.query(
      "BEGIN;\n" +
        (await readFile(`migrations/${name}.up.sql`, "utf8")) +
        "\nCOMMIT;",
    );
  await build({
    entryPoints: ["tests/problem-authoring-harness.tsx"],
    outfile: join(temp, "bundle.js"),
    bundle: true,
    platform: "browser",
    jsx: "automatic",
    alias: { "@": process.cwd() },
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    logLevel: "silent",
  });
  execFileSync(
    "node_modules/.bin/tailwindcss",
    ["-i", "app/globals.css", "-o", join(temp, "style.css")],
    { stdio: "pipe" },
  );
  const katexRoot = join(process.cwd(), "node_modules/katex/dist");
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith("/api/authored-problems")) {
        if (req.method === "PUT" && failNext > 0) {
          failNext--;
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Temporary save failure. Your work is retained.",
            }),
          );
          return;
        }
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers))
          if (value)
            headers.set(key, Array.isArray(value) ? value.join(",") : value);
        const request = new Request(url, {
          method: req.method,
          headers,
          body: req.method === "GET" ? undefined : Buffer.concat(chunks),
        });
        const paths = url.pathname.split("/").filter(Boolean);
        if (req.method === "POST" && paths[4] === "media" && uploadGate)
          await uploadGate;
        let response;
        if (paths[2] === "library") response = await libraryApi(request);
        else if (paths[2] === "attempts")
          response = await attemptApi(
            paths[3] ? "read" : "list",
            request,
            paths[3],
          );
        else if (paths[3] === "attempts")
          response = await attemptApi("submit", request, paths[2]);
        else if (paths[3] === "submission-info")
          response = await attemptApi("info", request, paths[2]);
        else if (paths[2] === "drafts" && paths[4] === "solutions")
          response = await solutionApi(
            req.method === "GET" ? "permission-read" : "permission-write",
            request,
            paths[3],
            paths[5],
          );
        else if (paths[3] === "solutions")
          response = await solutionApi(
            paths[5] === "view" ? "view" : "media",
            request,
            paths[2],
            paths[4],
            paths[6],
          );
        else if (paths[2] === "media")
          response = await mediaApi("cleanup", request);
        else if (paths[4] === "media")
          response = await mediaApi(
            req.method === "GET" ? "list" : "upload",
            request,
            paths[3],
          );
        else if (paths[3] === "media")
          response = await mediaApi(
            req.method === "GET" ? "read" : "delete",
            request,
            paths[2],
            paths[4],
          );
        else {
          let action;
          if (paths[2] !== "drafts") action = "public";
          else if (!paths[3])
            action = req.method === "POST" ? "create" : "list";
          else
            action =
              paths[4] ||
              { GET: "read", PUT: "update", DELETE: "delete" }[req.method];
          response = await api(
            action,
            request,
            paths[2] === "drafts" ? paths[3] : paths[2],
          );
        }
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (url.pathname === "/api/arena/collection") {
        const response = await collectionApi(new Request(url));
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      if (url.pathname === "/api/auth/get-session") {
        res.setHeader("content-type", "application/json");
        res.end("null");
        return;
      }
      if (url.pathname === "/bundle.js" || url.pathname === "/style.css") {
        res.setHeader(
          "Content-Type",
          url.pathname.endsWith("js") ? "application/javascript" : "text/css",
        );
        res.end(await readFile(join(temp, basename(url.pathname))));
        return;
      }
      if (url.pathname === "/katex.css") {
        res.setHeader("Content-Type", "text/css");
        res.end(await readFile(join(katexRoot, "katex.min.css")));
        return;
      }
      if (url.pathname.startsWith("/fonts/")) {
        res.end(
          await readFile(join(katexRoot, "fonts", basename(url.pathname))),
        );
        return;
      }
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Physcratic editor test</title><style>:root{--font-plex-sans:Arial,sans-serif}body{font-family:Arial,sans-serif}</style><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/katex.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      );
    } catch (error) {
      console.error(error);
      res.writeHead(500);
      res.end("Test harness failed");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const TARGET = { screens: 1, clicks: 3, selects: 0 };
  const log = (...a) => console.log(...a);
  const errors = [];
  const newPage = async (width, height = 1000, profile) => {
    const context = await browser.newContext(profile ?? { viewport: { width, height } });
    const page = await context.newPage();
    page.on("pageerror", (e) => { errors.push(e.message); console.error("Browser error:", e.message); });
    page.on("dialog", (d) => d.accept());
    return { context, page };
  };
  const saved = (page) => until(async () => (await page.getByRole("status").allTextContents()).some((t) => t.includes("All changes saved")), "autosave");
  const draftId = (page) => new URL(page.url()).searchParams.get("draft");
  const noSideways = async (page, label) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${label}: no sideways scroll`);
  const mathField = async (scope) => { const f = scope.locator("math-field").first(); await f.waitFor({ timeout: 20000 }); return f; };
  const savedContent = async (id) => (await pool.query("SELECT content FROM authored_draft WHERE problem_id=$1", [id])).rows[0]?.content;
  const savedKey = async (id) => (await pool.query("SELECT data FROM authored_draft_private_part WHERE problem_id=$1", [id])).rows[0]?.data?.key;

  // ------------------------------------------------------------------ 0. Spacing around an equation chip
  // Text typed on both sides of an equation must come back exactly as typed, in the box and in what is saved.
  for (let attempt = 0; attempt < Number(process.env.SPACING_LOOPS || 3); attempt++) {
    const { context: sctx, page: sp } = await newPage(1440);
    await sp.goto(origin);
    await sp.getByRole("heading", { level: 1, name: "Problem Studio" }).waitFor();
    const sq = sp.getByRole("region", { name: "Part a", exact: true }).getByRole("textbox", { name: "What's the question?" });
    await sq.click();
    await sq.pressSequentially("A ball is thrown up at ");
    await sp.keyboard.type("$");
    const spanel = sp.getByRole("group", { name: "Type your equation" });
    await spanel.waitFor();
    await mathField(spanel);
    await sp.waitForTimeout(300);
    await sp.keyboard.type("v=12");
    await sp.keyboard.press("Escape");
    await spanel.waitFor({ state: "detached" });
    await sp.keyboard.type(" m/s. How high does it go?");
    const domSpans = await sq.evaluate((box) => {
      const out = []; let text = "";
      const flush = () => { if (text) out.push({ kind: "text", text }); text = ""; };
      const walk = (parent) => Array.from(parent.childNodes).forEach((node, i, all) => {
        if (node.nodeType === 3) text += node.nodeValue.replace(/\u00a0/g, " ").replace(/\u200b/g, "");
        else if (node.tagName === "BR") { if (!(parent === box && i === all.length - 1)) text += "\n"; }
        else if (node.dataset?.mathId !== undefined) { flush(); out.push({ kind: "math", latex: node.dataset.latex }); }
        else walk(node);
      });
      walk(box); flush();
      return { out, html: box.innerHTML.slice(0, 600) };
    });
    const wanted = [{ kind: "text", text: "A ball is thrown up at " }, { kind: "math", latex: "v=12" }, { kind: "text", text: " m/s. How high does it go?" }];
    assert.deepEqual(domSpans.out, wanted, `the box keeps the spaces on both sides of the equation (attempt ${attempt}): ${domSpans.html}`);
    await sp.waitForURL((url) => url.searchParams.has("draft"));
    const sid = draftId(sp);
    // Wait until what is saved is what is in the box. "All changes saved" can describe an earlier save.
    await until(async () => JSON.stringify((await savedContent(sid))?.sections?.[0]?.parts?.[0]?.blocks?.find((b) => b.kind === "text")?.spans) === JSON.stringify(wanted), `the saved text matches the box (attempt ${attempt})`);
    await sctx.close();
  }
  log("Spacing around an equation chip kept, in the box and when saved.");
  /** Drafts the spacing check made, so the counts below can leave them out. */
  const spacingDrafts = Number(process.env.SPACING_LOOPS || 3);

  // ------------------------------------------------------------------ 1. Publish a one-part problem at 1440
  const { context: wide, page } = await newPage(1440);
  await page.goto(origin);
  await page.getByRole("heading", { level: 1, name: "Problem Studio" }).waitFor();
  const counts = { screens: 1, clicks: 0, focusClicks: 0, selects: 0, typedFields: 0, keys: 0 };
  const click = async (l) => { await l.click(); counts.clicks++; };
  const focusClick = async (l) => { await l.click(); counts.focusClicks++; };
  const typed = async (l, text, opts) => { await l.pressSequentially(text, opts); counts.typedFields++; counts.keys += text.length; };
  assert.equal(await page.getByRole("button", { name: "Simple" }).getAttribute("aria-pressed"), "true", "Simple is the default");
  assert.equal(await page.getByRole("button", { name: "Advanced" }).getAttribute("aria-pressed"), "false");
  assert.equal(await page.getByRole("button", { name: "Publish", exact: true }).count(), 1, "one Publish button");
  assert.equal(await page.locator("select:visible").count(), 0, "no select on the page");
  for (const text of ["Main question (optional)", "What's the question?", "Add an image (optional)", "Worked solution (required)", "Final Answer (Solution)", "Answer preview", "Only you see this", "Where's it from?", "Difficulty rating", "Pick a topic so people can find it (optional)"])
    await page.getByText(text, { exact: true }).first().waitFor();
  // The page runs in this order, top to bottom: main question, part a (question, worked solution, final answer, answer preview), Add part b, source, difficulty, topic, the rights tick, Publish.
  const topOf = async (locator) => (await locator.first().boundingBox()).y;
  const order = [
    page.getByText("Main question (optional)", { exact: true }),
    page.getByText("What's the question?", { exact: true }),
    page.getByText("Worked solution (required)", { exact: true }),
    page.getByText("Final Answer (Solution)", { exact: true }),
    page.getByText("Answer preview", { exact: true }),
    page.getByRole("button", { name: "Add part b" }),
    page.getByText("Where's it from?", { exact: true }),
    page.getByText("Difficulty rating", { exact: true }),
    page.getByText("Pick a topic so people can find it (optional)", { exact: true }),
    page.getByLabel(/I wrote this problem and I'm happy to share it on Physcratic/),
    page.getByRole("button", { name: "Publish", exact: true }),
  ];
  const tops = [];
  for (const item of order) tops.push(await topOf(item));
  assert.deepEqual(tops, [...tops].sort((a, b) => a - b), `the page is in the owner's order: ${tops.join(", ")}`);
  assert.equal(await page.getByRole("button", { name: "Add part b" }).count(), 1, "the button names the next letter");
  assert.equal(await page.getByText("Try an answer").count() + await page.getByText("Add a picture").count() + await page.getByText("Final answer. We check").count(), 0, "the old labels are gone");
  assert.equal(await page.getByText(/context|provide/i).count(), 0, "no jargon labels");

  // The question, with an equation typed like in a word processor: $ opens it, Escape closes it.
  const part = page.getByRole("region", { name: "Part a", exact: true });
  const question = part.getByRole("textbox", { name: "What's the question?" });
  await focusClick(question);
  await typed(question, "A ball is thrown up at ");
  await page.keyboard.type("$");
  const panel = page.getByRole("group", { name: "Type your equation" });
  await panel.waitFor();
  const eq = await mathField(panel);
  await page.waitForTimeout(300);
  await page.keyboard.type("v=12");
  counts.keys += 5;
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });
  await page.keyboard.type(" m/s. How high does it go?");
  counts.keys += 26;
  assert.equal(await question.locator("[data-math-id]").count(), 1, "the equation is a chip inside the text");
  assert.ok((await question.locator("[data-math-id] .katex").count()) === 1, "the chip shows rendered maths");
  await page.waitForURL((url) => url.searchParams.has("draft"));
  const id = draftId(page);
  await saved(page);
  assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), "A Ball is Thrown Up", "the title comes from the question");

  // Clicking the equation edits it.
  await question.locator("[data-math-id]").click();
  await panel.waitFor();
  await mathField(panel);
  await page.waitForTimeout(300);
  assert.equal(await panel.locator("math-field").evaluate((e) => e.value), "v=12", "the panel opens with the equation in it");
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });

  // The main question: the setup every part shares, written before the parts.
  const mainBox = page.getByRole("textbox", { name: "Main question (optional)" });
  await mainBox.click();
  await mainBox.pressSequentially("Ignore air resistance.");
  // The picture.
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), click(part.getByRole("button", { name: "Choose an image" }))]);
  await chooser.setFiles({ name: "ball.png", mimeType: "image/png", buffer: png });
  await part.getByLabel("Describe the image").waitFor({ timeout: 20000 });
  await typed(part.getByLabel("Describe the image"), "A ball thrown upwards from the ground");

  // The worked solution comes before the final answer, and Simple needs one.
  const solutionBox = part.getByRole("textbox", { name: "Worked solution (required)" });
  await solutionBox.click();
  await solutionBox.pressSequentially("At the top the speed is zero, so all the kinetic energy is potential energy.");
  // The answer key and Answer preview.
  const answerBox = await mathField(part.getByText("Final Answer (Solution)", { exact: true }).locator("xpath=ancestor::div[contains(@data-tour,'studio-answer')]"));
  await focusClick(answerBox);
  await page.waitForTimeout(300);
  await page.keyboard.type("m*a");
  counts.typedFields++; counts.keys += 3;
  await until(async () => (await part.getByRole("list", { name: "Symbols in this answer" }).locator("li").allInnerTexts()).map((x) => x.trim()).join(",") === "m,a", "symbols detected");
  const tryBox = await mathField(part.getByText("Answer preview", { exact: true }).locator("xpath=ancestor::div[contains(@data-tour,'studio-try')]"));
  await focusClick(tryBox);
  await page.waitForTimeout(300);
  await page.keyboard.type("a*m");
  const result = part.locator("[data-test-result]");
  await until(async () => /^Correct\./.test(await result.innerText()), "answer preview: correct");
  await page.keyboard.press("Control+A"); await page.keyboard.type("m+a");
  await until(async () => /^Incorrect\./.test(await result.innerText()), "answer preview: incorrect");
  log("Answer preview:", JSON.stringify(await result.innerText()));

  // Where it's from (I wrote it is the default), an estimated difficulty band, then the rights tick and Publish.
  assert.equal(await page.getByRole("radio", { name: "I wrote it" }).isChecked(), true, "I wrote it is the default");
  // The difficulty rating is required. Publish stays enabled: pressing it lists everything missing at once and moves focus to the first.
  assert.equal(await page.getByRole("button", { name: "Publish", exact: true }).isDisabled(), false, "Publish stays enabled");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByText("Add a difficulty rating from 0 to 4,000.", { exact: true }).waitFor({ timeout: 3000 });
  await page.getByText("Tick the box to say you wrote this problem.", { exact: true }).waitFor({ timeout: 3000 });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-simple-field")), "difficulty", "focus moves to the first missing item, the rating");
  assert.equal((await pool.query("SELECT state FROM authored_problem WHERE id=$1", [id])).rows[0].state !== "published", true, "nothing was published");
  await page.getByRole("radio", { name: /^Advanced/ }).click();
  assert.equal(await page.getByRole("radio", { name: /^Advanced/ }).getAttribute("aria-checked"), "true", "the band is chosen");
  assert.equal(await page.getByLabel("Difficulty rating", { exact: true }).inputValue(), "2100", "the band fills in its middle rating");
  assert.equal(await page.getByLabel("Difficulty rating", { exact: true }).getAttribute("inputmode"), "numeric");
  await page.getByLabel("Difficulty rating", { exact: true }).fill("2310");
  assert.equal(await page.getByRole("radio", { name: /^Advanced/ }).getAttribute("aria-checked"), "true", "an exact rating in the band keeps the band");
  assert.equal((await page.getByTestId("difficulty-band").innerText()).trim(), "2,310 · Advanced", "the band name shows next to the number");
  for (const bad of ["abc", "4001", ""]) {
    await page.getByLabel("Difficulty rating", { exact: true }).fill(bad);
    await page.getByText("Add a difficulty rating from 0 to 4,000.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Publish", exact: true }).isDisabled(), false, `Publish stays enabled for "${bad}"`);
  }
  await page.getByLabel("Difficulty rating", { exact: true }).fill("2310");
  await click(page.getByLabel(/I wrote this problem and I'm happy to share it on Physcratic/));
  await saved(page);
  await click(page.getByRole("button", { name: "Publish", exact: true }));
  await until(async () => (await pool.query("SELECT state FROM authored_problem WHERE id=$1", [id])).rows[0].state === "published", "publish");
  log(`SIMPLE PUBLISH: ${JSON.stringify(counts)}  target ${JSON.stringify(TARGET)}`);
  assert.ok(counts.screens <= TARGET.screens && counts.clicks <= TARGET.clicks && counts.selects <= TARGET.selects, "within the click target");

  const content = await savedContent(id);
  assert.equal(content.title, "A Ball is Thrown Up");
  assert.equal(content.provenance.kind, "original");
  assert.equal(content.provenance.rightsDeclaration, "I wrote this problem and I'm happy to share it on Physcratic.");
  assert.equal(content.estimatedDifficulty, "2310", "the estimate is saved in the existing difficulty field as a rating");
  assert.deepEqual(content.context.find((b) => b.kind === "text")?.spans, [{ kind: "text", text: "Ignore air resistance." }], "the main question is the shared setup");
  const partRow = content.sections[0].parts[0];
  assert.equal(partRow.label, "a");
  assert.equal(partRow.answerMode, "expression");
  const spans = partRow.blocks.find((b) => b.kind === "text").spans;
  assert.deepEqual(spans, [{ kind: "text", text: "A ball is thrown up at " }, { kind: "math", latex: "v=12" }, { kind: "text", text: " m/s. How high does it go?" }]);
  const image = partRow.blocks.find((b) => b.kind === "image");
  assert.equal(image?.alt, "A ball thrown upwards from the ground");
  assert.ok(content.attachments.some((a) => a.id === image.mediaId && a.purpose === "statement-image"), "the picture is attached as a statement image");
  const key = await savedKey(id);
  assert.equal(key.kind, "expression");
  assert.deepEqual(key.variables.map((v) => v.name), ["m", "a"]);
  assert.equal(key.angleUnit, "radians");

  // Switching modes loses nothing and saves nothing.
  const before = (await pool.query("SELECT version FROM authored_draft WHERE problem_id=$1", [id])).rows[0].version;
  await page.getByRole("button", { name: "Advanced" }).click();
  assert.equal(await page.getByLabel("Problem title", { exact: true }).inputValue(), "A Ball is Thrown Up");
  assert.ok(await page.getByRole("button", { name: /Insert equation in Part a statement text 1/ }).count(), "Advanced text fields have the Equation button");
  await page.getByRole("button", { name: "Simple" }).click();
  assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), "A Ball is Thrown Up");
  assert.equal(await question.locator("[data-math-id]").count(), 1);
  await page.waitForTimeout(2500);
  assert.equal((await pool.query("SELECT version FROM authored_draft WHERE problem_id=$1", [id])).rows[0].version, before, "switching modes saves nothing");
  assert.equal(await page.evaluate(() => localStorage.getItem("physcratic.studio.mode")), "simple");

  // Another part, and taking it away again.
  await page.getByRole("button", { name: "Add part b" }).click();
  assert.equal(await page.getByRole("button", { name: "Add part c" }).count(), 1, "the button now names the next letter");
  await page.getByRole("region", { name: "Part b", exact: true }).waitFor();
  await page.getByRole("button", { name: "Remove part b" }).click();
  await page.getByRole("region", { name: "Part b", exact: true }).waitFor({ state: "detached" });

  // ------------------------------------------------------------------ 2. Messages sit next to their field, nothing is saved too early
  const fresh = await newPage(1440);
  const f = fresh.page;
  await f.goto(origin);
  await f.getByRole("button", { name: /Continue your last draft/ }).waitFor();
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM authored_problem")).rows[0].n, 1 + spacingDrafts, "no draft is created before the first edit");
  await f.getByRole("button", { name: "Publish", exact: true }).click();
  for (const text of ["Write the question first.", "Add the worked solution.", "Add the final answer.", "Give it a title, or write the question and we'll make one.", "Add a difficulty rating from 0 to 4,000.", "Tick the box to say you wrote this problem."])
    await f.getByText(text, { exact: true }).waitFor({ timeout: 3000 });
  assert.match(await f.evaluate(() => document.activeElement?.closest("[data-simple-field]")?.getAttribute("data-simple-field") ?? ""), /^q:/, "focus goes to the question, the first missing item");
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM authored_problem")).rows[0].n, 1 + spacingDrafts, "still no draft");
  // Fast typing across the first save keeps every character.
  const fq = f.getByRole("region", { name: "Part a", exact: true }).getByRole("textbox", { name: "What's the question?" });
  await fq.click();
  await f.keyboard.type("A cart of mass ", { delay: 20 });
  await f.keyboard.type("$");
  await f.getByRole("group", { name: "Type your equation" }).waitFor();
  await mathField(f.getByRole("group", { name: "Type your equation" }));
  await f.waitForTimeout(300);
  await f.keyboard.type("m", { delay: 20 });
  await f.keyboard.press("Escape");
  await f.keyboard.type(" rolls down a slope.", { delay: 20 });
  await f.waitForURL((url) => url.searchParams.has("draft"));
  await saved(f);
  await f.waitForTimeout(600);
  const second = draftId(f);
  await until(async () => { const c = await savedContent(second); const sp = c?.sections?.[0]?.parts?.[0]?.blocks?.[0]?.spans; return JSON.stringify(sp) === JSON.stringify([{ kind: "text", text: "A cart of mass " }, { kind: "math", latex: "m" }, { kind: "text", text: " rolls down a slope." }]); }, "fast typing saved");
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM authored_problem")).rows[0].n, 2 + spacingDrafts, "exactly one draft per problem");
  log("Fast typing across the first save kept every character.");
  // With a rating in, Publish is available and names what else is missing, each next to its field.
  await f.getByLabel("Difficulty rating", { exact: true }).fill("2100");
  await f.getByRole("button", { name: "Publish", exact: true }).click();
  for (const text of ["Add the worked solution.", "Add the final answer.", "Tick the box to say you wrote this problem."])
    await f.getByText(text, { exact: true }).waitFor({ timeout: 3000 });
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM authored_problem WHERE state='published'")).rows[0].n >= 1, true);
  await fresh.context.close();


  // ------------------------------------------------------------------ 3a. Typing shortcuts inside a Studio equation, on desktop and in phone emulation
  // The names turn into maths as you type, with hardware keys and with a phone keyboard (text without key presses).
  const typingCases = [["sin", "\\sin"], ["cos", "\\cos"], ["tan", "\\tan"], ["ln", "\\ln"], ["log", "\\log"], ["theta", "\\theta"], ["\\theta ", "\\theta"]];
  for (const [label, profile] of [["desktop", undefined], ["iPhone 13", (({ defaultBrowserType, ...p }) => p)(devices["iPhone 13"])], ["Pixel 7", (({ defaultBrowserType, ...p }) => p)(devices["Pixel 7"])]]) {
    for (const soft of [false, true, "composition", "whole word"]) {
      for (const [typed, expected] of typingCases) {
        const { context: tctx, page: tp } = await newPage(1440, 1000, profile);
        await tp.goto(origin);
        await tp.getByRole("heading", { level: 1, name: "Problem Studio" }).waitFor();
        const tq = tp.getByRole("region", { name: "Part a", exact: true }).getByRole("textbox", { name: "What's the question?" });
        await (profile ? tq.tap() : tq.click());
        await tp.keyboard.type("$");
        const tpanel = tp.getByRole("group", { name: "Type your equation" });
        await tpanel.waitFor();
        const tfield = await mathField(tpanel);
        await tp.waitForTimeout(700);
        if (soft === "composition" || soft === "whole word") {
          // An Android keyboard composes the word and commits it. Autocomplete sends the whole word at once. Both over CDP.
          const cdp = await tctx.newCDPSession(tp);
          const word = typed.replace(/ $/, "");
          if (soft === "composition") {
            for (let i = 1; i <= word.length; i++) await cdp.send("Input.imeSetComposition", { text: word.slice(0, i), selectionStart: i, selectionEnd: i });
            await cdp.send("Input.insertText", { text: word });
            if (word !== typed) await cdp.send("Input.insertText", { text: " " });
          } else await cdp.send("Input.insertText", { text: typed });
          await tp.waitForTimeout(120);
        } else if (soft) for (const ch of typed) { await tp.keyboard.insertText(ch); await tp.waitForTimeout(35); }
        else await tp.keyboard.type(typed, { delay: 35 });
        const got = (await tfield.evaluate((e) => e.value)).replace(/\\left|\\right/g, "");
        const where = await tp.evaluate(() => { const a = document.activeElement; return `${a?.tagName}${a?.getAttribute?.("aria-hidden") ? "[aria-hidden]" : ""}${a?.shadowRoot ? " (shadow)" : ""}`; });
        assert.equal(got, expected, `Studio equation, ${label}, ${soft === true ? "phone keyboard" : soft || "keys"}: ${JSON.stringify(typed)} became ${got} (focus is on ${where})`);
        await tctx.close();
      }
    }
  }
  log("Typing shortcuts in a Studio equation: desktop, iPhone and Pixel, keys, phone keyboard, composition and whole word.");
  // The field looks at its own text after every input, so text set directly (a phone keyboard that sends no key presses),
  // sin(kz) and a name that a longer one starts with (sin, as sinh may follow) convert too, with the cursor after the command.
  for (const [label, profile] of [["desktop", undefined], ["iPhone 13", (({ defaultBrowserType, ...p }) => p)(devices["iPhone 13"])], ["Pixel 7", (({ defaultBrowserType, ...p }) => p)(devices["Pixel 7"])]]) {
    for (const [typed, expected] of [["sin", "\\sin"], ["theta", "\\theta"], ["sin(kz)", "\\sin(kz)"], ["sinh", "\\sinh"]]) {
      const { context: tctx, page: tp } = await newPage(1440, 1000, profile);
      await tp.goto(origin);
      await tp.getByRole("heading", { level: 1, name: "Problem Studio" }).waitFor();
      const tq = tp.getByRole("region", { name: "Part a", exact: true }).getByRole("textbox", { name: "What's the question?" });
      await (profile ? tq.tap() : tq.click());
      await tp.keyboard.type("$");
      const tpanel = tp.getByRole("group", { name: "Type your equation" });
      await tpanel.waitFor();
      const tfield = await mathField(tpanel);
      await tp.waitForTimeout(700);
      await tfield.evaluate((e, value) => { e.value = value; e.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value })); }, typed);
      await tp.waitForTimeout(1000);
      const got = (await tfield.evaluate((e) => e.value)).replace(/\\left|\\right/g, "");
      assert.equal(got, expected, `Studio equation, ${label}, set directly: ${JSON.stringify(typed)} became ${got}`);
      const caret = await tfield.evaluate((e) => [e.position, e.lastOffset]);
      assert.equal(caret[0], caret[1], `Studio equation, ${label}, set directly: ${JSON.stringify(typed)} leaves the cursor at the end`);
      await tctx.close();
    }
  }
  log("Studio equation: text set directly converts sin, theta, sin(kz) and sinh, with the cursor after the command.");

  // ------------------------------------------------------------------ 3. A number answer at 375px
  const small = await newPage(375, 800);
  const m = small.page;
  await m.goto(origin);
  await m.getByRole("heading", { level: 1, name: "Problem Studio" }).waitFor();
  await noSideways(m, "375 empty");
  // No placeholder runs out of its box at 375 (and 320): the written ones stay inside their box, the typed ones are not cut off.
  const placeholdersOutside = () => m.evaluate(() => {
    const bad = [];
    for (const span of document.querySelectorAll("span[aria-hidden=true].absolute.pointer-events-none")) {
      const box = span.parentElement.getBoundingClientRect();
      const r = span.getBoundingClientRect();
      if (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.bottom > box.bottom + 0.5) bad.push(span.textContent);
    }
    const canvas = document.createElement("canvas").getContext("2d");
    for (const input of document.querySelectorAll("input[placeholder], textarea[placeholder]")) {
      if (!input.offsetParent) continue;
      const style = getComputedStyle(input);
      canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const room = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      if (input.tagName === "INPUT" && canvas.measureText(input.placeholder).width > room + 1) bad.push(input.placeholder);
    }
    return bad;
  });
  assert.deepEqual(await placeholdersOutside(), [], "no placeholder overflows its box at 375");
  await m.setViewportSize({ width: 320, height: 700 });
  await m.waitForTimeout(200);
  assert.deepEqual(await placeholdersOutside(), [], "no placeholder overflows its box at 320");
  await m.setViewportSize({ width: 375, height: 800 });
  const mpart = m.getByRole("region", { name: "Part a", exact: true });
  const mq = mpart.getByRole("textbox", { name: "What's the question?" });
  await mq.click();
  await m.keyboard.type("What is g near the surface?", { delay: 10 });
  await m.waitForURL((url) => url.searchParams.has("draft"));
  await saved(m);
  await m.keyboard.press("Control+A"); // stays inside the box
  await mq.click();
  await m.keyboard.type("$");
  await m.getByRole("group", { name: "Type your equation" }).waitFor();
  await noSideways(m, "375 equation panel");
  const panelBox = await m.getByRole("group", { name: "Type your equation" }).boundingBox();
  assert.ok(panelBox.x >= 0 && panelBox.x + panelBox.width <= 376, "the equation panel fits the screen");
  await m.keyboard.press("Escape");
  const nb = await mathField(mpart.getByText("Final Answer (Solution)", { exact: true }).locator("xpath=ancestor::div[contains(@data-tour,'studio-answer')]"));
  await nb.click();
  await m.waitForTimeout(300);
  await m.keyboard.type("9.8");
  await mpart.getByLabel("Unit (optional)").fill("m/s^2");
  await noSideways(m, "375 number answer");
  const tn = mpart.getByLabel("Answer preview", { exact: true });
  await tn.fill("9.81");
  await mpart.getByLabel("Unit for part a").fill("m/s^2");
  const mr = mpart.locator("[data-test-result]");
  await until(async () => /^Correct\./.test(await mr.innerText()), "number correct");
  await mpart.getByLabel("Unit for part a").fill("m");
  await until(async () => /^Needs review\./.test(await mr.innerText()), "unit mismatch");
  await tn.fill("12");
  await mpart.getByLabel("Unit for part a").fill("m/s^2");
  await until(async () => /^Incorrect\./.test(await mr.innerText()), "number incorrect");
  log("Number answer at 375:", JSON.stringify(await mr.innerText()));
  await saved(m);
  const k2 = await savedKey(draftId(m));
  assert.deepEqual(k2, { kind: "numeric", value: 9.8, units: "m/s^2", absTol: 1e-9, relTol: 0.01 });
  await small.context.close();

  // ------------------------------------------------------------------ 3b. Two parts, adapted from a source, a band chosen
  {
    const { context: tctx, page: tp } = await newPage(1440);
    await tp.goto(origin);
    await tp.getByRole("heading", { level: 1, name: "Problem Studio" }).waitFor();
    const mainQ = tp.getByRole("textbox", { name: "Main question (optional)" });
    await mainQ.click();
    await mainQ.pressSequentially("A cart rolls down a ramp.");
    const fill = async (partName, question, solution, answer) => {
      const region = tp.getByRole("region", { name: partName, exact: true });
      const q = region.getByRole("textbox", { name: "What's the question?" });
      await q.click();
      await q.pressSequentially(question);
      const sol = region.getByRole("textbox", { name: "Worked solution (required)" });
      await sol.click();
      await sol.pressSequentially(solution);
      const ans = await mathField(region.locator("[data-simple-field^='a:']"));
      await ans.click();
      await tp.keyboard.type(answer, { delay: 20 });
    };
    await fill("Part a", "How fast is it at the bottom?", "Use energy.", "9.8");
    await tp.getByRole("button", { name: "Add part b" }).click();
    await fill("Part b", "How long does it take?", "Use the speed and the length.", "2.5");
    // Adapted from needs a source, and its own rights tick.
    await tp.getByRole("radio", { name: "Adapted from" }).click();
    await tp.getByLabel("Source", { exact: true }).waitFor();
    await tp.getByRole("radio", { name: /^Intermediate/ }).click();
    await tp.getByText("1,200 · Intermediate", { exact: true }).waitFor();
    await tp.getByRole("button", { name: "Publish", exact: true }).click();
    await tp.getByText("Say where it's from.", { exact: true }).waitFor({ timeout: 3000 });
    await tp.getByText("Tick the box to say you have permission to share it.", { exact: true }).waitFor({ timeout: 3000 });
    await tp.getByLabel("Source", { exact: true }).fill("IPhO 2019, Problem 2");
    await tp.getByLabel(/I have permission to share this adapted problem on Physcratic/).check();
    await tp.waitForURL((url) => url.searchParams.has("draft"));
    const tid = draftId(tp);
    await saved(tp);
    if (process.env.STUDIO_SHOT_DIR) {
      // Full-page pictures of the whole page, for the review. Only when STUDIO_SHOT_DIR is set.
      for (const width of [1440, 375]) {
        await tp.setViewportSize({ width, height: 900 });
        await tp.waitForTimeout(400);
        await tp.screenshot({ path: join(process.env.STUDIO_SHOT_DIR, `studio-simple-${width}.png`), fullPage: true });
      }
      await tp.setViewportSize({ width: 1440, height: 1000 });
    }
    await tp.getByRole("button", { name: "Publish", exact: true }).click();
    await until(async () => (await pool.query("SELECT state FROM authored_problem WHERE id=$1", [tid])).rows[0].state === "published", "the two-part adapted problem publishes");
    const two = await savedContent(tid);
    assert.deepEqual(two.sections[0].parts.map((x) => x.label), ["a", "b"], "two parts, lettered a and b");
    assert.deepEqual(two.provenance, { kind: "authorized", source: "IPhO 2019, Problem 2", rightsDeclaration: "I have permission to share this adapted problem on Physcratic." });
    assert.equal(two.estimatedDifficulty, "1200", "the band saved its middle rating");
    assert.deepEqual(two.context.find((b) => b.kind === "text")?.spans, [{ kind: "text", text: "A cart rolls down a ramp." }]);
    // Every step of the Studio tour points at something on the page, in order.
    const { tours } = await import("../components/tour/tours.ts");
    for (const step of tours.studio.steps) {
      const found = await tp.evaluate((names) => names.some((name) => [...document.querySelectorAll(`[data-tour="${name}"]`)].some((el) => el.getBoundingClientRect().height > 0)), step.targets);
      assert.ok(found, `the Studio tour step ${step.id} has something to point at`);
    }
    await tctx.close();
    log("Two parts, adapted from a source, a band chosen: published and every tour target is on the page.");
  }

  // ------------------------------------------------------------------ 4. The student side of the Simple problem
  for (const width of [375, 1440]) {
    const s = await browser.newContext({ viewport: { width, height: 900 } });
    await s.addCookies([{ name: "viewer", value: "workflow-student", url: origin }]);
    const student = await s.newPage();
    await student.goto(`${origin}/dashboard/authored/${id}`);
    await student.locator("[id^='part-']").first().waitFor({ timeout: 20000 });
    assert.ok(await student.locator(".katex").first().isVisible(), `the equation in the question renders at ${width}`);
    assert.ok(await student.getByRole("img", { name: "A ball thrown upwards from the ground" }).first().isVisible(), `the picture shows at ${width}`);
    const field = student.locator("math-field").first();
    await field.waitFor({ timeout: 20000 });
    await field.click();
    await student.waitForTimeout(300);
    await student.keyboard.type("m*a");
    await student.getByRole("button", { name: "Submit answer", exact: true }).click();
    await student.getByRole("heading", { name: /Correct · saved attempt/ }).waitFor({ timeout: 10000 });
    log(`Student at ${width}: Correct`);
    await s.close();
  }
  // Pictures for the Learn guide. Only when GUIDE_SHOT_DIR is set. Light mode, 1280px wide, real editor and API.
  if (process.env.GUIDE_SHOT_DIR) {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(process.env.GUIDE_SHOT_DIR, { recursive: true });
    const g = await newPage(1280, 1000);
    const gp = g.page;
    await gp.goto(origin);
    await gp.getByRole("heading", { level: 1, name: "Problem Studio" }).waitFor();
    const gpart = gp.getByRole("region", { name: "Part a", exact: true });
    const gq = gpart.getByRole("textbox", { name: "What's the question?" });
    await gq.click();
    await gp.keyboard.type("A ball is thrown straight up at ", { delay: 5 });
    await gp.keyboard.type("$");
    const gpanel = gp.getByRole("group", { name: "Type your equation" });
    await gpanel.waitFor();
    await gpanel.locator("math-field").first().waitFor({ timeout: 20000 });
    await gp.waitForTimeout(500);
    await gp.keyboard.type("v_0");
    await gp.keyboard.press("ArrowRight");
    await gp.keyboard.type("=12");
    await gp.keyboard.press("Escape");
    await gp.keyboard.type(" m/s from the ground. How high does it go?", { delay: 5 });
    await gp.waitForURL((url) => url.searchParams.has("draft"));
    await saved(gp);
    const [gchooser] = await Promise.all([gp.waitForEvent("filechooser"), gpart.getByRole("button", { name: "Choose an image" }).click()]);
    await gchooser.setFiles(process.env.GUIDE_PICTURE || { name: "ball.png", mimeType: "image/png", buffer: png });
    await gpart.getByLabel("Describe the image").waitFor({ timeout: 20000 });
    await gpart.getByLabel("Describe the image").fill("A ball thrown upwards from the ground, rising along a curve");
    const gans = await mathField(gpart.getByText("Final Answer (Solution)", { exact: true }).locator("xpath=ancestor::div[contains(@data-tour,'studio-answer')]"));
    await gans.click();
    await gp.waitForTimeout(400);
    await gp.keyboard.type("v^2/(2g)");
    await saved(gp);
    // The picture should not show drafts left over from the checks above.
    await gp.getByRole("button", { name: /Continue your last draft/ }).evaluate((el) => el.remove()).catch(() => {});
    await gp.evaluate(() => window.scrollTo(0, 0));
    await gp.screenshot({ path: `${process.env.GUIDE_SHOT_DIR}/studio-simple.png` });
    // The equation panel open, with the question in view.
    await gq.locator("[data-math-id]").click();
    await gpanel.waitFor();
    await gpanel.locator("math-field").first().waitFor({ timeout: 20000 });
    await gp.waitForTimeout(700);
    await gq.evaluate((el) => { const top = el.getBoundingClientRect().top + window.scrollY - 140; window.scrollTo(0, top); });
    await gp.waitForTimeout(300);
    await gp.screenshot({ path: `${process.env.GUIDE_SHOT_DIR}/studio-equation.png` });
    await g.context.close();
  }
  assert.deepEqual(errors, [], "no browser errors");
  await wide.close();

} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await rm(temp, { recursive: true, force: true });
}
