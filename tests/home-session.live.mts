// The shared public shell must never contain account data, regardless of session cookies.
// This starts the production build with a disposable PostgreSQL, creates a verified user and a
// real session, signs the session cookie the way Better Auth does, and fetches "/" with and without it, one after
// the other and at the same time.
//
//   VERCEL_ENV=production pnpm build        (once)
//   bash scripts/test-problem-authoring.sh pnpm exec tsx --conditions=react-server tests/home-session.live.mts
//
// scripts/test-problem-authoring.sh starts the disposable database and sets DATABASE_URL to it. This test refuses
// to run against anything that is not a local database with "test" in its name. The library browser workflow runs it with HOME_LIBRARY_BROWSER=1.
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";
import { retiredPracticeIds, ARENA_LIBRARY_HREF } from "../lib/legacy-practice";
import { problems } from "../lib/physics";
import { corpusProblems } from "../lib/corpus-pilot";
import { installAchievementFixtures } from "./community-achievement-fixtures";

const databaseUrl = process.env.DATABASE_URL ?? "";
const parsed = new URL(databaseUrl || "http://invalid");
assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname) && /test/.test(parsed.pathname), "DATABASE_URL must be a disposable local test database. Use scripts/test-problem-authoring.sh.");

const port = Number(process.env.HOME_SESSION_PORT ?? 3101);
const origin = `http://127.0.0.1:${port}`;
const secret = randomBytes(32).toString("hex");
const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });

// The Better Auth tables this test needs. The disposable database starts empty.
await pool.query(`
  DROP TABLE IF EXISTS session, account, verification, "rateLimit"; DROP TABLE IF EXISTS "user" CASCADE;
  CREATE TABLE account(id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL, "accessToken" text, "refreshToken" text, "idToken" text,
    "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now());
  CREATE TABLE verification(id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now());
  CREATE TABLE "rateLimit"(id text PRIMARY KEY, key text NOT NULL, count integer NOT NULL, "lastRequest" bigint NOT NULL);
  CREATE TABLE "user"(id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, "emailVerified" boolean NOT NULL DEFAULT false, image text,
    "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "termsAcceptedVersion" text, "termsAcceptedAt" timestamptz);
  CREATE TABLE session(id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE, "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(), "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user"(id));
`);
const user = { id: "user-home-session-test", name: "Zelda Quillfeather", email: "zelda.quillfeather@example.test" };
await pool.query(`INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)`, [user.id, user.name, user.email]);
const token = randomBytes(24).toString("hex");
await pool.query(`INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1, now() + interval '1 day', $2, $3)`, ["session-home-test", token, user.id]);
// Better Auth sets "<token>.<base64 HMAC-SHA256 of the token>", URL-encoded.
const signed = encodeURIComponent(`${token}.${createHmac("sha256", secret).update(token).digest("base64")}`);
const memberCookie = `better-auth.session_token=${signed}`;
const secondUser = { id: "second-home-session-test", name: "Milo Starling", email: "milo.starling@example.test" };
await pool.query(`INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)`, [secondUser.id, secondUser.name, secondUser.email]);
const secondToken = randomBytes(24).toString("hex");
await pool.query(`INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1, now() + interval '1 day', $2, $3)`, ["second-session-home-test", secondToken, secondUser.id]);
const secondSigned = encodeURIComponent(`${secondToken}.${createHmac("sha256", secret).update(secondToken).digest("base64")}`);
const secondCookie = `better-auth.session_token=${secondSigned}`;

// The public-library gate reuses these real A/B sessions and an account-specific progress fixture.
const libraryNotes = ["P3 synthetic private note A", "P3 synthetic private note B"];
if (process.env.HOME_LIBRARY_BROWSER === "1" || process.env.HOME_PUBLIC_SOLUTION_BROWSER === "1") {
  // Canonical disposable authoring migrations keep the public collection healthy without mocking its API.
  await installAchievementFixtures(pool, { userTableExists: true });
  await pool.query(`CREATE TABLE archive_progress("userId" text NOT NULL, "taskId" text NOT NULL, reviewed boolean NOT NULL DEFAULT false,
    notes text NOT NULL DEFAULT '', answer text NOT NULL DEFAULT '', "updatedAt" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY("userId", "taskId"))`);
  const taskId = `${corpusProblems[0].id}:${corpusProblems[0].parts[0].id}`;
  for (const [index, member] of [user, secondUser].entries()) await pool.query(`INSERT INTO archive_progress("userId","taskId",notes) VALUES($1,$2,$3)`, [member.id, taskId, libraryNotes[index]]);
}

const server = spawn("corepack", ["pnpm", "exec", "next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  env: { ...process.env, DATABASE_URL: databaseUrl, BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: origin, NODE_ENV: "production", AUTHORED_PUBLIC_SOLUTIONS_ENABLED: process.env.HOME_PUBLIC_SOLUTION_BROWSER === "1" ? "true" : "false" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (chunk) => (serverLog += chunk));
server.stderr.on("data", (chunk) => (serverLog += chunk));

let checks = 0;
const ok = (value: unknown, message: string) => { assert.ok(value, message); checks++; };
const visible = (html: string) => html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
async function home(cookie?: string) {
  const response = await fetch(`${origin}/`, { headers: { "user-agent": "home-session-test", ...(cookie ? { cookie } : {}) }, redirect: "manual" });
  return { status: response.status, cache: response.headers.get("cache-control") ?? "", body: await response.text() };
}
const isPublicHomeShell = (body: string) => /<h1[^>]*>Welcome (?:back|to Physcratic)\.<\/h1>/.test(body) && body.includes('id="daily-problem-heading"') && body.includes("For You") && !body.includes("data-home-sentence");
async function session(cookie: string) {
  const response = await fetch(`${origin}/api/auth/get-session`, { headers: { cookie } });
  ok(response.status === 200, "session endpoint responds normally");
  return response.json();
}

try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(`${origin}/`)).status === 200) break; } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (attempt === 59) throw new Error(`server did not start:\n${serverLog.slice(-2000)}`);
  }

  // 1. Real sessions remain valid while the initial shell stays public and private/no-store.
  const member = await home(memberCookie);
  ok(member.status === 200, `member status ${member.status}`);
  const memberSession = await session(memberCookie);
  ok(memberSession?.user?.id === user.id && memberSession.user.name === user.name, "the real signed session still resolves its own account");
  ok(!JSON.stringify(memberSession).includes(secondUser.id), "session response excludes the other account");
  ok(isPublicHomeShell(member.body), `a signed-in fetch of "/" shows the shared public shell. Server log:\n${serverLog.slice(-1500)}`);
  ok(/private/.test(member.cache) && /no-store/.test(member.cache), `signed-in Cache-Control: ${member.cache}`);

  // 2. A signed-out fetch straight after gets the landing page, with no trace of the signed-in user.
  const visitor = await home();
  ok(isPublicHomeShell(visitor.body), "a signed-out fetch right after a signed-in one shows the public shell");
  ok(/private/.test(visitor.cache) && /no-store/.test(visitor.cache), `signed-out Cache-Control: ${visitor.cache}`);
  for (const secretValue of [user.name, user.email, user.id, token, signed, "Zelda", "session-home-test"]) {
    ok(!visitor.body.includes(secretValue), `the signed-out response must not contain "${secretValue}"`);
    ok(!visitor.body.includes(encodeURIComponent(secretValue)), `the signed-out response must not contain "${secretValue}" (URL-encoded)`);
  }
  ok(!/Sign out/.test(visible(visitor.body)), "the initial public shell contains no signed-in account controls");

  // 3. Alternating and concurrent fetches never cross over.
  const results = await Promise.all(Array.from({ length: 24 }, (_, index) => home(index % 2 === 0 ? memberCookie : undefined).then((r) => ({ member: index % 2 === 0, ...r }))));
  for (const result of results) {
    ok(isPublicHomeShell(result.body), `${result.member ? "signed-in" : "signed-out"} fetch got the wrong page`);
    ok(/private/.test(result.cache) && /no-store/.test(result.cache), `Cache-Control ${result.cache}`);
    if (!result.member) ok(!result.body.includes(user.email) && !result.body.includes(token), "no user data in a signed-out response");
  }

  // HTML and RSC share the public shell and contain neither account’s private data.
  const cases = [undefined, memberCookie, secondCookie];
  for (const rsc of [false, true]) {
    const representations = await Promise.all(Array.from({ length: 18 }, async (_, index) => {
      const actor = index % cases.length;
      const response = await fetch(`${origin}/`, { headers: { ...(cases[actor] ? { cookie: cases[actor]! } : {}), ...(rsc ? { RSC: "1" } : {}) } });
      return { actor, response, body: await response.text() };
    }));
    for (const { response, body } of representations) {
      ok(response.status === 200, `${rsc ? "RSC" : "HTML"} status`);
      ok(/private/.test(response.headers.get("cache-control") ?? "") && /no-store/.test(response.headers.get("cache-control") ?? ""), "representations are private/no-store");
      if (rsc) ok(/text\/x-component/.test(response.headers.get("content-type") ?? ""), "RSC response content type");
      ok(!body.includes("data-home-sentence"), "A/B/guest share the public shell without the retired introduction");
      const forbidden = [user.name, user.email, user.id, secondUser.name, secondUser.email, secondUser.id];
      for (const value of [...forbidden, token, signed, secondToken, secondSigned, problems[0].hint, ...problems[0].solution.map(step => step.text).filter(text => text.length > 30)]) ok(!body.includes(value), "no cross-account or token data in representation");
    }
  }

  if (process.env.HOME_LIBRARY_BROWSER === "1") {
    for (const rsc of [false, true]) for (const cookie of cases) {
      const response = await fetch(`${origin}/problems?collection=pilot`, { headers: { ...(cookie ? { cookie } : {}), ...(rsc ? { RSC: "1" } : {}) } });
      const body = await response.text();
      ok(response.status === 200, "guest and members can read the public library");
      for (const privateValue of [user.id, user.email, secondUser.id, secondUser.email, token, secondToken, ...libraryNotes]) ok(!body.includes(privateValue), "public library HTML/RSC excludes private identities and progress");
    }
    for (const [index, cookie] of [memberCookie, secondCookie].entries()) {
      const account = index === 0 ? user.id : secondUser.id;
      const otherAccount = index === 0 ? secondUser.id : user.id;
      const response = await fetch(`${origin}/api/archive-progress`, { headers: { cookie, "X-Practice-Account": account } });
      const body = await response.text();
      ok(response.status === 200 && body.includes(libraryNotes[index]) && !body.includes(libraryNotes[1-index]), "real private progress API is account-isolated");
      ok(/private/.test(response.headers.get("cache-control") ?? "") && /no-store/.test(response.headers.get("cache-control") ?? ""), "private progress is not cacheable");
      const stale = await fetch(`${origin}/api/archive-progress`, { headers: { cookie, "X-Practice-Account": otherAccount } });
      const staleBody = await stale.text();
      ok(stale.status === 409 && libraryNotes.every(note => !staleBody.includes(note)), "stale displayed account cannot read either student's notes");
    }
    const journey = spawn(process.execPath, ["--import", "tsx", "tests/public-library.browser.mjs"], {
      env: { ...process.env, BROWSER_TEST_ORIGIN: origin, LIBRARY_SESSION_A: signed, LIBRARY_SESSION_B: secondSigned }, stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    journey.stdout.on("data", chunk => { output += chunk; });
    journey.stderr.on("data", chunk => { output += chunk; });
    const code = await new Promise(resolve => journey.on("close", resolve));
    console.log(output);
    ok(code === 0, "public library browser and mounted account-switch journeys pass");
    if (process.env.HOME_PDF_STUDIO_BROWSER === "1") {
      const {runPdfStudioProduction} = await import("./pdf-studio.production.browser.mjs");
      await runPdfStudioProduction({origin,pool,sessionCookie:memberCookie});
    }
    if (process.env.HOME_PDF_BROWSER === "1") {
      const pdf = spawn(process.execPath, ["tests/pdf-accessibility.browser.mjs"], { env: { ...process.env, BROWSER_TEST_ORIGIN: origin, LIBRARY_SESSION_A: signed }, stdio: "inherit" });
      ok(await new Promise(resolve => pdf.on("close", resolve)) === 0, "PDF accessibility, text selection and navigation pass");
    }
    if (process.env.HOME_TOPIC_BROWSER === "1") {
      const topics = spawn(process.execPath, ["--import", "tsx", "tests/topics.browser.mjs"], { env: { ...process.env, BROWSER_TEST_ORIGIN: origin }, stdio: "inherit" });
      ok(await new Promise(resolve => topics.on("close", resolve)) === 0, "production topic browsers pass");
    }
    if (process.env.HOME_ARCHIVE_BROWSER === "1") {
      const archive = spawn(process.execPath, ["--import", "tsx", "tests/archive.browser.mjs"], { env: { ...process.env, BROWSER_TEST_ORIGIN: origin }, stdio: "inherit" });
      ok(await new Promise(resolve => archive.on("close", resolve)) === 0, "production archive browser passes");
    }
  }

  if (process.env.PLAYWRIGHT_MODULE) {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      for (const cookie of [signed, secondSigned]) {
        const mobile = cookie === secondSigned;
        const context = await browser.newContext({ viewport: { width: mobile ? 375 : 1440, height: 1000 } });
        await context.route("**/*", (route: any) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
        await context.addCookies([{ name: "better-auth.session_token", value: cookie, url: origin }]);
        const page = await context.newPage();
        await page.goto(origin);
        if (mobile) await page.getByRole("button", { name: "Menu", exact: true }).click();
        await page.getByRole("button", { name: "Sign out", exact: true }).waitFor();
        const memberName = cookie === signed ? user.name : secondUser.name;
        await page.getByRole("heading", { level: 1, name: `Welcome back, ${memberName}.`, exact: true }).waitFor();
        await page.getByRole("link", { name: "Guides", exact: true }).first().click();
        await page.waitForURL(`${origin}/learn`);
        await page.getByRole("link", { name: /Physcratic.*home/ }).click();
        await page.waitForURL(`${origin}/`);
        await page.getByRole("heading", { level: 1, name: `Welcome back, ${memberName}.`, exact: true }).waitFor();
        if (mobile) await page.getByRole("button", { name: "Menu", exact: true }).click();
        await page.getByRole("button", { name: "Sign out", exact: true }).click();
        await page.waitForURL(`${origin}/dashboard`);
        if (mobile) {
          if (await page.getByRole("dialog").isVisible()) await page.keyboard.press("Escape");
          await page.locator('header a[aria-label="Physcratic home"]').click();
        } else await page.locator('aside a[aria-label="Physcratic home"]').click();
        await page.waitForURL(`${origin}/`);
        await page.getByRole("heading", { level: 1, name: "Welcome to Physcratic.", exact: true }).waitFor();
        const rendered = await page.content();
        for (const value of [user.name, user.email, secondUser.name, secondUser.email]) ok(!rendered.includes(value), "no former account data in guest browser");
        if (mobile) await page.getByRole("button", { name: "Menu", exact: true }).click();
        await page.getByRole("link", { name: "Sign in", exact: true }).first().click();
        await page.waitForURL(/\/sign-in/);
        ok(await page.getByRole("heading", { name: "Sign In", exact: true }).isVisible(), "guest can reach the actual sign-in page");
        await page.getByRole("link", { name: "Create an account", exact: true }).click();
        await page.waitForURL(/\/sign-up/);
        ok(await page.getByRole("heading", { name: "Create Account", exact: true }).isVisible(), "existing Lobby account path reaches sign-up");
        await context.close();
      }
    } finally { await browser.close(); }
    // Restore the HTTP expiry fixture's session removed by the browser logout.
    await pool.query(`INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1, now() + interval '1 day', $2, $3)`, ["session-home-test", token, user.id]);
  }

  for (const id of retiredPracticeIds) for (const cookie of [undefined, memberCookie, secondCookie]) {
    const response = await fetch(`${origin}/dashboard/problems/${id}`, { redirect: "manual", headers: { ...(cookie ? { cookie } : {}), RSC: "1" } });
    ok(response.status === 308, "guest and synthetic members receive the same legacy redirect");
    ok(new URL(response.headers.get("location")!, origin).href === new URL(ARENA_LIBRARY_HREF, origin).href, "legacy redirect destination does not contain account data");
  }

  if (process.env.HOME_BROWSER_JOURNEYS === "1") {
    const journey = spawn(process.execPath, ["tests/drunk-user.browser.mjs"], { env: { ...process.env, BROWSER_TEST_ORIGIN: origin }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    journey.stdout.on("data", chunk => { output += chunk; });
    journey.stderr.on("data", chunk => { output += chunk; });
    const code = await new Promise(resolve => journey.on("close", resolve));
    console.log(output);
    ok(code === 0, "first-time browser journeys pass on disposable auth database");
  }

  if (process.env.HOME_PUBLIC_SOLUTION_BROWSER === "1") {
    const { runPublicSolutionProduction } = await import("./authored-public-solutions.production.browser.mjs");
    await runPublicSolutionProduction({pool,origin,userId:user.id,cookie:memberCookie});
  }

  // 4. A bad, expired or tampered cookie is a visitor, not an error.
  for (const cookie of [`better-auth.session_token=${encodeURIComponent(`${token}.AAAA`)}`, "better-auth.session_token=garbage", `better-auth.session_token=${signed}x`]) {
    ok(await session(cookie) === null, "tampered session does not authenticate");
    const response = await home(cookie);
    ok(response.status === 200 && isPublicHomeShell(response.body), `tampered cookie shows the public shell (${cookie.slice(0, 40)})`);
  }
  await pool.query(`UPDATE session SET "expiresAt" = now() - interval '1 hour' WHERE token = $1`, [token]);
  ok(await session(memberCookie) === null, "an expired session does not authenticate");
  const expired = await home(memberCookie);
  ok(expired.status === 200 && isPublicHomeShell(expired.body), "an expired session shows the public shell");

  // 5. Disconnect the test client and verify that crawlers receive the same public shell.
  await pool.end().catch(() => undefined);
  const crawler = await fetch(`${origin}/`, { headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } });
  ok(crawler.status === 200 && isPublicHomeShell(await crawler.text()), "a crawler gets the landing page");

  console.log(`home-session.live: ${checks} checks passed on ${origin}`);
} finally {
  server.kill("SIGTERM");
  await pool.end().catch(() => undefined);
}
