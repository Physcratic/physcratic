import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import type { Pool } from "pg";
import { createRuntimeLoginAttestation } from "./runtime-login-attestation";

const instant = Date.parse("2026-11-19T00:00:00Z");
const config = {
  runId: "a".repeat(32), commitSha: "b".repeat(40), requestKey: "e".repeat(64),
  notBefore: new Date(instant - 1000).toISOString(), expiresAt: new Date(instant + 60_000).toISOString(),
};
const env = { PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION: JSON.stringify(config), VERCEL_ENV: "production",
  VERCEL_GIT_COMMIT_SHA: config.commitSha, VERCEL_DEPLOYMENT_ID: "dpl_synthetic12345" };
const approval = createHmac("sha256", Buffer.from(config.requestKey, "hex"))
  .update(`physcratic-runtime-login-attestation-v2\n${config.runId}\n${config.commitSha}\n${env.VERCEL_DEPLOYMENT_ID}`)
  .digest("hex");
const path = "https://physcratic.invalid/api/arena/collection";
const request = () => new Request(path, { headers: { "x-physcratic-runtime-attestation": approval } });
const accepted = { loginMatches: true, unassumedRole: true, databaseMatches: true };

function harness(result: unknown = accepted, input: Record<string, string | undefined> = env,
  timeout = 5000, now = () => instant) {
  const tasks: (() => Promise<void>)[] = [];
  const records: unknown[] = [];
  const releases: boolean[] = [];
  const queries: unknown[] = [];
  let acquisitions = 0;
  const pool = { options: { connectionTimeoutMillis: timeout }, connect: async () => {
    acquisitions++;
    return { query: async (query: unknown) => {
      queries.push(query);
      if (result instanceof Error) throw result;
      return [ { command: "BEGIN" }, { command: "SET" }, { command: "SELECT", rows: [result] }, { command: "COMMIT" } ];
    }, release: (discard: boolean) => releases.push(discard) };
  } } as unknown as Pool;
  const attest = createRuntimeLoginAttestation(pool, { env: input, now, schedule: task => tasks.push(task), emit: r => records.push(r) });
  return { attest, tasks, records, releases, queries, acquisitions: () => acquisitions };
}

test("OFF and malformed configurations cannot schedule a probe", () => {
  for (const input of [{}, { ...env, PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION: "invalid" },
    { ...env, NEXT_PHASE: "phase-production-build" }, { ...env, VERCEL_ENV: "preview" },
    { ...env, VERCEL_GIT_COMMIT_SHA: "c".repeat(40) }, { ...env, VERCEL_DEPLOYMENT_ID: "untrusted\nPRIVATE" },
    ...[{ ...config, expiresAt: new Date(instant + 16 * 60_000).toISOString() },
      { ...config, requestKey: "wrong" }, { ...config, unexpected: "PRIVATE" },
      { ...config, expiresAt: config.notBefore }, { ...config, notBefore: "bad" },
      { ...config, notBefore: new Date(instant + 1000).toISOString() }]
      .map(value => ({ ...env, PHYSCRATIC_RUNTIME_LOGIN_ATTESTATION: JSON.stringify(value) }))]) {
    const probe = harness(accepted, input);
    probe.attest(request());
    assert.equal(probe.tasks.length, 0);
    assert.equal(probe.acquisitions(), 0);
  }
  for (const timeout of [0, -1, Infinity, 5001]) {
    const probe = harness(accepted, env, timeout);
    probe.attest(request());
    assert.equal(probe.tasks.length, 0);
  }
});

test("only the approved deployment's unsigned-in, unfiltered collection GET can consume its attempt", () => {
  const probe = harness();
  const header = { "x-physcratic-runtime-attestation": approval };
  for (const invalid of [new Request(path), new Request(path, { method: "HEAD", headers: header }),
    new Request(path + "?source=arena", { headers: header }), new Request(path + "/other", { headers: header }),
    new Request(path, { headers: { ...header, cookie: "synthetic=signed-in" } }),
    new Request(path, { headers: { ...header, authorization: "synthetic" } })]) probe.attest(invalid);
  const replay = harness(accepted, { ...env, VERCEL_DEPLOYMENT_ID: "dpl_synthetic67890" });
  replay.attest(request());
  assert.equal(replay.tasks.length, 0);
  assert.equal(probe.tasks.length, 0);
  probe.attest(request());
  probe.attest(request());
  assert.equal(probe.tasks.length, 1);
  assert.equal(probe.acquisitions(), 0, "the response path must not acquire a client");
});

test("probe uses a bounded read-only transaction and emits only the fixed receipt", async () => {
  const probe = harness();
  probe.attest(request());
  await probe.tasks[0]();
  assert.equal(probe.acquisitions(), 1);
  const [query] = probe.queries as { text: string; query_timeout: number }[];
  assert.equal(query.query_timeout, 1000);
  assert.match(query.text, /^BEGIN READ ONLY;\s+SET LOCAL statement_timeout = '1s';/);
  assert.match(query.text, /COMMIT$/);
  assert.deepEqual(probe.releases, [false]);
  assert.deepEqual(probe.records, [{ event: "runtime_login_attestation", version: 2,
    runId: config.runId, deploymentId: env.VERCEL_DEPLOYMENT_ID, commitSha: config.commitSha,
    observedAt: new Date(instant).toISOString(), outcome: "verified" }]);
});

test("mismatch or partial failure returns only a fixed outcome and does not retry", async () => {
  for (const result of [new Error("PRIVATE_ROLE postgres://PRIVATE_PASSWORD SELECT secret"),
    { ...accepted, loginMatches: false }, { ...accepted, unassumedRole: false }, { ...accepted, databaseMatches: false }]) {
    const probe = harness(result);
    probe.attest(request());
    await probe.tasks[0]();
    probe.attest(request());
    assert.equal(probe.tasks.length, 1);
    assert.equal(probe.records.length, 1);
    assert.equal((probe.records[0] as { outcome: string }).outcome, result instanceof Error ? "unavailable" : "mismatch");
    assert.deepEqual(probe.releases, [result instanceof Error]);
    assert.doesNotMatch(JSON.stringify(probe.records), /PRIVATE|SELECT|postgres:/);
  }
});

test("expiry skips a delayed task and suppresses evidence after a late failure", async () => {
  let clock = instant;
  const delayed = harness(accepted, env, 5000, () => clock);
  delayed.attest(request());
  clock += 60_000;
  await delayed.tasks[0]();
  assert.equal(delayed.acquisitions(), 0);

  clock = instant;
  const late = harness(new Error("PRIVATE"), env, 5000, () => clock);
  late.attest(request());
  const pending = late.tasks[0]();
  clock += 60_000;
  await pending;
  assert.deepEqual(late.releases, [true]);
  assert.deepEqual(late.records, []);
});
