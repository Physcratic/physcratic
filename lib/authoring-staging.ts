import "server-only";
import { z } from "zod";

type Environment = Record<string, string | undefined>;
export const authoringStagingOrigin = "https://financial-dashboard-git-codex-physcr-54d12a-neuterions-projects.vercel.app";
const branch = "codex/physcratic-authoring-completion";
const unavailable = () => new Error("Authoring staging configuration is unavailable.");

// This gate uses the same branch/marker boundary as the preserved Blob guard.
// Normal Production and unrelated branches retain their existing policies.
export function isAuthoringStaging(env: Environment = process.env) {
  const marker = env.AUTHORING_STAGING_BLOB_ENABLED;
  if (env.VERCEL_ENV === "production" && marker === undefined) return false;
  if (env.VERCEL === "1" && (!env.VERCEL_ENV || !env.VERCEL_GIT_COMMIT_REF)) throw unavailable();
  if (env.VERCEL_GIT_COMMIT_REF !== branch && marker === undefined) return false;
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "preview" || env.VERCEL_GIT_COMMIT_REF !== branch ||
      env.VERCEL_PROJECT_ID !== "prj_phm4794zl2QBICu5MMbLFxcHAfFq" || marker !== "1") throw unavailable();
  return true;
}

export function authoringStagingAuth(env: Environment = process.env) {
  if (!isAuthoringStaging(env)) return undefined;
  if (env.BETTER_AUTH_URL !== authoringStagingOrigin ||
      (env.BETTER_AUTH_TRUSTED_ORIGINS && env.BETTER_AUTH_TRUSTED_ORIGINS !== authoringStagingOrigin)) throw unavailable();
  return { baseURL: authoringStagingOrigin, trustedOrigins: [authoringStagingOrigin] };
}

export function verificationRecipient(email: string, url: string, env: Environment = process.env) {
  const auth = authoringStagingAuth(env);
  if (!auth) return email;
  const fail = () => new Error("Staging verification email is unavailable.");
  try {
    const raw = env.STAGING_VERIFICATION_EMAIL_ALLOWLIST?.trim();
    if (!raw || raw.length > 4096) throw fail();
    const allowed = raw.split(/[,\n]/).map(value => value.trim().toLowerCase());
    const recipient = email.trim().toLowerCase();
    if (allowed.length > 50 || allowed.some(value => !z.email().safeParse(value).success) ||
        !z.email().safeParse(recipient).success || !allowed.includes(recipient)) throw fail();
    const link = new URL(url);
    if (link.origin !== auth.baseURL || link.username || link.password || link.pathname !== "/api/auth/verify-email") throw fail();
    const callback = link.searchParams.get("callbackURL");
    if (callback !== null) {
      const destination = new URL(callback, auth.baseURL);
      if (destination.origin !== auth.baseURL || destination.username || destination.password) throw fail();
    }
    return recipient;
  } catch { throw fail(); }
}
