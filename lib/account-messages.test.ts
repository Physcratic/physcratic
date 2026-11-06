import assert from "node:assert/strict";
import test from "node:test";
import { accountErrorMessage, emailChangeOutcome } from "./account-messages";

test("account errors say what to do next", () => {
  assert.equal(accountErrorMessage("change-password", { code: "INVALID_PASSWORD", status: 400 }), "That current password didn’t match. Try again or reset it.");
  assert.equal(accountErrorMessage("change-email", { code: "INVALID_PASSWORD", status: 400 }), "That password didn’t match. Try again or reset it.");
  assert.equal(accountErrorMessage("change-email", { code: "EMAIL_BUDGET", status: 429 }), "That’s a lot of emails for one hour. Try again later.");
  assert.equal(accountErrorMessage("request-reset", { status: 429 }), "Too many tries. Wait a minute, then try again.");
  assert.equal(accountErrorMessage("change-email", { code: "PASSWORD_NOT_SET", status: 400 }), "Set a password first. Then you can change your email.");
  assert.equal(accountErrorMessage("reset-password", { code: "INVALID_TOKEN", status: 400 }), "That link has expired or was already used. Ask for a new one.");
  assert.equal(accountErrorMessage("change-email", { status: 400, message: "Email is the same" }), "That’s already your email.");
  assert.equal(accountErrorMessage("change-password", { status: 503 }), "Something went wrong on our side. Try again in a minute.");
  assert.equal(accountErrorMessage("change-password", undefined), "Something went wrong on our side. Try again in a minute.");
});

test("every account message follows the copy rules", () => {
  const codes = ["EMAIL_BUDGET", "INVALID_PASSWORD", "CURRENT_PASSWORD_REQUIRED", "PASSWORD_NOT_SET", "PASSWORD_TOO_SHORT", "PASSWORD_TOO_LONG", "INVALID_TOKEN", "UNAUTHORIZED", "INVALID_EMAIL", "OTHER"];
  for (const action of ["change-email", "change-password", "request-reset", "reset-password"] as const)
    for (const code of codes) for (const status of [400, 401, 429, 503])
      assert.doesNotMatch(accountErrorMessage(action, { code, status }), /[–—;]/);
  for (const [step, error] of [["approved", undefined], ["done", undefined], [undefined, "TOKEN_EXPIRED"], [undefined, undefined]] as const) {
    const outcome = emailChangeOutcome(step, error);
    assert.doesNotMatch(`${outcome.title} ${outcome.body}`, /[–—;]/);
  }
});

test("email change landing reads the step and any error", () => {
  assert.equal(emailChangeOutcome("approved", undefined).title, "Approved");
  assert.equal(emailChangeOutcome("done", undefined).ok, true);
  assert.equal(emailChangeOutcome("done", "INVALID_TOKEN").ok, false, "an error wins over the step");
  assert.equal(emailChangeOutcome("weird", undefined).ok, false);
});
