import { after } from "next/server";
import { headers } from "next/headers";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { runtimeDatabaseOptions } from "../runtime-database";
import { attachRuntimeLoginAttestation } from "../runtime-login-attestation";

const globalDatabase = globalThis as unknown as { physicsPool?: Pool };
export const pool = globalDatabase.physicsPool ?? new Pool({ ...runtimeDatabaseOptions(), max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000, idle_in_transaction_session_timeout: 15000 });
if (process.env.NODE_ENV !== "production") globalDatabase.physicsPool = pool;
attachRuntimeLoginAttestation(pool, { inRequest: async () => {
  try { await headers(); return true; } catch { return false; }
}, schedule: task => after(task) });
export const db = drizzle(pool, { schema });
