import "server-only";
import type { PoolConfig } from "pg";
import { isAuthoringStaging } from "./authoring-staging";

// Unused aliases still expose credentials to the process and operator tooling.
// In the authoring Preview they must be absent/empty, not merely ignored.
export function runtimeDatabaseOptions(env: Record<string, string | undefined> = process.env): PoolConfig {
  if (!isAuthoringStaging(env)) return { connectionString: env.DATABASE_URL };
  const fail = () => new Error("Authoring staging database is unavailable.");
  try {
    if (Object.entries(env).some(([key, value]) => Boolean(value) && /^(PG[A-Z_0-9]*|POSTGRES(?:_|$)|DATABASE_URL_)/.test(key))) throw fail();
    const url = new URL(env.DATABASE_URL || "");
    if (!["postgres:", "postgresql:"].includes(url.protocol) ||
        !["ep-green-waterfall-b7qaw260.c-13.us-east-1.aws.neon.tech", "ep-green-waterfall-b7qaw260-pooler.c-13.us-east-1.aws.neon.tech"].includes(url.hostname) ||
        url.pathname !== "/neondb" || decodeURIComponent(url.username) !== "physcratic_integration_app" || !url.password ||
        !["require", "verify-full"].includes(url.searchParams.get("sslmode") || "")) throw fail();
    return { host: url.hostname, port: Number(url.port || 5432), database: "neondb",
      user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: true }, enableChannelBinding: true,
      options: "-c search_path=public,pg_catalog" };
  } catch { throw fail(); }
}
