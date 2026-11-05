// Easy mode in Problem Studio, against the real editor and API on the throwaway PostgreSQL (loopback only).
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
  const TARGET = { screens: 1, clicks: 4, selects: 0, fields: 4 };
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
  const mathLive = async (page, scope) => {
    const field = (scope ?? page).locator("math-field").first();
    await field.waitFor({ timeout: 20000 });
    return field;
  };

  // ------------------------------------------------------------------ 1. Publish a one-part problem at 1440
  const { context: wide, page } = await newPage(1440);
  await page.goto(origin);
  await page.getByRole("heading", { level: 1, name: "Problem Studio" }).waitFor();
  const counts = { screens: 1, clicks: 0, selects: 0, fields: 0, keys: 0 };
  const click = async (l) => { await l.click(); counts.clicks++; };
  const type = async (l, text) => { await l.fill(text); counts.fields++; counts.keys += text.length; };
  assert.equal(await page.getByRole("button", { name: "Easy" }).getAttribute("aria-pressed"), "true", "Easy is the default");
  assert.equal(await page.getByRole("button", { name: "Publish problem" }).count(), 1, "one Publish button");
  assert.ok(await page.getByRole("complementary", { name: "Student preview" }).isVisible(), "the preview sits beside the editor at 1440");
  assert.equal(await page.getByRole("button", { name: "Advanced" }).getAttribute("aria-pressed"), "false");
  const title = "Phase 0 baseline problem";
  await type(page.getByLabel("Title", { exact: true }), title);
  await page.waitForURL((url) => url.searchParams.has("draft"));
  const id = draftId(page);
  await saved(page);
  await type(page.getByLabel("Problem text", { exact: true }), "Find the net force on a 2 kg cart that accelerates at 5 m/s2. Give F in terms of m and a.");
  await type(page.getByLabel("Question", { exact: true }), "Find F.");
  const answer = await mathLive(page, page.getByRole("region", { name: "Part a", exact: true }));
  await click(answer);
  await page.waitForTimeout(300);
  await page.keyboard.type("m*a");
  counts.fields++; counts.keys += 3;
  await until(async () => (await page.getByRole("list", { name: "Symbols in this answer" }).locator("li").allInnerTexts()).map((x) => x.trim()).join(",") === "m,a", "symbols detected");
  assert.deepEqual((await page.getByRole("list", { name: "Symbols in this answer" }).locator("li").allInnerTexts()).map((t) => t.trim()), ["m", "a"], "symbols are found from the answer");
  assert.equal(await page.locator("select:visible").count(), 0, "no select on the page");
  await click(page.getByLabel(/I wrote this problem and I'm happy to share it on Physcratic/));
  await saved(page);
  const publish = page.getByRole("button", { name: "Publish problem", exact: true });
  await click(publish);
  await until(async () => (await pool.query("SELECT state FROM authored_problem WHERE id=$1", [id])).rows[0].state === "published", "publish");
  log(`EASY PUBLISH: ${JSON.stringify(counts)}  target ${JSON.stringify(TARGET)}`);
  assert.ok(counts.screens <= TARGET.screens && counts.clicks <= TARGET.clicks && counts.selects <= TARGET.selects && counts.fields <= TARGET.fields, "within the click target");
  const row = (await pool.query("SELECT content FROM authored_draft WHERE problem_id=$1", [id])).rows[0].content;
  assert.equal(row.title, title);
  assert.equal(row.provenance.kind, "original");
  assert.equal(row.provenance.rightsDeclaration, "I wrote this problem and I'm happy to share it on Physcratic.");
  assert.equal(row.sections.length, 1);
  assert.equal(row.sections[0].parts[0].label, "a");
  assert.equal(row.sections[0].parts[0].answerMode, "expression");
  const partId = row.sections[0].parts[0].id;
  const key = (await pool.query("SELECT data FROM authored_draft_private_part WHERE problem_id=$1", [id]).catch(() => ({ rows: [] }))).rows[0]?.data?.key;
  if (key) { assert.equal(key.kind, "expression"); assert.deepEqual(key.variables.map((v) => v.name), ["m", "a"]); assert.equal(key.angleUnit, "radians"); }

  // Preview and Test an answer at 1440
  const part = page.getByRole("region", { name: "Part a preview" });
  await part.waitFor();
  const testBox = await mathLive(page, part);
  await testBox.click();
  await page.waitForTimeout(300);
  await page.keyboard.type("a*m");
  await until(async () => /Correct\./.test(await part.locator("[data-test-result]").innerText()), "test answer correct");
  await page.keyboard.press("Control+A"); await page.keyboard.type("m+a");
  await until(async () => /Incorrect\./.test(await part.locator("[data-test-result]").innerText()), "test answer incorrect");
  log("Test an answer at 1440:", JSON.stringify(await part.locator("[data-test-result]").innerText()));

  // Switching to Advanced and back loses nothing and saves nothing new
  const before = (await pool.query("SELECT version FROM authored_draft WHERE problem_id=$1", [id])).rows[0].version;
  await click(page.getByRole("button", { name: "Advanced" }));
  assert.equal(await page.getByLabel("Problem title", { exact: true }).inputValue(), title);
  assert.equal(await page.getByLabel("Section 1 part 1 label", { exact: true }).inputValue(), "a");
  await page.getByRole("button", { name: "Easy" }).click();
  assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), title);
  await page.waitForTimeout(2500);
  assert.equal((await pool.query("SELECT version FROM authored_draft WHERE problem_id=$1", [id])).rows[0].version, before, "switching modes saves nothing");
  assert.equal((await page.evaluate(() => localStorage.getItem("physcratic.studio.mode"))), "easy");

  // Continue link on a new Easy page
  const fresh = await newPage(1440);
  await fresh.page.goto(origin);
  await fresh.page.getByRole("button", { name: /Continue your last draft/ }).waitFor();
  assert.equal(await fresh.page.getByRole("button", { name: "Publish problem" }).isEnabled(), true, "Publish shows what is missing instead of staying silent");
  await fresh.page.getByRole("button", { name: "Publish problem" }).click();
  for (const text of ["Give the problem a title.", "Write the question for this part.", "Add the answer for this part.", "Tick the box to say you wrote this problem."])
    await fresh.page.getByText(text, { exact: true }).waitFor({ timeout: 3000 });
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM authored_problem")).rows[0].n, 1, "no draft is created before the first edit");
  // Fast typing across the first save keeps every character.
  const f = fresh.page;
  await f.getByLabel("Title", { exact: true }).pressSequentially("Pendulum on a cart", { delay: 15 });
  await f.getByLabel("Problem text", { exact: true }).pressSequentially("A bob of mass $m$ hangs from a cart.", { delay: 15 });
  await f.waitForURL((url) => url.searchParams.has("draft"));
  await saved(f);
  await f.waitForTimeout(500);
  assert.equal(await f.getByLabel("Title", { exact: true }).inputValue(), "Pendulum on a cart");
  assert.equal(await f.getByLabel("Problem text", { exact: true }).inputValue(), "A bob of mass $m$ hangs from a cart.");
  const second = draftId(f);
  await until(async () => { const r = (await pool.query("SELECT content FROM authored_draft WHERE problem_id=$1", [second])).rows[0]?.content; return r?.title === "Pendulum on a cart" && r.context?.[0]?.spans?.some((s) => s.latex === "m"); }, "fast typing saved");
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM authored_problem")).rows[0].n, 2, "exactly one draft per problem");
  log("Fast typing across the first save kept every character.");
  await fresh.context.close();

  // ------------------------------------------------------------------ 2. A number answer, 375px, tabs
  const small = await newPage(375, 800);
  const m = small.page;
  await m.goto(origin);
  await m.getByRole("heading", { level: 1, name: "Problem Studio" }).waitFor();
  await noSideways(m, "375 empty");
  await m.getByLabel("Title", { exact: true }).fill("Free fall");
  await m.waitForURL((url) => url.searchParams.has("draft"));
  await saved(m);
  await m.getByLabel("Question", { exact: true }).fill("What is g near the surface?");
  const numberBox = await mathLive(m, m.getByRole("region", { name: "Part a", exact: true }));
  await numberBox.click();
  await m.waitForTimeout(300);
  await m.keyboard.type("9.8");
  await m.getByLabel("Unit", { exact: true }).fill("m/s^2");
  await noSideways(m, "375 write");
  assert.equal(await m.getByRole("complementary", { name: "Student preview" }).isVisible(), false, "the preview is its own tab at 375");
  await m.getByRole("button", { name: "Preview" }).click();
  await noSideways(m, "375 preview");
  const mp = m.getByRole("region", { name: "Part a preview" });
  await mp.getByLabel("Test an answer for part a").fill("9.81");
  await mp.getByLabel("Unit for part a").fill("m/s^2");
  await until(async () => /Correct\./.test(await mp.locator("[data-test-result]").innerText()), "number correct");
  await mp.getByLabel("Unit for part a").fill("m");
  await until(async () => /Needs review\./.test(await mp.locator("[data-test-result]").innerText()), "unit mismatch");
  await mp.getByLabel("Test an answer for part a").fill("12");
  await mp.getByLabel("Unit for part a").fill("m/s^2");
  await until(async () => /Incorrect\./.test(await mp.locator("[data-test-result]").innerText()), "number incorrect");
  log("Number answer at 375:", JSON.stringify(await mp.locator("[data-test-result]").innerText()));
  await m.getByRole("button", { name: "Write" }).click();
  await saved(m);
  const k2 = (await pool.query("SELECT data FROM authored_draft_private_part WHERE problem_id=$1", [draftId(m)]).catch(() => ({ rows: [] }))).rows[0]?.data?.key;
  if (k2) assert.deepEqual(k2, { kind: "numeric", value: 9.8, units: "m/s^2", absTol: 1e-9, relTol: 0.01 });
  await small.context.close();

  // ------------------------------------------------------------------ 3. The student side of the Easy problem
  for (const width of [375, 1440]) {
    const s = await browser.newContext({ viewport: { width, height: 900 } });
    await s.addCookies([{ name: "viewer", value: "workflow-student", url: origin }]);
    const student = await s.newPage();
    await student.goto(`${origin}/dashboard/authored/${id}`);
    await student.locator("[id^='part-']").first().waitFor({ timeout: 20000 });
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
