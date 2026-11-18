import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { Pool } from "pg";
import test from "node:test";
import { attachRuntimeLoginAttestation } from "./runtime-login-attestation";

const instant = Date.parse("2026-11-18T00:00:00Z");
const config = { runId: "a".repeat(32), commitSha: "b".repeat(40),
  notBefore: new Date(instant - 1000).toISOString(), expiresAt: new Date(instant + 60_000).toISOString() };
const env = { PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION: JSON.stringify(config), VERCEL_ENV: "production",
  VERCEL_GIT_COMMIT_SHA: config.commitSha, VERCEL_DEPLOYMENT_ID: "dpl_synthetic12345" };
class TestPool extends EventEmitter {
  nextClient: object = {};
  releases: boolean[] = [];
  override emit(event: string, ...args: unknown[]) {
    if (event === "acquire" && args[0]) this.nextClient = args[0] as object;
    return super.emit(event, ...args);
  }
  async connect() { return Object.assign({}, this.nextClient, { release: (destroy = false) => { this.releases.push(destroy); } }); }
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test("attestation is inert unless the exact bounded deployment configuration is valid", () => {
  for (const input of [{}, { ...env, PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION: "invalid" },
    { ...env, NEXT_PHASE: "phase-production-build" }, { ...env, VERCEL_ENV: "preview" }, { ...env, VERCEL_GIT_COMMIT_SHA: "c".repeat(40) },
    { ...env, VERCEL_DEPLOYMENT_ID: "untrusted\nPRIVATE" },
    ...[{ ...config, expiresAt: new Date(instant + 16 * 60_000).toISOString() },
      { ...config, runId: [config.runId] }, { ...config, unexpected: "PRIVATE" },
      { ...config, expiresAt: config.notBefore }, { ...config, notBefore: "bad" }]
      .map(value => ({ ...env, PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION: JSON.stringify(value) }))]) {
    const pool = new TestPool();
    attachRuntimeLoginAttestation(pool as unknown as Pool, { env: input, now: () => instant, emit: () => assert.fail("no log") });
    assert.equal(pool.listenerCount("acquire"), 0);
  }
});
test("one physical app connection produces only a deployment-bound private assertion", async () => {
  const pool = new TestPool(), records: unknown[] = [];
  let queries = 0;
  attachRuntimeLoginAttestation(pool as unknown as Pool, { env, inRequest: async () => true, now: () => instant, emit: r => records.push(r) });
  const client = { query: async () => { queries++; return { rows: [{ loginMatches: true, unassumedRole: true, databaseMatches: true }] }; } };
  pool.emit("acquire", client);pool.emit("acquire", client);await tick();
  assert.equal(queries, 1);assert.equal(pool.listenerCount("acquire"), 0);
  assert.deepEqual(records, [{ event: "runtime_login_attestation", version: 1, runId: config.runId,
    deploymentId: env.VERCEL_DEPLOYMENT_ID, commitSha: config.commitSha,
    observedAt: new Date(instant).toISOString(), outcome: "verified" }]);
});
test("failure and mismatch never disclose raw database identity or errors, and never retry", async () => {
  for (const result of [null, { loginMatches: false, unassumedRole: true, databaseMatches: true },
    { loginMatches: true, unassumedRole: false, databaseMatches: true },
    { loginMatches: true, unassumedRole: true, databaseMatches: false }]) {
    const pool = new TestPool(), records: { outcome: string }[] = [];
    attachRuntimeLoginAttestation(pool as unknown as Pool, { env, inRequest: async () => true, now: () => instant, emit: r => records.push(r) });
    pool.emit("acquire", { query: async () => { if (!result) throw Error("PRIVATE_ROLE postgres://PRIVATE_PASSWORD SELECT secret"); return { rows: [result] }; } });
    await tick();assert.equal(records[0].outcome, result ? "mismatch" : "unavailable");
    assert.doesNotMatch(JSON.stringify(records), /PRIVATE|SELECT|postgres:/);assert.equal(pool.listenerCount("acquire"), 0);
  }
});
test("window bounds stop both queries and late evidence; broken log sinks are contained", async () => {
  const pool = new TestPool();let clock = instant - 2000, queries = 0;
  attachRuntimeLoginAttestation(pool as unknown as Pool, { env, inRequest: async () => true, now: () => clock, emit: () => assert.fail("late evidence") });
  pool.emit("acquire", { query: async () => { queries++;return { rows: [] }; } });assert.equal(queries, 0);
  clock = instant + 60_000;pool.emit("acquire", {});assert.equal(pool.listenerCount("acquire"), 0);
  const late = new TestPool();clock = instant;
  attachRuntimeLoginAttestation(late as unknown as Pool, { env, inRequest: async () => true, now: () => clock, emit: () => assert.fail("late evidence") });
  late.emit("acquire", { query: async () => { clock += 120_000; return { rows: [] }; } });await tick();
  const sink = new TestPool();
  attachRuntimeLoginAttestation(sink as unknown as Pool, { env, inRequest: async () => true, now: () => instant, emit: () => { throw Error("PRIVATE_SINK"); } });
  sink.emit("acquire", { query: async () => ({ rows: [] }) });await tick();
});

test("build and background acquisitions are not serving evidence; later in-band acquisition can attest", async () => {
  const pool=new TestPool();let serving=false,queries=0;
  const records:{outcome:string}[]=[];
  attachRuntimeLoginAttestation(pool as unknown as Pool,{env,now:()=>instant,inRequest:async()=>serving,emit:r=>records.push(r)});
  const client={query:async()=>{queries++;return {rows:[{loginMatches:true,unassumedRole:true,databaseMatches:true}]};}};
  pool.emit("acquire",client);await tick();assert.equal(queries,0);assert.equal(records.length,0);
  serving=true;pool.emit("acquire",client);await tick();assert.equal(queries,1);assert.equal(records[0].outcome,"verified");
});

test("post-response probe reserves its own app-pool connection and never queries the request client", async () => {
  const pool=new TestPool(), tasks:(()=>Promise<void>)[]=[];
  let queries=0;
  attachRuntimeLoginAttestation(pool as unknown as Pool,{env,now:()=>instant,inRequest:async()=>true,schedule:task=>tasks.push(task),emit:()=>{}});
  pool.emit("acquire",{query:()=>assert.fail("request transaction must not be probed")});await tick();
  assert.equal(tasks.length,1);assert.equal(queries,0);
  pool.nextClient={query:async()=>{queries++;return {rows:[{loginMatches:true,unassumedRole:true,databaseMatches:true}]};}};
  await tasks[0]();assert.equal(queries,1);assert.deepEqual(pool.releases,[false]);
});
test("failed probe connections are discarded rather than returned with pending work", async () => {
  const pool=new TestPool();
  attachRuntimeLoginAttestation(pool as unknown as Pool,{env,now:()=>instant,inRequest:async()=>true,emit:()=>{}});
  pool.emit("acquire",{query:async()=>{throw Error("PRIVATE timeout");}});await tick();
  assert.deepEqual(pool.releases,[true]);
});
