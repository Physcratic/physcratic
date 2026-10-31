# Authored-problem release gates after Phase 8A

The code is ready to enter Phase8B review. This is not production readiness or
deployment approval. [Phase8A evidence](AUTHORING_PHASE8A.md) records225/225 tests,
zero lint warnings, TypeScript/build, browser/PG gates and completed independent
6C-B/7 review. Inherited font/lint/corpus blockers are resolved.

Still required before release:

- **Isolated live staging:** real Better Auth registration, verification-email
  delivery, sign-in/sign-out/return paths, account switching and trusted-origin
  handling with final staging configuration. Harness sessions are injected;
  compiled guest smoke does not substitute for these checks. Validate runtime
  BETTER_AUTH_URL/secret and mail settings without exposing values.
- **Real private Vercel Blob:** upload/reference retention, approved statement and
  solution-image/PDF access, revoke/unpublish/expiry, interrupted reads and cleanup
  using isolated staging objects. Current automated storage is memory-backed.
- **Migration operator/ledger review:** no shared/production DB was accessed or
  migrated in this phase. Remote application/ledger state could not be inspected;
  do not interpret that as proof of an empty ledger. An authorized operator must
  verify target state and apply/check migrations in order with the existing
  lock/checksum/source-commit procedure.0005 follows0004;0006 follows0005.
- **Phase8B release audit:** verify final release artifact, account/media behavior,
  environment configuration and updated GitHub CI result. Browser suites are
  explicit local gates, not configured in normal CI. A later consolidated PR and
  deployment require separate instructions.

Migration files0001–0006 are unchanged by Phase8A.0005 adds permission/media/reveal
state and expands the attempt guard/assisted constraint without rewriting old
attempts; rollback refuses populated new state.0006 adds four discovery indexes
and an immutable public-metadata search function only; down removes only those
objects. Existing round-trip/preservation/race tests pass. No build/startup/deploy
migration or schema-push hook exists.

Reviewed up-file SHA256 (unchanged from Phase7):

| Migration | SHA256 |
| --- | --- |
|0005|`65dfc1a1137cf963b7e579931fde6d8c315d0bfb8dbd6c465a8cc70d741335e4`|
|0006|`3ed763699a4e58512604fe6b738dc7e8440c1f2291501e1c29fa2da07dd8a37f`|

No remaining confirmed query/privacy/navigation defect was found by the completed
independent review. Delivered solutions/PDFs cannot be recalled; assistance means
recorded app reveal, and approved whole PDFs remain the author's responsibility.
These existing policy limits are preserved, not new release fixes.

## Phase 8B current verdict — updated external evidence

BLOCKED for controlled live staging validation:

1. **Preview/Production isolation NOT ESTABLISHED.** Vercel→GitHub mapping is now
   confirmed: financial-dashboard/prj_phm4794zl2QBICu5MMbLFxcHAfFq. Broad P/P/D
   DATABASE_URL, BLOB_READ_WRITE_TOKEN and BETTER_AUTH_SECRET entries exist, with
   no authoring-completion-specific overrides. Auth-hardening overrides do not
   cover authoring; staging.physcratic.com points to auth-hardening. Actual
   authoring DB/role/Blob store and effective auth/callback origins need read-only
   verification before any separately approved configuration change or live test.
2. **Remote schema/ledger/backup UNKNOWN.** Named Neon branches are inventoried,
   not proven deployment connections or approved targets. Inspect/reconcile the
   verified target's actual schema/ledger and recovery point; do not assume empty.
3. **Recovered-workspace library browser rerun.** Fresh authoring/student suites
   passed; library initialization failed with ENOSPC.8A pass remains prior
   evidence only. No fresh library pass is claimed by this documentation update.

**Closed gates:** financial-dashboard→Physcratic repository mapping and exact8A
Preview identity are externally verified. Remote CI for f876792 is independently
confirmed SUCCESS: PR41210409141 and push41210403475, including exact checkout
SHA and all install/types/lint/unit+PG/build steps. Do not retain its CI as an
open blocker. This later evidence-only commit's CI is tracked separately.

No remaining confirmed application-security/migration defect from independent
83/83 and51/51 reviews;252/252 merged tests,0skip/TODO. Live Better Auth/mail/
origin and private Blob tests remain later tasks only after isolation, ledger
and explicit write authorization. No writes/decryptions/config changes made.

[Environment evidence](AUTHORING_ENVIRONMENT_EVIDENCE.md),
[readiness](AUTHORING_RELEASE_READINESS.md), [runbook](AUTHORING_RELEASE_RUNBOOK.md).
Draft PR27 remains review preparation, not authorization to merge/deploy/migrate.
