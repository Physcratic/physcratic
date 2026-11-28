import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { del, get } from "@vercel/blob";

const pathPattern = /^(?:author-media|solution-evidence|community-profile-media|community-medal-proof)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/;
const fixtureByteLimit = 1024 * 1024;
const blockedOverrides = [
  "VERCEL_BLOB_API_URL", "NEXT_PUBLIC_VERCEL_BLOB_API_URL",
  "VERCEL_BLOB_API_VERSION_OVERRIDE", "NEXT_PUBLIC_VERCEL_BLOB_API_VERSION_OVERRIDE",
  "VERCEL_BLOB_PROXY_THROUGH_ALTERNATIVE_API", "NEXT_PUBLIC_VERCEL_BLOB_PROXY_THROUGH_ALTERNATIVE_API",
  "DEBUG", "NEXT_PUBLIC_DEBUG", "NODE_DEBUG", "NODE_DEBUG_NATIVE",
];

function binding(storeId, env) {
  if (typeof storeId !== "string" || storeId !== storeId.trim() || !/^store_[A-Za-z0-9]+$/.test(storeId) ||
      env.VERCEL_ENV === "production" ||
      env.VERCEL_TARGET_ENV === "production" || env.VERCEL_BLOB_RETRIES !== "0" ||
      env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ||
      blockedOverrides.some(key => env[key] !== undefined)) {
    throw new Error("An approved nonproduction binding with no overrides and zero SDK retries is required.");
  }
  const token = env.PHASE5B_BLOB_TOKEN;
  const oidcToken = env.PHASE5B_BLOB_OIDC_TOKEN;
  const fromToken = token?.match(/^vercel_blob_rw_([a-zA-Z0-9]+)_[A-Za-z0-9_-]+$/);
  if (!oidcToken && fromToken && fromToken[0] === token && storeId === `store_${fromToken[1]}`) return { token };
  if (!token && oidcToken && oidcToken === oidcToken.trim() && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(oidcToken)) {
    const claims = JSON.parse(Buffer.from(oidcToken.split(".")[1], "base64url").toString());
    // The provider verifies the signature and authorization. This check rejects Production context locally.
    if (["preview", "development"].includes(claims?.environment) && Number.isFinite(claims.exp) && claims.exp > Date.now() / 1000) {
      return { storeId, oidcToken };
    }
  }
  throw new Error("Use one credential for the independently approved nonproduction store.");
}

async function fixtureEtag(result, pathname, storeId, sha256) {
  const reader = result.stream?.getReader();
  try {
    const origin = `https://${storeId.slice(6)}.private.blob.vercel-storage.com`;
    if (result.statusCode !== 200 || !reader || result.blob?.url !== `${origin}/${pathname}` ||
        result.blob.pathname !== pathname || !result.blob.etag) {
      throw new Error("Unexpected private object metadata.");
    }
    const hash = createHash("sha256");
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > fixtureByteLimit) throw new Error("The synthetic fixture exceeds 1 MiB.");
      hash.update(value);
    }
    if (hash.digest("hex") !== sha256) throw new Error("The synthetic fixture content does not match.");
    return result.blob.etag;
  } finally {
    if (reader) await reader.cancel().catch(() => {});
  }
}

export async function probe({ mode, storeId, pathname, sha256 }, { sdk = { get, del }, env = process.env } = {}) {
  if (!["inspect", "repeat", "held"].includes(mode) || !pathname || pathname.length > 512 ||
      pathname !== pathname.trim() || !pathPattern.test(pathname) || sha256?.length !== 64 || !/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error("Supply a mode, exact registered pathname and synthetic fixture SHA-256.");
  }
  const auth = binding(storeId, env);
  const options = () => ({ ...auth, abortSignal: AbortSignal.timeout(10000) });
  const originRead = () => sdk.get(pathname, { ...options(), access: "private", useCache: false });
  const first = await originRead();
  if (first === null) {
    if (mode === "inspect") return "ORIGIN_ABSENT_ONLY";
    throw new Error("A confirmed-present fixture is required.");
  }
  const etag = await fixtureEtag(first, pathname, storeId, sha256);
  if (mode === "inspect") return "ORIGIN_PRESENT_MATCHED";
  await sdk.del(pathname, { ...options(), ifMatch: etag });
  const assertAbsent = async () => {
    const remaining = await originRead();
    if (remaining === null) return;
    await remaining.stream?.cancel().catch(() => {});
    throw new Error("The path is still present after deletion.");
  };
  await assertAbsent();
  if (mode === "held") return "HELD_ORIGIN_ABSENT_KEEP_PENDING";
  // Discard the first acknowledgement as an operator would after a lost response.
  // Repeat on the already absent synthetic pathname whose writers have stopped.
  await sdk.del(pathname, options());
  await assertAbsent();
  return "REPEAT_DELETE_ORIGIN_ABSENT";
}

async function run() {
  const [, , mode, storeId, pathname, sha256] = process.argv;
  try {
    if (process.argv.length !== 6) throw new Error("Unexpected arguments.");
    console.log(await probe({ mode, storeId, pathname, sha256 }));
  } catch {
    console.error("PROBE_FAILED. Stop and review the binding, fixture or provider result privately. Preserve pending obligations.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void run();
