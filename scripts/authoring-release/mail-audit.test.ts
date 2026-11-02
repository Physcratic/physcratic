import assert from "node:assert/strict";
import test from "node:test";
import { sendVerificationEmail } from "../../lib/verification-email";

test("staging verification mail refuses unauthorized recipients before HTTP; Production remains unchanged", async t => {
  const stage = { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_ID: "prj_phm4794zl2QBICu5MMbLFxcHAfFq", VERCEL_GIT_COMMIT_REF: "codex/physcratic-authoring-completion", AUTHORING_STAGING_BLOB_ENABLED: "1", BETTER_AUTH_URL: "https://financial-dashboard-git-codex-physcr-54d12a-neuterions-projects.vercel.app" };
  const keys = ["RESEND_API_KEY", "RESEND_EMAIL_DOMAIN", "STAGING_VERIFICATION_EMAIL_ALLOWLIST", "BETTER_AUTH_TRUSTED_ORIGINS", ...Object.keys(stage)];
  const saved = new Map(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, stage, { RESEND_API_KEY: "re_disposable_audit_only", RESEND_EMAIL_DOMAIN: "staging.example.invalid", STAGING_VERIFICATION_EMAIL_ALLOWLIST: "allowed@example.invalid" });
  delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  let requests = 0;
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    requests++; assert.ok(["allowed@example.invalid", "outside-allowlist@example.invalid"].includes(JSON.parse(String(init?.body)).to[0]));
    return Response.json({ id: "mock-only-no-email-sent" });
  });
  try {
    const input = { email: "outside-allowlist@example.invalid", url: `${stage.BETTER_AUTH_URL}/api/auth/verify-email`, token: "disposable" };
    await assert.rejects(sendVerificationEmail(input), /email is unavailable/);
    for (const value of ["", " ", "*", "invalid"]) {
      process.env.STAGING_VERIFICATION_EMAIL_ALLOWLIST = value;
      await assert.rejects(sendVerificationEmail({ ...input, email: "allowed@example.invalid" }));
    }
    delete process.env.STAGING_VERIFICATION_EMAIL_ALLOWLIST;
    await assert.rejects(sendVerificationEmail(input));
    assert.equal(requests, 0);
    process.env.STAGING_VERIFICATION_EMAIL_ALLOWLIST = "allowed@example.invalid";
    await sendVerificationEmail({ ...input, email: "allowed@example.invalid" });
    assert.equal(requests, 1);
    process.env.VERCEL_ENV = "production";
    delete process.env.AUTHORING_STAGING_BLOB_ENABLED;
    delete process.env.STAGING_VERIFICATION_EMAIL_ALLOWLIST;
    await sendVerificationEmail({ ...input, url: "https://production.invalid/verify" });
    assert.equal(requests, 2);
  } finally {
    for (const [key, value] of saved) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
