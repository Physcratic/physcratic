import "server-only";
import type { PoolConfig } from "pg";
import { isAuthoringStaging } from "./authoring-staging";

class StagingDatabaseConfigurationError extends Error {
  constructor(code: string) {
    super("Authoring staging database is unavailable.");
    // Fixed reason codes help operators diagnose a rejected binding without
    // logging a connection string, username, password or inherited alias value.
    this.name = `StagingDatabaseConfigurationError[${code}]`;
  }
}

// Unused aliases still expose credentials to the process and operator tooling.
// In the authoring Preview they must be absent/empty, not merely ignored.
export function runtimeDatabaseOptions(env: Record<string, string | undefined> = process.env): PoolConfig {
  if (!isAuthoringStaging(env)) return { connectionString: env.DATABASE_URL };
  const fail = (code: string) => new StagingDatabaseConfigurationError(code);
  try {
    if (Object.entries(env).some(([key, value]) => Boolean(value) && /^(PG[A-Z_0-9]*|POSTGRES(?:_|$)|DATABASE_URL_)/.test(key))) throw fail("INHERITED_ALIAS_PRESENT");
    const url = new URL(env.DATABASE_URL || "");
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw fail("SCHEME_MISMATCH");
    if (!["ep-green-waterfall-b7qaw260.c-13.us-east-1.aws.neon.tech", "ep-green-waterfall-b7qaw260-pooler.c-13.us-east-1.aws.neon.tech"].includes(url.hostname)) throw fail("HOST_MISMATCH");
    if (url.pathname !== "/neondb") throw fail("DATABASE_MISMATCH");
    if (decodeURIComponent(url.username) !== "physcratic_integration_app") throw fail("APPLICATION_ROLE_MISMATCH");
    if (!url.password) throw fail("PASSWORD_MISSING");
    if (!["require", "verify-full"].includes(url.searchParams.get("sslmode") || "")) throw fail("TLS_MODE_MISMATCH");
    return { host: url.hostname, port: Number(url.port || 5432), database: "neondb",
      user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: true }, enableChannelBinding: true,
      options: "-c search_path=public,pg_catalog" };
  } catch (error) {
    if (error instanceof StagingDatabaseConfigurationError) throw error;
    throw fail("PRIMARY_URL_INVALID");
  }
}
