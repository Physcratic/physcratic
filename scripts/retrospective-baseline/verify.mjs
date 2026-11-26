import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { captureTransport, runPsqlCapture } from "./transport.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const local = name => readFileSync(new URL(name, import.meta.url));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const digestPattern = /^[0-9a-f]{64}$/;
const commitPattern = /^[0-9a-f]{40}$/;
const encode = value => JSON.stringify(value);
const same = (a, b) => encode([...a].sort()) === encode([...b].sort());

const sourcePins = {
  "0020_authored_public_solutions": "bf82e81c46ec434cf6976e1b1f25dba6fe963266",
  "0026_account_deletion_blockers": "ee236380364a0a0f96145ac1ac753cb5cca11c4f",
};
const runtimeContract = {
  "relation:authored_revision": ["SELECT", "INSERT"],
  "relation:authored_attempt": ["SELECT", "INSERT"],
  "relation:community_favourite": ["SELECT", "INSERT", "DELETE"],
  "relation:community_favourite_limit": ["SELECT", "INSERT", "UPDATE"],
  "relation:community_problem_total": ["SELECT"],
  "relation:community_profile": ["SELECT", "INSERT", "UPDATE"],
  "relation:community_profile_write_limit": ["SELECT", "INSERT", "UPDATE"],
  "relation:community_badge_selection": ["SELECT", "INSERT", "UPDATE"],
  "relation:community_achievement_write_limit": ["SELECT", "INSERT", "UPDATE"],
  "relation:community_external_approved_medal": ["SELECT"],
  "routine:public.community_showcase_ids_valid(text[])": ["EXECUTE"],
};
const protectedRelations = new Set([
  "relation:community_external_medal", "relation:community_external_medal_audit",
  "relation:account_deletion_publication", "relation:account_deletion_outbox",
  "relation:account_deletion_pending_upload", "relation:physcratic_production_migrations",
]);
const booleanProbe = "routine:public.account_deletion_mutation_allowed(oid,text,jsonb,jsonb)";
const uploadAck = "routine:public.account_deletion_upload_finished(text,text,text)";
const restrictionDecision = "routine:public.community_restriction_decide(text,text,text,integer,boolean,text)";

function differences(label, expected, actual, findings) {
  const wanted = new Set(expected);
  const observed = new Set(actual);
  for (const key of wanted) if (!observed.has(key)) findings.push({ check: label, state: "missing", key });
  for (const key of observed) if (!wanted.has(key)) findings.push({ check: label, state: "unexpected", key });
  if (actual.length !== observed.size) findings.push({ check: label, state: "duplicate entry" });
}

function verifyPackage(expected) {
  const manifest = local("PACKAGE_SHA256SUMS");
  if (!digestPattern.test(expected) || sha(manifest) !== expected) throw Error("Package manifest checksum mismatch");
  for (const entry of manifest.toString("utf8").trimEnd().split("\n")) {
    const match = /^([a-f0-9]{64})  ([a-zA-Z0-9_./-]+)$/.exec(entry);
    if (!match || match[2].includes("..") || sha(readFileSync(root + match[2])) !== match[1]) {
      throw Error("Package file checksum mismatch");
    }
  }
}

function validatePlan(plan, reference) {
  const target = plan.target;
  if (plan.version !== 1 || !target || !plan.approvalToInspect?.trim() || !target.providerBindingRef?.trim()
    || !target.providerProject?.trim() || !target.providerBranch?.trim() || !/^[a-zA-Z0-9.-]+$/.test(target.endpoint ?? "")
    || !Number.isInteger(target.port) || target.port < 1 || target.port > 65535
    || !plan.ownershipAndAclEvidence?.trim() || !plan.objectOwner?.trim() || !plan.runtimeRole?.trim()
    || plan.runtimeRole === target.login || !/^[A-Za-z0-9_.-]+$/.test(target.database ?? "")
    || ![target.login, target.databaseOwner, target.schemaOwner].every(x => x?.trim())
    || !Number.isInteger(target.version) || target.version < 180000 || target.version > 189999
    || !plan.expectedLaterMigrations || !plan.ownerOverrides || !Array.isArray(plan.additionalGrants)
    || !Array.isArray(plan.publicRevocations) || !Array.isArray(plan.defaultAcl)
    || !Array.isArray(plan.roleMemberships)) throw Error("Incomplete inspection plan");
  for (const [id, entry] of Object.entries(plan.expectedLaterMigrations)) {
    if (!Object.hasOwn(reference.overlays, id) || !commitPattern.test(entry.sourceCommit) || !entry.authorizationRef?.trim()) {
      throw Error("Invalid later migration expectation");
    }
  }
  for (const grant of plan.additionalGrants) {
    if (!Array.isArray(grant) || grant.length !== 6 || grant.slice(0, 5).some(s => typeof s !== "string")
      || !grant[0] || !grant[2] || grant[2] === "PUBLIC" || !grant[3] || !grant[4] || grant[5] !== false) {
      throw Error("Invalid explicit grant");
    }
  }
}

function verifyLedger(ledger, target, plan, reference, findings) {
  const expected = Object.keys(reference.migrations).filter(id =>
    !Object.hasOwn(reference.overlays, id) || Object.hasOwn(plan.expectedLaterMigrations, id));
  differences("ledger IDs", expected, ledger.map(r => r.id), findings);
  const capturedAt = Date.parse(target.capturedAt);
  for (const row of ledger) {
    const expectedSha = reference.migrations[row.id];
    const expectedLaterSource = plan.expectedLaterMigrations[row.id]?.sourceCommit;
    if (!digestPattern.test(expectedSha) || row.sha256 !== expectedSha || row.result !== "verified"
      || !commitPattern.test(row.sourceCommit) || (sourcePins[row.id] && row.sourceCommit !== sourcePins[row.id])
      || (expectedLaterSource && row.sourceCommit !== expectedLaterSource)
      || !row.appliedBy?.trim() || !Number.isFinite(Date.parse(row.appliedAt)) || Date.parse(row.appliedAt) > capturedAt) {
      findings.push({ check: "ledger checksum, provenance or result", key: row.id });
      continue;
    }
    // Compare the exact recorded Git object without fetching or running it.
    const source = spawnSync("git", ["show", row.sourceCommit + ":migrations/" + row.id + ".up.sql"], { cwd: root });
    if (source.status !== 0 || sha(source.stdout) !== expectedSha) {
      findings.push({ check: "recorded source migration bytes unavailable or different", key: row.id });
    }
  }
}

function verifyCatalogue(capture, plan, reference, findings) {
  const expected = { ...reference.catalogue };
  for (const id of Object.keys(plan.expectedLaterMigrations).sort()) {
    for (const [key, digest] of Object.entries(reference.overlays[id].catalogue)) {
      if (digest === null) delete expected[key];
      else expected[key] = digest;
    }
  }
  differences("catalogue objects", Object.keys(expected), Object.keys(capture.catalogue), findings);
  for (const [key, value] of Object.entries(capture.catalogue)) {
    if (Object.hasOwn(expected, key) && sha(encode(value)) !== expected[key]) {
      findings.push({ check: "catalogue definition or state", key });
    }
  }
  const owned = Object.keys(expected).filter(key => key.startsWith("relation:") || key.startsWith("routine:"));
  differences("owned objects", owned, Object.keys(capture.owners), findings);
  for (const [key, owner] of Object.entries(plan.ownerOverrides)) {
    if (!owned.includes(key) || !owner.role?.trim() || !owner.evidence?.trim()) throw Error("Invalid owner exception");
  }
  for (const key of owned) {
    const expectedOwner = plan.ownerOverrides[key]?.role ?? plan.objectOwner;
    if (capture.owners[key] !== expectedOwner || expectedOwner === plan.runtimeRole) findings.push({ check: "object owner", key });
  }
}

function verifySecurity(capture, plan, reference, findings) {
  const runtime = capture.runtime;
  if (runtime.role !== plan.runtimeRole || !runtime.restricted || !runtime.connect || !runtime.schemaUsage
    || runtime.databaseCreate || runtime.schemaCreate || runtime.memberships.length || capture.publicCreate !== false
    || [capture.target.schemaOwner, capture.target.databaseOwner].includes(runtime.role)) {
    findings.push({ check: "runtime LOGIN, memberships or database/schema privileges" });
  }
  const publicGrants = [...reference.publicGrants];
  for (const id of Object.keys(plan.expectedLaterMigrations)) publicGrants.push(...reference.overlays[id].publicGrants);
  if (!plan.publicRevocations.every(entry => entry[0] !== booleanProbe
    && publicGrants.some(known => encode(known) === encode(entry)))) {
    throw Error("Invalid recorded PUBLIC revocation");
  }
  const expectedAcl = publicGrants.filter(entry => !plan.publicRevocations.some(revoked => encode(revoked) === encode(entry)))
    .map(([key, privilege]) => [key, "", "PUBLIC", plan.ownerOverrides[key]?.role ?? plan.objectOwner, privilege, false])
    .concat(plan.additionalGrants);
  if (new Set(expectedAcl.map(encode)).size !== expectedAcl.length) throw Error("Duplicate ACL expectation");
  differences("nonowner ACL", expectedAcl.map(encode), capture.acl.map(encode), findings);
  differences("creator default ACL", plan.defaultAcl.map(encode), capture.defaultAcl.map(encode), findings);
  differences("memberships in scoped owner or grantee roles", plan.roleMemberships.map(encode), capture.roleMemberships.map(encode), findings);
  for (const [creator, , objectType, grantee, , , grantable] of capture.defaultAcl) {
    if (grantee === plan.runtimeRole || (grantee === "PUBLIC" && objectType !== "f") || grantable) {
      findings.push({ check: "unsafe creator default ACL", key: creator });
    }
  }

  const wantedRights = { ...runtimeContract };
  if (Object.hasOwn(plan.expectedLaterMigrations, "0026_account_deletion_blockers")) wantedRights[uploadAck] = ["EXECUTE"];
  for (const [key, rights] of Object.entries(wantedRights)) {
    if (!same(rights, capture.effective[key]?.rights ?? [])) findings.push({ check: "required scoped runtime rights", key });
  }
  const runtimeAcl = expectedAcl.filter(([, , grantee]) => grantee === "PUBLIC" || grantee === plan.runtimeRole);
  const rightsFromAcl = (key, columns) => [...new Set(runtimeAcl.filter(([k, col]) => k === key && columns.includes(col))
    .map(row => row[4]))];
  differences("effective privilege objects", Object.keys(capture.owners), Object.keys(capture.effective), findings);
  for (const [key, { rights, grantOption }] of Object.entries(capture.effective)) {
    const deniedRoutine = key.startsWith("routine:public.community_external_medal_")
      || (key.startsWith("routine:public.account_deletion_") && key !== booleanProbe && key !== uploadAck)
      || (key.startsWith("routine:") && capture.catalogue[key]?.[2]
        && ![booleanProbe, uploadAck, restrictionDecision].includes(key));
    const deniedUser = key === "relation:user" && rights.some(right => !["SELECT", "INSERT", "UPDATE"].includes(right));
    if (grantOption || !same(rights, rightsFromAcl(key, [""])) || deniedUser
      || (rights.length && (protectedRelations.has(key) || deniedRoutine))) {
      findings.push({ check: "effective runtime rights or grant option", key });
    }
  }
  for (const [key, column, rights, grantOption] of capture.effectiveColumns) {
    const expected = rightsFromAcl(key, ["", column]).filter(right => ["SELECT", "INSERT", "UPDATE", "REFERENCES"].includes(right));
    if (grantOption || !same(rights, expected) || (protectedRelations.has(key) && rights.length)
      || (wantedRights[key] && rights.some(right => !wantedRights[key].includes(right)))) {
      findings.push({ check: "effective runtime column rights or grant option", key: key + "." + column });
    }
  }
  if (capture.ownerDependenciesOk !== true) findings.push({ check: "trusted guard and projection dependencies" });
}

try {
  const [planPath, expectedPlan, expectedManifest, capturePath, mode, ...extra] = process.argv.slice(2);
  if (!capturePath || extra.length || (mode && mode !== "--capture")) {
    throw Error("Usage: node verify.mjs PLAN PLAN_SHA256 MANIFEST_SHA256 CAPTURE [--capture]");
  }
  verifyPackage(expectedManifest);
  const planBytes = readFileSync(planPath);
  if (!digestPattern.test(expectedPlan) || sha(planBytes) !== expectedPlan) throw Error("Inspection plan checksum mismatch");
  const plan = JSON.parse(planBytes);
  const reference = JSON.parse(local("reference.json"));
  validatePlan(plan, reference);
  if (mode === "--capture") runPsqlCapture(plan, capturePath);
  const captureBytes = readFileSync(capturePath);
  const capture = JSON.parse(captureBytes);
  if (capture.captureVersion !== 2) throw Error("Unexpected capture format");
  const findings = [];
  for (const key of ["database", "login", "version", "databaseOwner", "schemaOwner"]) {
    if (capture.target[key] !== plan.target[key]) findings.push({ check: "capture target", key });
  }
  const transport = captureTransport(capture);
  if (!transport) findings.push({ check: "client or backend transport evidence" });
  if (!Number.isFinite(Date.parse(capture.target.capturedAt))) findings.push({ check: "capture timestamp" });
  if (capture.inconsistentConsent !== 0) findings.push({ check: "inconsistent consent" });
  verifyLedger(capture.ledger, capture.target, plan, reference, findings);
  verifyCatalogue(capture, plan, reference, findings);
  verifySecurity(capture, plan, reference, findings);
  console.log(JSON.stringify({
    status: findings.length ? "DRIFT_OR_UNVERIFIED" : "CATALOGUE_MATCH_PENDING_REVIEW",
    capturedAt: capture.target.capturedAt,
    transport,
    captureSha256: sha(captureBytes),
    ledgerSha256: sha(encode(capture.ledger)),
    packageManifestSha256: expectedManifest,
    planSha256: expectedPlan,
    expectedLaterMigrations: Object.keys(plan.expectedLaterMigrations).sort(),
    findings,
  }, null, 2));
  if (findings.length) process.exitCode = 2;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
