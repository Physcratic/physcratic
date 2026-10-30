import test from "node:test";
import assert from "node:assert/strict";
import { getTermsAcceptance, TERMS_VERSION } from "./terms";

test("signup requires explicit acceptance of the current version", () => {
  for (const body of [undefined, null, {}, { termsVersion: TERMS_VERSION }, { termsAccepted: false, termsVersion: TERMS_VERSION }, { termsAccepted: "true", termsVersion: TERMS_VERSION }, { termsAccepted: true }, { termsAccepted: true, termsVersion: "older-version" }]) {
    assert.throws(() => getTermsAcceptance(body), /Accept the current Terms/);
  }
});

test("acceptance records use the server timestamp rather than client supplied audit fields", () => {
  const serverTime = new Date("2026-10-30T12:00:00Z");
  assert.deepEqual(getTermsAcceptance({ termsAccepted: true, termsVersion: TERMS_VERSION, termsAcceptedVersion: "forged", termsAcceptedAt: "2000-01-01T00:00:00Z" }, serverTime), { termsAcceptedVersion: TERMS_VERSION, termsAcceptedAt: serverTime });
});
