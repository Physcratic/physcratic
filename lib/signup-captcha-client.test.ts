import test from "node:test";
import assert from "node:assert/strict";
import { getSignupCaptchaToken } from "./signup-captcha-client";

test("submit tokens are fresh, use signup action, and allow retry after execution failure", async (t) => {
  const oldKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const oldWindow = globalThis.window;
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "public-test-key";
  let executions = 0;
  let unavailable = false;
  globalThis.window = { grecaptcha: {
    ready: (done: () => void) => done(),
    execute: async (key: string, options: { action: string }) => {
      assert.equal(key, "public-test-key");
      assert.equal(options.action, "signup");
      if (unavailable) throw new Error("provider failed");
      return `fresh-${++executions}`;
    },
  } } as unknown as Window & typeof globalThis;
  t.after(() => {
    globalThis.window = oldWindow;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    else process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = oldKey;
  });
  assert.equal(await getSignupCaptchaToken(), "fresh-1");
  assert.equal(await getSignupCaptchaToken(), "fresh-2");
  unavailable = true;
  await assert.rejects(getSignupCaptchaToken());
  unavailable = false;
  assert.equal(await getSignupCaptchaToken(), "fresh-3");
  delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  await assert.rejects(getSignupCaptchaToken(), /unavailable/);
});
