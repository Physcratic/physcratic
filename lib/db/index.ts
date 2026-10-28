import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalDatabase = globalThis as unknown as { physicsPool?: Pool };
export const pool = globalDatabase.physicsPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000, idle_in_transaction_session_timeout: 15000 });
if (process.env.NODE_ENV !== "production") globalDatabase.physicsPool = pool;
export const db = drizzle(pool, { schema });
