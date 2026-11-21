import { readFile } from "node:fs/promises";
import type { Pool } from "pg";

// Disposable schema fixtures for the publication consumers.
export async function installProfilePublicationFixture(pool: Pool) {
  const { rows } = await pool.query<{ schema: string }>("SELECT current_schema() AS schema");
  const schema = '"' + rows[0].schema.replaceAll('"', '""') + '"';
  const migration = await readFile("migrations/0022_b1_profile_signup.up.sql", "utf8");
  await pool.query(`BEGIN;
    ALTER TABLE ${schema}."user" ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT true;
    ${migration.replaceAll("public.", schema + ".")}
    COMMIT;`);
}
