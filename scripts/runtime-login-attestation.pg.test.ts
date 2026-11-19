import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { Pool } from "pg";
import test from "node:test";
import { createRuntimeLoginAttestation } from "../lib/runtime-login-attestation";

// Separate PG18.7 CI step, not the older database job's automatic file glob.
const raw = process.env.AUTHORING_TEST_DATABASE_URL;
test("attestation observes the actual application LOGIN without any extra grants", { skip: !raw, timeout: 30000 }, async () => {
  const root = new URL(raw!);assert.equal(root.hostname, "127.0.0.1");
  assert.equal(root.pathname, "/physcratic_authoring_test");assert.equal(root.search, "");assert.equal(root.hash, "");
  const admin = new Pool({ connectionString: raw, max: 1 });
  let database = false, role = false, closing = false;const pools: Pool[] = [];
  const idleErrors: Error[] = [];
  const onIdleError = (error: Error & {code?: string}) => {
    // DROP DATABASE FORCE can race the final idle socket close. Only this
    // specific teardown event is expected; runtime failures remain test failures.
    if (!(closing && error.code === '57P01')) idleErrors.push(error);
  };
  admin.on('error',onIdleError);
  try {
    for (let attempt=0;;attempt++) {
      try {await admin.query('SELECT 1');break;}
      catch(error) {if(attempt>=20)throw error;await new Promise(resolve=>setTimeout(resolve,100));}
    }
    assert.equal((await admin.query("SHOW server_version_num")).rows[0].server_version_num, "180007");
    await admin.query("CREATE DATABASE neondb");database = true;
    await admin.query("CREATE ROLE physcratic_runtime_app LOGIN PASSWORD 'synthetic-attestation-only' NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");role = true;
    const url = new URL(root);url.pathname = "/neondb";url.username = "physcratic_runtime_app";url.password = "synthetic-attestation-only";
    const config = { runId: "a".repeat(32), commitSha: "b".repeat(40), requestKey: "e".repeat(64),
      notBefore: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() };
    const env = { PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION: JSON.stringify(config), VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_SHA: config.commitSha, VERCEL_DEPLOYMENT_ID: "dpl_synthetic12345" };
    const approval = createHmac("sha256", Buffer.from(config.requestKey, "hex"))
      .update(`physcratic-runtime-login-attestation-v2\n${config.runId}\n${config.commitSha}\n${env.VERCEL_DEPLOYMENT_ID}`).digest("hex");
    const headers = { "x-physcratic-runtime-attestation": approval };
    const request = () => new Request("https://physcratic.invalid/api/arena/collection", { headers });
    const schedule = (task: () => Promise<void>) => { void task(); };
    const app = new Pool({ connectionString: url.href, max: 1, connectionTimeoutMillis: 5000 });
    pools.push(app); app.on("error", onIdleError);
    const records: { outcome: string }[] = [];
    const ready = Promise.withResolvers<void>();
    const attest = createRuntimeLoginAttestation(app, { env, schedule, emit: r => { records.push(r); ready.resolve(); } });
    const normal = await app.query("SELECT 42 AS ordinary_result,session_user AS login");
    assert.equal(normal.rows[0].ordinary_result, 42);
    assert.equal(normal.rows[0].login, "physcratic_runtime_app");
    attest(request());
    await ready.promise;
    assert.equal(records.length, 1);
    assert.equal(records[0].outcome, "verified");
    attest(request());
    assert.equal((await app.query("SHOW statement_timeout")).rows[0].statement_timeout, "0", "probe timeout must not leak");
    assert.equal(records.length, 1);
    assert.equal((await app.query("SELECT has_schema_privilege(current_user,'public','CREATE') AS allowed")).rows[0].allowed, false);

    const ownerUrl = new URL(root);
    ownerUrl.pathname = "/neondb";
    const owner = new Pool({ connectionString: ownerUrl.href, max: 1, connectionTimeoutMillis: 5000 });
    pools.push(owner); owner.on("error", onIdleError);
    const mismatch = Promise.withResolvers<{ outcome: string }>();
    createRuntimeLoginAttestation(owner, { env, schedule, emit: r => mismatch.resolve(r) })(request());
    const wrongRole = await mismatch.promise;
    assert.equal(wrongRole.outcome, "mismatch");
    assert.doesNotMatch(JSON.stringify([...records, wrongRole]), /postgres|synthetic-attestation-only|SELECT|session_user/);

    // Keep a normal client checked out. The probe must time out without using
    // it or leaving a pending acquisition in the ordinary pool.
    const saturated = new Pool({ connectionString: url.href, max: 1, connectionTimeoutMillis: 150 });
    pools.push(saturated); saturated.on("error", onIdleError);
    const timed = Promise.withResolvers<{ outcome: string }>();
    const saturatedAttest = createRuntimeLoginAttestation(saturated, { env, schedule, emit: r => timed.resolve(r) });
    const held = await saturated.connect();
    try {
      const began = Date.now();
      saturatedAttest(request());
      assert.equal((await timed.promise).outcome, "unavailable");
      assert.ok(Date.now() - began < 2000, "pool acquisition timeout is bounded");
      assert.equal(saturated.waitingCount, 0);
      assert.equal((await held.query("SELECT 7 AS normal")).rows[0].normal, 7);
    } finally { held.release(); }
    assert.equal((await saturated.query("SELECT 8 AS normal")).rows[0].normal, 8);
    if (process.env.ATTESTATION_SERVING_SMOKE === '1') {
      // Build the existing application schema/rights only inside this disposable
      // target so the ordinary collection SELECT succeeds, rather than testing
      // an aborted missing-table transaction. The observer itself needs no grant.
      const {readFile}=await import('node:fs/promises');
      const {fixtureDDL,seed}=await import('./authoring-release-production/package/test-fixture.mjs');
      const setup=new Pool({connectionString:ownerUrl.href,max:1});pools.push(setup);setup.on('error',onIdleError);
      for(const ddl of fixtureDDL())await setup.query(ddl);await seed(setup);
      await setup.query(await readFile('migrations/20261031_auth_rate_limit.sql','utf8'));
      const migrations=JSON.parse(await readFile('scripts/production-upgrade/migrations.json','utf8')) as {path:string}[];
      for(const migration of migrations)await setup.query(await readFile(migration.path,'utf8'));
      const provision=await readFile('scripts/runtime-role/provision.review.sql','utf8');
      const baseline=provision.slice(provision.indexOf('-- Existing Better Auth'),provision.indexOf('COMMIT;'));
      await setup.query(baseline.replaceAll(':"runtime_role"','physcratic_runtime_app'));

      const {spawn}=await import('node:child_process');const {createServer}=await import('node:net');
      const socket=createServer();await new Promise<void>(resolve=>socket.listen(0,'127.0.0.1',resolve));
      const port=(socket.address() as {port:number}).port;await new Promise<void>(resolve=>socket.close(()=>resolve()));
      const childEnv={...process.env};for(const key of Object.keys(childEnv))if(/^(VERCEL|DATABASE_URL|POSTGRES|PG|COMMUNITY_|ACCOUNT_DELETION_|PRACTICE_|RESEND_|BLOB_|AUTHORING_STAGING_)/.test(key))delete childEnv[key];
      Object.assign(childEnv,env,{NODE_ENV:'production',DATABASE_URL:url.href,BETTER_AUTH_URL:`http://127.0.0.1:${port}`,BETTER_AUTH_SECRET:'synthetic-attestation-serving-secret-0000000000000000'});
      const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:childEnv,stdio:['ignore','pipe','pipe']});
      let output='';child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',()=>{});
      try {
        const endpoint = `http://127.0.0.1:${port}/api/arena/collection`;
        let ordinary: unknown;
        for (let n = 0; n < 80; n++) {
          try {
            const response = await fetch(endpoint);
            if (response.status === 200) { ordinary = await response.json(); break; }
          } catch { /* Wait for Next.js startup. */ }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.ok(ordinary, "ordinary existing collection route served");
        assert.equal((ordinary as { authoredUnavailable: boolean }).authoredUnavailable, false);
        assert.doesNotMatch(output, /runtime_login_attestation/);
        const response = await fetch(endpoint, { headers });
        assert.equal(response.status, 200);
        const body = await response.text();
        assert.deepEqual(JSON.parse(body), ordinary);
        assert.ok(!body.includes(approval) && !body.includes(config.requestKey) && !body.includes("physcratic_runtime_app"));
        for(let n=0;n<20&&!output.includes('runtime_login_attestation');n++)await new Promise(resolve=>setTimeout(resolve,100));
        const record=output.split('\n').filter(line=>line.startsWith('{"event":"runtime_login_attestation"')).map(line=>JSON.parse(line));
        assert.equal(record.length,1);assert.equal(record[0].outcome,'verified');
        assert.equal(record[0].deploymentId,env.VERCEL_DEPLOYMENT_ID);assert.equal(record[0].commitSha,config.commitSha);
        assert.doesNotMatch(JSON.stringify(record),/postgres|synthetic-attestation-only|SELECT|session_user/);
        assert.ok(!output.includes(approval) && !output.includes(config.requestKey));
      } finally {child.kill('SIGTERM');if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));}
    }

  } finally {
    closing = true;
    await Promise.all(pools.map(p => p.end()));
    if (database) await admin.query("DROP DATABASE neondb WITH (FORCE)");
    if (role) await admin.query("DROP ROLE physcratic_runtime_app");
    await admin.end();
    assert.deepEqual(idleErrors, [], 'no unexpected idle connection failures');
  }
});
