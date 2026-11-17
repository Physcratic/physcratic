import assert from "node:assert/strict";
import { Pool } from "pg";
import test from "node:test";
import { attachRuntimeLoginAttestation } from "../lib/runtime-login-attestation";

// Separate PG18.7 CI step, not the older database job's automatic file glob.
const raw = process.env.AUTHORING_TEST_DATABASE_URL;
test("attestation observes the actual application LOGIN without any extra grants", { skip: !raw, timeout: 15000 }, async () => {
  const root = new URL(raw!);assert.equal(root.hostname, "127.0.0.1");
  assert.equal(root.pathname, "/physcratic_authoring_test");assert.equal(root.search, "");assert.equal(root.hash, "");
  const admin = new Pool({ connectionString: raw, max: 1 });
  let database = false, role = false;const pools: Pool[] = [];
  try {
    assert.equal((await admin.query("SHOW server_version_num")).rows[0].server_version_num, "180007");
    await admin.query("CREATE DATABASE neondb");database = true;
    await admin.query("CREATE ROLE physcratic_runtime_app LOGIN PASSWORD 'synthetic-attestation-only' NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");role = true;
    const url = new URL(root);url.pathname = "/neondb";url.username = "physcratic_runtime_app";url.password = "synthetic-attestation-only";
    const config = { runId: "a".repeat(32), commitSha: "b".repeat(40), notBefore: new Date(Date.now()-1000).toISOString(), expiresAt: new Date(Date.now()+60_000).toISOString() };
    const env = { PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION: JSON.stringify(config), VERCEL_ENV: "production", VERCEL_GIT_COMMIT_SHA: config.commitSha, VERCEL_DEPLOYMENT_ID: "dpl_synthetic12345" };
    const app = new Pool({ connectionString: url.href, max: 1 });pools.push(app);
    const records: { outcome: string }[] = [];const ready=Promise.withResolvers<void>();attachRuntimeLoginAttestation(app, { env, inRequest: async () => true, emit: r => {records.push(r);ready.resolve();} });
    const normal = await app.query("SELECT 42 AS ordinary_result,session_user AS login");
    assert.equal(normal.rows[0].ordinary_result, 42);assert.equal(normal.rows[0].login, "physcratic_runtime_app");
    await ready.promise;assert.equal(records.length, 1);assert.equal(records[0].outcome, "verified");
    await app.query("SELECT 1");assert.equal(records.length, 1);
    assert.equal((await app.query("SELECT has_schema_privilege(current_user,'public','CREATE') AS allowed")).rows[0].allowed, false);
    const owner = new Pool({ connectionString: raw, max: 1 });pools.push(owner);
    const mismatch: { outcome: string }[] = [];const otherReady=Promise.withResolvers<void>();attachRuntimeLoginAttestation(owner, { env, inRequest: async () => true, emit: r => {mismatch.push(r);otherReady.resolve();} });
    await owner.query("SELECT 1");await otherReady.promise;assert.equal(mismatch[0].outcome, "mismatch");
    assert.doesNotMatch(JSON.stringify([...records,...mismatch]), /postgres|synthetic-attestation-only|SELECT|session_user/);
    if (process.env.ATTESTATION_SERVING_SMOKE === '1') {
      // Build the existing application schema/rights only inside this disposable
      // target so the ordinary collection SELECT succeeds, rather than testing
      // an aborted missing-table transaction. The observer itself needs no grant.
      const {readFile}=await import('node:fs/promises');
      const {fixtureDDL,seed}=await import('./authoring-release-production/package/test-fixture.mjs');
      const ownerUrl=new URL(root);ownerUrl.pathname='/neondb';
      const setup=new Pool({connectionString:ownerUrl.href,max:1});pools.push(setup);
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
        let served=false;
        for(let n=0;n<80;n++){
          try {const response=await fetch(`http://127.0.0.1:${port}/api/arena/collection`);if(response.status===200){served=true;break;}}catch{}
          await new Promise(resolve=>setTimeout(resolve,100));
        }
        assert.ok(served,'ordinary existing collection route served');
        for(let n=0;n<20&&!output.includes('runtime_login_attestation');n++)await new Promise(resolve=>setTimeout(resolve,100));
        const record=output.split('\n').filter(line=>line.startsWith('{"event":"runtime_login_attestation"')).map(line=>JSON.parse(line));
        assert.equal(record.length,1);assert.equal(record[0].outcome,'verified');
        assert.equal(record[0].deploymentId,env.VERCEL_DEPLOYMENT_ID);assert.equal(record[0].commitSha,config.commitSha);
        assert.doesNotMatch(JSON.stringify(record),/postgres|synthetic-attestation-only|SELECT|session_user/);
      } finally {child.kill('SIGTERM');if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));}
    }

  } finally {
    await Promise.all(pools.map(p => p.end()));
    if (database) await admin.query("DROP DATABASE neondb WITH (FORCE)");
    if (role) await admin.query("DROP ROLE physcratic_runtime_app");
    await admin.end();
  }
});
