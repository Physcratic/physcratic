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
const { chromium } = browserTools("playwright");
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
  const newPage = async (width, height = 1000) => {
    const context = await browser.newContext({ viewport: { width, height } });
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
  for (const text of ["What's the question?", "Add a picture (optional)", "Final answer. We check students against this.", "Try an answer", "Worked solution (optional)"])
    await page.getByText(text, { exact: true }).waitFor();
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
  assert.ok(await page.getByText("We made this from your question. Change it if you like.").isVisible());

  // Clicking the equation edits it.
  await question.locator("[data-math-id]").click();
  await panel.waitFor();
  await mathField(panel);
  await page.waitForTimeout(300);
  assert.equal(await panel.locator("math-field").evaluate((e) => e.value), "v=12", "the panel opens with the equation in it");
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "detached" });

  // The picture.
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), click(part.getByRole("button", { name: "Choose a picture" }))]);
  await chooser.setFiles({ name: "ball.png", mimeType: "image/png", buffer: png });
  await part.getByLabel("Describe the picture").waitFor({ timeout: 20000 });
  await typed(part.getByLabel("Describe the picture"), "A ball thrown upwards from the ground");

  // The answer key and Try an answer.
  const answerBox = await mathField(part.getByText("Final answer. We check students against this.").locator("xpath=ancestor::div[contains(@data-tour,'studio-answer')]"));
  await focusClick(answerBox);
  await page.waitForTimeout(300);
  await page.keyboard.type("m*a");
  counts.typedFields++; counts.keys += 3;
  await until(async () => (await part.getByRole("list", { name: "Symbols in this answer" }).locator("li").allInnerTexts()).map((x) => x.trim()).join(",") === "m,a", "symbols detected");
  const tryBox = await mathField(part.getByText("Try an answer", { exact: true }).locator("xpath=ancestor::div[contains(@data-tour,'studio-try')]"));
  await focusClick(tryBox);
  await page.waitForTimeout(300);
  await page.keyboard.type("a*m");
  const result = part.locator("[data-test-result]");
  await until(async () => /^Correct\./.test(await result.innerText()), "try an answer: correct");
  await page.keyboard.press("Control+A"); await page.keyboard.type("m+a");
  await until(async () => /^Incorrect\./.test(await result.innerText()), "try an answer: incorrect");
  log("Try an answer:", JSON.stringify(await result.innerText()));

  // Rights and Publish.
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
  await page.getByRole("button", { name: "Add another part" }).click();
  await page.getByRole("region", { name: "Part b", exact: true }).waitFor();
  await page.getByRole("button", { name: "Remove part b" }).click();
  await page.getByRole("region", { name: "Part b", exact: true }).waitFor({ state: "detached" });

  // ------------------------------------------------------------------ 2. Messages sit next to their field, nothing is saved too early
  const fresh = await newPage(1440);
  const f = fresh.page;
  await f.goto(origin);
  await f.getByRole("button", { name: /Continue your last draft/ }).waitFor();
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM authored_problem")).rows[0].n, 1, "no draft is created before the first edit");
  await f.getByRole("button", { name: "Publish", exact: true }).click();
  for (const text of ["Write the question first.", "Add the final answer.", "Give it a title, or write the question and we'll make one.", "Tick the box to say you wrote this problem."])
    await f.getByText(text, { exact: true }).waitFor({ timeout: 3000 });
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM authored_problem")).rows[0].n, 1, "still no draft");
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
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM authored_problem")).rows[0].n, 2, "exactly one draft per problem");
  log("Fast typing across the first save kept every character.");
  await fresh.context.close();

  // ------------------------------------------------------------------ 3. A number answer at 375px
  const small = await newPage(375, 800);
  const m = small.page;
  await m.goto(origin);
  await m.getByRole("heading", { level: 1, name: "Problem Studio" }).waitFor();
  await noSideways(m, "375 empty");
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
  const nb = await mathField(mpart.getByText("Final answer. We check students against this.").locator("xpath=ancestor::div[contains(@data-tour,'studio-answer')]"));
  await nb.click();
  await m.waitForTimeout(300);
  await m.keyboard.type("9.8");
  await mpart.getByLabel("Unit (optional)").fill("m/s^2");
  await noSideways(m, "375 number answer");
  const tn = mpart.getByLabel("Try an answer", { exact: true });
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
  assert.deepEqual(errors, [], "no browser errors");
  await wide.close();

} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await rm(temp, { recursive: true, force: true });
}
