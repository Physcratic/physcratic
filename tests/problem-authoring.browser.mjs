// Run with scripts/test-problem-authoring.sh node_modules/.bin/tsx tests/problem-authoring.browser.mjs
// Browser harness uses real production editor + API factory on disposable PostgreSQL.
// Better Auth sessions are injected, not simulated browser login. Test tooling is external.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { Pool } from "pg";
import { createAuthorMediaApi } from "../lib/author-media-api.ts";
import { memoryAuthorStorage, png, pdf } from "./author-media-fixtures.ts";
import { createProblemAuthoringApi } from "../lib/problem-authoring-api.ts";
import { isAllowedSubmissionOrigin } from "../lib/submission-security.ts";
const require = createRequire(import.meta.url);
const browserTools = process.env.AUTHORING_BROWSER_TOOLS
  ? createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"))
  : require;
const { chromium } = browserTools("playwright");
const { default: AxeBuilder } = browserTools("@axe-core/playwright");
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
const api = createProblemAuthoringApi({
  pool,
  user: async () => ({ id: "browser-author", emailVerified: true }),
  origin: (request) => isAllowedSubmissionOrigin(request, [origin]),
});
const mediaStorage = memoryAuthorStorage();
const mediaApi = createAuthorMediaApi({
  pool,
  storage: mediaStorage.storage,
  user: async () => ({ id: "browser-author", emailVerified: true }),
  origin: (request) => isAllowedSubmissionOrigin(request, [origin]),
});
async function until(check, label) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error(`Timed out: ${label}`);
}
try {
  await pool.query(
    'CREATE TABLE "user" (id text PRIMARY KEY); INSERT INTO "user" VALUES (\'browser-author\')',
  );
  for (const name of [
    "0001_problem_authoring",
    "0002_authored_write_limit",
    "0003_author_media",
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
        if (paths[2] === "media") response = await mediaApi("cleanup", request);
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
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Physcratic editor test</title><style>:root{--font-inter:Arial,sans-serif}body{font-family:Arial,sans-serif}</style><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/katex.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
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
  await page.getByRole("button", { name: "New problem", exact: true }).click();
  await page
    .getByLabel("Problem title", { exact: true })
    .fill("The pendulum experiment");
  const id = new URL(page.url()).searchParams.get("draft");
  assert.ok(id);
  await page
    .getByRole("button", { name: "Add text to common context", exact: true })
    .click();
  await page
    .getByLabel("Common context text 1", { exact: true })
    .fill("A pendulum swings through a small angle. ");
  await page
    .getByRole("button", { name: "+ Inline equation", exact: true })
    .click();
  await page
    .getByLabel("Common context inline equation 2", { exact: true })
    .fill(String.raw`T = 2\pi\sqrt{L/g}`);
  await page
    .getByRole("button", { name: "+ Add section", exact: true })
    .click();
  await page.getByLabel("Section 1 title", { exact: true }).fill("Motion");
  await page
    .getByRole("button", { name: "+ Add section", exact: true })
    .click();
  await page.getByLabel("Section 2 title", { exact: true }).fill("Energy");
  await page
    .getByRole("button", { name: "Move section 2 up", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.getByLabel("Section 1 title", { exact: true }).inputValue(),
    "Energy",
  );
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.hasAttribute("data-order-item"),
    ),
    true,
  );
  await page
    .getByRole("button", { name: "+ Add part to section 1", exact: true })
    .click();
  await page
    .getByText("Private answer, hints & solution · part 1", { exact: true })
    .click();
  await page.getByLabel("Answer type", { exact: true }).selectOption("numeric");
  await page.getByLabel("Expected value", { exact: true }).fill("");
  await page
    .getByLabel("Expected value", { exact: true })
    .pressSequentially("-0.5");
  assert.equal(
    await page.getByLabel("Expected value", { exact: true }).inputValue(),
    "-0.5",
  );
  await page.getByLabel("Units", { exact: true }).fill("m");
  await page
    .getByRole("button", { name: "Add text to worked solution", exact: true })
    .click();
  await page
    .getByLabel("Worked solution text 1", { exact: true })
    .fill("PRIVATE_KEY_SENTINEL");
  await page
    .getByLabel("Upload image to worked solution", { exact: true })
    .setInputFiles({
      name: "private.png",
      mimeType: "image/png",
      buffer: Buffer.from(png),
    });
  await page
    .getByLabel("Worked solution image 2 alt text", { exact: true })
    .fill("Private solution diagram");
  await page
    .getByRole("button", { name: "+ Add part to section 2", exact: true })
    .click();
  const secondSection = page
    .locator("section[data-order-item]")
    .filter({ has: page.getByLabel("Section 2 title", { exact: true }) });
  await secondSection
    .getByText("Private answer, hints & solution · part 1", { exact: true })
    .click();
  await secondSection
    .getByLabel("Answer type", { exact: true })
    .selectOption("expression");
  await secondSection
    .getByLabel("Expected expression", { exact: true })
    .fill("x^2");
  await secondSection
    .getByRole("button", { name: "+ Add variable", exact: true })
    .click();
  await secondSection.getByLabel("Symbol", { exact: true }).fill("x");
  await secondSection
    .getByLabel("Minimum (optional)", { exact: true })
    .pressSequentially("-0.5");
  assert.equal(
    await secondSection
      .getByLabel("Minimum (optional)", { exact: true })
      .inputValue(),
    "-0.5",
  );
  await page
    .getByLabel("Rights declaration", { exact: true })
    .fill("I own this original work.");
  await until(
    async () =>
      (await page.getByRole("status").allTextContents()).some((s) =>
        s.includes("All changes saved"),
      ),
    "autosave",
  );
  // Secure upload, failed replacement, private preview isolation and autosaved restoration.
  const uploadFile = (name, bytes = png, mimeType = "image/png") => ({
    name,
    mimeType,
    buffer: Buffer.from(bytes),
  });
  await page
    .getByLabel("Upload image to common context", { exact: true })
    .setInputFiles(uploadFile("diagram.png"));
  await page
    .getByLabel("Common context image 2 alt text", { exact: true })
    .fill("Pendulum diagram");
  await until(
    async () =>
      await page
        .getByAltText("Pendulum diagram", { exact: true })
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    "private image proxy",
  );
  const firstMedia = await page
    .getByAltText("Pendulum diagram", { exact: true })
    .getAttribute("src");
  mediaStorage.failPut = true;
  await page
    .getByLabel("Replace common context image 2", { exact: true })
    .setInputFiles(uploadFile("failed.png"));
  await until(
    async () =>
      (await page.getByRole("alert").allTextContents()).some((t) =>
        t.includes("temporarily unavailable"),
      ),
    "failed upload feedback",
  );
  assert.equal(
    await page
      .getByAltText("Pendulum diagram", { exact: true })
      .getAttribute("src"),
    firstMedia,
  );
  mediaStorage.failPut = false;
  await page
    .getByLabel("Replace common context image 2", { exact: true })
    .setInputFiles(uploadFile("replacement.png"));
  await until(
    async () =>
      (await page
        .getByAltText("Pendulum diagram", { exact: true })
        .getAttribute("src")) !== firstMedia,
    "replacement",
  );
  await page
    .getByLabel("Upload statement PDF", { exact: true })
    .setInputFiles(uploadFile("statement.pdf", pdf, "application/pdf"));
  await page
    .getByRole("link", { name: "Download statement PDF", exact: true })
    .waitFor();
  await page
    .getByLabel("Upload private solution PDF", { exact: true })
    .setInputFiles(uploadFile("solution.pdf", pdf, "application/pdf"));
  await page
    .getByRole("link", { name: "Download private solution PDF", exact: true })
    .waitFor();
  await until(
    async () =>
      (await page.getByRole("status").allTextContents()).some((t) =>
        t.includes("All changes saved"),
      ),
    "media autosave",
  );
  await page
    .getByRole("button", { name: "Student preview", exact: true })
    .click();
  assert.equal(
    await page.getByRole("article", { name: "Student-facing preview" }).count(),
    1,
  );
  assert.equal(
    (await page.locator("body").innerText()).includes("PRIVATE_KEY_SENTINEL"),
    false,
  );
  assert.equal(
    await page
      .getByAltText("Private solution diagram", { exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.getByAltText("Pendulum diagram", { exact: true }).count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("link", { name: "Download statement PDF 1", exact: true })
      .count(),
    1,
  );
  assert.equal(
    (await page.locator("body").innerText()).includes(
      "Download private solution PDF",
    ),
    false,
  );
  assert.ok(
    await page.locator(".katex .sqrt").count(),
    "LaTeX square root must render, not plain command text",
  );
  await page.getByRole("button", { name: "Write", exact: true }).click();
  failNext = 1;
  await page
    .getByLabel("Problem title", { exact: true })
    .fill("Unsaved valuable work");
  await page
    .getByRole("heading", { name: "Your work has not been saved" })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Restore local work", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Problem title", { exact: true }).inputValue(),
    "Unsaved valuable work",
  );
  assert.equal(
    await page
      .getByLabel("Common context image 2 alt text", { exact: true })
      .inputValue(),
    "Pendulum diagram",
  );
  await page.getByRole("button", { name: "Save now", exact: true }).click();
  await until(
    async () =>
      (await page.getByRole("status").allTextContents()).some((s) =>
        s.includes("All changes saved"),
      ),
    "recovery save",
  );
  const current = await (
    await api(
      "read",
      new Request(`${origin}/api/authored-problems/drafts/${id}`),
      id,
    )
  ).json();
  const update = await api(
    "update",
    new Request(`${origin}/api/authored-problems/drafts/${id}`, {
      method: "PUT",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        version: current.version,
        content: { ...current.content, title: "Remote version" },
        privateParts: current.privateParts,
      }),
    }),
    id,
  );
  assert.equal(update.status, 200);
  await page
    .getByLabel("Problem title", { exact: true })
    .fill("Keep local conflict work");
  await page
    .getByRole("heading", { name: "Resolve a version conflict" })
    .waitFor();
  assert.equal(
    await page.getByLabel("Problem title", { exact: true }).inputValue(),
    "Keep local conflict work",
  );
  await page
    .getByRole("button", {
      name: "Compare with latest server copy",
      exact: true,
    })
    .click();
  await page
    .getByText(
      "Inspect latest server document and private answer configuration",
      { exact: true },
    )
    .click();
  assert.equal(
    (await page.locator("body").innerText()).includes("PRIVATE_KEY_SENTINEL"),
    true,
  );
  // Conflict resolutions cannot swap the document under a pending upload callback.
  let finishUpload;
  uploadGate = new Promise((resolve) => {
    finishUpload = resolve;
  });
  await page
    .getByLabel("Replace common context image 2", { exact: true })
    .setInputFiles(uploadFile("conflict-replacement.png"));
  await until(
    async () =>
      await page
        .getByRole("button", { name: "Use server copy", exact: true })
        .isDisabled(),
    "upload locks server-copy choice",
  );
  assert.equal(
    await page
      .getByRole("button", {
        name: "Keep local work over this version",
        exact: true,
      })
      .isDisabled(),
    true,
  );
  finishUpload();
  uploadGate = undefined;
  await until(
    async () =>
      (await page
        .getByRole("button", { name: "Use server copy", exact: true })
        .count()) === 0,
    "upload edit invalidates old comparison",
  );
  current.content.context[1].mediaId = (
    await page
      .getByAltText("Pendulum diagram", { exact: true })
      .getAttribute("src")
  )
    .split("/")
    .pop();
  current.content.attachments.find(a=>a.purpose==="statement-image").id=current.content.context[1].mediaId;
  await page
    .getByRole("button", {
      name: "Compare with latest server copy",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Use server copy", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Student preview", exact: true })
    .click();
  assert.equal(
    (await page.locator("body").innerText()).includes("PRIVATE_KEY_SENTINEL"),
    false,
    "conflict inspection must not leak keys into student preview",
  );
  await page.getByRole("button", { name: "Write", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Keep local work over this version",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Save now", exact: true }).click();
  await until(
    async () =>
      (await page.getByRole("status").allTextContents()).some((s) =>
        s.includes("All changes saved"),
      ),
    "conflict save",
  );
  await page
    .getByRole("button", { name: "Add text to common context", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete Common context block 3", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  assert.notEqual(
    await page.evaluate(() => document.activeElement?.tagName),
    "BODY",
  );
  await page.getByRole("button", { name: "Save now", exact: true }).click();
  await until(
    async () =>
      (await page.getByRole("status").allTextContents()).some((s) =>
        s.includes("All changes saved"),
      ),
    "final save",
  );
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "/tmp/physcratic-editor-desktop.png",
    fullPage: true,
  });
  const a11y = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    a11y.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
  await page.setViewportSize({ width: 375, height: 812 });
  const mobileA11y = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    mobileA11y.violations.map((v) => v.id),
    [],
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.screenshot({
    path: "/tmp/physcratic-editor-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Publish problem", exact: true })
    .click();
  await until(
    async () =>
      (await pool.query("SELECT state FROM authored_problem WHERE id=$1", [id]))
        .rows[0].state === "published",
    "publish",
  );
  const publicResult = await (
    await api(
      "public",
      new Request(`${origin}/api/authored-problems/${id}`),
      id,
    )
  ).json();
  assert.equal(
    JSON.stringify(publicResult).includes("PRIVATE_KEY_SENTINEL"),
    false,
  );
  await page
    .getByRole("button", { name: "Unpublish problem", exact: true })
    .click();
  await until(
    async () =>
      (await pool.query("SELECT state FROM authored_problem WHERE id=$1", [id]))
        .rows[0].state === "archived",
    "unpublish",
  );
  const ownerResult = await (
    await api(
      "read",
      new Request(`${origin}/api/authored-problems/drafts/${id}`),
      id,
    )
  ).json();
  const { title: previousTitle, ...previousContent } = current.content;
  const { title: finalTitle, ...finalContent } = ownerResult.content;
  assert.deepEqual(
    finalContent,
    previousContent,
    "all blocks, inline equations, IDs and ordering round-trip across recovery/conflict",
  );
  assert.deepEqual(
    ownerResult.privateParts,
    current.privateParts,
    "private configuration and solution blocks round-trip exactly",
  );
  assert.equal(
    ownerResult.privateParts.find((p) => p.key?.kind === "numeric").key.value,
    -0.5,
  );
  assert.equal(
    ownerResult.privateParts.find((p) => p.key?.kind === "expression").key
      .variables[0].min,
    -0.5,
  );
  await page.getByRole("button", { name: "← Drafts", exact: true }).click();
  await page
    .getByRole("button", { name: /^Delete Keep local conflict work$/ })
    .click();
  await until(
    async () =>
      (
        await pool.query(
          "SELECT count(*)::integer AS count FROM authored_draft WHERE problem_id=$1",
          [id],
        )
      ).rows[0].count === 0,
    "draft deletion",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: real editor/browser + PostgreSQL CRUD, inline math, keyboard reorder/delete, negative numbers, autosave, recovery, 409 resolution, publication/privacy, mobile overflow and axe accessibility",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await rm(temp, { recursive: true, force: true });
}
