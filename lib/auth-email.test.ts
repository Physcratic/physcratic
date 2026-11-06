import assert from "node:assert/strict";
import test from "node:test";
import {
  changeEmailApprovalEmail, changeEmailVerifyEmail, escapeHtml, passwordResetEmail, plainValue, safeLink, signupVerificationEmail,
} from "./auth-email-templates";
import { authEmailOutbox, deliverAuthEmail, memoryTransportAllowed } from "./auth-email-transport";
import { budgetIdentifier, normalizeAddress } from "./auth-email-budget";
import { tokenRequestType, withCallback } from "./auth-account";

const hostile = `"><script>alert(1)</script>\n\rBcc: x@evil.test <img src=x onerror=alert(1)>&'`;
const url = "https://physcratic.com/api/auth/verify-email?token=abc&callbackURL=%2F";

test("templates escape every user value in HTML and keep it on one line in text", () => {
  for (const mail of [
    changeEmailApprovalEmail({ newEmail: hostile, url, resetUrl: "https://physcratic.com/forgot-password" }),
    changeEmailVerifyEmail({ newEmail: hostile, url }),
  ]) {
    assert.doesNotMatch(mail.html, /<script|<img|onerror=alert\(1\)>/);
    assert.match(mail.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(mail.html, /&quot;&gt;/);
    assert.match(mail.html, /&amp;&#39;/);
    assert.doesNotMatch(mail.text, /\nBcc:/, "a value cannot start a new line");
    assert.ok(mail.text.includes(url));
    assert.ok(mail.html.includes(`href="${escapeHtml(url)}"`), "links are attribute-escaped");
    assert.doesNotMatch(mail.subject, /script/);
  }
});

test("copy rules: no em or en dashes and no semicolons in any account email", () => {
  for (const mail of [
    signupVerificationEmail({ url }), passwordResetEmail({ url, setPassword: false }), passwordResetEmail({ url, setPassword: true }),
    changeEmailApprovalEmail({ newEmail: "new@example.invalid", url, resetUrl: "https://physcratic.com/forgot-password" }),
    changeEmailVerifyEmail({ newEmail: "new@example.invalid", url }),
  ]) {
    const prose = `${mail.subject}\n${mail.text.replaceAll(url, "")}`;
    assert.doesNotMatch(prose, /[–—;]/);
  }
});

test("approval email names the new address and offers a password reset", () => {
  const mail = changeEmailApprovalEmail({ newEmail: "new@example.invalid", url, resetUrl: "https://physcratic.com/forgot-password" });
  assert.match(mail.text, /change the email on your Physcratic account to new@example\.invalid/);
  assert.match(mail.text, /Not you\? Reset your password\. https:\/\/physcratic\.com\/forgot-password/);
  assert.equal(passwordResetEmail({ url, setPassword: true }).subject, "Set your Physcratic password");
});

test("plain values and links are bounded and safe", () => {
  assert.equal(plainValue("a b\u0000c"), "a b c");
  assert.equal(plainValue("x".repeat(1000)).length, 320);
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "https://u:p@physcratic.com/x", "/relative"])
    assert.throws(() => safeLink(bad));
});

test("memory transport needs the flag and neither NODE_ENV nor VERCEL_ENV set to production", () => {
  assert.equal(memoryTransportAllowed({ AUTH_EMAIL_TRANSPORT: "memory", NODE_ENV: "test" }), true);
  assert.equal(memoryTransportAllowed({ AUTH_EMAIL_TRANSPORT: "memory", NODE_ENV: "test", VERCEL_ENV: "preview" }), true);
  assert.equal(memoryTransportAllowed({ AUTH_EMAIL_TRANSPORT: "memory", NODE_ENV: "production" }), false);
  assert.equal(memoryTransportAllowed({ AUTH_EMAIL_TRANSPORT: "memory", NODE_ENV: "test", VERCEL_ENV: "production" }), false);
  assert.equal(memoryTransportAllowed({ NODE_ENV: "test" }), false);
});

test("a refused memory transport fails closed and never reaches the provider", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json({}); });
  const message = { to: "a@example.invalid", subject: "s", text: "t", html: "h", idempotencyKey: "k" };
  await assert.rejects(deliverAuthEmail(message, { AUTH_EMAIL_TRANSPORT: "memory", VERCEL_ENV: "production", RESEND_API_KEY: "x", RESEND_EMAIL_DOMAIN: "example.invalid" }), /misconfigured/);
  await assert.rejects(deliverAuthEmail(message, { AUTH_EMAIL_TRANSPORT: "memory", NODE_ENV: "production", RESEND_API_KEY: "x", RESEND_EMAIL_DOMAIN: "example.invalid" }), /misconfigured/);
  assert.equal(calls, 0);
  const before = authEmailOutbox().length;
  await deliverAuthEmail(message, { AUTH_EMAIL_TRANSPORT: "memory", NODE_ENV: "test" });
  assert.equal(authEmailOutbox().length, before + 1);
  assert.equal(calls, 0);
});

test("budget keys are per normalised address and never hold the address", () => {
  assert.equal(normalizeAddress("  Ada@Example.INVALID "), "ada@example.invalid");
  assert.equal(budgetIdentifier("Ada@Example.invalid"), budgetIdentifier(" ada@example.invalid"));
  assert.notEqual(budgetIdentifier("ada@example.invalid"), budgetIdentifier("bob@example.invalid"));
  assert.match(budgetIdentifier("ada@example.invalid"), /^auth-email-budget:[0-9a-f]{64}$/);
});

test("change-email helpers read the request type and replace only the callback", () => {
  const claims = Buffer.from(JSON.stringify({ email: "a@x.invalid", updateTo: "b@x.invalid", requestType: "change-email-verification" })).toString("base64url");
  assert.equal(tokenRequestType(`h.${claims}.s`), "change-email-verification");
  assert.equal(tokenRequestType("not-a-jwt"), undefined);
  const next = new URL(withCallback("https://physcratic.com/api/auth/verify-email?token=t1&callbackURL=%2Fevil", "/email-change?step=done"));
  assert.equal(next.searchParams.get("token"), "t1");
  assert.equal(next.searchParams.get("callbackURL"), "/email-change?step=done");
});
