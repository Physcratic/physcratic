import "server-only";
import { get, put, del } from "@vercel/blob";
import { getVercelOidcToken } from "@vercel/oidc";
import type { AuthorStorage } from "./author-media-api";

const authoringBranch = "codex/physcratic-authoring-completion";
const stagingStore = "store_3XHvtHs2UM4ZFD5d";
const projectId = "prj_phm4794zl2QBICu5MMbLFxcHAfFq";
const team = "neuterions-projects";
const unavailable = () => new Error("Authoring staging storage is unavailable.");

// Resolve per operation, inside the Function request context. Never cache OIDC.
async function credentials(
  env: Record<string, string | undefined>,
  oidc: () => Promise<string>,
  path: string,
): Promise<{ storeId?: string; oidcToken?: string }> {
  const branch = env.VERCEL_GIT_COMMIT_REF;
  const optIn = env.AUTHORING_STAGING_BLOB_ENABLED;
  // Ordinary Production keeps SDK defaults. An explicit staging marker must
  // never bypass the guard, even if the deployment environment is misconfigured.
  if (env.VERCEL_ENV === "production" && optIn === undefined) return {};
  // Missing deployment identity must not turn an authoring Preview into legacy.
  if (env.VERCEL === "1" && (!env.VERCEL_ENV || !branch)) throw unavailable();
  if (branch !== authoringBranch && optIn === undefined) return {};
  if (
    env.VERCEL !== "1" ||
    env.VERCEL_ENV !== "preview" ||
    branch !== authoringBranch ||
    env.VERCEL_PROJECT_ID !== projectId ||
    optIn !== "1" ||
    env.AUTHORING_STAGING_BLOB_STORE_ID !== stagingStore ||
    // The SDK accepts full URLs for get/del; staging must use registry paths.
    !/^(author-media|solution-evidence)\/[A-Za-z0-9/_.-]+$/.test(path) ||
    path.includes("..")
  )
    throw unavailable();

  try {
    const oidcToken = (await oidc()).trim();
    const segments = oidcToken.split(".");
    if (segments.length !== 3 || !segments[2]) throw unavailable();
    const claims = JSON.parse(Buffer.from(segments[1], "base64url").toString());
    const now = Date.now() / 1000;
    // Consistency checks only. Blob verifies the JWT signature and store access.
    if (
      claims.project_id !== projectId ||
      claims.environment !== "preview" ||
      claims.owner !== team ||
      claims.project !== "financial-dashboard" ||
      claims.aud !== `https://vercel.com/${team}` ||
      !["https://oidc.vercel.com", `https://oidc.vercel.com/${team}`].includes(claims.iss) ||
      claims.sub !== `owner:${team}:project:financial-dashboard:environment:preview` ||
      typeof claims.exp !== "number" ||
      claims.exp <= now ||
      typeof claims.nbf !== "number" ||
      claims.nbf > now
    )
      throw unavailable();
    // In blob 2.8.2 this nonempty pair selects OIDC before legacy env tokens.
    // Do not pass `token`, catch SDK failures with a retry, or spread env options.
    return { storeId: stagingStore, oidcToken };
  } catch {
    // Never propagate helper errors that could contain credentials or paths.
    throw unavailable();
  }
}

// The legacy solution-evidence routes also run in this Preview. Keep their
// existing interfaces/options while preventing a separate shared-store path.
export function authoringPreviewBlobCredentials(path: string) {
  return credentials(process.env, getVercelOidcToken, path);
}

// Never return SDK URLs, allow public storage, or overwrite an existing object.
export function createPrivateAuthorStorage({
  sdk = { get, put, del },
  env = (): Record<string, string | undefined> => process.env,
  oidc = getVercelOidcToken,
} = {}): AuthorStorage {
  return {
    async put(path, bytes, contentType) {
      const auth = await credentials(env(), oidc, path);
      await sdk.put(path, Buffer.from(bytes), {
        ...auth,
        access: "private",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: false,
        abortSignal: AbortSignal.timeout(10000),
      });
    },
    async get(path) {
      const auth = await credentials(env(), oidc, path);
      const result = await sdk.get(path, {
        ...auth,
        access: "private",
        abortSignal: AbortSignal.timeout(10000),
      });
      return result?.statusCode === 200 ? result.stream : null;
    },
    async del(path) {
      const auth = await credentials(env(), oidc, path);
      await sdk.del(path, { ...auth, abortSignal: AbortSignal.timeout(10000) });
    },
  };
}

export const privateAuthorStorage = createPrivateAuthorStorage();
