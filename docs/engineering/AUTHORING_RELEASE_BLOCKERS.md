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
