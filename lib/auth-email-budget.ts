import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";

// Per-address cap on reset and change-email messages, on top of the per-IP limits.
// Rows live in the existing Better Auth "verification" table under a prefix no Better Auth
// flow uses. The address is hashed, so the table never holds it in clear text.
export const AUTH_EMAIL_BUDGET = { max: 3, windowMs: 60 * 60 * 1000 } as const;
export type AuthEmailKind = "reset" | "change-approval" | "change-verify";

export function normalizeAddress(email: string) {
  return email.trim().toLowerCase();
}
export function budgetIdentifier(email: string) {
  return `auth-email-budget:${createHash("sha256").update(normalizeAddress(email)).digest("hex")}`;
}

/** Takes one slot for this address. False means the address already had its 3 emails this hour. */
export async function reserveAuthEmail(pool: Pool, email: string, kind: AuthEmailKind, now = new Date()) {
  const identifier = budgetIdentifier(email);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialise per address so parallel requests cannot all see the same count.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [identifier]);
    await client.query(`DELETE FROM "verification" WHERE "identifier"=$1 AND "expiresAt"<=$2`, [identifier, now]);
    const { rows } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM "verification" WHERE "identifier"=$1`, [identifier]);
    if (rows[0].n >= AUTH_EMAIL_BUDGET.max) { await client.query("ROLLBACK"); return false; }
    await client.query(`INSERT INTO "verification"("id","identifier","value","expiresAt","createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$5)`,
      [randomUUID(), identifier, kind, new Date(now.getTime() + AUTH_EMAIL_BUDGET.windowMs), now]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
