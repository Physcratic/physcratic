import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

// Refuse arbitrary URLs. Only a deliberately named disposable loopback DB is permitted.
const url = process.env.AUTHORING_TEST_DATABASE_URL;
if (url) {
  Object.assign(process.env, { NODE_ENV: "production" });
  const parsed = new URL(url);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || parsed.hostname !== "127.0.0.1" ||
      parsed.pathname !== "/physcratic_authoring_test" || parsed.search || parsed.hash) {
    throw new Error("AUTHORING_TEST_DATABASE_URL must point to the disposable loopback physcratic_authoring_test database without URL overrides");
  }
}

test("PostgreSQL built-in limiter: atomic across auth instances, reset, IPs, outage", { skip: !url }, async (t) => {
  const { betterAuth } = await import("better-auth");
  const { getAuthTables } = await import("better-auth/db");
  const { getMigrations } = await import("better-auth/db/migration");
  const schema = `auth_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: url, max: 1 });
  const role = `${schema}_runtime`;
  const pools: Pool[] = [];
  t.after(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.query(`DROP ROLE IF EXISTS "${role}"`);
    await admin.end();
  });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.query(`CREATE ROLE "${role}" NOLOGIN`);
  const makePool = (runtime = false) => {
    const pool = new Pool({ connectionString: url, max: 5, options: `-c search_path=${schema}${runtime ? ` -c role=${role}` : ""}`, connectionTimeoutMillis: 1000, statement_timeout: 5000 });
    pools.push(pool); return pool;
  };
  const setup = makePool();
  await setup.query(await readFile(new URL("../migrations/20261031_auth_rate_limit.sql", import.meta.url), "utf8"));
  const fields = await setup.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name='rateLimit' ORDER BY ordinal_position", [schema]);
  assert.deepEqual(fields.rows.map((r) => [r.column_name, r.data_type, r.is_nullable]), [["id", "text", "NO"], ["key", "text", "NO"], ["count", "integer", "NO"], ["lastRequest", "bigint", "NO"]]);
  const definition = getAuthTables({ rateLimit: { storage: "database" } }).rateLimit;
  assert.equal(definition.modelName, "rateLimit");
  assert.equal(definition.fields.key.unique, true);
  assert.equal(definition.fields.lastRequest.bigint, true);
  for (const field of ["key", "count", "lastRequest"]) assert.equal(definition.fields[field].required, true);
  await setup.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
  await setup.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "rateLimit" TO "${role}"`);
  let downstreamCalls = 0;
  const makeAuth = (pool: Pool) => betterAuth({
    baseURL: "https://physcratic.com", secret: "isolated-auth-test-secret-at-least-32-chars", database: pool,
    rateLimit: { enabled: true, storage: "database", window: 60, max: 3 },
    logger: { disabled: true },
    plugins: [{ id: "test-provider-boundary", onRequest: async () => { downstreamCalls++; } }],
  });
  // Initialize identity tables only inside this disposable schema: the SDK
  // validates the complete auth schema before it serves even /ok.
  await (await getMigrations(makeAuth(setup).options)).runMigrations();
  await setup.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON "user", "session", "account", "verification" TO "${role}"`);
  const instances = [makeAuth(makePool(true)), makeAuth(makePool(true))];
  const send = async (n: number, headers: Record<string, string> = { "x-forwarded-for": "192.0.2.10" }) => {
    try { return (await instances[n % 2].handler(new Request("https://physcratic.com/api/auth/ok", { headers }))).status; }
    catch { return 503; } // Same fail-closed contract as Next auth wrapper; no credentials logged.
  };
  const wave = (headers?: Record<string,string>) => Promise.all(Array.from({length:30}, (_,n)=>send(n,headers)));
  const first = await wave();
  assert.equal(first.filter(s=>s===200).length,3);
  assert.equal(first.filter(s=>s===429).length,27);
  let rows = await setup.query('SELECT "count" FROM "rateLimit"');
  assert.equal(rows.rowCount,1); assert.equal(rows.rows[0].count,3);
  assert.equal((await instances[0].handler(new Request("https://physcratic.com/api/auth/ok/", { headers: {"x-forwarded-for":"192.0.2.10"} }))).status,429,"trailing slash shares bucket");
  const otherPath = await instances[0].handler(new Request("https://physcratic.com/api/auth/get-session", { headers: {"x-forwarded-for":"192.0.2.10"} }));
  assert.notEqual(otherPath.status,429,"limits are per-path, not an aggregate auth cap");
  await setup.query('DELETE FROM "rateLimit" WHERE "key" LIKE $1', ["%|/get-session"]);
  assert.equal(await send(0),429, "saturation persists across separate pools/instances");
  await setup.query('UPDATE "rateLimit" SET "lastRequest"=$1', [Date.now()-61000]);
  const reset = await wave();
  assert.equal(reset.filter(s=>s===200).length,3);
  assert.equal(reset.filter(s=>s===429).length,27);
  rows = await setup.query('SELECT "count" FROM "rateLimit"'); assert.equal(rows.rows[0].count,3);
  assert.equal(await send(0,{"x-forwarded-for":"192.0.2.11"}),200, "distinct single IP has separate bucket");
  assert.equal(await send(0,{"x-forwarded-for":"192.0.2.10", "x-real-ip":"192.0.2.99"}),429, "other headers cannot override selected IP");
  const missing = await wave({}); assert.equal(missing.filter(s=>s===200).length,3);
  assert.equal(await send(0,{"x-forwarded-for":"192.0.2.88, 192.0.2.89"}),429, "untrusted multi-hop chain shares missing-IP bucket");
  assert.equal(await send(0,{"x-forwarded-for":"not-an-ip"}),429);
  assert.equal((await setup.query('SELECT "count" FROM "rateLimit" WHERE "key"=$1', ["no-trusted-ip|/ok"])).rows[0].count,3, "production fallback key, never development localhost");
  for(let n=0;n<3;n++) assert.equal(await send(n,{"x-forwarded-for":`2001:db8:abcd:1::${n+1}`}),200);
  assert.equal(await send(0,{"x-forwarded-for":"2001:db8:abcd:1::ff"}),429,"IPv6 /64 normalization");
  await setup.query(`REVOKE UPDATE ON "rateLimit" FROM "${role}"`);
  const beforeDenied = downstreamCalls;
  assert.deepEqual(await Promise.all([send(0), send(1)]), [503, 503]);
  assert.equal(downstreamCalls, beforeDenied, "permission failure cannot reach auth/provider hooks");
  await setup.query(`GRANT UPDATE ON "rateLimit" TO "${role}"`);
  // Both instances see the missing table and reject, never switching to memory.
  await setup.query('ALTER TABLE "rateLimit" RENAME TO "rateLimit_unavailable"');
  const beforeFailure = downstreamCalls;
  const failures = await Promise.all([send(0),send(1)]);
  assert.deepEqual(failures,[503,503]);
  assert.equal(downstreamCalls,beforeFailure,"DB failure must stop before provider/mail hooks");
  await setup.query('ALTER TABLE "rateLimit_unavailable" RENAME TO "rateLimit"');
  assert.equal(await send(0),429,"restored storage retains saturated counter");
  const disconnected = new Pool({ host: "127.0.0.1", port: 1, database: "unused_test", connectionTimeoutMillis: 500 });
  pools.push(disconnected);
  const beforeDisconnect = downstreamCalls;
  let disconnectedStatus: number;
  try {
    disconnectedStatus = (await makeAuth(disconnected).handler(new Request("https://physcratic.com/api/auth/ok"))).status;
  } catch { disconnectedStatus = 503; }
  assert.ok(disconnectedStatus >= 500, "connection failure must fail closed");
  assert.equal(downstreamCalls,beforeDisconnect);
});
