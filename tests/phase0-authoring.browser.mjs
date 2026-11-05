// Phase 0 baseline: publish a one-part, one-expression problem in the real Problem Studio and count the work.
// Boilerplate (throwaway PostgreSQL, real editor and API, injected session) is copied from tests/problem-authoring.browser.mjs.
// Run: AUTHORING_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:PORT/physcratic_authoring_test CHROMIUM_PATH=/path/to/chrome node --require ./tests/server-only-register.cjs --import tsx tests/phase0-authoring.browser.mjs
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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error("Browser error:", e.message);
  });
  page.on("dialog", (d) => d.accept());
  await page.goto(origin);
  const counts = { clicks: 0, fills: 0, selects: 0, keystrokes: 0 };
  const click = async (locator) => { await locator.click(); counts.clicks++; };
  const fill = async (locator, text) => { await locator.fill(text); counts.fills++; counts.keystrokes += text.length; };
  const choose = async (locator, value) => { await locator.selectOption(value); counts.selects++; };
  const controls = (label) => page.evaluate((label) => {
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden"; };
    const name = (el) => (el.labels?.[0]?.innerText || el.getAttribute("aria-label") || el.innerText || el.placeholder || el.id || "").replace(/\s+/g, " ").trim().slice(0, 70);
    const all = [...document.querySelectorAll("input, select, textarea, button, summary, a[href]")].filter(visible);
    const chips = all.filter((el) => el.tagName === "BUTTON" && el.hasAttribute("aria-pressed")).length;
    const rows = all.filter((el) => !(el.tagName === "BUTTON" && el.hasAttribute("aria-pressed"))).map((el) => `${el.tagName.toLowerCase()}${el.type && el.tagName !== "BUTTON" ? ":" + el.type : ""}${el.required || el.getAttribute("aria-required") === "true" ? "*" : ""} ${name(el)}`);
    if (chips) rows.push(`(${chips} topic and method chips, buttons with aria-pressed)`);
    return { label, count: all.length, rows };
  }, label);
  const show = (info) => console.log(`\n## ${info.label}: ${info.count} controls\n` + info.rows.map((r) => "  " + r).join("\n"));

  show(await controls("Screen 1: Problem Studio draft list"));
  await click(page.getByRole("button", { name: "New problem", exact: true }));
  await fill(page.getByLabel("Problem title", { exact: true }), "Phase 0 baseline problem");
  await page.waitForURL((url) => url.searchParams.has("draft"));
  const id = new URL(page.url()).searchParams.get("draft");
  await until(async () => (await page.getByRole("status").allTextContents()).some((t) => t.includes("All changes saved")), "autosave");
  show(await controls("Screen 2: empty editor, title only"));
  console.log("status/alerts:", JSON.stringify(await page.locator("[role=status],[role=alert]").allInnerTexts()));
  const blockers = async () => (await page.locator("body").innerText()).split("\n").map((l) => l.trim()).filter((l) => /required|at least one|must be|invalid|missing/i.test(l) && l.length < 140 && !/^Required for authorized/.test(l));
  const step = async (name) => { await page.waitForTimeout(250); console.log(`[click ${counts.clicks} | fill ${counts.fills} | select ${counts.selects} | keys ${counts.keystrokes}] ${name}\n    blockers: ${JSON.stringify(await blockers())}   publish enabled: ${await page.getByRole("button", { name: "Publish problem", exact: true }).isEnabled()}`); };
  await step("after title");
  await fill(page.getByLabel("Rights declaration", { exact: true }), "I wrote this problem myself.");
  await step("after rights declaration");
  console.log("provenance default:", await page.getByLabel("Content provenance").inputValue(), "| options:", JSON.stringify(await page.getByLabel("Content provenance").locator("option").allInnerTexts()));
  await click(page.getByRole("button", { name: "+ Add section", exact: true }));
  await step("after + Add section");
  await click(page.getByRole("button", { name: "+ Add part to section 1", exact: true }));
  await step("after + Add part");
  console.log("defaults: section title =", JSON.stringify(await page.getByLabel("Section 1 title", { exact: true }).inputValue()), "| part label =", JSON.stringify(await page.getByLabel("Section 1 part 1 label", { exact: true }).inputValue()));
  await click(page.getByRole("button", { name: "Add text to part 1 statement", exact: true }));
  await fill(page.getByLabel(/Part .* statement text 1/i).first(), "Find the net force on a 2 kg cart that accelerates at 5 m/s2. Give F in terms of m and a.");
  await step("after statement text");
  await click(page.locator("summary", { hasText: "Answer key, hints and solution" }));
  show(await controls("Answer key panel opened (before choosing a type)"));
  const card = page.locator("section[data-order-item]").filter({ has: page.getByLabel("Section 1 part 1 label", { exact: true }) }).last();
  console.log("answer type default:", await card.getByLabel("Answer type", { exact: true }).inputValue(), "| options:", JSON.stringify(await card.getByLabel("Answer type", { exact: true }).locator("option").allInnerTexts()));
  await choose(card.getByLabel("Answer type", { exact: true }), "expression");
  await step("after Answer type = expression");
  console.log(JSON.stringify((await card.locator("input,select,textarea,button").evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => (e.labels?.[0]?.innerText || e.getAttribute("aria-label") || e.innerText || "").trim().slice(0, 50)))), null, 0));
  await fill(card.getByLabel("Expected expression", { exact: true }), "m*a");
  await step("after Expected expression m*a");
  console.log("angle default:", await card.getByLabel("Angle convention").inputValue());
  const addVar = card.getByRole("button", { name: /variable/i });
  console.log("variable buttons:", JSON.stringify(await addVar.allInnerTexts()));
  const cardControls = () => card.evaluate((el) => [...el.querySelectorAll("input,select,textarea,button")].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest("[data-order-item] [data-order-item]") ).map((e) => `${e.tagName.toLowerCase()}${e.type ? ":" + e.type : ""} ${(e.labels?.[0]?.innerText || e.getAttribute("aria-label") || e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 60)}`).filter((s) => !/Move |Delete |Upload image|Add text|Add equation|Inline equation|Text span/.test(s)));
  console.log("Answer key panel before variables:", JSON.stringify(await cardControls()));
  await click(card.getByRole("button", { name: "+ Add variable" }));
  console.log("after one + Add variable:", JSON.stringify(await cardControls()));
  await fill(card.getByLabel("Symbol").first(), "m");
  await click(card.getByRole("button", { name: "+ Add variable" }));
  await fill(card.getByLabel("Symbol").nth(1), "a");
  await step("after declaring m and a");
  show(await controls("Final editor state"));
  await click(page.getByRole("button", { name: "Publish problem", exact: true }));
  await until(async () => (await pool.query("SELECT state FROM authored_problem WHERE id=$1", [id])).rows[0].state === "published", "publish");
  await page.waitForTimeout(500);
  console.log("PUBLISHED after", JSON.stringify(counts), "| UI:", JSON.stringify((await page.locator("[role=status],[role=alert]").allInnerTexts()).filter(Boolean)));

  // The student side of the same problem, in the same harness: list the screen and walk read, answer, check, solution.
  const inv = (p) => p.evaluate(() => {
    const rows = [];
    const closedDetails = (el) => { const d = el.parentElement?.closest("details:not([open])"); return Boolean(d) && !(el.tagName === "SUMMARY" && el.parentElement === d); };
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !closedDetails(el); };
    const label = (el) => (el.getAttribute("aria-label") || el.labels?.[0]?.innerText || el.innerText || el.getAttribute("placeholder") || el.id || "").replace(/\s+/g, " ").trim().slice(0, 80);
    const size = (el) => { const r = el.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; };
    const interactive = "a[href],button,input,textarea,select,summary,[role=tab]";
    let run = null;
    const flush = () => { if (run) { rows.push(`text    ${run.paras} text blocks, ${run.chars} characters, starts "${run.start}"`); run = null; } };
    const walk = (node) => { for (const el of node.children) {
      if (!visible(el) || ["SCRIPT", "STYLE"].includes(el.tagName) || el.closest(".katex-mathml")) continue;
      if (/^H[1-6]$/.test(el.tagName)) { flush(); rows.push(`${el.tagName.toLowerCase().padEnd(7)} ${label(el)}`); continue; }
      if (el.matches(interactive)) { flush(); rows.push(`${(el.tagName === "INPUT" ? "input:" + el.type : el.getAttribute("role") === "tab" ? "tab" : el.tagName.toLowerCase()).padEnd(7)} ${label(el)} [${size(el)}]${el.disabled ? " (disabled)" : ""}`); continue; }
      if (el.matches("p,li,blockquote,pre,.katex-display,figcaption,dd,dt,label") && !el.querySelector(interactive)) { const t = el.innerText.replace(/\s+/g, " ").trim(); if (!t) continue; run ??= { paras: 0, chars: 0, start: t.slice(0, 40) }; run.paras++; run.chars += t.length; continue; }
      walk(el);
    } };
    walk(document.body); flush();
    return rows;
  });
  for (const width of [375, 1440]) {
    const studentContext = await browser.newContext({ viewport: { width, height: 900 } });
    await studentContext.addCookies([{ name: "viewer", value: "workflow-student", url: origin }]);
    const student = await studentContext.newPage();
    await student.goto(`${origin}/dashboard/authored/${id}`);
    await student.locator("[id^='part-']").first().waitFor({ timeout: 20000 });
    await student.waitForTimeout(500);
    const rows = await inv(student);
    console.log(`\n=== AUTHORED student page at ${width}: ${rows.length} listed items`);
    rows.forEach((r) => console.log("  " + r));
    if (width === 1440) {
      const c = { clicks: 0, keys: 0 };
      const answer = student.getByLabel("Expression answer", { exact: true });
      if (await answer.count()) { await answer.click(); c.clicks++; await answer.pressSequentially("m*a"); c.keys += 3; }
      const names = await student.getByRole("button").allInnerTexts();
      console.log("buttons on the page:", JSON.stringify(names.map((n) => n.trim()).filter(Boolean)));
      const submit = student.getByRole("button", { name: "Submit answer", exact: true });
      if (await submit.count()) { await submit.click(); c.clicks++; await student.getByRole("heading", { name: /saved attempt/ }).first().waitFor({ timeout: 10000 }).catch(() => {}); await student.waitForTimeout(400); }
      console.log("choose part value:", JSON.stringify(await student.getByLabel("Choose part", { exact: true }).inputValue()), JSON.stringify(await student.getByLabel("Choose part", { exact: true }).locator("option").allInnerTexts()));
      console.log("form text:", JSON.stringify((await student.locator("main, body").first().innerText()).split("\n").filter((l) => /part|submit|choose|retain|required|error|could not/i.test(l)).slice(0, 14)));
      console.log("after answering and checking:", JSON.stringify(c), "| feedback:", JSON.stringify((await student.getByRole("heading", { name: /saved attempt/ }).allInnerTexts()).concat(await student.locator("[role=status]").allInnerTexts()).filter(Boolean)).slice(0, 500));
      console.log("solution controls:", JSON.stringify((await student.getByRole("button", { name: /solution/i }).allInnerTexts()).concat(await student.getByRole("link", { name: /solution/i }).allInnerTexts())));
    }
    await studentContext.close();
  }

} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await rm(temp, { recursive: true, force: true });
}