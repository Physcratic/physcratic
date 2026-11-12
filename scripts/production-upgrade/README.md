# B6B-1 reviewed Production upgrade

Preparation only. This package does not authorize a Production connection, migration,
role/grant change, credential change, feature activation or deployment. No startup,
build, application route or import executes this operator. Historical packages and
migration SQL are unchanged. Do not use the frozen six-migration executor here.

## Exact release

Owner-supplied inspected baseline: Neon `divine-mode-82940461`, branch
`br-quiet-dawn-b7m2zrt3`, direct endpoint `ep-snowy-heart-b7c1220y`, database
`neondb`, existing operator/application role `neondb_owner`, PG18.6, ledger
`public.physcratic_production_migrations`. Source main was fetched on 12 November
2026. Target identity comes from the owner, not a name-based inference.

Installed IDs are exactly 0001-0006 and 0016. Their canonical SHA-256 values are
in `migrations.json`. The owner's inspection reports verified entries, but did
not supply actual row hash strings or the complete catalog/recovery fingerprints.
No claim of an independent Production hash comparison is made here. The executor
requires exact equality to the canonical hashes before DDL. Any mismatch stops.

Only this missing order is allowed:

`0007 → 0008 → 0009 → 0010 → 0011 → 0012 → 0013 → 0014 → 0015 → 0017 → 0018`

0016 is verified and never replayed. Authentication and legacy schema must already
match the owner-approved baseline, including the independently installed auth
rate limiter. A missing prerequisite, partial install, unknown ledger row,
unledgered object or catalog/ACL/owner/configuration drift stops the release.
No inferred ledger entries, IF NOT EXISTS drift repair or automatic down exists.

All eleven migrations and eleven ledger rows execute in one transaction, after
the historical common advisory lock and SHARE ROW EXCLUSIVE locks on all baseline
tables. Statement/lock waits are bounded. Canonical bytes are hashed first.
Only the pinned 0018 standalone BEGIN/COMMIT wrapper is removed from execution,
so its body joins the outer transaction with the ledger. The installed 0016
wrapper is parsed for validation but its SQL is never executed. PostgreSQL parses
the unchanged interior, including all function bodies. Migration files are not
edited or rewritten on disk.

0009 builds indexes on retained authoring history. 0014 captures existing comment
evidence/review/audit rows, but this reported baseline has no comments schema.
0018 creates the non-login Deleted user principal and wraps installed immutable
routines, adding late-write guards. Existing auth, authoring and contest rows
must remain byte-identical, excluding that one newly created principal. Whole
baseline fingerprints are checked before commit and on a separate connection.
Locks and scans can interrupt authentication/writes during the hold and can
exceed bounded timeouts at real volume. Synthetic rehearsal is not a Production
load or backup qualification.

## Later authorized operator procedure

1. Obtain separate target-specific authority, a reviewed writer/DDL hold and a
   provider-verified recovery point with restore-erasure procedure. Require a
   reviewed `disabledFeaturesReference` proving affected community, deletion and
   practice flags remain OFF throughout the window. Installing schema while an
   old true flag is present can activate behavior without changing that flag.
   The tool cannot infer effective Vercel configuration and does not inspect it. Do not read
   or expose connection strings in logs. Do not restore deleted identities into
   live traffic. Resolve actual retention, independent staffing and cleanup
   requirements separately before feature activation.
2. Use the exact reviewed clean checkout and Node22/pnpm10 dependencies. Review
   `migrations.json`, `PACKAGE_SHA256SUMS`, code and `role-grants.sql`. Obtain the
   canonical installed-ledger comparison and approved baseline catalog/ACL hash
   plus baseline row fingerprint hash from authorized inspection of that exact
   held target/recovery point. The source helper `snapshot` hashes the complete
   catalog plus ACL/owner/search-path/event-trigger/extension metadata. The
   `fingerprints` helper returns only counts and hashes, never row values.
   Existing partial metadata alone cannot fill these approval fields safely.
3. Fill `approval-template.json` outside the tracked checkout, with actual owner
   approval/recovery/hold references and both hashes. Times are explicit UTC.
   The reviewed window is at most 30 minutes, and the recovery-verification
   attestation must be at most 30 minutes old at execution. These are execution
   safeguards, not invented provider retention or legal deadlines. Approval
   references must point to independently reviewed evidence, not test examples.
4. Have the owner independently approve the exact candidate, approval-file hash
   and package-manifest hash. Provision a new private output directory. Supply
   only `PHYSCRATIC_UPGRADE_DIRECT_URL` through an approved secret channel. The
   tool has no DATABASE_URL/PGHOST/connector fallback and accepts only the fixed
   direct TLS-verified endpoint/database/current role. It never prints secrets
   or raw PostgreSQL errors. Clear shell tracing and avoid recording secrets.
5. Only after authorization, use this explicit invocation. The final attestation
   string is literal. Placeholders below are nonsecret reviewed values:

```sh
node scripts/production-upgrade/operator.mjs --inspect-reviewed-window \
  "$REVIEWED_CANDIDATE_SHA" "$REVIEWED_PACKAGE_SHA256" \
  "$APPROVAL_FILE" "$REVIEWED_APPROVAL_SHA256" "$NEW_PRIVATE_EVIDENCE_DIRECTORY" \
  WRITER_HOLD_AND_SEPARATE_OWNER_AUTHORIZATION_CONFIRMED
```

   This performs only its separately authorized read-only preflight. It is NOT
   authorized by B6B-1. For later separately approved installation, use
   `--execute-reviewed-window` with a different new private evidence directory
   and the same reviewed bindings. Neither command creates or changes roles,
   grants, policy rows, feature flags, private providers or environment settings.
6. Retain the writer hold through independent postcommit verification on the
   tool's new TLS connection. Check complete ledger, hashes, original provenance,
   schema/ACL fingerprint, retained row fingerprints, no invalid constraints and
   unchanged flags. Retain private binding/preflight/attempt/commit/postcommit
   artifacts. Independently review the results before releasing the hold.
7. On any rejection, timeout, connection loss or uncertain acknowledgement, STOP.
   If execution started, independently inspect committed state under separate
   authority before retry. Do not reuse an evidence directory, replay installed
   SQL, forge ledger entries, drop objects or run downs to make status green.
   Failed precommit work rolls back. Committed work requires reviewed recovery,
   not automated rollback. Disabling exposure does not undo saved data/erasure.

## Gradual role transition, not executed by this package

Keep existing application binding unchanged during this schema window. The
reported owner application connection is a risk, not a new recommended runtime.
Do not switch all connections or revoke the owner in the same unqualified step.

- Provision a distinct NOLOGIN migration/function owner and restricted LOGIN
  runtime, deletion and operator service identities later through approved
  credential handling. No service may inherit the owner or another service.
  No service gets trusted-schema CREATE, broad DELETE, TRUNCATE, ALL TABLES or
  ALL FUNCTIONS. The initial release tool intentionally requires the reported
  `neondb_owner` bridge identity. A later owner-transfer window needs its own
  exact identity approval rather than silently changing this guard.
- Inventory exact object ownership and inherited/default/PUBLIC privileges.
  Transfer only reviewed explicit objects to the migration owner, preserving
  immutable guards, current function ACLs and fixed search paths. Do not use
  unrestricted REASSIGN OWNED. Supply the owner required DML for its definer
  routines and do not grant service membership in it.
- `role-grants.sql` is the exact review template for the three restricted service
  roles. It is not loaded by the operator. Test current authentication, authoring,
  private-media, grading and contests under the new runtime before any cutover.
  The rehearsal proves real sign-in, authoring create/publish, contest registration,
  preserved baseline data and denial of immutable DELETE/privileged erasure/CREATE.
  The role template denies ordinary user DELETE because account erasure belongs
  to B5. Qualify any auth error-compensation path requiring it instead of adding
  broad identity DELETE as a workaround. No full Production role compatibility
  claim is made from a representative smoke alone.
- Keep existing binding as a controlled rollback during approved synthetic
  qualification. Switch runtime first only after its own auth/authoring/contest
  and failure-path acceptance. Configure deletion/operator bindings separately
  after exact grants and owner controls pass. Revoke any superseded memberships
  and owner exposure only under a separate reviewed plan.
- Never grant ordinary access to deletion tables, permit creators, staff writes
  or audit/history mutations. The canonical PUBLIC exact-permit boolean probe
  is deliberate. Reviewed helper EXECUTE and private trigger-owned writes are
  preserved. New community flags, deletion and practice flags stay OFF.

## Rehearsal and release decision

`lib/production-upgrade.pg.test.ts` runs only when the existing disposable
`AUTHORING_TEST_DATABASE_URL` identifies loopback `physcratic_authoring_test`,
without query/host overrides. It refuses an existing neondb/owner, creates its own
synthetic database and removes only its owned resources. Existing fixture schema
and canonical 0001-0006 plus0016 construct the noncontiguous baseline. It exercises
checksum/catalog/unledgered drift, competing common locks, actual mid-DDL failure
and atomic ledger rollback, original data preservation, successful eleven-file
upgrade, independent postcommit read, replay refusal, and the separate grants.
It never accepts the Production target. CI's existing database glob runs it.

GO for a code-only tooling merge after executed exact-head CI and this rehearsal
pass. NO-GO for executing a Production window until baseline hash reconciliation,
approved recovery/restore-erasure evidence, writer hold, current target bindings
and separate explicit window authorization are supplied. No feature activation
is bundled. B6B-2 first obtains those concrete artifacts and reviews the invocation,
then authorizes a bounded window. Retention/staff/provider approvals remain gates
for the later account-deletion and practice-progress activation phases.
