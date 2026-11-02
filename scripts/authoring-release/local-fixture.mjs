// Test-only. Every destructive reset is restricted to the disposable localhost URL.
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { connection, migrations, readOnlyReport, directory, historicalSource, requireCondition } from "./core.mjs";
export const fixtureSource = "4e18931e1c3e2f18271e6ff9f274a158c0c40f9a";
export async function localClient() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const client = connection(process.env.AUTHORING_TEST_DATABASE_URL, true);
    try { await client.connect(); await client.query("SELECT 1"); return client; }
    catch (error) { await client.end().catch(() => {}); if (attempt === 59) throw error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
export async function reset(client) {
  const id = (await client.query("SELECT inet_client_addr()::text AS addr,current_database() AS db")).rows[0];
  // Docker's published localhost port reaches the server through its bridge,
  // so inet_client_addr need not itself be 127.0.0.1. Pin the client endpoint.
  requireCondition(client.connectionParameters.host === "127.0.0.1" && id.db === "physcratic_authoring_test", "LOCAL_RESET_REFUSED");
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
  await client.query('CREATE TABLE public."user"(id text PRIMARY KEY,marker text NOT NULL)');
  await client.query(`CREATE TABLE public.physcratic_integration_migrations(
    id text PRIMARY KEY, sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'), source_commit text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),applied_by text NOT NULL DEFAULT CURRENT_USER,
    result text NOT NULL CHECK(result='verified'))`);
}
export async function applyFixture(client, first, last = first) {
  const files = await migrations();
  for (let i = first; i <= last; i++) {
    await client.query("BEGIN; SET LOCAL search_path=public,pg_catalog");
    try {
      await client.query(files[i - 1].sql);
      await client.query("INSERT INTO public.physcratic_integration_migrations(id,sha256,source_commit,result) VALUES($1,$2,$3,'verified')", [files[i - 1].id, files[i - 1].sha256, i <= 3 ? historicalSource : fixtureSource]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
  }
}
async function generate() {
  const client = await localClient();
  try {
    await reset(client); await applyFixture(client, 1, 3);
    for (let version = 3; version <= 6; version++) {
      if (version > 3) await applyFixture(client, version);
      const report = await readOnlyReport(client);
      requireCondition(report.identity.server_version_num === 180006, "BASELINES_REQUIRE_EXACT_PG18_6");
      await writeFile(new URL(`baselines/v${version}.json`, directory), JSON.stringify({ server_version_num: 180006, catalog: report.catalog, ledger_columns: report.ledger_columns, ledger_constraints: report.ledger_constraints }, null, 2) + "\n");
    }
    console.log("Generated PG18.6 baseline catalogs v3-v6 on disposable localhost only.");
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) generate().catch(error => { console.error(error.code || "LOCAL_BASELINE_FAILED"); process.exitCode = 1; });
