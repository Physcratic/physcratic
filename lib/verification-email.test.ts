import assert from "node:assert/strict";
import test from "node:test";
import { sendVerificationEmail } from "./verification-email";

for (const failure of ["invalid-key", "provider-unavailable"] as const) {
  test(`verification mail ${failure} rejects without exposing provider diagnostics or using another credential`, async (t) => {
    const values = { RESEND_API_KEY: "offline-test-key", RESEND_EMAIL_DOMAIN: "example.invalid",
      VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "offline-fixture",
      RESEND_PRODUCTION_API_KEY: "must-never-be-used" };
    const keys = [...Object.keys(values), "AUTHORING_STAGING_BLOB_ENABLED"];
    const saved = new Map(keys.map((key) => [key, process.env[key]]));
    Object.assign(process.env, values);
    delete process.env.AUTHORING_STAGING_BLOB_ENABLED;
    t.after(() => { for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    } });
    let requests = 0;
    t.mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      requests++;
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer offline-test-key");
      if (failure === "provider-unavailable") throw new Error("SENSITIVE_MOCK_PROVIDER_DIAGNOSTIC");
      return Response.json({ name: "validation_error", message: "SENSITIVE_MOCK_PROVIDER_DIAGNOSTIC" }, { status: 401 });
    });
    await assert.rejects(sendVerificationEmail({ email: "fixture@example.invalid",
      url: "https://offline.example.invalid/api/auth/verify-email", token: "synthetic-token" }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Resend delivery failed/);
      assert.doesNotMatch(error.message, /SENSITIVE_MOCK|offline-test-key|must-never-be-used/);
      return true;
    });
    assert.equal(requests, 1, "a failed delivery must not retry with a fallback credential");
  });
}
