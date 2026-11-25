// Test the pinned client against an in-process loopback stub, without provider credentials.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BlobNotFoundError, del, put } from "@vercel/blob";

const require = createRequire(import.meta.url);
const installed = join(dirname(require.resolve("@vercel/blob")), "..", "package.json");
assert.equal(JSON.parse(readFileSync(installed, "utf8")).version, "2.8.2");
const token = "vercel_blob_rw_synthetic_only";
const path = "synthetic/upload";
const seen = [];
let behavior;
let notifyAbort;
let lateCommit = false;

const stub = createServer(async (request, response) => {
  const method = request.method;
  const type = request.url.split("?")[0];
  seen.push({ method, type, attempt: request.headers["x-api-blob-request-attempt"], id: request.headers["x-api-blob-request-id"] });
  for await (const _chunk of request) { /* drain request bytes */ }
  if (behavior === "abort") {
    notifyAbort();
    // Model a write already accepted upstream when the connection is cancelled.
    response.on("close", () => { lateCommit = true; });
    return;
  }
  response.setHeader("Content-Type", "application/json");
  if (behavior === "not-found") {
    response.statusCode = 404;
    response.end(JSON.stringify({ error: { code: "not_found", message: "synthetic" } }));
  } else if (behavior === "retry-once" && seen.length === 1) {
    response.statusCode = 503;
    response.end(JSON.stringify({ error: { code: "service_unavailable", message: "synthetic" } }));
  } else {
    response.end(JSON.stringify(method === "PUT" ? { pathname: path, etag: "synthetic" } : {}));
  }
});

await new Promise(resolve => stub.listen(0, "127.0.0.1", resolve));
try {
  process.env.VERCEL_BLOB_API_URL = `http://127.0.0.1:${stub.address().port}`;
  const upload = (abortSignal) => put(path, "fixture", { token, access: "private", allowOverwrite: false, abortSignal });
  behavior = "retry-once";
  delete process.env.VERCEL_BLOB_RETRIES;
  assert.equal((await upload()).pathname, path);
  assert.deepEqual(seen.map(item => [item.method, item.attempt]), [["PUT", "0"], ["PUT", "1"]]);
  assert.equal(seen[0].id, seen[1].id);

  seen.length = 0;
  process.env.VERCEL_BLOB_RETRIES = "0";
  await assert.rejects(upload());
  assert.deepEqual(seen.map(item => [item.method, item.attempt]), [["PUT", "0"]]);

  seen.length = 0;
  behavior = "abort";
  const controller = new AbortController();
  const accepted = new Promise(resolve => { notifyAbort = resolve; });
  const cancelled = assert.rejects(upload(controller.signal));
  await accepted;
  controller.abort();
  await cancelled;
  // The stub, not the SDK, controls whether an accepted request commits.
  for (let attempt = 0; attempt < 50 && !lateCommit; attempt++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(lateCommit, true);
  assert.equal(seen.length, 1);

  seen.length = 0;
  behavior = "not-found";
  await assert.rejects(del(path, { token }), BlobNotFoundError);
  assert.deepEqual(seen.map(item => [item.method, item.type]), [["POST", "/delete"]]);
  behavior = "success";
  await del(path, { token });
  await del(path, { token });
  assert.equal(seen.length, 3);
  console.log("PASS pinned SDK transport, retry counts, ambiguous abort model and DELETE response handling");
} finally {
  stub.closeAllConnections();
  await new Promise(resolve => stub.close(resolve));
}
