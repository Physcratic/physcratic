# Authoring release execution package — NOT AUTHORIZED FOR REMOTE EXECUTION

Current decisions: **NO-GO migrations; NO-GO push/deploy**. See
[the audit and operator sequence](../../docs/engineering/AUTHORING_NEON_RELEASE_AUDIT.md).
The latest minimal fixes and operator gates are recorded in
[the blocker follow-up](../../docs/engineering/AUTHORING_STAGING_BLOCKER_FIXES.md);
[the full-backup procedure](../../docs/engineering/AUTHORING_STAGING_BACKUP.md)
provides a separately authorized alternative recovery path. The previous audit
remains a historical record; its missing mail/origin guard findings are fixed
locally by the follow-up and are not yet deployed.

Nothing in this package grants permission to run remote SQL or change resources.

| Artifact | Purpose |
| --- | --- |
| `preflight-readonly.sql` | Standalone psql transaction: explicitly READ ONLY, catalog/identity/ledger inspection and exact counts. Only generated SELECTs use `\gexec`. |
| `catalog-readonly.sql` | SELECT-only public migration schema inventory, constraints, functions, triggers, indexes, auth/ledger columns and identity. |
| `baselines/v3.json` … `v6.json` | Canonical PG18.6 catalogs generated from the six unchanged UP files; not observations of Neon. |
| `baseline-supplement-readonly.sql` | Internal FK trigger health, replication mode, auth prerequisites and database collation; READ ONLY. |
| `backup-metadata-readonly.sql` | Extension/locale/ownership/ACL/recovery-role evidence; READ ONLY. |
| `backup-integrity-readonly.sql` | Snapshot-bound logical schema/data fingerprints, sequences and large objects; caller must begin READ ONLY. |
| `backup-rehearsal-local.sh` | Synthetic encrypted full-database PG18.6 dump/restore and retained-original cutover; no network or cloud secrets. |
| `core.mjs` | Version/checksum/ledger classifier; separately gated write transaction and preservation checks. |
| `operator.mjs` | Explicit read-only collection, post-commit validation, secure in-memory environment audit, or approved suffix execution. |
| `approval-template.json` | Deliberately unauthorized, incomplete approval record. Copy privately; do not edit the packaged template. |
| `runtime-audit.mjs` | No-network endpoint/alias/origin comparison; outputs no credentials or secret hashes. |
| `test-local.sh` | Disposable localhost PG18.6 tests, actual standalone psql validation, mocked mail and Blob SDK transport tests. |
| `local-fixture.mjs` | Local-test-only schema reset/baseline generator. Refuses remote endpoints. Never use as an operator migration runner. |
| `PACKAGE_SHA256SUMS` | Checksums for operational files, tests and baseline catalogs. Its own SHA256 binds the approval record. |

From the repository root:

```sh
(cd scripts/authoring-release && sha256sum -c PACKAGE_SHA256SUMS)
sha256sum scripts/authoring-release/PACKAGE_SHA256SUMS
sha256sum -c docs/engineering/AUTHORING_MIGRATION_SHA256SUMS
bash scripts/authoring-release/test-local.sh
bash scripts/authoring-release/backup-rehearsal-local.sh
```

There is no startup/build/deploy migration hook. This package is not imported by
the application. Normal migration commands refuse the current uncommitted tree,
the false approval template, a wrong endpoint/database, a pooled migration URL,
unreviewed recovery/lock evidence, drift or an unapproved suffix.

Do not regenerate baselines to make a remote mismatch pass. Regeneration is a new
review: on a fresh disposable PG18.6 runner, `node scripts/authoring-release/local-fixture.mjs`
generates catalogs only from the pinned unchanged SQL. Recheck tests and every
package checksum and obtain a new package-bound approval afterward.

## Explicit staging-only recovery exception

The user has approved snapshot-only recovery risk for this integration staging
release, waiving a separate encrypted pg_dump and local restore prerequisite.
The default recovery checks remain unchanged when no explicit exception record
is provided. `staging_recovery_exception` must bind the exact hard-pinned
project/branch/endpoint/database and snapshot, approver/reason, and acknowledge
untested restore and uncertain capacity. It never waives isolation, drift,
quiescence, lock, checksum, source SHA or final execution authorization.
Keep recovery_rehearsed and recovery_capacity_reserved false when unproven.
Do not use this exception for Production. See the current decision/runbook in
`work/staging-risk-exception/`; older backup runbooks remain historical evidence,
not additional prerequisites under this explicit user policy.
