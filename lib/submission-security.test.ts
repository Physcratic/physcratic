import assert from "node:assert/strict";
import test from "node:test";
import { detectSubmissionMedia, evidenceMatches, safeReturnPath, validUploadSize } from "./submission-security";
import { submissionLimits } from "./solution-grading";

const bytes = (text: string) => new TextEncoder().encode(text);
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
  for (const unsafe of ["//evil.example", "https://evil.example", "/dashboard\\evil.example", "/dashboard-other", "/dashboard\nother", undefined]) assert.equal(safeReturnPath(unsafe), "/dashboard/submissions");
});
