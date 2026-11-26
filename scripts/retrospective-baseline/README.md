# Retrospective migration baseline inspection

Phase 5B remains on hold. This package prepares a read-only comparison for 0020, 0021, 0022 and 0024. It produces evidence for independent review and explicit owner acceptance. The [dated acceptance record](../../docs/engineering/RETROSPECTIVE_BASELINE_ACCEPTANCE.md) is pending. Earlier installation outputs provide corroboration with the limits in that record.

## What the comparison checks

- The complete observed numbered ledger must match the reviewed migration IDs and up-file SHA-256 values. Rows 0001 through 0018 and 0020, 0021, 0022 and 0024 are required. Each row must be verified and have attributable, plausible metadata. Check the recorded source commit against the exact up-file bytes using local Git. 0020 and 0026 also have original source pins. Matching a source file establishes source consistency. Original authorization and execution history require independent evidence.
- The scoped catalogue covers public-solution consent and eligibility, the favourites constraint and aggregate protection, signup and profile publication, external awards and their projection and guards. It also checks relevant earlier dependencies and selected later surfaces. Inspect types/defaults/nullability, constraints and FK trigger state, index definitions and readiness, application trigger definitions and enablement, view SQL and options, and scoped routine definitions and execution settings. One aggregate checks current 0020 consent consistency. The capture contains no student rows, Tally references, or object paths. Existing base-auth and evidence tables have partial structural scope as defined in the SQL. This is a focused baseline alongside the existing complete release checks.
- Ownership is checked against named approved roles. Nonowner table, column and function ACLs and creator default ACLs are compared with separately reviewed expectations. The capture resolves ordinary runtime effective privileges, including column grants, grant options and role memberships. The medal projection, private medal tables, operator routines and erasure routines retain their separate permission boundaries. Review the actual serving role through its own identity evidence. The inspection LOGIN and database name alone cannot identify the serving role or provider branch.
- The reference was generated from the exact checked-in migrations in empty disposable PostgreSQL 18.7. The 0019, 0023, 0025 and 0026 changes have separate expected deltas. The operator enumerates only already-authorized, expected installations in the private plan. Unlisted ledger rows or scoped objects, missing rows or definitions, mismatched source, unexpected roles or grants, and unsupported versions stop acceptance. A match for 0025 or 0026 does not accept either track's installation, grants or activation. A 0025 install preflight still requires its own absent-state checks.

## Prepare the private inspection plan

1. Obtain separate read-only inspection authorization. Verify the repository SHA, manifest digest and exact target against an independent owner record. Independently match Neon project, branch, direct endpoint, database, version, inspection LOGIN and current serving LOGIN on the pooled/direct bindings. Use the identity procedure in [runtime-role](../runtime-role/README.md) and keep its results private. Coordinate a quiet capture window with the 0026 operator. Repeat the capture after any approved migration, ACL, ownership, binding or relevant code change before accepting the baseline.
2. Copy `inspection-plan.template.json` to an access-restricted folder outside the repository. Fill it from the approved target and ownership/ACL evidence, using the observations as material for review. Each expected optional migration has the form `"0023_author_credit":{"sourceCommit":"<exact full SHA>","authorizationRef":"<owner evidence reference>"}`. An observed later row without independent support stays unresolved. Leave unsupported history unknown.
3. Enter the reviewed default `objectOwner` and exact exceptions as `{"relation:community_profile":{"role":"<owner>","evidence":"<approved reference>"}}`. Record each existing or later nonowner grant in `additionalGrants` as `[objectKey, columnOrEmpty, grantee, grantor, privilege, false]`, using exact names and the relevant approved role contracts. For example, the 0024 runtime addition is one `SELECT` grant on `relation:community_external_approved_medal`. A scoped later `0026` runtime acknowledgement is allowed only with its reviewed owner authorization. Record a separately authorized revocation from canonical PUBLIC as `[objectKey, privilege]`. The default ACL array uses `[creator, schemaOrEmpty, objectType, grantee, grantor, privilege, grantable]` for the creator's public-schema or global deviations, with null ACL fields for an empty explicit ACL. The verifier compares these entries exactly and rejects unsafe defaults. The plan must represent approved rights. Record approved transitive memberships in scoped owners, grantees and the runtime as `[member, grantedRole, inherits, canSetRole]` in `roleMemberships`. PostgreSQL superusers are outside this membership comparison and require the existing provider and owner trust evidence. A blind copy of the actual ACL is insufficient.
4. Give the completed plan and its independent SHA-256 to the inspector. Use an approved metadata reader with SELECT on the existing ledger and authored revisions for the aggregate. Do not issue temporary grants for this run. Resolve any access gap through the owner before connecting. Store raw metadata and reports only in the restricted review space. Keep credentials and data out of GitHub.

## Windows PowerShell and psql

Use a clean LF checkout of the reviewed commit, PowerShell 7, Node 22, Git with the recorded source objects available, and PostgreSQL `psql` 15 or newer. Source objects can be obtained from the trusted repository independently. Do not substitute an unreviewed commit when a recorded object is absent. Use an approved hidden password prompt or libpq password file. Supply a trusted CA through `PGSSLROOTCERT` where required. Confirm the target host in the provider console. These commands may only run after owner authorization for that connection.

```powershell
$Package = 'scripts/retrospective-baseline'
$ExpectedCommit = Read-Host 'Independently reviewed package commit'
$ExpectedManifest = (Read-Host 'Independently reviewed manifest SHA-256').Trim().ToLowerInvariant()
$ExpectedPlan = (Read-Host 'Independently reviewed private plan SHA-256').Trim().ToLowerInvariant()
$PlanPath = Read-Host 'Private inspection plan JSON path'
$EvidenceDir = Read-Host 'Existing restricted evidence directory'

if ((git rev-parse HEAD).Trim() -cne $ExpectedCommit -or (git status --porcelain)) { throw 'Wrong or dirty checkout' }
$Manifest = Join-Path $Package 'PACKAGE_SHA256SUMS'
if ((Get-FileHash -LiteralPath $Manifest -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ExpectedManifest) { throw 'Wrong package manifest' }
Get-Content -LiteralPath $Manifest | ForEach-Object {
  $Digest, $Path = $_ -split '  ', 2
  if ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $Digest) { throw "Package file mismatch $Path" }
}
if ((Get-FileHash -LiteralPath $PlanPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ExpectedPlan) { throw 'Wrong inspection plan' }
$Plan = Get-Content -Raw -LiteralPath $PlanPath | ConvertFrom-Json
$Target = $Plan.target
if (-not $Plan.approvalToInspect -or -not $Target.providerBindingRef -or -not $Target.providerProject -or -not $Target.providerBranch) { throw 'Inspection approval and target evidence required' }
if ($Target.endpoint -cnotmatch '^[a-zA-Z0-9.-]+$' -or $Target.database -cnotmatch '^[a-zA-Z0-9_.-]+$' -or $Target.port -lt 1 -or $Target.port -gt 65535) { throw 'Unsupported target format' }
$Capture = Join-Path $EvidenceDir 'baseline-capture.json'
$Report = Join-Path $EvidenceDir 'baseline-verification.json'
if (-not (Test-Path -PathType Container -LiteralPath $EvidenceDir) -or
    (Test-Path -LiteralPath $Capture) -or (Test-Path -LiteralPath $Report)) { throw 'Private directory and fresh filenames required' }

& node (Join-Path $Package 'verify.mjs') $PlanPath $ExpectedPlan $ExpectedManifest $Capture --capture |
  Tee-Object -FilePath $Report
if ($LASTEXITCODE -ne 0) { throw 'Baseline remains unverified. Preserve any report and capture privately.' }
```

Record the report output in the restricted review space. Exit 0 reports `CATALOGUE_MATCH_PENDING_REVIEW` with the precise capture, ledger, plan and manifest digests. Exit 2 reports unexpected or unverified evidence. Exit 1 indicates an invalid package, plan, capture or tool failure. Any nonzero result keeps the hold. The captured ledger digest is specific to this package's JSON representation. The 0026 installer has its own ledger digest contract.

The runner forces libpq `sslmode=verify-full` and `gssencmode=disable` for the approved direct hostname. Keep the existing trusted CA and credentials. A single `psql` process runs `\conninfo` followed by the pinned SQL on the same connection. The runner retains the legacy SSL sentence or the PostgreSQL 18 SSL Connection and SSL Protocol rows. PostgreSQL 18 emits those rows with pipe separators in the runner’s unaligned output. Missing or unsupported client TLS evidence stops the run. The report records the enforced client mode and the observed TLS protocol. PostgreSQL's `pg_stat_ssl` SSL flag and protocol are captured separately, including `false` and `null` on a backend connection without TLS. Neon documents the proxy and compute as separate connection legs. Its proxy source accepts client TLS and selects the compute leg's SSL mode independently. [Neon client TLS requirements](https://neon.com/docs/connect/connect-securely) [Neon proxy and compute connection](https://neon.com/docs/connect/connection-errors#couldnt-connect-to-compute-node) [Neon client handshake](https://github.com/neondatabase/neon/blob/fa504217c61bbcaf5c512d75830564541f917f8f/proxy/src/pglb/handshake.rs#L75-L118) [Neon compute SSL mode](https://github.com/neondatabase/neon/blob/fa504217c61bbcaf5c512d75830564541f917f8f/proxy/src/control_plane/client/cplane_proxy_v1.rs#L308-L316) [PostgreSQL SSL statistics](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-SSL-VIEW)

The SQL runs a single bounded, repeatable-read, read-only transaction. It checks the target database, unassumed inspection LOGIN, PostgreSQL version, runtime role existence and expected evidence tables. The read-only SQL invokes no application routines. The offline verifier checks database and schema ownership and preserves Step 2. To reverify an existing capture offline, use the same Node command with the existing capture path and omit `--capture`. The corrected format requires current same-session client and backend evidence. There is no alteration, role change, migration lock, replay or ledger write. Reviewers compare the full current ledger with existing accepted Step 2 evidence, the canonical source and the scope-specific result. Missing original receipts stay unknown. Do not lower the existing checks to obtain a passing result.

## Independent review and acceptance

The reviewer verifies the exact package and plan, rechecks the provider and runtime binding, inspects each finding and corroborating record, reconciles any supported later change, and confirms a stable capture window. The owner accepts the exact dated record and evidence hashes separately. A successful run, a merge or a historical transcript cannot lift the hold. The dossier does not qualify account erasure or retained-copy recovery and provides no authority to install 0025 or 0026, change grants or flags, or deploy.

## Disposable verification

```sh
bash scripts/retrospective-baseline/rehearse-local.sh
```

The harness uses its own local Docker container, PostgreSQL 18.7, OpenSSL, Node, local psql and canonical migrations with synthetic ledger rows. Run it with an actual PostgreSQL 18 client and a PostgreSQL 15 through 17 client to exercise both formats. The harness prints the client version. It regenerates the reference for comparison, exercises verified TLS on a direct connection and through a local TLS-terminating proxy, confirms the backend observations differ, rejects missing client evidence, an untrusted CA and a hostname mismatch, and introduces catalogue, trigger, function, owner, column grant and ledger drift. Use `--reference` to print a refreshed reference for review from that fixture. Never derive it from the target database.
