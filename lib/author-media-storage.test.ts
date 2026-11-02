import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { get, put, del, BlobAccessError } from "@vercel/blob";
import { authoringPreviewBlobCredentials, createPrivateAuthorStorage, privateAuthorStorage } from "./author-media-storage";

const storeId = "store_3XHvtHs2UM4ZFD5d";
const projectId = "prj_phm4794zl2QBICu5MMbLFxcHAfFq";
const branch = "codex/physcratic-authoring-completion";
const path = "author-media/problem/object/file.png";
const legacyToken = "vercel_blob_rw_d3dkNrocHUVOhMdE_disposable-test-token";
type Environment = Record<string, string | undefined>;
function preview(): Environment {
  return {
    VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_ID: projectId,
    VERCEL_GIT_COMMIT_REF: branch, AUTHORING_STAGING_BLOB_ENABLED: "1",
    AUTHORING_STAGING_BLOB_STORE_ID: storeId,
    BLOB_STORE_ID: "store_d3dkNrocHUVOhMdE", BLOB_READ_WRITE_TOKEN: legacyToken,
  };
}
function token(overrides: Record<string, unknown> = {}) {
  const claims = {
    iss: "https://oidc.vercel.com/neuterions-projects",
    aud: "https://vercel.com/neuterions-projects",
    sub: "owner:neuterions-projects:project:financial-dashboard:environment:preview",
    owner: "neuterions-projects", project: "financial-dashboard",
    project_id: projectId, environment: "preview",
    nbf: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 7200,
    ...overrides,
  };
  // Synthetic JWT: the transport is mocked, never presented to a live service.
  return `${Buffer.from('{"alg":"RS256"}').toString("base64url")}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.mock-signature`;
}
function fixture(env = preview(), oidc = async () => token()) {
  const calls: { op: string; path: string; options: object }[] = [];
  const sdk = {
    put: async (...args: Parameters<typeof put>) => {
      calls.push({ op: "put", path: args[0], options: args[2] });
      return { url: "https://private.invalid/secret", downloadUrl: "https://private.invalid/download" } as Awaited<ReturnType<typeof put>>;
    },
    get: async (...args: Parameters<typeof get>) => {
      calls.push({ op: "get", path: args[0], options: args[1] });
      return { statusCode: 200, stream: new ReadableStream(), blob: { url: "https://private.invalid/secret" } } as Awaited<ReturnType<typeof get>>;
    },
    del: async (...args: Parameters<typeof del>) => {
      calls.push({ op: "del", path: String(args[0]), options: args[1]! });
    },
  };
  return { calls, storage: createPrivateAuthorStorage({ env: () => env, oidc, sdk }) };
}

test("authoring Preview uses the explicit staging OIDC pair for put/get/del and returns no URLs", async () => {
  let lookups = 0;
  const oidcToken = token();
  const { storage, calls } = fixture(preview(), async () => { lookups++; return oidcToken; });
  for (const registryPath of [path, "solution-evidence/user/file.png"]) {
    assert.equal(await storage.put(registryPath, new Uint8Array([1]), "image/png"), undefined);
    const body = await storage.get(registryPath);
    assert.ok(body instanceof ReadableStream);
    await body.cancel();
    assert.equal(await storage.del(registryPath), undefined);
  }
  assert.equal(lookups, 6);
  assert.deepEqual(calls.map(c => c.op), ["put", "get", "del", "put", "get", "del"]);
  for (const call of calls) {
    assert.ok([path, "solution-evidence/user/file.png"].includes(call.path));
    assert.equal(Reflect.get(call.options, "storeId"), storeId);
    assert.equal(Reflect.get(call.options, "oidcToken"), oidcToken);
    assert.equal("token" in call.options, false);
    assert.ok(Reflect.get(call.options, "abortSignal") instanceof AbortSignal);
  }
  assert.equal(Reflect.get(calls[0].options, "access"), "private");
  assert.equal(Reflect.get(calls[0].options, "allowOverwrite"), false);
  assert.equal(Reflect.get(calls[0].options, "addRandomSuffix"), false);
  assert.equal(Reflect.get(calls[1].options, "access"), "private");
});

test("staging failures never call any Blob operation, even with the shared token present", async (t) => {
  const cases: [string, Environment, () => Promise<string>][] = [];
  for (const key of ["VERCEL", "VERCEL_ENV", "VERCEL_PROJECT_ID", "VERCEL_GIT_COMMIT_REF", "AUTHORING_STAGING_BLOB_ENABLED", "AUTHORING_STAGING_BLOB_STORE_ID"]) {
    const env = preview(); delete env[key];
    cases.push([`missing ${key}`, env, async () => token()]);
  }
  for (const [key, value] of Object.entries({
    VERCEL: "0", VERCEL_ENV: "development", VERCEL_PROJECT_ID: "prj_other",
    VERCEL_GIT_COMMIT_REF: "other-branch", AUTHORING_STAGING_BLOB_ENABLED: "0",
    AUTHORING_STAGING_BLOB_STORE_ID: "store_d3dkNrocHUVOhMdE",
  })) cases.push([`mismatched ${key}`, { ...preview(), [key]: value }, async () => token()]);
  cases.push(["staging marker on Production", { ...preview(), VERCEL_ENV: "production" }, async () => token()]);
  for (const bad of ["", "   ", "not-a-jwt", legacyToken, token({ exp: 1 }), token({ nbf: Date.now() / 1000 + 3600 })]) {
    cases.push(["missing, malformed or expired OIDC", preview(), async () => bad]);
  }
  for (const key of ["project_id", "environment", "owner", "project", "aud", "iss", "sub"]) {
    cases.push([`mismatched OIDC ${key}`, preview(), async () => token({ [key]: "wrong" })]);
    cases.push([`missing OIDC ${key}`, preview(), async () => token({ [key]: undefined })]);
  }
  cases.push(["OIDC helper throws", preview(), async () => { throw new Error(`private credential ${legacyToken}`); }]);
  for (const [name, env, oidc] of cases) await t.test(name, async () => {
    const { storage, calls } = fixture(env, oidc);
    for (const run of [() => storage.put(path, new Uint8Array(), "image/png"), () => storage.get(path), () => storage.del(path)]) {
      await assert.rejects(run, { name: "Error", message: "Authoring staging storage is unavailable." });
    }
    assert.equal(calls.length, 0);
  });
});

test("branch identity alone requires staging opt-in; Preview-wide store connection alone does not opt other branches in", async () => {
  const env = preview(); delete env.AUTHORING_STAGING_BLOB_ENABLED;
  const authoring = fixture(env);
  await assert.rejects(() => authoring.storage.get(path));
  env.VERCEL_GIT_COMMIT_REF = "codex/other";
  await authoring.storage.del(path);
  assert.equal("storeId" in authoring.calls[0].options, false);
  delete env.VERCEL_GIT_COMMIT_REF;
  await assert.rejects(() => authoring.storage.get(path));
});

test("Production, other Previews and local development preserve SDK defaults", async () => {
  for (const env of [
    { ...preview(), VERCEL_ENV: "production", AUTHORING_STAGING_BLOB_ENABLED: undefined },
    { ...preview(), VERCEL_GIT_COMMIT_REF: "codex/other", AUTHORING_STAGING_BLOB_ENABLED: undefined },
    {},
  ]) {
    const { storage, calls } = fixture(env, async () => { throw new Error("OIDC should not be requested"); });
    await storage.put(path, new Uint8Array(), "image/png");
    const body = await storage.get(path); if (body instanceof ReadableStream) await body.cancel();
    await storage.del(path);
    for (const { options } of calls) {
      assert.equal("storeId" in options, false);
      assert.equal("oidcToken" in options, false);
      assert.equal("token" in options, false);
    }
  }
});

test("staging rejects full URLs and non-registry paths for every operation", async () => {
  const { storage, calls } = fixture();
  for (const unsafe of ["https://d3dkNrocHUVOhMdE.private.blob.vercel-storage.com/file", "//shared/file", "author-media/../file", "author-media/file?query", "author-media/%2e%2e/file"]) {
    await assert.rejects(() => storage.put(unsafe, new Uint8Array(), "image/png"));
    await assert.rejects(() => storage.get(unsafe));
    await assert.rejects(() => storage.del(unsafe));
  }
  assert.equal(calls.length, 0);
});

test("installed Blob SDK sends staging credentials on the wire and never retries with shared credentials", async (t) => {
  // Resolve the SDK's own Undici so its imported fetch uses this dispatcher.
  const sdkRequire = createRequire(createRequire(import.meta.url).resolve("@vercel/blob"));
  const { MockAgent, getGlobalDispatcher, setGlobalDispatcher } = sdkRequire("undici");
  const agent = new MockAgent();
  agent.disableNetConnect();
  const previous = getGlobalDispatcher();
  setGlobalDispatcher(agent);
  const variables = { ...preview(), VERCEL_OIDC_TOKEN: "wrong-environment-token" };
  const saved = new Map(Object.keys(variables).map(key => [key, process.env[key]]));
  Object.assign(process.env, variables);
  const oidcToken = token();
  const contextKey = Symbol.for("@vercel/request-context");
  const previousContext = Object.getOwnPropertyDescriptor(globalThis, contextKey);
  // Mock Vercel's Function request context, exercising the installed OIDC helper.
  Reflect.set(globalThis, contextKey, { get: () => ({ headers: { "x-vercel-oidc-token": oidcToken } }) });
  t.after(async () => {
    setGlobalDispatcher(previous); await agent.close();
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (previousContext) Object.defineProperty(globalThis, contextKey, previousContext);
    else Reflect.deleteProperty(globalThis, contextKey);
  });
  const requests: { headers: Record<string, string>; body?: string }[] = [];
  const api = agent.get("https://vercel.com");
  const origin = agent.get("https://3xhvths2um4zfd5d.private.blob.vercel-storage.com");
  const blob = { url: `https://3XHvtHs2UM4ZFD5d.private.blob.vercel-storage.com/${path}`, pathname: path, contentType: "image/png", contentDisposition: "inline" };
  api.intercept({ method: "PUT", path: `/api/blob/?pathname=${encodeURIComponent(path)}` }).reply(200, (opts: typeof requests[number]) => { requests.push(opts); return blob; });
  origin.intercept({ method: "GET", path: `/${path}` }).reply(200, (opts: typeof requests[number]) => { requests.push(opts); return "private bytes"; });
  api.intercept({ method: "POST", path: "/api/blob/delete" }).reply(200, (opts: typeof requests[number]) => { requests.push(opts); return {}; });
  const storage = privateAuthorStorage;
  assert.equal(await storage.put(path, new Uint8Array([1]), "image/png"), undefined);
  assert.equal(await new Response(await storage.get(path)).text(), "private bytes");
  await storage.del(path);
  assert.equal(requests.length, 3);
  for (const request of requests) {
    assert.equal(request.headers.authorization, `Bearer ${oidcToken}`);
    assert.equal(Object.values(request.headers).includes(legacyToken), false);
  }
  for (const i of [0, 2]) assert.equal(requests[i].headers["x-vercel-blob-store-id"], "3XHvtHs2UM4ZFD5d");
  assert.deepEqual(JSON.parse(requests[2].body!), { urls: [path] });
  // A denied valid-looking token must surface an error with no fallback request.
  api.intercept({ method: "POST", path: "/api/blob/delete" }).reply(403, (opts: typeof requests[number]) => {
    requests.push(opts);
    assert.equal(opts.headers.authorization, `Bearer ${oidcToken}`);
    assert.equal(opts.headers["x-vercel-blob-store-id"], "3XHvtHs2UM4ZFD5d");
    return { error: { code: "forbidden" } };
  });
  await assert.rejects(() => storage.del(path), BlobAccessError);
  assert.equal(requests.length, 4);
  const evidenceCredentials = await authoringPreviewBlobCredentials("solution-evidence/user/file.png");
  assert.deepEqual(evidenceCredentials, { storeId, oidcToken });
  agent.assertNoPendingInterceptors();
});
