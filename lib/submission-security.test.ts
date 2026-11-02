import assert from "node:assert/strict";
import test from "node:test";
import { detectSubmissionMedia, evidenceMatches, isAllowedSubmissionOrigin, safeReturnPath, validUploadSize } from "./submission-security";
import { submissionLimits } from "./solution-grading";

const bytes = (text: string) => new TextEncoder().encode(text);
test("write origins must match deployment configuration, never request Host", () => {
  const allowed = ["https://app.example/", undefined, "not-a-url"];
  const input = (origin?: string, host = "https://app.example", site?: string) => new Request(host, { headers: { ...(origin ? { origin } : {}), ...(site ? { "sec-fetch-site": site } : {}) } });
  assert.equal(isAllowedSubmissionOrigin(input("https://app.example"), allowed), true);
  assert.equal(isAllowedSubmissionOrigin(input("https://app.example", "https://internal.example", "same-origin"), allowed), true);
  for (const origin of [undefined, "null", "https://evil.example", "https://app.example.evil.example", "http://app.example", "https://app.example/"]) assert.equal(isAllowedSubmissionOrigin(input(origin), allowed), false);
  assert.equal(isAllowedSubmissionOrigin(input("https://evil.example", "https://evil.example"), allowed), false);
  assert.equal(isAllowedSubmissionOrigin(input("https://app.example", "https://app.example", "cross-site"), allowed), false);
  assert.equal(isAllowedSubmissionOrigin(input("https://app.example"), []), false);
});
test("uploads require supported binary signatures, not names or browser MIME alone", () => {
  assert.equal(detectSubmissionMedia(Uint8Array.from([255, 216, 255, 0])), "image/jpeg");
  assert.equal(detectSubmissionMedia(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
  assert.equal(detectSubmissionMedia(bytes("RIFF1234WEBP")), "image/webp");
  assert.equal(detectSubmissionMedia(bytes("%PDF-1.7")), "application/pdf");
  assert.equal(detectSubmissionMedia(bytes("<svg onload='alert(1)'/>")), null);
  assert.equal(detectSubmissionMedia(bytes("renamed-file.jpg")), null);
  assert.equal(detectSubmissionMedia(new Uint8Array()), null);
});
test("upload limits reject empty, fractional and oversized evidence", () => {
  assert.equal(validUploadSize(0), false);
  assert.equal(validUploadSize(-1), false);
  assert.equal(validUploadSize(1.5), false);
  assert.equal(validUploadSize(submissionLimits.maxFileBytes), true);
  assert.equal(validUploadSize(submissionLimits.maxFileBytes + 1), false);
});
test("server registry metadata must match every submitted evidence field", () => {
  const file = { id: "11111111-1111-4111-8111-111111111111", mediaType: "image/png" as const, bytes: 1000, sha256: "a".repeat(64) };
  assert.equal(evidenceMatches(file, file), true);
  for (const modified of [{ ...file, id: "other" }, { ...file, bytes: 999 }, { ...file, sha256: "b".repeat(64) }, { ...file, mediaType: "text/html" }]) assert.equal(evidenceMatches(file, modified), false);
});
test("authentication return destinations cannot redirect off-site", () => {
  assert.equal(safeReturnPath("/dashboard?view=problems"), "/dashboard?view=problems");
  assert.equal(safeReturnPath("/dashboard/submissions"), "/dashboard/submissions");
  assert.equal(safeReturnPath("/settings"), "/settings");
  assert.equal(safeReturnPath("/settings?onboarding=1"), "/settings?onboarding=1");
  for (const unsafe of ["/settings/evil", "/settings-other", "/settings\\evil.example", "/settings\nother"])
    assert.equal(safeReturnPath(unsafe), "/dashboard/submissions");
  for (const unsafe of ["//evil.example", "https://evil.example", "/dashboard\\evil.example", "/dashboard-other", "/dashboard\nother", undefined]) assert.equal(safeReturnPath(unsafe), "/dashboard/submissions");
});
