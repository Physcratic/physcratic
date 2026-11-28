import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { put } from "@vercel/blob";
import pg from "pg";
import { probe } from "../account-deletion-0026/provider-probe.mjs";

const storeId = "store_3XHvtHs2UM4ZFD5d";
const database = "physcratic_authoring_test";
const port = 55440;
const controlOwner = "synthetic-phase5b-b";
const removedOwner = "synthetic-phase5b-blob-removed";
const pixels = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/4bkAAAAASUVORK5CYII=", "base64");

async function main() {
  const mode = process.argv[3] ?? "prepare";
  assert.ok(process.argv.length <= 4 && ["prepare", "proxy-before", "probe", "proxy-after"].includes(mode));
  const root = await realpath(process.argv[2]);
  assert.equal(basename(root), "Physcratic-Phase5B-Blob", "Use the new dedicated fixture directory");
  assert.ok(process.env.VERCEL_ENV !== "production" && process.env.VERCEL_TARGET_ENV !== "production");
  assert.equal(process.env.VERCEL_BLOB_RETRIES, "0");
  assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, "0");
  for (const key of Object.keys(process.env)) {
    assert.ok(!/^(?:NEXT_PUBLIC_)?VERCEL_BLOB_(?:API_URL|API_VERSION_OVERRIDE|PROXY_THROUGH_ALTERNATIVE_API)$|^(?:NEXT_PUBLIC_)?(?:NODE_)?DEBUG$|^NODE_DEBUG_NATIVE$/i.test(key));
  }
  const token = process.env.PHASE5B_BLOB_TOKEN;
  if (!/^vercel_blob_rw_3XHvtHs2UM4ZFD5d_[A-Za-z0-9_-]+$/.test(token ?? "") ||
      token !== token.trim() || process.env.PHASE5B_BLOB_OIDC_TOKEN !== undefined) {
    throw new Error("A matching store token is required.");
  }

  const state = JSON.parse(await readFile(join(root, "fixture-state.json"), "utf8"));
  assert.equal(state.port, port, "Use the dedicated port");
  assert.equal(state.appPort, 3318);
  assert.equal(await realpath(state.data), await realpath(join(root, "data")));
  assert.equal(state.withCompletions, false);
  assert.match(state.secrets.admin, /^[a-f0-9]{64}$/);
  const receipt = randomUUID();
  const controlToken = randomBytes(32).toString("hex");
  const objects = Object.fromEntries(["control", "terminal", "held"].map(mode => {
    const id = randomUUID();
    const subject = mode === "control" ? controlOwner : removedOwner;
    return [mode, { id, pathname: `solution-evidence/${subject}/${id}.png` }];
  }));
  const file = join(root, "synthetic.png");
  const proofPath = join(root, "blob-fixtures.json");
  const client = new pg.Client({
    host: "127.0.0.1", port, database, user: "phase5b_cluster_admin", password: state.secrets.admin,
    ssl: false, connectionTimeoutMillis: 5000, statement_timeout: 10000,
  });
  await client.connect();
  try {
    const { rows: [target] } = await client.query(`SELECT current_database() db, session_user login, current_user effective,
      host(inet_server_addr()) host, inet_server_port() port, current_setting('data_directory') data,
      current_setting('server_version_num') version`);
    assert.equal(await realpath(target.data), await realpath(state.data));
    assert.deepEqual({ ...target, data: undefined }, { data: undefined, db: database, login: "phase5b_cluster_admin",
      effective: "phase5b_cluster_admin", host: "127.0.0.1", port, version: "180007" });
    if (mode !== "prepare") {
      await verifyFixture(client, root, mode);
      return;
    }
    await client.query("BEGIN; SET LOCAL ROLE phase5b_owner; SET LOCAL search_path=pg_catalog,public,pg_temp");
    const { rows: [baseline] } = await client.query(`SELECT
      EXISTS(SELECT FROM "user" WHERE id=$1 AND "emailVerified") AS control_ready,
      NOT EXISTS(SELECT FROM "user" WHERE id=$2) AS removed_absent,
      NOT EXISTS(SELECT FROM account_deletion_outbox) AS empty_outbox,
      to_regprocedure('public.account_deletion_upload_finished(text,text,text)') IS NOT NULL AS ready`,
    [controlOwner, removedOwner]);
    assert.deepEqual(baseline, { control_ready: true, removed_absent: true, empty_outbox: true, ready: true });
    await writeFile(file, pixels, { flag: "wx", mode: 0o600 });
    await writeFile(proofPath, JSON.stringify({ storeId, provider: "author", file, receipt, objects }, null, 2) + "\n",
      { flag: "wx", mode: 0o600 });

    // Seed only the post-erasure provider boundary. This fixture does not replay
    // deletion, create restored credentials, or change the existing A/B records.
    await client.query("SELECT set_config('physcratic.private_upload_token',$1,true)", [controlToken]);
    await client.query(`INSERT INTO solution_evidence(id,"userId",pathname,filename,"mediaType",bytes,sha256)
       VALUES($1,$2,$3,'synthetic.png','image/png',$4,$5)`, [objects.control.id, controlOwner,
      objects.control.pathname, pixels.length, createHash("sha256").update(pixels).digest("hex")]);
    await client.query(`INSERT INTO account_deletion_receipt_store(id,nonce,actor_tag,expires_at)
      VALUES($1,$2,'synthetic-provider-fixture',clock_timestamp()+interval '6 hours')`,
    [receipt, createHash("sha256").update(randomUUID()).digest("hex")]);
    await client.query(`INSERT INTO account_deletion_outbox(deletion_id,provider,pathname)
      VALUES($1,'author',$2),($1,'author',$3)`, [receipt, objects.terminal.pathname, objects.held.pathname]);
    await client.query(`INSERT INTO account_deletion_pending_upload(provider,pathname) VALUES('author',$1)`, [objects.held.pathname]);
    await client.query("COMMIT");
    for (const { pathname } of Object.values(objects)) {
      await put(pathname, pixels, {
        token, access: "private", contentType: "image/png", addRandomSuffix: false,
        allowOverwrite: false, abortSignal: AbortSignal.timeout(10000),
      });
    }
    await client.query("SELECT public.account_deletion_upload_finished('author',$1,$2)",
      [objects.control.pathname, controlToken]);
    await writeFile(join(root, "blob-fixtures.ready"), "BLOB_FIXTURES_READY\n", { flag: "wx", mode: 0o600 });
    console.log("BLOB_FIXTURES_READY");
  } finally {
    await client.end();
  }
}

async function verifyFixture(client, root, mode) {
  assert.equal(await readFile(join(root, "blob-fixtures.ready"), "utf8"), "BLOB_FIXTURES_READY\n");
  const { storeId: recordedStore, provider, file, receipt, objects } = JSON.parse(
    await readFile(join(root, "blob-fixtures.json"), "utf8"),
  );
  assert.equal(recordedStore, storeId);
  assert.equal(provider, "author");
  assert.equal(file, join(root, "synthetic.png"));
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
  assert.match(receipt, uuid);
  assert.equal(new Set(Object.values(objects).map(object => object.id)).size, 3);
  for (const key of ["control", "terminal", "held"]) {
    assert.match(objects[key].id, uuid);
    const owner = key === "control" ? controlOwner : removedOwner;
    assert.equal(objects[key].pathname, `solution-evidence/${owner}/${objects[key].id}.png`);
  }
  const bytes = await readFile(file);
  assert.deepEqual(bytes, pixels);
  const snapshot = async () => {
    const { rows: [row] } = await client.query(`SELECT
      (SELECT to_jsonb(u) FROM "user" u WHERE id=$1 AND "emailVerified") AS control_owner,
      NOT EXISTS(SELECT FROM "user" WHERE id=$2) AS removed_absent,
      EXISTS(SELECT FROM solution_evidence WHERE "userId"=$1 AND pathname=$3) AS control_exists,
      (SELECT jsonb_agg(jsonb_build_object('path',o.pathname,'state',o.state,'attempts',o.attempts,
        'held_since',u.recorded_at,'due',o.available_at<=clock_timestamp()) ORDER BY o.pathname)
       FROM account_deletion_outbox o LEFT JOIN account_deletion_pending_upload u USING (provider,pathname)
       WHERE o.provider='author' AND o.deletion_id=$4) AS jobs,
      (SELECT count(*)::int FROM account_deletion_outbox) AS all_jobs,
      EXISTS(SELECT FROM account_deletion_receipt_store WHERE id=$4 AND expires_at>clock_timestamp()) AS active_receipt`,
    [controlOwner, removedOwner, objects.control.pathname, receipt]);
    assert.ok(row.control_owner && row.removed_absent && row.control_exists && row.active_receipt);
    assert.equal(row.all_jobs, 2);
    assert.equal(row.jobs.length, 2);
    const terminal = row.jobs.find(job => job.path === objects.terminal.pathname);
    const held = row.jobs.find(job => job.path === objects.held.pathname);
    assert.ok(held?.held_since && held.state === "pending" && held.attempts === 0);
    assert.ok(terminal && !terminal.held_since && terminal.due);
    return { terminal, held };
  };
  const before = await snapshot();
  assert.equal(before.terminal.state, "pending");
  assert.equal(before.terminal.attempts, 0);
  if (mode === "proxy-before" || mode === "proxy-after") {
    await verifyProxy(objects, bytes);
    console.log(mode === "proxy-before" ? "APP_ACCESS_VERIFIED_BEFORE" : "APP_ACCESS_VERIFIED_AFTER");
    if (mode === "proxy-after") {
      const admin = await signIn("admin1");
      const response = await appRequest("/api/admin/account-deletion", {
        method: "POST",
        headers: { cookie: admin, "content-type": "application/json" },
        body: JSON.stringify({ password: fixturePassword("admin1"), action: "cleanup", payload: {} }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { processed: 1, completed: true });
      const after = await snapshot();
      assert.equal(after.terminal.state, "complete");
      assert.equal(after.terminal.attempts, 1);
      assert.deepEqual(after.held, before.held);
      console.log("TERMINAL_ACKNOWLEDGED_HELD_PENDING");
    }
    return;
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  for (const [key, probeMode, expected] of [
    ["control", "inspect", "ORIGIN_PRESENT_MATCHED"],
    ["terminal", "repeat", "REPEAT_DELETE_ORIGIN_ABSENT"],
    ["held", "held", "HELD_ORIGIN_ABSENT_KEEP_PENDING"],
    ["control", "inspect", "ORIGIN_PRESENT_MATCHED"],
  ]) {
    const result = await probe({ mode: probeMode, storeId, pathname: objects[key].pathname, sha256 });
    assert.equal(result, expected);
    console.log(result);
  }
  assert.deepEqual(await snapshot(), before);
  console.log("HELD_JOB_AND_RECEIPT_UNCHANGED");
}

function appRequest(path, options = {}) {
  const origin = "http://127.0.0.1:3318";
  return fetch(origin + path, {
    ...options, headers: { origin, ...options.headers },
    redirect: "error", signal: AbortSignal.timeout(60_000),
  });
}

const fixturePassword = label => `Phase5B-local-${label}-only!`;

async function signIn(label) {
  const response = await appRequest("/api/auth/sign-in/email", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `phase5b-${label}@example.invalid`, password: fixturePassword(label) }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.id, `synthetic-phase5b-${label}`);
  const cookie = response.headers.getSetCookie().map(value => value.split(";", 1)[0])
    .find(value => /^better-auth\.session_token=/.test(value));
  assert.ok(cookie);
  return cookie;
}

async function verifyProxy(objects, bytes) {
  const path = id => "/api/solution-evidence/" + id;
  const guest = await appRequest(path(objects.held.id));
  assert.equal(guest.status, 401);
  await guest.body?.cancel();

  const cookie = await signIn("b");
  const held = await appRequest(path(objects.held.id), { headers: { cookie } });
  assert.equal(held.status, 404);
  await held.body?.cancel();
  const control = await appRequest(path(objects.control.id), { headers: { cookie } });
  assert.equal(control.status, 200);
  assert.match(control.headers.get("cache-control"), /private, no-store/);
  assert.deepEqual(Buffer.from(await control.arrayBuffer()), bytes);
}

main().catch(() => {
  console.error("BLOB_FIXTURE_OPERATION_STOPPED. Preserve the private fixture record. Reconcile the exact object and job before repeating any provider write.");
  process.exitCode = 1;
});
