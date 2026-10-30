import test from "node:test";
import assert from "node:assert/strict";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { signupCaptcha } from "./signup-captcha";
import { signupPolicy } from "./signup-policy";
import { TERMS_VERSION } from "./terms";

// Actual Better Auth HTTP pipeline and production consent hooks, disposable adapter + mocked Google/mail.
test("signup CAPTCHA HTTP boundary and registration regression", async (t) => {
  const originalFetch = globalThis.fetch;
  let verdict: unknown = { success: true, score: 0.9, action: "signup", hostname: "physcratic.com" };
  let failProvider = false;
  let throwProvider = false;
  let calls = 0;
  const consumed = new Set<string>();
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://www.google.com/recaptcha/api/siteverify");
    calls++;
    if (throwProvider) throw new Error("sensitive-provider-diagnostic");
    if (failProvider) return Response.json({}, { status: 503 });
    const token = new URLSearchParams(String(init?.body)).get("response")!;
    const result = consumed.has(token) ? { success: false, "error-codes": ["timeout-or-duplicate"] } : verdict;
    consumed.add(token);
    return Response.json(result);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const database = { user: [], session: [], account: [], verification: [] };
  const mails: unknown[] = [];
  const auth = betterAuth({
    baseURL: "https://physcratic.com", secret: "deterministic-test-only-secret-at-least-32-chars",
    database: memoryAdapter(database), ...signupPolicy,
    plugins: [signupCaptcha({ RECAPTCHA_SECRET_KEY: "test-secret", RECAPTCHA_ALLOWED_HOSTNAMES: "physcratic.com" })],
    emailAndPassword: { enabled: true, autoSignIn: false, requireEmailVerification: true, minPasswordLength: 8, maxPasswordLength: 128 },
    emailVerification: { sendOnSignUp: true, autoSignInAfterVerification: false, sendVerificationEmail: async (mail) => { mails.push(mail); } },
    rateLimit: { enabled: false },
  });
  let sequence = 0;
  const request = (token?: string, overrides = {}, path = "/sign-up/email") => auth.handler(new Request(`https://physcratic.com/api/auth${path}`, {
    method: "POST", headers: { "content-type": "application/json", origin: "https://physcratic.com", ...(token ? { "x-captcha-response": token } : {}) },
    body: JSON.stringify({ email: `user${++sequence}@example.com`, password: "Valid-password-123", name: "Student", termsAccepted: true, termsVersion: TERMS_VERSION, ...overrides }),
  }));
  assert.equal((await request()).status, 400, "direct API without CAPTCHA rejected");
  assert.equal(calls, 0);
  for (const bad of [
    { success: false }, { success: false, "error-codes": ["timeout-or-duplicate"] },
    { success: true, score: 0.1, action: "signup", hostname: "physcratic.com" },
    { success: true, score: 0.9, action: "signin", hostname: "physcratic.com" },
    { success: true, score: 0.9, action: "signup", hostname: "evil.example" },
  ]) {
    verdict = bad;
    assert.equal((await request(`bad-${sequence}`)).status, 403);
  }
  failProvider = true;
  assert.equal((await request("outage")).status, 500);
  failProvider = false;
  throwProvider = true;
  const transportFailure = await request("transport-failure");
  assert.equal(transportFailure.status, 500);
  assert.doesNotMatch(await transportFailure.text(), /sensitive-provider-diagnostic/);
  throwProvider = false;
  assert.equal(database.user.length, 0);
  verdict = { success: true, score: 0.9, action: "signup", hostname: "physcratic.com" };
  assert.equal((await request("forged", { termsAcceptedAt: "2000-01-01", termsAcceptedVersion: "forged" })).status, 400);
  const result = await request("fresh");
  assert.equal(result.status, 200, await result.clone().text());
  assert.equal((await result.json()).token, null);
  assert.equal(database.user.length, 1);
  const user = database.user[0] as Record<string, unknown>;
  assert.equal(user.termsAcceptedVersion, TERMS_VERSION);
  assert.notEqual(String(user.termsAcceptedAt), "2000-01-01");
  assert.equal(user.emailVerified, false);
  assert.equal(database.account.length, 1);
  assert.equal(database.session.length, 0);
  assert.equal(mails.length, 1);
  assert.equal((await request("fresh")).status, 403, "Google duplicate rejection fails closed");
  for (const terms of [{ termsAccepted: undefined }, { termsVersion: undefined }, { termsAccepted: false }, { termsAccepted: "true" }, { termsVersion: "old" }]) {
    assert.equal((await request(`terms-${sequence}`, terms)).status, 400);
  }
  const acceptedRecord = JSON.stringify(database.user[0]);
  const before = calls;
  const unverified = await request(undefined, { email: user.email }, "/sign-in/email");
  assert.equal(unverified.status, 403);
  assert.equal((await unverified.json()).code, "EMAIL_NOT_VERIFIED");
  await request(undefined, {}, "/request-password-reset");
  await request(undefined, {}, "/send-verification-email");
  assert.equal(calls, before, "other endpoints never invoke CAPTCHA");
  assert.equal(database.user.length, 1);
  assert.equal(JSON.stringify(database.user[0]), acceptedRecord, "rejected signup and login do not overwrite consent history");
});

test("missing server configuration fails closed only on signup", async () => {
  for (const env of [
    {}, { RECAPTCHA_SECRET_KEY: "secret" }, { RECAPTCHA_ALLOWED_HOSTNAMES: "physcratic.com" },
    { RECAPTCHA_SECRET_KEY: "   ", RECAPTCHA_ALLOWED_HOSTNAMES: "physcratic.com" },
    { RECAPTCHA_SECRET_KEY: "secret", RECAPTCHA_ALLOWED_HOSTNAMES: " ,  , " },
  ]) {
    const plugin = signupCaptcha(env);
    const ctx = { options: {}, logger: { error: () => { throw new Error("must not log raw provider errors"); } } };
    const run = plugin.onRequest as unknown as (request: Request, ctx: unknown) => Promise<{ response: Response } | undefined>;
    assert.equal((await run(new Request("https://physcratic.com/api/auth/sign-up/email/", { headers: { "x-captcha-response": "token" } }), ctx))?.response.status, 500);
    assert.equal(await run(new Request("https://physcratic.com/api/auth/sign-in/email"), ctx), undefined);
  }
});

test("provider exception is not logged or exposed", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("secret-provider-diagnostic"); };
  t.after(() => { globalThis.fetch = originalFetch; });
  const plugin = signupCaptcha({ RECAPTCHA_SECRET_KEY: "test-secret", RECAPTCHA_ALLOWED_HOSTNAMES: "physcratic.com" });
  let logs = 0;
  const run = plugin.onRequest as unknown as (request: Request, ctx: unknown) => Promise<{ response: Response }>;
  const result = await run(new Request("https://physcratic.com/api/auth/sign-up/email", { headers: { "x-captcha-response": "test-token" } }), { options: {}, logger: { error: () => { logs++; } } });
  assert.equal(result.response.status, 500);
  assert.doesNotMatch(await result.response.text(), /secret-provider-diagnostic|test-secret|test-token/);
  assert.equal(logs, 0);
});
