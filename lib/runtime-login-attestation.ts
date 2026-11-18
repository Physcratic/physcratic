import "server-only";
import type { Pool, PoolClient } from "pg";

type Config = { runId: string; commitSha: string; notBefore: string; expiresAt: string };
type Record = {
  event: "runtime_login_attestation"; version: 1; runId: string;
  deploymentId: string; commitSha: string; observedAt: string;
  outcome: "verified" | "mismatch" | "unavailable";
};
const identityQuery = `SELECT session_user='physcratic_runtime_app' AS "loginMatches",
  current_user=session_user AS "unassumedRole",current_database()='neondb' AS "databaseMatches"`;

// Temporary owner-approved observation only. No endpoint, caller identity, secret,
// credential parsing, privileged permission, user query or auth behavior change.
export function attachRuntimeLoginAttestation(pool: Pool, {
  env = process.env, now = Date.now,
  inRequest = async () => false, schedule = (task: () => Promise<void>) => { void task().catch(() => {}); },
  emit = (record: Record) => console.info(JSON.stringify(record)),
}: { env?: { [key: string]: string | undefined }; now?: () => number; inRequest?: () => Promise<boolean>; schedule?: (task: () => Promise<void>) => void; emit?: (record: Record) => void } = {}) {
  const disabled = () => {};
  let config: Config;
  try {
    const raw = env.PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION;
    if (!raw || raw.length > 1024 || env.VERCEL_ENV !== "production" || env.NEXT_PHASE === "phase-production-build") return disabled;
    const value = JSON.parse(raw);
    if (!value || Array.isArray(value) || typeof value !== "object" ||
      Object.keys(value).sort().join() !== "commitSha,expiresAt,notBefore,runId" ||
      typeof value.runId !== "string" || typeof value.commitSha !== "string" ||
      !/^[a-f0-9]{32}$/.test(value.runId) || !/^[a-f0-9]{40}$/.test(value.commitSha) ||
      typeof value.notBefore !== "string" || typeof value.expiresAt !== "string") return disabled;
    config = value;
    const start = Date.parse(config.notBefore), end = Date.parse(config.expiresAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 15 * 60_000 ||
      now() >= end || env.VERCEL_GIT_COMMIT_SHA !== config.commitSha ||
      !/^dpl_[a-zA-Z0-9]{8,80}$/.test(env.VERCEL_DEPLOYMENT_ID ?? "")) return disabled;
  } catch { return disabled; }
  const deploymentId = env.VERCEL_DEPLOYMENT_ID!;
  const start = Date.parse(config.notBefore), end = Date.parse(config.expiresAt);
  let attempted = false, checking = false;
  const detach = () => { pool.removeListener("acquire", acquired); };
  const observe = async () => {
    if (now() < start || now() >= end) return;
    let outcome: Record["outcome"] = "unavailable", client: PoolClient | undefined, failed = true;
    try {
      // Reserve a real connection from the SAME application pool after the
      // response. Never interleave metadata SQL with a request's transaction.
      client = await pool.connect();
      if (now() >= end) return;
      const query = { text: identityQuery, query_timeout: 1000 };
      const { rows } = await client.query<{ loginMatches: boolean; unassumedRole: boolean; databaseMatches: boolean }>(query);
      failed = false;
      outcome = rows.length === 1 && rows[0].loginMatches === true &&
        rows[0].unassumedRole === true && rows[0].databaseMatches === true ? "verified" : "mismatch";
    } catch { /* No raw errors, usernames, SQL or connection details in logs. */ }
    finally { try { client?.release(failed); } catch { /* Contain cleanup failures. */ } }
    if (now() >= end || now() < start) return;
    try { emit({ event: "runtime_login_attestation", version: 1, runId: config.runId,
      deploymentId, commitSha: config.commitSha, observedAt: new Date(now()).toISOString(), outcome }); }
    catch { /* Observability must never fail an application operation. */ }
  };
  const prepare = async () => {
    // Build/import/background activity is not serving evidence. The production
    // adapter requires a live Next request and retains the post-response work.
    if (!await inRequest() || now() < start || now() >= end) return;
    attempted = true; detach();
    schedule(observe);
  };
  function acquired() {
    if (attempted || now() >= end) { detach(); return; }
    if (checking || now() < start) return;
    checking = true;
    void prepare().catch(() => {}).finally(() => { checking = false; });
  }
  pool.on("acquire", acquired);
  return detach;
}
