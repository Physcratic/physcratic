import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { canonical, classify, executeSuffix, readOnlyReport, migrations, verifyPackage, validateApproval, connection, target, identifier } from "./core.mjs";
import { localClient, reset, applyFixture, fixtureSource } from "./local-fixture.mjs";
import { auditRuntime } from "./runtime-audit.mjs";

test("release package guards and suffix execution on disposable PG18.6", async t => {
  const client = await localClient();
  const db = "physcratic_authoring_test";
  const files = await migrations();
  async function seed(version = 3) { await reset(client); await applyFixture(client, 1, version); }
  async function inspect() { const report = await readOnlyReport(client); return { report, decision: await classify(report, db) }; }
  async function approved(prefix = 3) {
    return { authorized: true, operation: "apply_verified_missing_suffix", approved_by: "disposable-local-test",
      expires_at: new Date(Date.now() + 3600000).toISOString(), package_sha256: await verifyPackage(), release_commit: fixtureSource,
      expected_role: (await client.query("SELECT current_user AS role")).rows[0].role,
      target, expected_missing_ids: files.slice(prefix).map(f => f.id), snapshot_id: target.snapshot,
      target_isolated: true, production_endpoint_different: true, schema_drift_reviewed: true, role_privileges_reviewed: true,
      writes_quiesced: true, recovery_rehearsed: true, recovery_capacity_reserved: true, common_lock_agreed: true,
      recovery_evidence: "LOCAL_FIXTURE_ONLY", quiescence_evidence: "LOCAL_FIXTURE_ONLY", lock_evidence: "LOCAL_FIXTURE_ONLY",
      advisory_lock: { namespace: "physcratic:authoring:migrations:v1", seed: "0" }, local_test: true };
  }
  try {
    await t.test("read-only preflight handles exact prefix versions 3,4,5,6 and counts all public tables", async () => {
      await seed();
      for (let version = 3; version <= 6; version++) {
        if (version > 3) await applyFixture(client, version);
        const { report, decision } = await inspect();
        assert.equal(report.identity.read_only, "on");
        assert.equal(report.identity.server_version_num, 180006);
        assert.equal(decision.status, version === 6 ? "ALREADY_COMPLETE" : "EXACT_MISSING_SUFFIX");
        assert.equal(decision.catalogVersion, version);
        assert.deepEqual(decision.missing.map(f => f.id), files.slice(version).map(f => f.id));
        assert.equal(report.counts.physcratic_integration_migrations, String(version));
      }
    });
    await t.test("missing ledger is NO-GO rather than permission to replay 0001-0003", async () => {
      await seed(); await client.query("DROP TABLE public.physcratic_integration_migrations");
      assert.equal((await inspect()).decision.status, "NO_GO");
    });
    await t.test("historical checksum/source drift and fake ledger entries are NO-GO", async () => {
      for (const mutation of ["sha256=repeat('0',64)", "source_commit=repeat('a',40)"]) {
        await seed(); await client.query(`UPDATE public.physcratic_integration_migrations SET ${mutation} WHERE id='0001_problem_authoring'`);
        assert.equal((await inspect()).decision.status, "NO_GO");
      }
      await seed();
      await client.query("INSERT INTO public.physcratic_integration_migrations(id,sha256,source_commit,result) VALUES($1,$2,$3,'verified')", [files[3].id, files[3].sha256, fixtureSource]);
      assert.equal((await inspect()).decision.status, "NO_GO");
    });
    await t.test("partial objects, unledgered complete suffix and altered historical functions are NO-GO", async () => {
      await seed(); await client.query("CREATE TABLE public.authored_attempt(drift text)");
      assert.equal((await inspect()).decision.status, "NO_GO");
      await seed(); await client.query("BEGIN; SET LOCAL search_path=public,pg_catalog"); await client.query(files[3].sql); await client.query("COMMIT");
      assert.equal((await inspect()).decision.status, "NO_GO");
      await seed(); await client.query("BEGIN; SET LOCAL search_path=public,pg_catalog");
      for (const file of files.slice(3)) await client.query(file.sql);
      await client.query("COMMIT");
      const unledgered = await inspect();
      assert.equal(unledgered.decision.catalogVersion, 6);
      assert.equal(unledgered.decision.status, "NO_GO");
      await seed(); await client.query("CREATE OR REPLACE FUNCTION public.authored_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$");
      assert.equal((await inspect()).decision.status, "NO_GO");
    });
    await t.test("disabled triggers and new constraints are schema drift", async () => {
      await seed(); await client.query("ALTER TABLE public.authored_revision DISABLE TRIGGER authored_revision_immutable");
      assert.equal((await inspect()).decision.status, "NO_GO");
      await seed(); await client.query("ALTER TABLE public.authored_draft ADD CONSTRAINT extra_check CHECK(version<1000)");
      assert.equal((await inspect()).decision.status, "NO_GO");
    });
    await t.test("disabled internal FK triggers and replication-role bypass are hard stops", async () => {
      await seed();
      const trigger = (await client.query("SELECT tgname FROM pg_trigger WHERE tgrelid='public.authored_problem'::regclass AND tgisinternal LIMIT 1")).rows[0].tgname;
      await client.query(`ALTER TABLE public.authored_problem DISABLE TRIGGER ${identifier(trigger)}`);
      assert.ok((await inspect()).decision.errors.includes("FOREIGN_KEY_INTERNAL_TRIGGERS_UNHEALTHY"));
      await seed(); await client.query("SET session_replication_role=replica");
      try { assert.ok((await inspect()).decision.errors.includes("SESSION_REPLICATION_ROLE_NOT_ORIGIN")); }
      finally { await client.query("SET session_replication_role=origin"); }
    });
    await t.test("unapproved recovery/lock/package/role/suffix fails before any migration DDL", async () => {
      await seed(); const approval = await approved();
      for (const change of [{ authorized: false }, { recovery_rehearsed: false }, { recovery_capacity_reserved: false }, { common_lock_agreed: false }, { package_sha256: "bad" }])
        await assert.rejects(executeSuffix(client, { ...approval, ...change }, { localTest: true }));
      await assert.rejects(executeSuffix(client, { ...approval, expected_role: "other" }, { localTest: true }));
      await assert.rejects(executeSuffix(client, { ...approval, expected_missing_ids: [files[5].id] }, { localTest: true }));
      assert.equal((await inspect()).decision.ledgerPrefix, 3);
      const template = JSON.parse(await readFile(new URL("./approval-template.json", import.meta.url), "utf8"));
      assert.throws(() => validateApproval(template, approval.package_sha256), /MIGRATION_NOT_AUTHORIZED/);
    });
    await t.test("explicit snapshot-only exception permits this staging suffix without claiming rehearsed recovery", async () => {
      await seed();
      const approval = { ...await approved(), recovery_rehearsed: false, recovery_capacity_reserved: false,
        recovery_evidence: "USER_ACCEPTED_SNAPSHOT_ONLY_RISK_LOCAL_TEST",
        staging_recovery_exception: { kind: "staging_snapshot_only", approved: true, approved_by: "local-test-user",
          reason: "Staging-only exception; real backup and restore waived", target, snapshot_id: target.snapshot,
          not_for_production: true, accepts_unrehearsed_restore: true, accepts_capacity_uncertainty: true } };
      for (const change of [{ writes_quiesced: false }, { target_isolated: false }, { production_endpoint_different: false }, { common_lock_agreed: false }])
        await assert.rejects(executeSuffix(client, { ...approval, ...change }, { localTest: true }));
      for (const change of [{ approved: false }, { not_for_production: false }, { accepts_unrehearsed_restore: false },
        { accepts_capacity_uncertainty: false }, { reason: "" }, { snapshot_id: "other" }, { target: { ...target, branch: "production" } }])
        assert.throws(() => validateApproval({ ...approval, staging_recovery_exception: { ...approval.staging_recovery_exception, ...change } }, approval.package_sha256, true), /INVALID_STAGING_RECOVERY_EXCEPTION/);
      assert.throws(() => validateApproval({ ...approval, target: { ...target, endpoint: "production" } }, approval.package_sha256, true), /INVALID_STAGING_RECOVERY_EXCEPTION/);
      const result = await executeSuffix(client, approval, { localTest: true });
      assert.equal(result.preservation, "unchanged");
      assert.equal((await inspect()).decision.status, "ALREADY_COMPLETE");
      assert.equal(approval.recovery_rehearsed, false);
      assert.equal(approval.recovery_capacity_reserved, false);
    });
    for (const prefix of [3, 4, 5]) await t.test(`executes only the exact approved suffix after prefix ${prefix}`, async () => {
      await seed(prefix);
      await client.query('INSERT INTO public."user" VALUES(\'owner\',\'retain this user\')');
      await client.query("INSERT INTO public.authored_problem(id,slug,owner_id) VALUES('00000000-0000-4000-8000-000000000001','retained','owner')");
      await client.query(`INSERT INTO public.authored_draft(problem_id,content) VALUES('00000000-0000-4000-8000-000000000001','{"private":"retain native draft"}')`);
      await client.query("CREATE TABLE public.unrelated_history(id integer PRIMARY KEY,body text); INSERT INTO public.unrelated_history VALUES(1,'retain other user records')");
      const before = (await client.query("SELECT id,sha256,source_commit,applied_at::text,applied_by,result FROM public.physcratic_integration_migrations ORDER BY id")).rows;
      const result = await executeSuffix(client, await approved(prefix), { localTest: true });
      assert.deepEqual(result.applied, files.slice(prefix).map(f => f.id));
      assert.equal(result.preservation, "unchanged");
      const { report, decision } = await inspect();
      assert.equal(decision.status, "ALREADY_COMPLETE");
      assert.deepEqual(report.ledger.slice(0, prefix), before);
      assert.equal(report.counts.user, "1"); assert.equal(report.counts.unrelated_history, "1");
    });
    await t.test("failure after 0005 rolls back schema and ledger, preserving old records", async () => {
      await seed(); await client.query('INSERT INTO public."user" VALUES(\'owner\',\'retain\')');
      const before = await inspect();
      await assert.rejects(executeSuffix(client, await approved(), { localTest: true, testFaultAfter: files[4].id }), /INJECTED_LOCAL_TEST_FAILURE/);
      const after = await inspect();
      assert.equal(after.decision.ledgerPrefix, 3);
      assert.equal(canonical(after.report.catalog), canonical(before.report.catalog));
      assert.deepEqual(after.report.ledger, before.report.ledger); assert.deepEqual(after.report.counts, before.report.counts);
    });
    await t.test("a new immutable attempt's constraint/guard signature must match the approved PG18.6 catalog", async () => {
      await seed(4); await client.query("ALTER TABLE public.authored_attempt DROP CONSTRAINT authored_attempt_assisted_check");
      assert.equal((await inspect()).decision.status, "NO_GO");
    });
    await t.test("operator CLI collects read-only, rejects remote use of local approval, executes locally and verifies a new connection", async () => {
      await seed();
      const temp = await mkdtemp("work/neon-release-audit/local-cli-");
      const operator = fileURLToPath(new URL("./operator.mjs", import.meta.url));
      const env = { ...process.env, AUTHORING_RELEASE_DIRECT_URL: process.env.AUTHORING_TEST_DATABASE_URL };
      const run = args => execFileSync(process.execPath, [operator, ...args], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const first = JSON.parse(run(["collect-readonly", "--local-test", "--out", `${temp}/preflight.json`]));
      assert.equal(first.status, "EXACT_MISSING_SUFFIX");
      const approval = await approved();
      const file = `${temp}/LOCAL_TEST_APPROVAL_NOT_FOR_REMOTE.json`;
      await writeFile(file, JSON.stringify(approval), { mode: 0o600 });
      assert.throws(() => run(["execute-missing-suffix", "--approval", file]), error => error.stderr.includes("LOCAL_APPROVAL_REFUSED_REMOTELY"));
      const applied = JSON.parse(run(["execute-missing-suffix", "--local-test", "--approval", file]));
      assert.equal(applied.preservation, "unchanged");
      const verified = JSON.parse(run(["verify-postcommit-readonly", "--local-test", "--approval", file, "--out", `${temp}/postcommit.json`]));
      assert.equal(verified.status, "ALREADY_COMPLETE");
      await writeFile(file, JSON.stringify({ ...approval, release_commit: "a".repeat(40) }));
      assert.throws(() => run(["verify-postcommit-readonly", "--local-test", "--approval", file, "--out", `${temp}/wrong-source.json`]), error => error.status === 2);
    });
    await t.test("RLS-limited counts fail rather than reporting a misleading zero", async () => {
      await seed();
      await client.query("CREATE ROLE release_package_reader NOLOGIN; GRANT USAGE ON SCHEMA public TO release_package_reader; GRANT SELECT ON ALL TABLES IN SCHEMA public TO release_package_reader");
      await client.query("ALTER TABLE public.authored_draft ENABLE ROW LEVEL SECURITY; CREATE POLICY no_rows ON public.authored_draft USING(false)");
      await client.query("SET ROLE release_package_reader");
      try { await assert.rejects(readOnlyReport(client), /ROW_VISIBILITY_NOT_PROVEN/); }
      finally { await client.query("RESET ROLE"); }
    });
  } finally { await client.end(); }
});

test("connection and environment audits do not use or disclose shared credentials", () => {
  assert.throws(() => connection("postgresql://u:p@ep-production.aws.neon.tech/neondb?sslmode=require"), /DIRECT_ENDPOINT_MISMATCH/);
  assert.throws(() => connection("postgresql://u:p@ep-green-waterfall-b7qaw260-pooler.aws.neon.tech/neondb?sslmode=require"), /DIRECT_ENDPOINT_MISMATCH/);
  assert.throws(() => connection("postgresql://u:p@ep-green-waterfall-b7qaw260.aws.neon.tech/neondb?sslmode=disable"), /TLS_REQUIRED/);
  assert.throws(() => connection("postgresql://u:p@ep-green-waterfall-b7qaw260.aws.neon.tech/neondb?sslmode=require", true), /LOCAL_TEST_TARGET_REFUSED/);
  const preview = { DATABASE_URL: "postgresql://local-user:synthetic-password@ep-green-waterfall-b7qaw260-pooler.aws.neon.tech/neondb?sslmode=require",
    DATABASE_URL_UNPOOLED: "postgresql://other-user:synthetic-password@ep-production.aws.neon.tech/neondb?sslmode=require", POSTGRES_PASSWORD: "synthetic-password", PGHOST: "ep-production.aws.neon.tech", BETTER_AUTH_SECRET: "synthetic-preview-secret",
    STAGING_VERIFICATION_EMAIL_ALLOWLIST: "allowed@example.invalid", AUTHORING_STAGING_BLOB_ENABLED: "1", AUTHORING_STAGING_BLOB_STORE_ID: "store_3XHvtHs2UM4ZFD5d" };
  const result = auditRuntime(preview, { DATABASE_URL: preview.DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET: "synthetic-production-secret" });
  assert.equal(result.preview_binding.expected_endpoint, true); assert.equal(result.distinct_endpoints, true);
  assert.ok(result.non_target_or_unverifiable_aliases.includes("DATABASE_URL_UNPOOLED"));
  assert.equal(result.application_email_allowlist_enforced, true);
  assert.ok(result.nonempty_aliases_blocking_staging_database.includes("DATABASE_URL_UNPOOLED"));
  assert.ok(result.nonempty_aliases_blocking_staging_database.includes("POSTGRES_PASSWORD"));
  assert.equal(result.staging_auth_configuration_valid, false);
  assert.deepEqual(result.effective_trusted_origins, []);
  const output = JSON.stringify(result);
  for (const secret of ["synthetic-password", "local-user", "other-user", "synthetic-preview-secret", "synthetic-production-secret", "postgresql://"]) assert.equal(output.includes(secret), false);
});
