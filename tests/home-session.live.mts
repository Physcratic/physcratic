// A signed-in response for "/" must never be served to a signed-out fetch, and a signed-out response must never
// contain user data. This starts the production build with a disposable PostgreSQL, creates a verified user and a
// real session, signs the session cookie the way Better Auth does, and fetches "/" with and without it, one after
// the other and at the same time.
//
//   VERCEL_ENV=production pnpm build        (once)
//   bash scripts/test-problem-authoring.sh pnpm exec tsx --conditions=react-server tests/home-session.live.mts
//
// scripts/test-problem-authoring.sh starts the disposable database and sets DATABASE_URL to it. This test refuses
// to run against anything that is not a local database with "test" in its name. Not run by CI.
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";

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

const server = spawn("pnpm", ["exec", "next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  env: { ...process.env, DATABASE_URL: databaseUrl, BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: origin, NODE_ENV: "production" },
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
const isLobby = (body: string) => /<h1[^>]*>Lobby<\/h1>/.test(body) && !body.includes("data-home-sentence");
const isLanding = (body: string) => body.includes("data-home-sentence") && /<h1[^>]*>Free physics olympiad practice<\/h1>/.test(body) && !/<h1[^>]*>Lobby<\/h1>/.test(body);

try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(`${origin}/`)).status === 200) break; } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (attempt === 59) throw new Error(`server did not start:\n${serverLog.slice(-2000)}`);
  }

  // 1. A signed-in fetch gets the Lobby, private and not stored.
  const member = await home(memberCookie);
  ok(member.status === 200, `member status ${member.status}`);
  ok(isLobby(member.body), `a signed-in fetch of "/" shows the Lobby. Server log:\n${serverLog.slice(-1500)}`);
  ok(/private/.test(member.cache) && /no-store/.test(member.cache), `signed-in Cache-Control: ${member.cache}`);

  // 2. A signed-out fetch straight after gets the landing page, with no trace of the signed-in user.
  const visitor = await home();
  ok(isLanding(visitor.body), "a signed-out fetch right after a signed-in one shows the landing page");
  ok(/private/.test(visitor.cache) && /no-store/.test(visitor.cache), `signed-out Cache-Control: ${visitor.cache}`);
  for (const secretValue of [user.name, user.email, user.id, token, signed, "Zelda", "session-home-test"]) {
    ok(!visitor.body.includes(secretValue), `the signed-out response must not contain "${secretValue}"`);
    ok(!decodeURIComponent(visitor.body).includes(secretValue), `the signed-out response must not contain "${secretValue}" (decoded)`);
  }
  ok(!/Welcome back|My attempts|Sign out|Lobby/.test(visible(visitor.body)), "no signed-in content on the landing page");

  // 3. Alternating and concurrent fetches never cross over.
  const results = await Promise.all(Array.from({ length: 24 }, (_, index) => home(index % 2 === 0 ? memberCookie : undefined).then((r) => ({ member: index % 2 === 0, ...r }))));
  for (const result of results) {
    ok(result.member ? isLobby(result.body) : isLanding(result.body), `${result.member ? "signed-in" : "signed-out"} fetch got the wrong page`);
    ok(/private/.test(result.cache) && /no-store/.test(result.cache), `Cache-Control ${result.cache}`);
    if (!result.member) ok(!result.body.includes(user.email) && !result.body.includes(token), "no user data in a signed-out response");
  }

  // 4. A bad, expired or tampered cookie is a visitor, not an error.
  for (const cookie of [`better-auth.session_token=${encodeURIComponent(`${token}.AAAA`)}`, "better-auth.session_token=garbage", `better-auth.session_token=${signed}x`]) {
    const response = await home(cookie);
    ok(response.status === 200 && isLanding(response.body), `tampered cookie shows the landing page (${cookie.slice(0, 40)})`);
  }
  await pool.query(`UPDATE session SET "expiresAt" = now() - interval '1 hour' WHERE token = $1`, [token]);
  const expired = await home(memberCookie);
  ok(expired.status === 200 && isLanding(expired.body), "an expired session shows the landing page");

  // 5. A crawler with no cookie never reaches the database: stop it and fetch again.
  await pool.end().catch(() => undefined);
  const crawler = await fetch(`${origin}/`, { headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } });
  ok(crawler.status === 200 && isLanding(await crawler.text()), "a crawler gets the landing page");

  console.log(`home-session.live: ${checks} checks passed on ${origin}`);
} finally {
  server.kill("SIGTERM");
  await pool.end().catch(() => undefined);
}
