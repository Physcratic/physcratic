// Actual library + reader components and production API factories; disposable PG only.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { Pool } from "pg";
import { createAuthoredLibraryApi } from "../lib/authored-library-api.ts";
import { createProblemAuthoringApi } from "../lib/problem-authoring-api.ts";
const require = createRequire(import.meta.url);
const browserTools = createRequire(
  join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"),
);
const { chromium } = browserTools("playwright");
const { default: AxeBuilder } = browserTools("@axe-core/playwright");
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const target = new URL(
  process.env.AUTHORING_TEST_DATABASE_URL || "http://invalid",
);
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.pathname, "/physcratic_authoring_test");
const pool = new Pool({ connectionString: target.href, max: 5 });
const temp = await mkdtemp(join(process.cwd(), "work/library-browser-"));
const library = createAuthoredLibraryApi(pool);
const author = createProblemAuthoringApi({
  pool,
  user: async () => ({ id: "author", emailVerified: true }),
  origin: () => true,
});
let server,
  browser,
  origin,
  failLibrary = false,
  slowLibrary = false;
const requests = [],
  bodies = [];
const text = (value) => ({
  id: randomUUID(),
  kind: "text",
  spans: [{ kind: "text", text: value }],
});
const fixtures = [];
async function action(kind, id, body, method = "POST") {
  const r = await author(
    kind,
    new Request("http://physcratic.test/api", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    id,
  );
  assert.ok(r.ok, await r.clone().text());
  return r.status === 204 ? null : r.json();
}
try {
  await pool.query(
    'CREATE TABLE "user"(id text PRIMARY KEY); INSERT INTO "user" VALUES(\'author\')',
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
  for (let i = 0; i < 26; i++) {
    const partId = randomUUID();
    const body = {
      content: {
        title: `Pendulum ${i} ` + (i === 0 ? "x^{2}+".repeat(27) : "motion"),
        topicTags: ["Mechanics"],
        methodTags: ["Energy"],
        estimatedDifficulty: i === 0 ? " Intermediate " : "Intermediate",
        context: [
          text("Study the motion."),
          { id: randomUUID(), kind: "math", latex: "x^2+v^2" },
        ],
        sections: [
          {
            id: randomUUID(),
            title: "Motion",
            blocks: [],
            parts: [
              { id: partId, label: "a", blocks: [], answerMode: "manual" },
            ],
          },
        ],
        provenance: {
          kind: "original",
          source: "Physcratic test author",
          rightsDeclaration: "Original material, authorized for publication.",
        },
        attachments: [],
      },
      privateParts: [
        {
          partId,
          key: { kind: "manual" },
          hints: [text("PRIVATE_HINT_SENTINEL")],
          solution: [text("PRIVATE_SOLUTION_SENTINEL")],
        },
      ],
    };
    const draft = await action("create", undefined, body);
    await action("publish", draft.problemId, { version: 1 });
    fixtures.push({ id: draft.problemId, body });
  }
  await pool.query("DELETE FROM authored_write_limit");
  const draftBody = structuredClone(fixtures[0].body);
  draftBody.content.title = "DRAFT_SECRET";
  await action("create", undefined, draftBody);
  await build({
    entryPoints: ["tests/authored-library-harness.tsx"],
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
  const bundle = await readFile(join(temp, "bundle.js"), "utf8");
  for (const secret of [
    "authored_revision_private_part",
    "createAuthoredGrader",
    "PRIVATE_HINT_SENTINEL",
  ])
    assert.equal(bundle.includes(secret), false);
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, origin);
      requests.push({ path: url.pathname, method: req.method });
      let response;
      if (url.pathname === "/api/authored-problems/library") {
        if (slowLibrary) await new Promise((r) => setTimeout(r, 500));
        response = failLibrary
          ? Response.json({ error: "PRIVATE_DB_ERROR" }, { status: 503 })
          : await library(new Request(url));
      } else if (/^\/api\/authored-problems\/[^/]+$/.test(url.pathname))
        response = await author(
          "public",
          new Request(url),
          url.pathname.split("/").at(-1),
        );
      else if (url.pathname === "/api/auth/get-session")
        response = Response.json(null);
      if (response) {
        const body = await response.text();
        bodies.push(body);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(body);
        return;
      }
      if (["/bundle.js", "/style.css"].includes(url.pathname)) {
        res.setHeader(
          "Content-Type",
          url.pathname.endsWith("js") ? "application/javascript" : "text/css",
        );
        res.end(await readFile(join(temp, basename(url.pathname))));
        return;
      }
      if (url.pathname === "/katex.css" || url.pathname.startsWith("/fonts/")) {
        res.end(
          await readFile(
            join(
              process.cwd(),
              "node_modules/katex/dist",
              url.pathname === "/katex.css"
                ? "katex.min.css"
                : `fonts/${basename(url.pathname)}`,
            ),
          ),
        );
        return;
      }
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Library test</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/katex.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      );
    } catch (e) {
      console.error(e);
      res.writeHead(500);
      res.end("Harness failure");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const route = `${origin}/dashboard?view=problems&collection=authored`;
  const resultLinks = () => page.locator('a[href^="/dashboard/authored/"]');
  await page.goto(route);
  await page
    .getByText("24 published problems on this page", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("tab", { name: "Authored problems", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.equal(await resultLinks().count(), 24);
  const firstIds = await resultLinks().evaluateAll((links) =>
    links.map((l) => l.getAttribute("href")),
  );
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page
    .getByText("2 published problems on this page", { exact: true })
    .waitFor();
  assert.equal(
    (
      await resultLinks().evaluateAll((links) =>
        links.map((l) => l.getAttribute("href")),
      )
    ).some((id) => firstIds.includes(id)),
    false,
  );
  await page
    .getByLabel("Find a problem", { exact: true })
    .fill("no_matching_word");
  await page.getByText(/No published authored problems found/).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Previous page" }).isDisabled(),
    true,
  );
  await page
    .getByLabel("Find a problem", { exact: true })
    .fill("pendulum energy");
  await page
    .getByText("24 published problems on this page", { exact: true })
    .waitFor();
  await page.getByLabel("Authored tag", { exact: true }).fill("Missing");
  await page.getByText(/No published authored problems found/).waitFor();
  await page.getByLabel("Authored tag", { exact: true }).fill("Mechanics");
  await page
    .getByLabel("Author-estimated difficulty", { exact: true })
    .fill("Advanced");
  await page.getByText(/No published authored problems found/).waitFor();
  await page
    .getByLabel("Author-estimated difficulty", { exact: true })
    .fill("Intermediate");
  await page
    .getByLabel("Provenance", { exact: true })
    .selectOption("authorized");
  await page.getByText(/No published authored problems found/).waitFor();
  await page.getByLabel("Provenance", { exact: true }).selectOption("");
  await page
    .getByText("24 published problems on this page", { exact: true })
    .waitFor();
  await page
    .getByLabel("Author-estimated difficulty", { exact: true })
    .fill(" Intermediate ");
  await page
    .getByText("1 published problems on this page", { exact: true })
    .waitFor();
  assert.equal(
    await resultLinks().first().getAttribute("href"),
    `/dashboard/authored/${fixtures[0].id}`,
  );
  await page
    .getByLabel("Author-estimated difficulty", { exact: true })
    .fill("");
  await page
    .getByText("24 published problems on this page", { exact: true })
    .waitFor();
  // A slow obsolete search must never replace the newer filter's results.
  slowLibrary = true;
  const obsoleteRequest = page.waitForRequest((r) =>
    r.url().includes("q=obsolete_search"),
  );
  await page
    .getByLabel("Find a problem", { exact: true })
    .fill("obsolete_search");
  await obsoleteRequest;
  slowLibrary = false;
  await page
    .getByLabel("Find a problem", { exact: true })
    .fill("pendulum energy");
  await page
    .getByText("24 published problems on this page", { exact: true })
    .waitFor();
  await page.waitForTimeout(600);
  assert.equal(await resultLinks().count(), 24);
  for (const width of [1440, 375])
    for (const dark of [false, true]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        (dark) => document.documentElement.classList.toggle("dark", dark),
        dark,
      );
      // Allow theme color transitions to settle before measuring contrast.
      await page.waitForTimeout(300);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `overflow at ${width}`,
      );
      assert.deepEqual(
        (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        [],
      );
      await page.screenshot({
        path: join(
          process.cwd(),
          `work/phase7-library-${width}-${dark ? "dark" : "light"}.png`,
        ),
        fullPage: true,
      });
    }
  // A legal long, unbroken physics title must wrap in the reader as well as its card.
  await page.goto(`${origin}/dashboard/authored/${fixtures[0].id}`);
  await page.getByRole("heading", { name: fixtures[0].body.content.title, exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "long authored reader title must not overflow mobile viewport");
  await page.goto(route);
  await page.getByText("24 published problems on this page", { exact: true }).waitFor();
  await page
    .getByRole("tab", { name: "Authored problems", exact: true })
    .focus();
  await page.keyboard.press("ArrowLeft");
  await page
    .locator('[role="tab"][data-state="active"]')
    .filter({ hasText: "Guided exercises" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("tab", { name: /Guided exercises/ })
      .getAttribute("aria-selected"),
    "true",
  );
  await page.getByLabel("Find a problem", { exact: true }).fill("");
  assert.equal(await page.getByRole("tab", { name: /Quick practice/ }).count(), 0);
  assert.equal(new URL(page.url()).searchParams.get("collection"), "pilot");
  // The reconciliation must retain main's Arena collection as well as authoring.
  await page.getByRole("tab", { name: /Physcratic Arena/ }).click();
  await page.getByRole("heading", { name: "Physcratic Arena", exact: true }).waitFor();
  await page.getByRole("tab", { name: /Olympiad archive/ }).click();
  await page
    .getByRole("heading", { name: "Full theory problems", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("tab", { name: /Olympiad archive/ })
      .getAttribute("aria-selected"),
    "true",
  );
  await page
    .getByRole("tab", { name: "Authored problems", exact: true })
    .click();
  await page
    .getByText("24 published problems on this page", { exact: true })
    .waitFor();
  failLibrary = true;
  await page
    .getByRole("button", { name: "Refresh published problems" })
    .click();
  await page.getByText(/Published problems could not be loaded/).waitFor();
  assert.equal(await page.getByText("PRIVATE_DB_ERROR").count(), 0);
  failLibrary = false;
  slowLibrary = true;
  await page.getByRole("button", { name: "Retry library" }).click();
  await page
    .getByText("Loading published problems…", { exact: true })
    .waitFor();
  await page
    .getByText("24 published problems on this page", { exact: true })
    .waitFor();
  slowLibrary = false;
  const openedId = (await resultLinks().first().getAttribute("href"))
    .split("/")
    .at(-1);
  const fixture = fixtures.find((f) => f.id === openedId);
  await resultLinks().first().click();
  await page
    .getByRole("heading", { name: fixture.body.content.title, exact: true })
    .waitFor();
  await page.getByRole("link", { name: "Sign in to submit" }).waitFor();
  assert.ok((await page.locator(".katex").count()) > 0);
  const back = page.locator(
    'a[href="/dashboard?view=problems&collection=authored"]',
  );
  assert.equal(await back.count(), 1);
  await back.click();
  await page
    .getByText("24 published problems on this page", { exact: true })
    .waitFor();
  const updated = structuredClone(fixture.body);
  updated.content.title = "Revised harmonic problem";
  await action("update", openedId, { ...updated, version: 2 }, "PUT");
  await action("publish", openedId, { version: 3 });
  await page
    .getByRole("button", { name: "Refresh published problems" })
    .click();
  await page
    .getByRole("link", { name: "Revised harmonic problem", exact: true })
    .waitFor();
  await action("unpublish", openedId, { version: 4 });
  await page
    .getByRole("button", { name: "Refresh published problems" })
    .click();
  await page
    .getByText("24 published problems on this page", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Revised harmonic problem", exact: true })
      .count(),
    0,
  );
  await page.goto(`${origin}/dashboard/authored/${openedId}`);
  await page
    .getByText(/not available|unavailable|not published/i)
    .first()
    .waitFor();
  for (const sentinel of [
    "PRIVATE_HINT_SENTINEL",
    "PRIVATE_SOLUTION_SENTINEL",
    "DRAFT_SECRET",
  ])
    assert.equal(
      bodies.some((b) => b.includes(sentinel)),
      false,
      sentinel,
    );
  assert.equal(
    requests.some((r) => /solutions|attempts/.test(r.path)),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS Phase7 library + disposable PostgreSQL: real tabs/filters/search/pagination/navigation, guest reader/math, republish/unpublish, errors/loading, legacy tabs, keyboard, desktop/mobile light/dark axe/overflow, privacy.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await pool.end();
  await rm(temp, { recursive: true, force: true });
}
