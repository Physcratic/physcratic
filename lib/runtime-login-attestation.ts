import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pool, PoolClient, QueryResult } from "pg";

type Config = { runId: string; commitSha: string; notBefore: string; expiresAt: string; requestKey: string };
type Attestation = {
  event: "runtime_login_attestation"; version: 2; runId: string;
  deploymentId: string; commitSha: string; observedAt: string;
  outcome: "verified" | "mismatch" | "unavailable";
};

const identityQuery = `BEGIN READ ONLY;
  SET LOCAL statement_timeout = '1s';
  SELECT session_user='physcratic_runtime_app' AS "loginMatches",
    current_user=session_user AS "unassumedRole",current_database()='neondb' AS "databaseMatches";
  COMMIT`;

// The owner signs the actual deployment ID after Vercel assigns it. The key
// stays in the owner tooling and this deployment's server-side environment.
export function createRuntimeLoginAttestation(pool: Pick<Pool, "connect" | "options">, {
  schedule, env = process.env, now = Date.now,
  emit = (record: Attestation) => console.info(JSON.stringify(record)),
}: {
  schedule: (task: () => Promise<void>) => void;
  env?: Record<string, string | undefined>;
  now?: () => number;
  emit?: (record: Attestation) => void;
}) {
  const disabled = () => {};
  const raw = env.PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION;
  const actualDeploymentId = env.VERCEL_DEPLOYMENT_ID;
  const timeout = pool.options.connectionTimeoutMillis;
  if (!raw || raw.length > 1024 || env.VERCEL_ENV !== "production" || env.NEXT_PHASE === "phase-production-build" ||
      !actualDeploymentId || !/^dpl_[a-zA-Z0-9]{8,80}$/.test(actualDeploymentId) ||
      !timeout || !Number.isFinite(timeout) || timeout < 0 || timeout > 5000) return disabled;
  const deploymentId = actualDeploymentId;

  let config: Config;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        Object.keys(value).sort().join() !== "commitSha,expiresAt,notBefore,requestKey,runId" ||
        typeof value.runId !== "string" || !/^[a-f0-9]{32}$/.test(value.runId) ||
        typeof value.commitSha !== "string" || !/^[a-f0-9]{40}$/.test(value.commitSha) ||
        value.commitSha !== env.VERCEL_GIT_COMMIT_SHA ||
        typeof value.requestKey !== "string" || !/^[a-f0-9]{64}$/.test(value.requestKey) ||
        typeof value.notBefore !== "string" || typeof value.expiresAt !== "string") return disabled;
    config = value;
  } catch { return disabled; }
  const start = Date.parse(config.notBefore);
  const end = Date.parse(config.expiresAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 15 * 60_000 ||
      new Date(start).toISOString() !== config.notBefore || new Date(end).toISOString() !== config.expiresAt ||
      now() >= end) return disabled;

  const { runId, commitSha } = config;
  const approval = createHmac("sha256", Buffer.from(config.requestKey, "hex"))
    .update(`physcratic-runtime-login-attestation-v2\n${runId}\n${commitSha}\n${deploymentId}`)
    .digest();
  const inWindow = (time: number) => time >= start && time < end;
  let attempted = false;

  async function observe() {
    if (!inWindow(now())) return;
    let client: PoolClient | undefined;
    let outcome: Attestation["outcome"] = "unavailable";
    let discard = true;
    try {
      client = await pool.connect();
      if (!inWindow(now())) return;
      // The transaction owns the server timeout on the actual pooled backend.
      // The client deadline bounds the entire batch, including pooler waits.
      const query = { text: identityQuery, query_timeout: 1000 };
      const result: QueryResult | QueryResult[] = await client.query(query);
      if (Array.isArray(result) && result.map(r => r.command).join(",") === "BEGIN,SET,SELECT,COMMIT") {
        discard = false;
        const [row] = result[2].rows;
        outcome = result[2].rows.length === 1 && row?.loginMatches === true &&
          row.unassumedRole === true && row.databaseMatches === true ? "verified" : "mismatch";
      }
    } catch { /* The fixed unavailable outcome covers any failure. */ }
    finally {
      // Destruction also rolls back an unfinished probe transaction.
      try { client?.release(discard); } catch { /* Keep cleanup off the request path. */ }
    }
    const observed = now();
    if (!inWindow(observed)) return;
    try {
      emit({ event: "runtime_login_attestation", version: 2, runId, deploymentId, commitSha,
        observedAt: new Date(observed).toISOString(), outcome });
    } catch { /* Keep logging off the request path. */ }
  }

  return (request: Request) => {
    if (attempted || !inWindow(now())) return;
    try {
      const url = new URL(request.url);
      if (request.method !== "GET" || url.pathname !== "/api/arena/collection" || url.search ||
          request.headers.has("cookie") || request.headers.has("authorization")) return;
      const token = request.headers.get("x-physcratic-runtime-attestation");
      if (!token || !/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(token, "hex"), approval)) return;
      attempted = true;
      schedule(observe);
    } catch { /* Never alter the ordinary response. */ }
  };
}
