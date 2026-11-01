export type HealthPayload = { ok: true; version: string; time: string };

/**
 * Body of GET /api/health. Pure: it reads only the two arguments, never a
 * database, and exposes no environment names or secrets. The version is the
 * short commit SHA of the deployment, or "local" outside Vercel.
 */
export function healthPayload(
  env: Record<string, string | undefined>,
  now: Date,
): HealthPayload {
  const sha = env.VERCEL_GIT_COMMIT_SHA?.trim();
  return {
    ok: true,
    version: sha ? sha.slice(0, 7) : "local",
    time: now.toISOString(),
  };
}
