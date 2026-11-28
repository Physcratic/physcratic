import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import type { del, get } from "@vercel/blob";
import { probe } from "../scripts/account-deletion-0026/provider-probe.mjs";

const bytes = Buffer.from("synthetic fixture");
const pathname = "author-media/synthetic-problem/abc/synthetic.png";
const storeId = "store_Fixture";
const input = { mode: "repeat", pathname, storeId, sha256: createHash("sha256").update(bytes).digest("hex") };
const env = { NODE_ENV: "test" as const, PHASE5B_BLOB_TOKEN: "vercel_blob_rw_Fixture_synthetic", VERCEL_BLOB_RETRIES: "0" };

function fixture({ body = bytes, remains = false, badMetadata = false, rejectRepeat = false } = {}) {
  const calls: string[] = [];
  let present = true;
  const sdk: { get: typeof get; del: typeof del } = {
    async get(path, options) {
      assert.equal(path, pathname);
      assert.equal(options.access, "private");
      assert.equal(options.useCache, false);
      assert.ok(options.abortSignal instanceof AbortSignal);
      calls.push("get");
      if (!present) return null;
      return {
        statusCode: 200,
        headers: new Headers(),
        blob: {
          pathname: badMetadata ? "different-path" : pathname,
          url: "https://Fixture.private.blob.vercel-storage.com/" + pathname,
          etag: '"fixture-etag"',
          downloadUrl: "",
          size: body.byteLength,
          contentType: "image/png",
          contentDisposition: "",
          cacheControl: "",
          uploadedAt: new Date(0),
        },
        stream: new ReadableStream({ start(controller) { controller.enqueue(body); controller.close(); } }),
      };
    },
    async del(path, options) {
      assert.ok(options);
      assert.equal(path, pathname);
      assert.ok(options.abortSignal instanceof AbortSignal);
      if (present) assert.equal(options.ifMatch, '"fixture-etag"');
      else assert.equal(options.ifMatch, undefined);
      calls.push("del");
      if (rejectRepeat && !present) throw new Error("Provider refused the repeat");
      present = remains;
    },
  };
  return { calls, sdk };
}

test("repeat deletion checks confirmed presence and origin absence before and after the repeat", async () => {
  const { calls, sdk } = fixture();
  assert.equal(await probe(input, { sdk, env }), "REPEAT_DELETE_ORIGIN_ABSENT");
  assert.deepEqual(calls, ["get", "del", "get", "del", "get"]);
});

test("held deletion leaves terminal disposition pending and inspect performs no deletes", async () => {
  const { calls, sdk } = fixture();
  assert.equal(await probe({ ...input, mode: "inspect" }, { sdk, env }), "ORIGIN_PRESENT_MATCHED");
  assert.equal(await probe({ ...input, mode: "held" }, { sdk, env }), "HELD_ORIGIN_ABSENT_KEEP_PENDING");
  assert.equal(await probe({ ...input, mode: "inspect" }, { sdk, env }), "ORIGIN_ABSENT_ONLY");
  assert.deepEqual(calls, ["get", "get", "del", "get", "get"]);
  await assert.rejects(probe({ ...input, mode: "held" }, { sdk, env }), /present fixture/);
});

test("rejects mismatched credentials, ambiguous paths, Production context and API overrides before I/O", async () => {
  const { calls, sdk } = fixture();
  for (const overrides of [
    { PHASE5B_BLOB_TOKEN: "vercel_blob_rw_Other_synthetic" },
    { VERCEL_ENV: "production" },
    { VERCEL_TARGET_ENV: "production" },
    { PHASE5B_BLOB_OIDC_TOKEN: "ambiguous" },
    { VERCEL_BLOB_API_URL: "https://wrong.invalid" },
    { VERCEL_BLOB_RETRIES: "1" },
    { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
  ]) await assert.rejects(probe(input, { sdk, env: { ...env, ...overrides } }));
  for (const pathname of ["author-media/x.png\n", "/author-media/x", "https://wrong.invalid/file", "author-media/../x", "solution-evidence/u/a%2fb"]) {
    await assert.rejects(probe({ ...input, pathname }, { sdk, env }));
  }
  assert.deepEqual(calls, []);
});

test("refuses to delete different content or metadata and stops on observed reappearance", async () => {
  const other = fixture({ body: Buffer.from("unrelated") });
  await assert.rejects(probe(input, { sdk: other.sdk, env }), /content/);
  assert.deepEqual(other.calls, ["get"]);
  const wrong = fixture({ badMetadata: true });
  await assert.rejects(probe(input, { sdk: wrong.sdk, env }), /metadata/);
  assert.deepEqual(wrong.calls, ["get"]);
  const visible = fixture({ remains: true });
  await assert.rejects(probe(input, { sdk: visible.sdk, env }), /still present/);
  assert.deepEqual(visible.calls, ["get", "del", "get"]);
});

test("passes only the explicit preview OIDC pair and rejects Production OIDC", async () => {
  const { calls, sdk } = fixture();
  const makeToken = (environment: string) => "header." +
    Buffer.from(JSON.stringify({ environment, exp: Date.now() / 1000 + 60 })).toString("base64url") + ".signature";
  const oidcToken = makeToken("preview");
  const probeEnv = { ...env, PHASE5B_BLOB_TOKEN: undefined, PHASE5B_BLOB_OIDC_TOKEN: oidcToken };
  await assert.rejects(probe(input, { sdk, env: { ...probeEnv, PHASE5B_BLOB_OIDC_TOKEN: makeToken("production") } }));
  assert.deepEqual(calls, []);
  const read: typeof get = (path, options) => {
    assert.equal(options.token, undefined);
    assert.equal(options.storeId, storeId);
    assert.equal(options.oidcToken, oidcToken);
    return sdk.get(path, options);
  };
  assert.equal(await probe({ ...input, mode: "inspect" }, { sdk: { ...sdk, get: read }, env: probeEnv }), "ORIGIN_PRESENT_MATCHED");
});

test("reports a rejected repeat even when the first delete removed the fixture", async () => {
  const { calls, sdk } = fixture({ rejectRepeat: true });
  await assert.rejects(probe(input, { sdk, env }), /Provider refused the repeat/);
  assert.deepEqual(calls, ["get", "del", "get", "del"]);
});
