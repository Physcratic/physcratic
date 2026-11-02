import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Client } from "pg";

export const target = Object.freeze({ project: "divine-mode-82940461", branch: "br-solitary-thunder-b7h5q79t", endpoint: "ep-green-waterfall-b7qaw260", database: "neondb", snapshot: "snap-bitter-cloud-b75hikb1" });
export const historicalSource = "b191dd03d62aa4b01e7a3f08272b2417643f0d53";
const pinned = [
  ["0001_problem_authoring", "83ec2e53f95829aa6932a327dfd0362a3c197e190ddbcfb00a67d24a05c93d09"],
  ["0002_authored_write_limit", "c10cd7ecb9d6da65e0e95012a7dd199edac02e7a54b4fc8de86bb6c59bdc553b"],
  ["0003_author_media", "db4e91998388dafd964507571fc408f2f74fdd8b1af466469674911dc4b6db3a"],
  ["0004_authored_attempts", "e52abd4fa47e2c8abdc609fdc79c32c2f78a284df90b859463ae217abed7e423"],
  ["0005_authored_solution_access", "65dfc1a1137cf963b7e579931fde6d8c315d0bfb8dbd6c465a8cc70d741335e4"],
  ["0006_authored_discovery", "3ed763699a4e58512604fe6b738dc7e8440c1f2291501e1c29fa2da07dd8a37f"],
];
export const root = new URL("../../", import.meta.url);
export const directory = new URL("./", import.meta.url);
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const canonical = (value) => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, sort(value[key])]));
  return value;
}
export function requireCondition(condition, code) { if (!condition) throw Object.assign(new Error(code), { code }); }
export const identifier = (name) => '"' + name.replaceAll('"', '""') + '"';

export async function migrations() {
  const manifest = await readFile(new URL("docs/engineering/AUTHORING_MIGRATION_SHA256SUMS", root), "utf8");
  const files = await Promise.all(manifest.trim().split("\n").map(async (line, index) => {
    const [sha256, path] = line.split(/\s+/);
    requireCondition(/^migrations\/000[1-6]_[a-z_]+\.up\.sql$/.test(path), "INVALID_MIGRATION_MANIFEST");
    requireCondition(pinned[index]?.[1] === sha256 && path === `migrations/${pinned[index]?.[0]}.up.sql`, "PINNED_RELEASE_MANIFEST_MISMATCH");
    const sql = await readFile(new URL(path, root), "utf8");
    requireCondition(hash(sql) === sha256, "MIGRATION_CHECKSUM_MISMATCH");
    return { id: path.slice(11, -7), path, sha256, sql };
  }));
  requireCondition(files.length === 6 && files.every((f, i) => f.id.startsWith(`000${i + 1}_`)), "INVALID_MIGRATION_ORDER");
  return files;
}

// Explicit secret source only. Never fall back to inherited DATABASE_URL_UNPOOLED,
// PGHOST, PGPASSWORD, POSTGRES_* or a provider's default project/branch.
export function connection(secret, localTest = false) {
  let url;
  try { url = new URL(secret); } catch { throw new Error("DIRECT_URL_MISSING_OR_INVALID"); }
  requireCondition(["postgres:", "postgresql:"].includes(url.protocol) && url.username && url.password, "DIRECT_URL_INCOMPLETE");
  if (localTest) requireCondition(url.hostname === "127.0.0.1" && ["physcratic_authoring_test", "neondb"].includes(url.pathname.slice(1)), "LOCAL_TEST_TARGET_REFUSED");
  else {
    requireCondition(url.hostname.startsWith(`${target.endpoint}.`) && url.hostname.endsWith(".neon.tech") && !url.hostname.includes("-pooler"), "DIRECT_ENDPOINT_MISMATCH");
    requireCondition(url.pathname === `/${target.database}`, "DATABASE_MISMATCH");
    requireCondition(["require", "verify-full"].includes(url.searchParams.get("sslmode")), "TLS_REQUIRED");
  }
  return new Client({ host: url.hostname, port: Number(url.port || 5432), database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    ssl: localTest ? false : { rejectUnauthorized: true }, enableChannelBinding: !localTest,
    options: "-c search_path=pg_catalog,public", application_name: "physcratic-reviewed-authoring-release",
    connectionTimeoutMillis: 10000, query_timeout: 45000 });
}

export async function catalog(client, countRows = true) {
  // search_path affects pg_get_* deparsing; use the same setting as baselines.
  await client.query("SET LOCAL search_path=pg_catalog,public");
  const sql = await readFile(new URL("catalog-readonly.sql", directory), "utf8");
  const report = (await client.query(sql)).rows[0].report;
  report.ledger = report.ledger_columns.length
    ? (await client.query("SELECT id,sha256,source_commit,applied_at::text,applied_by,result FROM public.physcratic_integration_migrations ORDER BY id")).rows : null;
  report.counts = {};
  if (countRows) for (const relation of report.relations) {
    if (!["r", "p"].includes(relation.kind)) continue;
    requireCondition(relation.can_select && !relation.rls_active, "ROW_VISIBILITY_NOT_PROVEN");
    report.counts[relation.name] = (await client.query(`SELECT count(*)::text AS n FROM public.${identifier(relation.name)}`)).rows[0].n;
  }
  return report;
}

export async function readOnlyReport(client) {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    await client.query("SET LOCAL statement_timeout='30s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    const report = await catalog(client);
    requireCondition(report.identity.read_only === "on", "READ_ONLY_NOT_ACTIVE");
    await client.query("COMMIT"); return report;
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
}

export async function baseline(version) { return JSON.parse(await readFile(new URL(`baselines/v${version}.json`, directory), "utf8")); }
export async function classify(report, expectedDatabase = target.database) {
  const files = await migrations();
  const errors = [];
  if (report.identity.database !== expectedDatabase) errors.push("DATABASE_MISMATCH");
  if (report.identity.server_version_num !== 180006) errors.push("SERVER_VERSION_NOT_18_6");
  if (report.identity.replication_role !== "origin") errors.push("SESSION_REPLICATION_ROLE_NOT_ORIGIN");
  if (!Array.isArray(report.foreign_key_health) || report.foreign_key_health.some(f => f.trigger_count !== 4 || !f.all_origin_enabled)) errors.push("FOREIGN_KEY_INTERNAL_TRIGGERS_UNHEALTHY");
  const base = await baseline(3);
  if (!report.auth_columns.some(c => c.table === "user" && c.name === "id" && c.type === "text" && c.not_null)) errors.push("USER_ID_SCHEMA_MISMATCH");
  for (const field of ["ledger_columns", "ledger_constraints"])
    if (canonical(report[field]) !== canonical(base[field])) errors.push(`LEDGER_${field.toUpperCase()}_DRIFT`);
  const ledger = report.ledger;
  if (!ledger || ledger.length < 3 || ledger.length > 6) errors.push("UNVERIFIED_LEDGER_PREFIX");
  else for (let i = 0; i < ledger.length; i++) {
    const entry = ledger[i], expected = files[i];
    if (entry.id !== expected.id || entry.sha256 !== expected.sha256 || entry.result !== "verified" || !/^[0-9a-f]{40}$/.test(entry.source_commit || "") || !entry.applied_by || !entry.applied_at || (i < 3 && entry.source_commit !== historicalSource)) errors.push(`LEDGER_ENTRY_${i + 1}_MISMATCH`);
  }
  const catalogVersions = [];
  for (let version = 3; version <= 6; version++) if (canonical(report.catalog) === canonical((await baseline(version)).catalog)) catalogVersions.push(version);
  if (catalogVersions.length !== 1) errors.push("SCHEMA_DRIFT_PARTIAL_OR_UNRECOGNIZED");
  else if (ledger?.length !== catalogVersions[0]) errors.push("SCHEMA_LEDGER_DISAGREE_UNLEDGERED_OR_MISSING_OBJECTS");
  return { status: errors.length ? "NO_GO" : ledger.length === 6 ? "ALREADY_COMPLETE" : "EXACT_MISSING_SUFFIX",
    ledgerPrefix: ledger?.length ?? null, catalogVersion: catalogVersions.length === 1 ? catalogVersions[0] : null,
    missing: errors.length ? [] : files.slice(ledger.length).map(({ id, sha256, path }) => ({ id, sha256, path })), errors };
}

export async function verifyPackage() {
  const contents = await readFile(new URL("PACKAGE_SHA256SUMS", directory), "utf8");
  for (const line of contents.trim().split("\n")) {
    const [digest, path] = line.split(/\s+/);
    requireCondition(/^[a-zA-Z0-9_./-]+$/.test(path) && !path.includes(".."), "INVALID_PACKAGE_MANIFEST");
    requireCondition(hash(await readFile(new URL(path, directory))) === digest, "PACKAGE_CHECKSUM_MISMATCH");
  }
  return hash(contents);
}

export function validateApproval(approval, packageDigest, localTest = false) {
  requireCondition(approval.authorized === true && approval.operation === "apply_verified_missing_suffix", "MIGRATION_NOT_AUTHORIZED");
  requireCondition(approval.package_sha256 === packageDigest, "APPROVAL_PACKAGE_MISMATCH");
  requireCondition(/^[0-9a-f]{40}$/.test(approval.release_commit || ""), "RELEASE_SHA_REQUIRED");
  requireCondition(typeof approval.approved_by === "string" && approval.approved_by.trim(), "APPROVER_REQUIRED");
  requireCondition(Date.parse(approval.expires_at) > Date.now(), "APPROVAL_EXPIRED");
  for (const key of ["target_isolated", "production_endpoint_different", "schema_drift_reviewed", "role_privileges_reviewed", "writes_quiesced", "common_lock_agreed"])
    requireCondition(approval[key] === true, `APPROVAL_${key.toUpperCase()}_MISSING`);
  // Explicit user-approved staging-only risk acceptance. Never infer recovery
  // success or reserve capacity by setting false evidence flags to true.
  const exception = approval.staging_recovery_exception;
  if (exception !== undefined) {
    requireCondition(exception?.kind === "staging_snapshot_only" && exception.approved === true &&
      exception.not_for_production === true && exception.accepts_unrehearsed_restore === true &&
      exception.accepts_capacity_uncertainty === true &&
      typeof exception.approved_by === "string" && exception.approved_by.trim() &&
      typeof exception.reason === "string" && exception.reason.trim() &&
      exception.snapshot_id === target.snapshot &&
      ["project", "branch", "endpoint", "database"].every(key => exception.target?.[key] === target[key] && approval.target?.[key] === target[key]),
      "INVALID_STAGING_RECOVERY_EXCEPTION");
  } else for (const key of ["recovery_rehearsed", "recovery_capacity_reserved"])
    requireCondition(approval[key] === true, `APPROVAL_${key.toUpperCase()}_MISSING`);
  requireCondition(approval.target?.project === target.project && approval.target?.branch === target.branch && approval.target?.endpoint === target.endpoint && approval.target?.database === target.database, "APPROVAL_TARGET_MISMATCH");
  requireCondition(approval.snapshot_id === target.snapshot && approval.recovery_evidence && approval.quiescence_evidence && approval.lock_evidence, "EXECUTION_EVIDENCE_MISSING");
  requireCondition(typeof approval.expected_role === "string" && approval.expected_role.length > 0, "EXPECTED_ROLE_REQUIRED");
  requireCondition(approval.advisory_lock?.namespace === "physcratic:authoring:migrations:v1" && approval.advisory_lock?.seed === "0", "REVIEWED_LOCK_CONTRACT_MISMATCH");
  requireCondition(Array.isArray(approval.expected_missing_ids) && approval.expected_missing_ids.length > 0, "EXACT_SUFFIX_APPROVAL_REQUIRED");
  if (!localTest) requireCondition(approval.local_test !== true, "LOCAL_APPROVAL_REFUSED_REMOTELY");
}

// Hash server-side row images, xmin and ctid; fetch hashes only, never row data.
// Streaming avoids an unbounded string_agg and keeps private content out of logs.
async function fingerprint(client, relations, originalLedgerIds) {
  const result = {};
  for (const relation of relations.filter(r => ["r", "p"].includes(r.kind))) {
    const filter = relation.name === "physcratic_integration_migrations" ? " WHERE id = ANY($1::text[])" : "";
    const params = filter ? [originalLedgerIds] : [];
    await client.query(`DECLARE release_rows NO SCROLL CURSOR FOR SELECT encode(sha256(convert_to(jsonb_build_array(to_jsonb(t),xmin::text,ctid::text)::text,'UTF8')),'hex') AS digest FROM public.${identifier(relation.name)} t${filter} ORDER BY ctid`, params);
    const digest = createHash("sha256"); let count = 0;
    while (true) {
      const batch = await client.query("FETCH FORWARD 1000 FROM release_rows");
      if (!batch.rowCount) break;
      for (const row of batch.rows) { digest.update(row.digest); count++; }
    }
    await client.query("CLOSE release_rows");
    result[relation.name] = { oid: relation.oid, count, digest: digest.digest("hex") };
  }
  return result;
}

export async function executeSuffix(client, approval, { localTest = false, testFaultAfter = null } = {}) {
  validateApproval(approval, await verifyPackage(), localTest);
  requireCondition(localTest || testFaultAfter === null, "TEST_FAULT_OPTION_REFUSED");
  const files = await migrations(); let began = false, commitAttempted = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE"); began = true;
    await client.query("SET LOCAL statement_timeout='30s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL search_path=pg_catalog,public");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,$2::bigint))", [approval.advisory_lock.namespace, approval.advisory_lock.seed]);
    await client.query("LOCK TABLE public.physcratic_integration_migrations IN EXCLUSIVE MODE");
    let report = await catalog(client);
    requireCondition(report.identity.current_user === approval.expected_role, "EXECUTION_ROLE_MISMATCH");
    const decision = await classify(report, localTest ? report.identity.database : target.database);
    requireCondition(decision.status === "EXACT_MISSING_SUFFIX", "EXECUTION_PREFLIGHT_NOT_EXACT_SUFFIX");
    requireCondition(canonical(decision.missing.map(m => m.id)) === canonical(approval.expected_missing_ids), "APPROVED_SUFFIX_MISMATCH");
    requireCondition(report.relations.every(r => !["p", "f"].includes(r.kind) && !r.has_inheritance), "PARTITION_INHERITANCE_OR_FOREIGN_TABLE_REQUIRES_SEPARATE_PRESERVATION_REVIEW");
    // Quiescence must be operator-proven; these locks additionally block DML on
    // every pre-existing ordinary public table. All actors must share the lock.
    const tables = report.relations.filter(r => r.kind === "r").map(r => `public.${identifier(r.name)}`).sort();
    await client.query(`LOCK TABLE ${tables.join(",")} IN SHARE ROW EXCLUSIVE MODE`);
    // Refresh READ COMMITTED state after waiting for table locks, never migrate
    // using a stale pre-lock snapshot. Unknown/uncoordinated DDL is still a stop.
    const priorRelations = report.relations;
    report = await catalog(client);
    requireCondition(canonical(priorRelations) === canonical(report.relations), "RELATIONS_CHANGED_WHILE_LOCKING");
    requireCondition(canonical(await classify(report, localTest ? report.identity.database : target.database)) === canonical(decision), "PREFLIGHT_CHANGED_WHILE_LOCKING");
    const oldLedgerIds = report.ledger.map(r => r.id);
    const before = await fingerprint(client, report.relations, oldLedgerIds);
    for (const migration of files.slice(report.ledger.length)) {
      await client.query("SET LOCAL search_path=public,pg_catalog");
      await client.query(migration.sql);
      await client.query("INSERT INTO public.physcratic_integration_migrations(id,sha256,source_commit,result) VALUES($1,$2,$3,'verified')", [migration.id, migration.sha256, approval.release_commit]);
      if (migration.id === testFaultAfter) throw new Error("INJECTED_LOCAL_TEST_FAILURE");
      const step = await classify(await catalog(client, false), localTest ? report.identity.database : target.database);
      requireCondition(step.errors.length === 0, "POST_MIGRATION_SCHEMA_LEDGER_MISMATCH");
    }
    const after = await catalog(client);
    requireCondition((await classify(after, localTest ? report.identity.database : target.database)).status === "ALREADY_COMPLETE", "FINAL_SCHEMA_LEDGER_NOT_COMPLETE");
    requireCondition(canonical(before) === canonical(await fingerprint(client, report.relations, oldLedgerIds)), "PRE_EXISTING_RECORDS_OR_RELATIONS_CHANGED");
    commitAttempted = true; await client.query("COMMIT"); began = false;
    return { status: "COMMITTED_REQUIRES_INDEPENDENT_READ_ONLY_VALIDATION", applied: decision.missing.map(m => m.id), preservation: "unchanged", counts: after.counts };
  } catch (error) {
    if (began && !commitAttempted) await client.query("ROLLBACK").catch(() => {});
    if (commitAttempted) throw new Error("COMMIT_OUTCOME_UNCERTAIN_STOP_AND_INSPECT_LEDGER_NEVER_REPLAY");
    throw error;
  }
}
