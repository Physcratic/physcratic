import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { getMigrations } from "better-auth/db/migration";
import { createEmailVerificationToken } from "better-auth/api";
import { TERMS_VERSION } from "./terms";

const candidateOrigin = "https://financial-dashboard-git-codex-physcr-54d12a-neuterions-projects.vercel.app";

test("actual Better Auth configuration on the candidate stable Preview origin, disposable DB and captured mail only", {
  skip: !process.env.AUTHORING_TEST_DATABASE_URL && "Use disposable PostgreSQL runner",
}, async (t) => {
  const target = new URL(process.env.AUTHORING_TEST_DATABASE_URL!);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/physcratic_authoring_test");
  const database = `authoring_auth_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: target.href });
  await admin.query(`CREATE DATABASE ${database}`);
  target.pathname = `/${database}`;
  const testSecret = "disposable-local-auth-review-secret-not-a-real-credential";
  const variables: Record<string, string> = {
    RECAPTCHA_SECRET_KEY: "test-secret", RECAPTCHA_ALLOWED_HOSTNAMES: new URL(candidateOrigin).hostname,
    NODE_ENV: "production", VERCEL_ENV: "preview", DATABASE_URL: target.href,
    BETTER_AUTH_URL: candidateOrigin, BETTER_AUTH_SECRET: testSecret,
    VERCEL_URL: "immutable-preview.invalid", VERCEL_PROJECT_PRODUCTION_URL: "production.invalid",
    VERCEL: "1", VERCEL_PROJECT_ID: "prj_phm4794zl2QBICu5MMbLFxcHAfFq",
    VERCEL_GIT_COMMIT_REF: "codex/physcratic-authoring-completion", AUTHORING_STAGING_BLOB_ENABLED: "1",
    STAGING_VERIFICATION_EMAIL_ALLOWLIST: "local-auth-review@example.invalid",
  };
  const saved = new Map([...Object.keys(variables), "BETTER_AUTH_TRUSTED_ORIGINS", "RESEND_API_KEY", "RESEND_EMAIL_DOMAIN"].map(key => [key, process.env[key]]));
  Object.assign(process.env, variables);
  // Existing trusted pool injection lets real auth run only on this disposable
  // DB. The production DB-options guard is tested separately with SDK mocks.
  const shared = globalThis as unknown as { physicsPool?: Pool };
  const previousPool = shared.physicsPool;
  shared.physicsPool = new Pool({ connectionString: target.href });
  delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_EMAIL_DOMAIN;
  // No HTTP call leaves this process, even if a mail hook is accidentally used.
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    assert.equal(String(input), "https://www.google.com/recaptcha/api/siteverify");
    return Response.json({ success: true, score: 0.9, action: "signup", hostname: new URL(candidateOrigin).hostname });
  });
  const { auth } = await import("./auth");
  const { pool } = await import("./db");
  const { isSubmissionOrigin } = await import("./submission-server");
  const { sendVerificationEmail } = await import("./verification-email");
  const context = await auth.$context;
  assert.equal(context.rateLimit.storage, "database");
  assert.deepEqual(context.options.rateLimit?.customRules, {
    "/sign-in/email": { window: 60, max: 5 },
    "/sign-up/email": { window: 60, max: 3 },
    "/send-verification-email": { window: 60, max: 3 },
    "/change-email": { window: 60, max: 3 },
    "/change-password": { window: 60, max: 3 },
    "/request-password-reset": { window: 60, max: 3 },
    "/reset-password": { window: 60, max: 5 },
    "/verify-email": { window: 60, max: 10 },
  });
  const originalSender = context.options.emailVerification!.sendVerificationEmail;
  const outgoing: string[] = [];
  // Replace only transport scheduling/delivery, keeping the real auth options,
  // JWT construction, routes, origin middleware, password hashing and DB adapter.
  context.options.emailVerification!.sendVerificationEmail = async ({ url }) => { outgoing.push(url); };
  function post(path: string, body: unknown, origin = candidateOrigin, ip = "192.0.2.10") {
    return auth.handler(new Request(`${candidateOrigin}/api/auth${path}`, {
      method: "POST", headers: { origin, "content-type": "application/json", "x-forwarded-for": ip, "x-captcha-response": "local-test-token" }, body: JSON.stringify(body),
    }));
  }
  const credentials = { name: "Disposable auth fixture", email: "local-auth-review@example.invalid", password: "disposable-password-42" };
  const callbackURL = "/sign-in?verified=1&returnTo=%2Fdashboard%2Fauthor";
  try {
    // SDK migrations are used only to initialize this newly created local DB.
    await (await getMigrations(auth.options)).runMigrations();
    await t.test("actual signup hooks reject missing, false and stale Terms without creating identity or sending mail", async () => {
      const before = (await pool.query('SELECT count(*)::integer AS n FROM "user"')).rows[0].n;
      const mailCount = outgoing.length;
      const rejected = [{}, { termsAccepted: false, termsVersion: TERMS_VERSION },
        { termsAccepted: "true", termsVersion: TERMS_VERSION }, { termsAccepted: true, termsVersion: "stale-version" }];
      for (const [index, terms] of rejected.entries()) {
        const response = await post("/sign-up/email", { ...credentials,
          email: `terms-negative-${index}@example.invalid`, ...terms }, candidateOrigin, `192.0.2.${40 + index}`);
        assert.equal(response.status, 400);
        assert.equal((await response.json()).code, "TERMS_ACCEPTANCE_REQUIRED");
      }
      assert.equal((await pool.query('SELECT count(*)::integer AS n FROM "user"')).rows[0].n, before);
      assert.equal(outgoing.length, mailCount);
    });
    await t.test("explicit base URL anchors verification links and relative callbacks", async () => {
      assert.equal(context.baseURL, `${candidateOrigin}/api/auth`);
      assert.ok(context.trustedOrigins.includes(candidateOrigin));
      assert.deepEqual([...new Set(context.trustedOrigins)], [candidateOrigin]);
      assert.equal(isSubmissionOrigin(new Request(`${candidateOrigin}/api`, { headers: { origin: candidateOrigin } })), true);
      assert.equal(isSubmissionOrigin(new Request(`${candidateOrigin}/api`, { headers: { origin: "https://attacker.invalid" } })), false);
      assert.equal(isSubmissionOrigin(new Request(`${candidateOrigin}/api`, { headers: { origin: "https://production.invalid" } })), false);
      const response = await post("/sign-up/email", { ...credentials, termsAccepted: true, termsVersion: TERMS_VERSION, callbackURL });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).user.emailVerified, false);
      assert.equal(outgoing.length, 1);
      const link = new URL(outgoing[0]);
      assert.equal(link.origin, candidateOrigin);
      assert.equal(link.pathname, "/api/auth/verify-email");
      assert.equal(link.searchParams.get("callbackURL"), callbackURL);
      const payload = JSON.parse(Buffer.from(link.searchParams.get("token")!.split(".")[1], "base64url").toString());
      assert.equal(payload.exp - payload.iat, 3600);
      assert.equal((await pool.query('SELECT count(*)::integer AS n FROM "session"')).rows[0].n, 0);
    });
    await t.test("unverified sign-in, foreign origins and off-origin callbacks fail closed", async () => {
      const response = await post("/sign-in/email", { ...credentials, callbackURL });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, "EMAIL_NOT_VERIFIED");
      assert.equal((await pool.query('SELECT count(*)::integer AS n FROM "session"')).rows[0].n, 0);
      assert.equal((await post("/sign-in/email", credentials, "https://attacker.invalid", "192.0.2.11")).status, 403);
      assert.equal((await post("/sign-in/email", { ...credentials, callbackURL: "https://attacker.invalid/steal" }, candidateOrigin, "192.0.2.12")).status, 403);
      assert.equal((await post("/sign-in/email", credentials, "https://production.invalid", "192.0.2.13")).status, 403);
      assert.equal((await post("/sign-in/email", { ...credentials, callbackURL: "https://immutable-preview.invalid/sign-in" }, candidateOrigin, "192.0.2.14")).status, 403);
      const bad = new URL(`${candidateOrigin}/api/auth/verify-email`);
      bad.searchParams.set("token", "invalid"); bad.searchParams.set("callbackURL", callbackURL);
      const invalid = await auth.handler(new Request(bad));
      assert.equal(invalid.status, 302);
      assert.match(invalid.headers.get("location")!, /error=INVALID_TOKEN/);
      const expired = await createEmailVerificationToken(testSecret, credentials.email, undefined, -60);
      bad.searchParams.set("token", expired);
      const stale = await auth.handler(new Request(bad));
      assert.equal(stale.status, 302);
      assert.match(stale.headers.get("location")!, /error=TOKEN_EXPIRED/);
      assert.equal((await pool.query('SELECT "emailVerified" FROM "user"')).rows[0].emailVerified, false);
    });
    await t.test("verification requires a fresh sign-in; link replay is idempotent rather than single use", async () => {
      for (let i = 0; i < 2; i++) {
        const verified = await auth.handler(new Request(outgoing[0]));
        assert.equal(verified.status, 302);
        assert.equal(new URL(verified.headers.get("location")!, candidateOrigin).href, new URL(callbackURL, candidateOrigin).href);
        assert.equal((await pool.query('SELECT count(*)::integer AS n FROM "session"')).rows[0].n, 0);
      }
      const response = await post("/sign-in/email", { ...credentials, callbackURL });
      assert.equal(response.status, 200);
      const cookies = response.headers.get("set-cookie")!;
      assert.match(cookies, /Secure/i); assert.match(cookies, /HttpOnly/i); assert.match(cookies, /SameSite=Lax/i);
      assert.doesNotMatch(cookies, /Domain=/i);
      assert.equal((await pool.query('SELECT count(*)::integer AS n FROM "session"')).rows[0].n, 1);
    });
    await t.test("registration rate limit rejects the fourth request in one per-IP path bucket", async () => {
      assert.equal(context.rateLimit.storage, "database");
      for (let i = 0; i < 4; i++) {
        // Missing Terms acceptance prevents creation even for the first three.
        const response = await post("/sign-up/email", credentials, candidateOrigin, "192.0.2.77");
        assert.equal(response.status, i < 3 ? 400 : 429);
        if (i === 3) assert.ok(response.headers.get("x-retry-after"));
      }
      assert.equal((await pool.query('SELECT count(*)::integer AS n FROM "user"')).rows[0].n, 1);
    });
    await t.test("mail misconfiguration stops before HTTP; configured sender and idempotency are captured locally", async (mailTest) => {
      const input = { email: credentials.email, url: outgoing[0], token: "disposable-token" };
      await assert.rejects(sendVerificationEmail(input), /sender is not configured/);
      process.env.RESEND_API_KEY = "re_disposable_local_test_only";
      process.env.RESEND_EMAIL_DOMAIN = "invalid domain";
      await assert.rejects(sendVerificationEmail(input), /sender is not configured/);
      process.env.RESEND_EMAIL_DOMAIN = "staging-mail.example.invalid";
      let deliveries = 0;
      mailTest.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
        deliveries++;
        assert.equal(String(url), "https://api.resend.com/emails");
        const body = JSON.parse(String(init?.body));
        assert.equal(body.from, "Physcratic <accounts@staging-mail.example.invalid>");
        assert.deepEqual(body.to, [credentials.email]);
        assert.ok(body.text.includes(outgoing[0]));
        const headers = new Headers(init?.headers);
        assert.match(headers.get("idempotency-key")!, /^verify-email\/[a-f0-9]{64}$/);
        return Response.json({ id: "captured-only" });
      });
      await sendVerificationEmail(input);
      assert.equal(deliveries, 1);
    });
  } finally {
    context.options.emailVerification!.sendVerificationEmail = originalSender;
    await pool.end();
    if (previousPool) shared.physicsPool = previousPool; else delete shared.physicsPool;
    await admin.query(`DROP DATABASE ${database}`);
    await admin.end();
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
