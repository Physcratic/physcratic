// Disposable PostgreSQL + actual rendered StudentWorkspace + production API factories/grader.
// Run: AUTHORING_BROWSER_TOOLS=/tmp/physcratic-editor-test scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/authored-student.browser.mjs
// Better Auth's hook is a thin production shell; this harness injects verified/guest accounts.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { Pool } from "pg";
import { createAuthoredAttemptApi } from "../lib/authored-attempt-api.ts";
import { createProblemAuthoringApi } from "../lib/problem-authoring-api.ts";
import { createAuthorMediaApi } from "../lib/author-media-api.ts";
import { isAllowedSubmissionOrigin } from "../lib/submission-security.ts";
import { memoryAuthorStorage, png, pdf } from "./author-media-fixtures.ts";
const require = createRequire(import.meta.url),
  browserTools = createRequire(
    join(
      process.env.AUTHORING_BROWSER_TOOLS || "/tmp/physcratic-editor-test",
      "package.json",
    ),
  );
const { chromium } = browserTools("playwright"),
  { default: AxeBuilder } = browserTools("@axe-core/playwright"),
  { build } = createRequire(require.resolve("tsx"))("esbuild");
const target = new URL(
  process.env.AUTHORING_TEST_DATABASE_URL || "http://invalid",
);
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.pathname, "/physcratic_authoring_test");
const pool = new Pool({ connectionString: target.href, max: 10 }),
  temp = await mkdtemp(join(tmpdir(), "physcratic-student-browser-"));
let origin = "http://127.0.0.1",
  server,
  browser,
  problemId,
  revision,
  doc,
  version = 1,
  nextFault = 0,
  nextHistoryFault = 0,
  faultRepeats = 0,
  loseNext = false,
  delayNext = false,
  releasePost,
  delayPublic = false,
  releasePublic;
const requests = [],
  postBodies = [],
  responses = [];
const users = new Map([
  ["author", { id: "author", emailVerified: true }],
  ["A", { id: "A", emailVerified: true }],
  ["B", { id: "B", emailVerified: true }],
  ["unverified", { id: "unverified", emailVerified: false }],
]);
const deps = {
  pool,
  user: async (r) =>
    users.get(
      r.headers.get("x-test-user") ||
        r.headers.get("cookie")?.match(/viewer=([^;]+)/)?.[1],
    ),
  origin: (r) => isAllowedSubmissionOrigin(r, [origin]),
};
const author = createProblemAuthoringApi(deps),
  attempts = createAuthoredAttemptApi(deps),
  storage = memoryAuthorStorage(),
  media = createAuthorMediaApi({ ...deps, storage: storage.storage });
function req(
  who,
  body,
  method = body === undefined ? "GET" : "POST",
  path = "/api",
) {
  return new Request(`${origin}${path}`, {
    method,
    headers: {
      origin,
      "content-type": "application/json",
      ...(who ? { "x-test-user": who } : {}),
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}
async function json(response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}
async function resetRates() {
  await pool.query("DELETE FROM authored_student_rate");
}
const text = (t) => ({
  id: randomUUID(),
  kind: "text",
  spans: [{ kind: "text", text: t }],
});
async function publish() {
  revision = (
    await json(await author("publish", req("author", { version }), problemId))
  ).revision;
  version++;
}
async function upload(purpose) {
  const data = new FormData();
  data.set("purpose", purpose);
  data.set(
    "file",
    new File(
      [purpose.endsWith("pdf") ? pdf : png],
      purpose.endsWith("pdf") ? "statement.pdf" : "diagram.png",
      { type: purpose.endsWith("pdf") ? "application/pdf" : "image/png" },
    ),
  );
  return await json(
    await media(
      "upload",
      new Request(`${origin}/upload`, {
        method: "POST",
        headers: { origin, "x-test-user": "author" },
        body: data,
      }),
      problemId,
    ),
    201,
  );
}
async function until(check, label) {
  const start = Date.now();
  while (Date.now() - start < 15000) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw Error(`Timed out: ${label}`);
}
try {
  await pool.query(
    "CREATE TABLE \"user\"(id text PRIMARY KEY); INSERT INTO \"user\" VALUES ('author'),('A'),('B'),('unverified')",
  );
  for (const name of [
    "0001_problem_authoring",
    "0002_authored_write_limit",
    "0003_author_media",
    "0004_authored_attempts",
    "0005_authored_solution_access",
  ])
    await pool.query(
      "BEGIN;\n" +
        (await readFile(`migrations/${name}.up.sql`, "utf8")) +
        "\nCOMMIT;",
    );
  const parts = ["numeric", "expression", "manual"].map((answerMode, i) => ({
    id: randomUUID(),
    label: String.fromCharCode(65 + i),
    answerMode,
    blocks: [
      text(
        [
          "Find the dimensionless ratio.",
          "Give the squared displacement as a function of x.",
          "Explain your reasoning in your own words.",
        ][i],
      ),
    ],
  }));
  doc = {
    content: {
      title: "Motion in a harmonic trap",
      topicTags: ["mechanics"],
      methodTags: ["energy"],
      estimatedDifficulty: "Intermediate",
      context: [
        {
          id: randomUUID(),
          kind: "text",
          spans: [
            { kind: "text", text: "A particle moves with " },
            { kind: "math", latex: "E=\\frac12 mv^2" },
            { kind: "text", text: ". Study the motion below." },
          ],
        },
        {
          id: randomUUID(),
          kind: "math",
          latex: "\\frac{d^2 x}{dt^2}+\\omega^2x=0",
        },
        {
          id: randomUUID(),
          kind: "math",
          latex: Array(25).fill("x^2+v^2").join("+"),
        },
      ],
      sections: [
        {
          id: randomUUID(),
          title: "Conservation and motion",
          blocks: [text("Work through each part independently.")],
          parts,
        },
      ],
      provenance: {
        kind: "original",
        source: "",
        rightsDeclaration: "I own this material.",
      },
      attachments: [],
    },
    privateParts: parts.map((p) => ({
      partId: p.id,
      key:
        p.answerMode === "numeric"
          ? { kind: "numeric", value: 2, units: "1", absTol: 0, relTol: 0 }
          : p.answerMode === "manual"
            ? { kind: "manual" }
            : {
                kind: "expression",
                expected: "x^2+137",
                variables: [{ name: "x", domain: "real", assumptions: [] }],
                angleUnit: "radians",
                exclusions: [],
              },
      hints: [text("PRIVATE_HINT_SENTINEL")],
      solution: [text("PRIVATE_SOLUTION_SENTINEL")],
    })),
  };
  const draft = await json(await author("create", req("author", doc)), 201);
  problemId = draft.problemId;
  const image = await upload("statement-image"),
    statementPdf = await upload("statement-pdf"),
    solutionPdf = await upload("solution-pdf");
  doc.content.context.push({
    id: randomUUID(),
    kind: "image",
    mediaId: image.id,
    alt: "Oscillator displacement diagram",
    caption: "Public statement diagram",
  });
  doc.content.attachments = [
    { id: image.id, purpose: "statement-image" },
    { id: statementPdf.id, purpose: "statement-pdf" },
    { id: solutionPdf.id, purpose: "solution-pdf" },
  ];
  await json(
    await author(
      "update",
      req("author", { ...doc, version }, "PUT"),
      problemId,
    ),
  );
  version++;
  await publish();
  await build({
    entryPoints: ["tests/authored-student-harness.tsx"],
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
    "createAuthoredGrader",
    "authored_revision_private_part",
    "PRIVATE_HINT_SENTINEL",
  ])
    assert.equal(bundle.includes(secret), false, secret);
  const katexRoot = join(process.cwd(), "node_modules/katex/dist");
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith("/api/authored-problems")) {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers))
          if (v) headers.set(k, Array.isArray(v) ? v.join(",") : v);
        const request = new Request(url, {
          method: req.method,
          headers,
          body: req.method === "GET" ? undefined : raw,
        });
        requests.push({
          path: url.pathname,
          method: req.method,
          cookie: req.headers.cookie,
        });
        const paths = url.pathname.split("/").filter(Boolean);
        let response;
        if (paths[3] === "attempts" && req.method === "POST") {
          postBodies.push(JSON.parse(raw));
          if (nextFault) {
            const status = nextFault;
            if (--faultRepeats <= 0) nextFault = 0;
            response = Response.json(
              { error: "PRIVATE_INTERNAL_DIAGNOSTIC" },
              { status, headers: { "retry-after": "1" } },
            );
          } else {
            if (delayNext) {
              delayNext = false;
              await new Promise((r) => (releasePost = r));
            }
            response = await attempts("submit", request, paths[2]);
            if (loseNext) {
              loseNext = false;
              res.writeHead(201, { "content-type": "application/json" });
              res.write('{"attempt":');
              setImmediate(() => res.destroy());
              return;
            }
          }
        } else if (paths[2] === "attempts" && !paths[3] && nextHistoryFault) {
          response = Response.json({}, { status: nextHistoryFault });
          nextHistoryFault = 0;
        } else if (paths[2] === "attempts")
          response = await attempts(
            paths[3] ? "read" : "list",
            request,
            paths[3],
          );
        else if (paths[3] === "submission-info")
          response = await attempts("info", request, paths[2]);
        else if (paths[3] === "media")
          response = await media("read", request, paths[2], paths[4]);
        else {
          if (delayPublic) {
            delayPublic = false;
            await new Promise((r) => (releasePublic = r));
          }
          response = await author("public", request, paths[2]);
        }
        if (response.headers.get("content-type")?.includes("json"))
          responses.push(await response.clone().text());
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
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
      const who = req.headers.cookie?.match(/viewer=([^;]+)/)?.[1],
        user = users.get(who),
        viewer = user
          ? {
              state: user.emailVerified ? "verified" : "unverified",
              id: user.id,
            }
          : { state: "guest" };
      res.setHeader("Content-Type", "text/html");
      res.end(
        `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Physcratic solving test</title><style>:root{--font-inter:Arial,sans-serif}body{font-family:Arial,sans-serif}</style><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/katex.css"></head><body><div id="root"></div><script>window.__student=${JSON.stringify({ problemId, viewer })}</script><script src="/bundle.js"></script></body></html>`,
      );
    } catch (error) {
      console.error(error);
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
    }),
    page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  const route = `${origin}/dashboard/authored/${problemId}`;
  async function account(who) {
    await context.clearCookies();
    if (who)
      await context.addCookies([{ name: "viewer", value: who, url: origin }]);
    await page.goto(route);
    await page
      .getByRole("heading", { name: doc.content.title, exact: true })
      .waitFor();
  }
  async function choose(index) {
    await page
      .getByLabel("Choose part", { exact: true })
      .selectOption(parts[index].id);
  }
  async function submit() {
    await page
      .getByRole("button", { name: "Submit answer", exact: true })
      .click();
  }
  async function saved(label) {
    await page
      .getByRole("heading", { name: new RegExp(`^${label} · saved attempt`) })
      .waitFor();
  }
  await account();
  assert.equal(
    await page.getByRole("link", { name: "Sign in to submit" }).count(),
    1,
  );
  assert.equal(
    requests.some(
      (r) => r.path.includes("attempts") || r.path.includes("submission-info"),
    ),
    false,
  );
  assert.ok((await page.locator(".katex").count()) >= 3);
  assert.equal(
    await page
      .getByRole("img", { name: "Oscillator displacement diagram" })
      .count(),
    1,
  );
  assert.equal(
    await page.getByRole("link", { name: /Download statement PDF/ }).count(),
    1,
  );
  assert.equal(await page.getByRole("link", { name: /solution/i }).count(), 0);
  assert.equal(
    (
      await page.request.get(
        `${origin}/api/authored-problems/${problemId}/media/${solutionPdf.id}?revisionId=${revision.id}`,
      )
    ).status(),
    404,
  );
  await account("unverified");
  await page
    .getByRole("heading", { name: "Verify your email to submit" })
    .waitFor();
  assert.equal(
    await page.getByLabel("Numerical answer", { exact: true }).count(),
    0,
  );
  console.log("PASS public reading, media and account gates");
  await account("A");
  await page.getByLabel("Numerical answer", { exact: true }).fill("2");
  await page.getByLabel("Units", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .dblclick();
  await saved("Correct");
  assert.equal(postBodies.length, 1);
  assert.equal(postBodies[0].answer.units, "");
  await page.reload();
  await saved("Correct");
  assert.equal(
    postBodies.length,
    1,
    "reload does not send acknowledged attempt",
  );
  await page.getByRole("button", { name: "Start another attempt" }).click();
  await page.getByLabel("Numerical answer", { exact: true }).fill("1e-9999");
  await submit();
  await page.getByRole("alert").filter({ hasText: "representable" }).waitFor();
  assert.equal(postBodies.length, 1);
  await page.getByLabel("Numerical answer", { exact: true }).fill("3");
  await submit();
  await saved("Incorrect");
  await choose(1);
  await page.getByLabel("Expression answer", { exact: true }).fill("x*x+137");
  await submit();
  await saved("Correct");
  await page.getByRole("button", { name: "Start another attempt" }).click();
  await page
    .getByLabel("Expression answer", { exact: true })
    .fill("sin(x)^2+cos(x)^2");
  await submit();
  await saved("Needs review");
  await page
    .getByText("This does not necessarily mean your answer is wrong.", {
      exact: false,
    })
    .first()
    .waitFor();
  await choose(2);
  await page
    .getByLabel("Manual answer", { exact: true })
    .fill("Energy is conserved; <script>never execute</script>");
  await submit();
  await saved("Ungraded");
  await page
    .getByRole("button", { name: "Answer part A", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("heading", { name: "Submit an answer" })
      .evaluate((e) => document.activeElement === e),
    true,
  );
  await page.getByRole("button", { name: "Start another attempt" }).click();
  await page.getByLabel("Numerical answer", { exact: true }).fill("-");
  await choose(1);
  await choose(0);
  assert.equal(
    await page.getByLabel("Numerical answer", { exact: true }).inputValue(),
    "-",
  );
  await page.goto("about:blank");
  await page.goto(route);
  assert.equal(
    await page.getByLabel("Numerical answer", { exact: true }).inputValue(),
    "-",
  );
  await page.reload();
  assert.equal(
    await page.getByLabel("Numerical answer", { exact: true }).inputValue(),
    "-",
  );
  await page.getByLabel("Numerical answer", { exact: true }).fill("2");
  console.log(
    "PASS all answer modes, numeric validation and local form recovery",
  );
  loseNext = true;
  const before = postBodies.length;
  await submit();
  await page
    .getByRole("button", { name: "Retry original submission", exact: true })
    .waitFor();
  const original = postBodies.at(-1);
  await page.reload();
  await page
    .getByRole("button", { name: "Retry original submission", exact: true })
    .waitFor();
  assert.equal(postBodies.length, before + 1);
  await page
    .getByRole("button", { name: "Retry original submission", exact: true })
    .click();
  await saved("Correct");
  assert.deepEqual(postBodies.at(-1), original);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*) FROM authored_attempt WHERE user_id='A' AND idempotency_key=$1",
        [original.idempotencyKey],
      )
    ).rows[0].count,
    "1",
  );
  for (const status of [408, 429, 503]) {
    await page.getByRole("button", { name: "Start another attempt" }).click();
    nextFault = status;
    faultRepeats = status === 408 ? 1000 : 1;
    await submit();
    await page
      .getByRole("alert")
      .filter({
        hasText:
          status === 429
            ? "temporary"
            : status === 408
              ? /timed out|could not confirm/
              : "could not confirm",
      })
      .waitFor();
    nextFault = 0;
    const body = postBodies.at(-1);
    await page
      .getByRole("button", { name: "Retry original submission", exact: true })
      .click();
    await saved("Correct");
    assert.deepEqual(postBodies.at(-1), body);
  }
  console.log("PASS durable ambiguous recovery and HTTP retry states");
  // Seed >50 immutable attempts through the same production service; clear only disposable rate buckets.
  await resetRates();
  for (let i = 0; i < 48; i++) {
    if (i % 10 === 0) await resetRates();
    await json(
      await attempts(
        "submit",
        req("A", {
          revisionId: revision.id,
          partId: parts[2].id,
          answer: { kind: "manual", text: `pagination-${i}` },
          idempotencyKey: randomUUID(),
        }),
        problemId,
      ),
      201,
    );
  }
  await resetRates();
  nextHistoryFault = 503;
  await page
    .getByRole("button", { name: "My submissions", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "could not load this information" })
    .waitFor();
  assert.equal(
    await page.getByText("No saved attempts yet.", { exact: false }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "Retry history", exact: true })
    .click();
  await page.getByRole("button", { name: "Next page", exact: true }).waitFor();
  await until(
    async () =>
      (await page
        .locator('section[aria-label="My saved submissions"] ol>li')
        .count()) === 50,
    "first history page",
  );
  await page.getByRole("button", { name: "Problem", exact: true }).click();
  await choose(2);
  await page.getByRole("button", { name: "Start another attempt" }).click();
  await page
    .getByLabel("Manual answer", { exact: true })
    .fill("pagination-new");
  await submit();
  await saved("Ungraded");
  await page
    .getByRole("button", { name: "My submissions", exact: true })
    .click();
  await until(
    async () =>
      (await page
        .locator('section[aria-label="My saved submissions"] ol>li')
        .count()) === 50,
    "refetched matching cursor",
  );
  const seen = [];
  while (true) {
    seen.push(
      ...(await page
        .locator('section[aria-label="My saved submissions"] ol>li')
        .allTextContents()),
    );
    if (
      await page
        .getByRole("button", { name: "Next page", exact: true })
        .isDisabled()
    )
      break;
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await until(
      async () =>
        !(await page.getByText("Loading your saved attempts…").count()),
      "next history page",
    );
  }
  const total = Number(
    (
      await pool.query(
        "SELECT count(*) FROM authored_attempt WHERE user_id='A'",
      )
    ).rows[0].count,
  );
  assert.equal(
    seen.length,
    total,
    "all records reachable after submit against full first page",
  );
  assert.equal(new Set(seen).size, total);
  console.log("PASS pagination after new attempt against a full page");
  const aAttempt = (
    await pool.query(
      "SELECT id FROM authored_attempt WHERE user_id='A' LIMIT 1",
    )
  ).rows[0].id;
  await account("B");
  await page
    .getByRole("button", { name: "My submissions", exact: true })
    .click();
  await page.getByText("No saved attempts yet.", { exact: false }).waitFor();
  assert.equal(
    (
      await page.request.get(
        `${origin}/api/authored-problems/attempts/${aAttempt}`,
      )
    ).status(),
    404,
  );
  assert.equal(
    await page.getByText("pagination-new", { exact: true }).count(),
    0,
  );
  // Session invalidation removes cached private views rather than trusting a stale client hook.
  await page.getByRole("button", { name: "Problem", exact: true }).click();
  await page.getByLabel("Numerical answer", { exact: true }).fill("2");
  nextFault = 401;
  await submit();
  await page
    .getByText("We could not verify your session.", { exact: false })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "My submissions", exact: true })
      .count(),
    0,
  );
  await account("B");
  await page
    .getByRole("button", { name: "Retry original submission", exact: true })
    .click();
  await saved("Correct");
  await page.getByRole("button", { name: "Start another attempt" }).click();
  await page.getByLabel("Numerical answer", { exact: true }).fill("2");
  delayNext = true;
  await submit();
  await until(() => Boolean(releasePost), "delayed post");
  await context.clearCookies();
  await context.addCookies([{ name: "viewer", value: "A", url: origin }]);
  await page.evaluate(() => window.__setViewer({ state: "verified", id: "A" }));
  releasePost();
  releasePost = undefined;
  await page
    .getByRole("button", { name: "My submissions", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByText("Resolve the original submission", { exact: true })
      .count(),
    0,
    "B retry state never rendered for A",
  );
  await resetRates();
  await account("A");
  await page.getByRole("button", { name: "Start another attempt" }).click();
  await page.getByLabel("Numerical answer", { exact: true }).fill("7");
  const oldRevision = revision.id;
  doc.content.title = "Revised harmonic trap";
  await json(
    await author(
      "update",
      req("author", { ...doc, version }, "PUT"),
      problemId,
    ),
  );
  version++;
  await publish();
  await submit();
  await page
    .getByRole("button", { name: "Reload current problem", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("article", { name: "Published problem statement" })
      .count(),
    0,
  );
  assert.equal(
    await page.getByLabel("Choose part", { exact: true }).count(),
    0,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page
    .getByRole("button", { name: "Reload current problem", exact: true })
    .waitFor();
  delayPublic = true;
  await page
    .getByRole("button", { name: "Reload current problem", exact: true })
    .click();
  await until(() => Boolean(releasePublic), "delayed explicit reload");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  releasePublic();
  releasePublic = undefined;
  await page
    .getByRole("heading", { name: doc.content.title, exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Numerical answer", { exact: true }).inputValue(),
    "",
  );
  assert.equal(postBodies.at(-1).revisionId, oldRevision);
  await page
    .getByRole("button", {
      name: "Keep local work and close rejected submission",
      exact: true,
    })
    .click();
  const longMath = page
    .getByRole("group", { name: "Mathematical expression", exact: true })
    .last();
  await longMath.focus();
  await page.keyboard.press("ArrowRight");
  await until(
    async () => (await longMath.evaluate((e) => e.scrollLeft)) > 0,
    "keyboard formula scrolling",
  );
  const desktop = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    desktop.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
  await page.screenshot({
    path: "/tmp/physcratic-student-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page
    .getByRole("button", { name: "Answer part C", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Choose part", { exact: true }).inputValue(),
    parts[2].id,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "no mobile horizontal page overflow",
  );
  const mobile = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    mobile.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
  await page.screenshot({
    path: "/tmp/physcratic-student-mobile.png",
    fullPage: true,
  });
  await json(await author("unpublish", req("author", { version }), problemId));
  version++;
  await page
    .getByRole("button", { name: "Recheck publication", exact: true })
    .click();
  await page
    .getByText("This problem is unpublished, deleted or unavailable.", {
      exact: false,
    })
    .waitFor();
  assert.equal(
    await page
      .getByRole("article", { name: "Published problem statement" })
      .count(),
    0,
  );
  assert.equal(
    await page.getByLabel("Choose part", { exact: true }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "My submissions", exact: true })
    .click();
  await page
    .getByText("Historical selection", { exact: false })
    .first()
    .waitFor();
  assert.equal(
    (
      await page.request.get(
        `${origin}/api/authored-problems/${problemId}/media/${statementPdf.id}?revisionId=${revision.id}`,
      )
    ).status(),
    404,
  );
  for (const value of responses) {
    for (const secret of [
      "PRIVATE_HINT_SENTINEL",
      "PRIVATE_SOLUTION_SENTINEL",
      solutionPdf.id,
      "x^2+137",
      '"expected"',
      "blob.vercel-storage.com",
    ]) {
      assert.equal(value.includes(secret), false, `response leaked ${secret}`);
    }
  }
  assert.equal(
    requests.some((r) => r.path.includes("/drafts")),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS authored student browser/PostgreSQL: public math/media, all outcomes, dimensionless/underflow, multipart/input restoration, durable replay/duplicates, HTTP faults, >50 history/pagination, IDOR/account races, revision/unpublish, desktop/mobile axe and overflow, private isolation.",
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  await pool.end();
  await rm(temp, { recursive: true, force: true });
}
