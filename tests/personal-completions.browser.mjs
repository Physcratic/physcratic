// Run against a local production build with matching PERSONAL_COMPLETIONS_ENABLED.
// bash scripts/test-problem-authoring.sh node --require ./tests/server-only-register.cjs --import tsx tests/personal-completions.browser.mjs
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import arena from "../lib/arena/index.json" with { type: "json" };
import { verifyArenaPersonalization } from "./arena-personalization.browser.mjs";
import { achievementFixtures, achievementParsed, achievementRequest, installAchievementFixtures } from "./community-achievement-fixtures.ts";

const database = new URL(process.env.AUTHORING_TEST_DATABASE_URL);
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.pathname, "/physcratic_authoring_test");
const pool = new Pool({ connectionString: database.href });
const enabled = process.env.PERSONAL_COMPLETIONS_ENABLED === "true";
const require = createRequire(join(process.env.AUTHORING_BROWSER_TOOLS, "package.json"));
const { chromium } = require("playwright");
const { default: AxeBuilder } = require("@axe-core/playwright");
const origin = `http://127.0.0.1:${process.env.COMPLETIONS_BROWSER_PORT ?? 3107}`;
const secret = randomBytes(32).toString("hex");
const cookieName = "better-auth.session_token";
const path = "/api/personal-completions";
const pattern = "**/api/personal-completions*";
const arenaProblem = arena.problems.find(problem => problem.id === "arena-mind-the-gap");
assert.ok(arenaProblem);
const arenaPath = `/dashboard/problems/${arenaProblem.id}`;
const arenaKey = `arena:${arenaProblem.id}`;
const screenshots = process.env.COMPLETIONS_SCREENSHOTS;
let browser, server;
let serverLog = "";

async function addUser(id, name, verified = true) {
  await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,$4)', [id, name, `${id}@example.test`, verified]);
}
async function session(id) {
  const token = randomBytes(24).toString("hex");
  await pool.query('INSERT INTO session(id,token,"userId","expiresAt") VALUES($1,$2,$3,now()+interval \'1 day\')', [randomUUID(), token, id]);
  return encodeURIComponent(`${token}.${createHmac("sha256", secret).update(token).digest("base64")}`);
}
async function setCookie(context, value) {
  await context.addCookies([{ name: cookieName, value, url: origin }]);
}
async function open(cookie, width = 1440, theme = "dark") {
  const context = await browser.newContext({ viewport: { width, height: 960 }, isMobile: width < 500, hasTouch: width < 500, reducedMotion: "reduce" });
  await context.addInitScript(theme => localStorage.setItem("theme", theme), theme);
  // The app, fixture data and browser assets are all local.
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  if (cookie) await setCookie(context, cookie);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  return { context, page };
}
const control = (page, completed) => page.getByRole("button", { name: completed ? "Completed" : "Mark completed", exact: true });
const history = page => page.getByRole("region", { name: "Completed problems" });
const count = (page, n) => history(page).getByText(`${n} completed`, { exact: true });
const checkpoint = (promise, label) => Promise.race([promise, delay(12000, null, { ref: false }).then(() => {
  throw new Error(`Timed out waiting for ${label}`);
})]);
async function toggle(page, before) {
  const response = page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() === "PUT");
  await control(page, before).click();
  assert.equal((await response).status(), 200);
  await control(page, !before).waitFor();
}
async function switchSession(page, value, expectedId) {
  await setCookie(page.context(), value);
  const refreshed = page.waitForResponse(r => new URL(r.url()).pathname === "/api/auth/get-session");
  // Use the same notification Better Auth emits when a session changes in another tab.
  await page.evaluate(() => window.dispatchEvent(new StorageEvent("storage", {
    key: "better-auth.message", newValue: JSON.stringify({ event: "session", data: { trigger: "signIn" } }),
  })));
  assert.equal((await (await refreshed).json()).user.id, expectedId);
}
async function audit(page, root, theme, capture) {
  await page.waitForFunction(dark => document.documentElement.classList.contains("dark") === dark, theme === "dark");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const violations = (await new AxeBuilder({ page }).include(root).analyze()).violations;
  assert.deepEqual(violations.map(({ id, nodes }) => ({ id, targets: nodes.map(n => n.target) })), []);
  if (screenshots) await page.screenshot({ path: join(screenshots, capture) });
}

try {
  const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  assert.deepEqual(tables.rows, [], "Start with a fresh disposable database.");
  await pool.query(`
    CREATE TABLE "user"(id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, "emailVerified" boolean NOT NULL DEFAULT false, image text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), "termsAcceptedVersion" text, "termsAcceptedAt" timestamptz);
    CREATE TABLE session(id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE, "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(), "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user"(id));
    CREATE TABLE account(id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL, "accessToken" text, "refreshToken" text,
      "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now());
    CREATE TABLE verification(id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now());
  `);
  await pool.query(await readFile("migrations/20261031_auth_rate_limit.sql", "utf8"));
  await installAchievementFixtures(pool, { userTableExists: true });
  for (const migration of ["0012_community_problem_stats", "0020_authored_public_solutions", "0021_arena_favourite_key_pattern"]) {
    await pool.query(await readFile(`migrations/${migration}.up.sql`, "utf8"));
  }
  if (enabled) await pool.query(await readFile("migrations/0025_personal_completions.up.sql", "utf8"));
  await addUser("student-a", "Alex Student");
  await addUser("student-b", "Robin Student");
  await addUser("unverified", "Unverified Student", false);
  await pool.query(`INSERT INTO community_profile(user_id,handle,display_name,publication_basis,publication_policy_version,publication_recorded_at)
    VALUES('student-b','robin_student','Robin Student','legacy_acknowledgement','b1-v1',now())`);
  const fixture = achievementFixtures(pool);
  const problem = await fixture.problem("student-b");
  const authoredPath = `/dashboard/authored/${problem.id}`;
  const authoredKey = `authored:${problem.id}`;
  const [a, anotherA, b, unverified] = await Promise.all([session("student-a"), session("student-a"), session("student-b"), session("unverified")]);

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", new URL(origin).port, "-H", "127.0.0.1"], {
    env: { ...process.env, DATABASE_URL: database.href, BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: origin,
      COMMUNITY_PROFILES_ENABLED: "true", COMMUNITY_PROBLEM_STATS_ENABLED: "true" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", chunk => { serverLog += chunk; });
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await fetch(origin).then(r => r.ok, () => false)) break;
    assert.ok(server.exitCode === null && attempt < 119, "Local Next server did not start.");
    await delay(250);
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
  const signed = await open(a);
  const { context, page } = signed;

  if (!enabled) {
    const requests = [];
    page.on("request", request => { if (request.url().includes(path)) requests.push(request.url()); });
    for (const url of [arenaPath, authoredPath, "/settings"]) {
      await page.goto(origin + url, { waitUntil: "networkidle" });
      assert.equal(await control(page, false).or(control(page, true)).count(), 0);
      assert.equal(await history(page).count(), 0);
    }
    assert.deepEqual(requests, []);
    const disabled = await context.request.get(origin + path, { headers: { "X-Community-Account": "student-a" } });
    assert.equal(disabled.status(), 503);
    assert.equal((await pool.query("SELECT to_regclass('personal_problem_completion') AS table")).rows[0].table, null);
    const publicPage = page.waitForResponse(r => new URL(r.url()).pathname === "/api/arena/collection");
    await page.goto(origin + "/dashboard?view=problems");
    const legacy = await publicPage;
    assert.equal(legacy.request().headers()["x-community-account"], undefined);
    assert.equal((await legacy.json()).personalization, undefined);
    assert.equal(await page.getByText("Completed", {exact:true}).count(),0);
    console.log("PASS feature off on old schema, signed-in readers, Settings and legacy Arena collection");
  } else {
    if (screenshots) await mkdir(screenshots, { recursive: true });
    await page.goto(origin + arenaPath);
    await control(page, false).waitFor();
    await page.getByRole("tab", { name: "Worked solution", exact: true }).click();
    assert.equal(await control(page, false).count(), 1, "Opening a worked solution does not complete the problem.");
    await page.getByRole("tab", { name: "Problem statement", exact: true }).click();

    // Delay a successful response. Multiple immediate clicks still send one desired-state write.
    let putCount = 0;
    let releasePut;
    const hold = new Promise(resolve => { releasePut = resolve; });
    let sawPut;
    const started = new Promise(resolve => { sawPut = resolve; });
    await page.route(pattern, async route => {
      if (route.request().method() !== "PUT") return route.continue();
      putCount++;
      const response = await route.fetch();
      sawPut(response.status());
      await hold;
      await route.fulfill({ response });
    });
    await control(page, false).evaluate(button => { button.click(); button.click(); button.click(); });
    try {
      assert.equal(await checkpoint(started, "the held mark"), 200);
      assert.equal(await control(page, true).count(), 0);
      assert.equal(putCount, 1);
    } finally {
      releasePut();
    }
    await control(page, true).waitFor();
    await page.unroute(pattern);
    await page.reload();
    await control(page, true).waitFor();
    const separate = await open(anotherA, 375, "light");
    await separate.page.goto(origin + arenaPath);
    await control(separate.page, true).waitFor();
    await separate.context.close();
    console.log("PASS confirmed Arena mark, rapid clicks, reload, second authenticated session");

    await page.goto(origin + "/settings");
    await count(page, 1).waitFor();
    await page.getByRole("button", { name: "Create profile", exact: true }).waitFor();
    await history(page).getByRole("link", { name: arenaProblem.title, exact: true }).click();
    await page.waitForURL(origin + arenaPath);
    await control(page, true).waitFor();
    await page.route(pattern, route => route.request().method() === "PUT"
      ? route.fulfill({ status: 503, json: { error: "Fixture failure" } }) : route.continue());
    await control(page, true).click();
    await page.getByRole("alert").filter({ hasText: "Could not save completion." }).waitFor();
    await control(page, true).waitFor();
    await page.unroute(pattern);
    await toggle(page, true);
    await page.goBack();
    await count(page, 0).waitFor();
    assert.equal(await history(page).getByRole("link").count(), 0, "Cached profile history updates after unmark.");
    console.log("PASS private profile history without a profile, failed write, cached history invalidation");

    await page.goto(origin + authoredPath);
    await control(page, false).waitFor();
    await page.getByLabel("Numerical answer", { exact: true }).fill("2");
    await page.getByLabel("Units", { exact: true }).fill("1");
    const graded = page.waitForResponse(r => new URL(r.url()).pathname.endsWith("/attempts") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Submit answer", exact: true }).click();
    const attempt = await graded;
    assert.equal(attempt.status(), 201);
    assert.equal((await attempt.json()).attempt.status, "correct");
    await page.getByRole("heading", { name: "Correct, saved attempt 1", exact: true }).waitFor();
    assert.equal(await control(page, false).count(), 1, "Correct grading does not complete the problem.");
    await page.keyboard.press("Tab");
    await control(page, false).focus();
    assert.equal(await control(page, false).evaluate(button => button.matches(":focus-visible")), true);
    await page.keyboard.press("Enter");
    await control(page, true).waitFor();
    await page.reload();
    await control(page, true).waitFor();
    await toggle(page, true);
    await toggle(page, false);
    await page.goto(origin + "/settings");
    await count(page, 1).waitFor();
    assert.equal(await history(page).getByRole("link", { name: problem.content.title }).getAttribute("href"), authoredPath);
    const statusRequest = () => context.request.get(origin + path + "?key=" + authoredKey, { headers: { "X-Community-Account": "student-a" } });
    const receipt = await statusRequest();
    assert.equal(receipt.status(), 200);
    assert.match(receipt.headers()["cache-control"], /private.*no-store/);
    const recorded = await receipt.json();
    const withdrawn = await achievementParsed(await fixture.author("unpublish", achievementRequest("student-b", { version: problem.version }), problem.id));
    await page.reload();
    await count(page, 0).waitFor();
    await page.goto(origin + authoredPath);
    await page.getByRole("alert").filter({ hasText: "This problem is unpublished" }).waitFor();
    assert.equal(await control(page, false).or(control(page, true)).count(), 0);
    await achievementParsed(await fixture.author("publish", achievementRequest("student-b", { version: withdrawn.version }), problem.id));
    await page.reload();
    await control(page, true).waitFor();
    assert.deepEqual(await (await statusRequest()).json(), recorded);
    console.log("PASS keyboard community marking, unmarking, withdrawal and republication");

    // Hold A's history through A → B → A while a second A session unmarks the item.
    let releaseHistory;
    const responseHeld = new Promise(resolve => { releaseHistory = resolve; });
    let firstHistory;
    let holdFirstHistory = true;
    const fetched = new Promise(resolve => { firstHistory = resolve; });
    const lateHistory = page.waitForResponse(r => new URL(r.url()).pathname === path &&
      !new URL(r.url()).search && r.request().headers()["x-community-account"] === "student-a");
    await page.route(pattern, async route => {
      if (!holdFirstHistory || route.request().headers()["x-community-account"] !== "student-a" || new URL(route.request().url()).search) return route.continue();
      holdFirstHistory = false;
      const response = await route.fetch();
      firstHistory(response.status());
      await responseHeld;
      await route.fulfill({ response });
    });
    await page.goto(origin + "/settings");
    const secondSession = await open(anotherA);
    const setOtherSession = (completed) => secondSession.context.request.put(origin + path, {
      headers: {origin, "X-Community-Account": "student-a"}, data: {key:authoredKey, completed},
    });
    try {
      assert.equal(await checkpoint(fetched, "the held history"), 200);
      await switchSession(page, b, "student-b");
      await count(page, 0).waitFor();
      assert.equal((await setOtherSession(false)).status(), 200);
      await switchSession(page, a, "student-a");
      await page.getByText("student-a@example.test", {exact:true}).waitFor();
      await count(page, 0).waitFor();
    } finally {
      releaseHistory();
    }
    assert.equal((await lateHistory).status(), 200);
    await page.unrouteAll({ behavior: "wait" });
    await count(page, 0).waitFor();
    assert.equal(await history(page).getByRole("link").count(), 0);
    try { assert.equal((await setOtherSession(true)).status(), 200); }
    finally { await secondSession.context.close(); }
    await switchSession(page, b, "student-b");
    await count(page, 0).waitFor();
    const stale = await context.request.get(origin + path, { headers: { "X-Community-Account": "student-a" } });
    assert.equal(stale.status(), 409);
    await page.goto(origin + authoredPath);
    await control(page, false).waitFor();

    // A confirmed write response for B arrives after the same reader switches to A.
    let releaseSwitch;
    const switchHeld = new Promise(resolve => { releaseSwitch = resolve; });
    let pendingWrite;
    const writeReached = new Promise(resolve => { pendingWrite = resolve; });
    await page.goto(origin + arenaPath);
    await control(page, false).waitFor();
    await page.route(pattern, async route => {
      if (route.request().method() !== "PUT") return route.continue();
      const response = await route.fetch();
      pendingWrite(response.status());
      await switchHeld;
      await route.fulfill({ response });
    });
    const lateWrite = page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() === "PUT");
    await control(page, false).click();
    try {
      assert.equal(await checkpoint(writeReached, "the held account B write"), 200);
      const accountRead = page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() === "GET" &&
        r.request().headers()["x-community-account"] === "student-a");
      await switchSession(page, a, "student-a");
      assert.equal((await accountRead).status(), 200);
      await control(page, false).waitFor();
    } finally {
      releaseSwitch();
    }
    assert.equal((await lateWrite).status(), 200);
    await page.unrouteAll({ behavior: "wait" });
    await control(page, false).waitFor();
    assert.equal(await control(page, true).count(), 0);

    // A reader's earlier A response must also be ignored after A is selected again.
    let finishStatus;
    const statusHeld = new Promise(resolve => { finishStatus = resolve; });
    let signalStatus;
    const statusFetched = new Promise(resolve => { signalStatus = resolve; });
    let holdFirstStatus = true;
    await page.route(pattern, async route => {
      if (!holdFirstStatus || route.request().method() !== "GET" ||
        route.request().headers()["x-community-account"] !== "student-a") return route.continue();
      holdFirstStatus = false;
      const response = await route.fetch();
      signalStatus(await response.json());
      await statusHeld;
      await route.fulfill({response});
    });
    await page.reload();
    const statusWriter = await open(anotherA);
    try {
      assert.equal((await checkpoint(statusFetched, "the held reader status")).completed, false);
      await switchSession(page,b,"student-b");
      await control(page,true).waitFor();
      const marked = await statusWriter.context.request.put(origin+path,{
        headers:{origin,"X-Community-Account":"student-a"},data:{key:arenaKey,completed:true},
      });
      assert.equal(marked.status(),200);
      const freshStatus = page.waitForResponse(response => new URL(response.url()).pathname===path &&
        response.request().method()==="GET" && response.request().headers()["x-community-account"]==="student-a");
      await switchSession(page,a,"student-a");
      assert.equal((await (await freshStatus).json()).completed,true);
      await control(page,true).waitFor();
    } finally {
      finishStatus();
      await statusWriter.context.close();
    }
    await page.unrouteAll({behavior:"wait"});
    assert.equal(await control(page,false).count(),0);
    await toggle(page,true);
    console.log("PASS delayed Profile and reader responses through A to B to A, and a late write across accounts");

    // The private API is GET-readable for an unverified owner. No unverified reader has a write control.
    for (const [cookie, expected] of [[undefined, 401], [unverified, 403]]) {
      const visitor = await open(cookie);
      const requests = [];
      visitor.page.on("request", request => { if (request.url().includes(path)) requests.push(request.url()); });
      for (const url of [arenaPath, authoredPath]) {
        await visitor.page.goto(origin + url, { waitUntil: "networkidle" });
        assert.equal(await control(visitor.page, false).or(control(visitor.page, true)).count(), 0);
      }
      assert.deepEqual(requests, []);
      await visitor.page.goto(origin + "/settings");
      if (cookie) await count(visitor.page, 0).waitFor();
      else assert.equal(await history(visitor.page).count(), 0);
      assert.equal((await visitor.context.request.put(origin + path, {
        headers: { origin, "X-Community-Account": "unverified" }, data: { key: arenaKey, completed: true },
      })).status(), expected);
      await visitor.context.close();
    }
    const guestPublic = await fetch(origin + "/api/community/profile/robin_student");
    const memberPublic = await context.request.get(origin + "/api/community/profile/robin_student");
    assert.equal(guestPublic.status, 200);
    assert.equal(memberPublic.status(), 200);
    assert.deepEqual(await guestPublic.json(), await memberPublic.json());
    const publicPage = await fetch(origin + "/u/robin_student");
    assert.equal(publicPage.status, 200);
    assert.doesNotMatch(await publicPage.text(), /Completed problems|personal-completions|completedAt/);
    const publicProblem = await fetch(origin + "/api/authored-problems/" + problem.id);
    assert.equal(publicProblem.status, 200);
    assert.doesNotMatch(await publicProblem.text(), /completedAt|student-a|student-b/);
    console.log("PASS guest and unverified behavior, no public profile or authored API exposure");

    await toggle(page, false);
    for (const width of [375, 1440]) for (const theme of ["light", "dark"]) {
      const view = await open(anotherA, width, theme);
      for (const [name, url] of [["arena", arenaPath], ["community", authoredPath], ["profile", "/settings"]]) {
        await view.page.goto(origin + url);
        if (name === "profile") {
          await count(view.page, 2).waitFor();
          const link = history(view.page).getByRole("link").first();
          assert.ok((await link.boundingBox()).height >= 44);
          await history(view.page).scrollIntoViewIfNeeded();
        } else {
          const button = control(view.page, true);
          await button.waitFor();
          assert.ok((await button.boundingBox()).height >= 44);
          assert.equal(await button.locator("svg[aria-hidden='true']").count(), 1);
        }
        const selector = name === "profile" ? '[aria-labelledby="completed-problems-heading"]' : 'button[aria-pressed="true"]';
        await audit(view.page, selector, theme, `${name}-${width}-${theme}.png`);
      }
      await view.context.close();
    }

    // Fill more than a page using real Arena keys, keeping the reader/profile mutations above entirely API-driven.
    await pool.query("INSERT INTO personal_problem_completion(user_id,problem_key) SELECT 'student-a',unnest($1::text[]) ON CONFLICT DO NOTHING",
      [arena.problems.slice(0, 26).map(problem => "arena:" + problem.id)]);
    await page.goto(origin + "/settings");
    const firstLink = history(page).getByRole("link").first();
    await firstLink.waitFor();
    assert.equal(await history(page).getByRole("link").count(), 24);
    const firstHref = await firstLink.getAttribute("href");
    await history(page).getByRole("button", { name: "Next page" }).click();
    await firstLink.waitFor();
    assert.ok(await history(page).getByRole("link").count() < 24);
    assert.notEqual(await firstLink.getAttribute("href"), firstHref);
    await history(page).getByRole("button", { name: "Previous page" }).click();
    await firstLink.waitFor();
    assert.equal(await firstLink.getAttribute("href"), firstHref);
    console.log("PASS 12 responsive/theme screenshots, axe checks, and private history pagination");
    await verifyArenaPersonalization({ origin, pool, open, toggle, switchSession, users: { a, b, anotherA, unverified }, screenshots, AxeBuilder, authoredId: problem.id });
    assert.doesNotMatch(serverLog, /student-[ab]|completedAt|\b(?:ph1|pc2)\.[A-Za-z0-9_-]+/);
    console.log("PASS application output excludes account identifiers, private cursor values and completion fields");
  }
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  await browser?.close();
  if (server && server.exitCode === null && server.signalCode === null) {
    const closed = once(server, "close");
    server.kill("SIGTERM");
    await closed;
  }
  await pool.end();
}
