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

## Phase 8B current verdict — supersedes the earlier checkpoint

BLOCKED for controlled live staging validation:

1. **Target and isolation evidence missing.** GitHub's successful Phase8A Vercel
   status points to `neuterions-projects/financial-dashboard`, but its intended
   Physcratic project ID/purpose, provider-reported Preview SHA/environment and
   exact isolated Neon/private Blob/auth/mail resources are unverified. Obtain
   authorized read-only evidence; do not assume correct mapping or isolation.
2. **Remote schema/ledger/backup UNKNOWN.** Verify the actual target and ledger,
   schema compatibility, checksums and recovery point. Existing docs specify a
   ledger contract but no deployed schema/runner/lock key; approve/reconcile the
   concrete mechanism before any migration. No shared DB was accessed here.
3. **Final-SHA CI required.** Phase8A run41208646313 is verified successful, but
   cannot cover the SEO merge and Phase8B handoff. Obtain a fresh successful run
   for the delivered final SHA. Vercel success is not this CI or runtime proof.

Live Better Auth/email/origin and real private Blob tests remain next controlled
staging tasks, only after the above gates and separate write authorization.
No confirmed application-security or migration blocker in independent reviews:
83/83 security checks,51/51 migration checks, exact PG17 order/empty down/up proof.
Full merged suite252/252,0skip/TODO; see [readiness](AUTHORING_RELEASE_READINESS.md)
for current browser/build evidence and [runbook](AUTHORING_RELEASE_RUNBOOK.md)
for approval gates. A draft PR is review preparation, not deployment approval.

4. **Recovered-workspace library browser rerun.** Fresh authoring and student
   browsers passed; library initialization repeatedly failed with local ENOSPC,
   including a tmpfs-database attempt. Prior8A evidence is reviewed only. Require
   a successful current-tree rerun; do not count infrastructure failure as pass.

Latest GitHub observation: both `physcratic` AND `financial-dashboard` projects
report pending statuses on handoff55b5f68. Verify which project is intended and
why both are linked; do not infer isolation from either name. Draft PR27 exists
and remains unmerged: https://github.com/Physcratic/physcratic/pull/27
