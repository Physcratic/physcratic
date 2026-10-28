import assert from "node:assert/strict";
import test from "node:test";
import { readRequestBytes, readSubmissionForm, readSubmissionJson, RequestBodyTimeoutError } from "./submission-request";

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
test("chunked bodies are limited even with a forged small content-length", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array(40)); },
    cancel() { cancelled = true; },
  });
  const input = new Request("https://example.com", { method: "POST", body: stream, headers: { "content-length": "1" }, duplex: "half" } as RequestInit);
  await assert.rejects(readRequestBytes(input, 80), RangeError);
  assert.equal(cancelled, true);
});
test("stalled request streams time out and are cancelled", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const input = new Request("https://example.com", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  await assert.rejects(readRequestBytes(input, 100, 10), RequestBodyTimeoutError);
  assert.equal(cancelled, true);
});
test("bounded multipart parsing accepts files without content-length", async () => {
  const form = new FormData();
  form.append("file", new Blob(["%PDF-1.7"], { type: "application/pdf" }), "solution.pdf");
  const input = new Request("https://example.com", { method: "POST", body: form });
  const parsed = await readSubmissionForm(input, 1000);
  assert.equal((parsed.get("file") as File).name, "solution.pdf");
  const encoded = new Request("https://example.com", { method: "POST", body: form });
  const oversized = new Request("https://example.com", { method: "POST", body: await encoded.arrayBuffer(), headers: { "content-length": "1", "content-type": encoded.headers.get("content-type")! } });
  await assert.rejects(readSubmissionForm(oversized, 10), RangeError);
});
test("invalid UTF-8 is rejected before JSON validation", async () => {
  const input = new Request("https://example.com", { method: "POST", body: new Uint8Array([0xff, 0xfe]) });
  await assert.rejects(readSubmissionJson(input), TypeError);
});
