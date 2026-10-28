import assert from "node:assert/strict";
import test from "node:test";
import { readSubmissionJson } from "./submission-request";

const request = (body: string) => new Request("https://example.com/api/submissions", { method: "POST", body });
test("JSON submission parsing accepts normal Unicode working", async () => {
  assert.deepEqual(await readSubmissionJson(request('{"working":"α = β"}')), { working: "α = β" });
});
test("JSON size is enforced by actual bytes rather than caller headers", async () => {
  await assert.rejects(readSubmissionJson(request(JSON.stringify({ working: "α".repeat(200) })), 250), RangeError);
  await assert.rejects(readSubmissionJson(request("x".repeat(100001))), RangeError);
});
test("malformed and empty submission JSON cannot be saved", async () => {
  await assert.rejects(readSubmissionJson(request("{")), SyntaxError);
  await assert.rejects(readSubmissionJson(new Request("https://example.com")), SyntaxError);
});
