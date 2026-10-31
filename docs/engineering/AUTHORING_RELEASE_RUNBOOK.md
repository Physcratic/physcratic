# Controlled staging operator runbook — Phase 8B

**Status: execution blocked pending target identification and isolation evidence.**
This document authorizes no shared writes, account creation, mail, uploads,
migrations or deployment. Obtain explicit approval at each gate below. Never put
credentials, connection strings or secret values in the approval record/logs.

## 1. Pin the artifact and prove the target (read-only first)

Audited code/test commit: `32761ee914e5030260497ec6bf02e3844dc0a2d7`.
Latest integrated main: `a55bb1a`; integration merge: `a3269e7`.
Phase8A reference: `71ff793c83c3ab58e4890c4623815052a061eeb8`.
The final Phase8B handoff commit follows this audited code and changes documents
only; record its full SHA from the branch and require fresh successful CI for it.

Externally verified Vercel project: `neuterions-projects/financial-dashboard`,
ID `prj_phm4794zl2QBICu5MMbLFxcHAfFq`, connected to `Physcratic/physcratic`.
Verified READY Phase8A Preview: `dpl_AMNA9Vhxs7na5RN5ZZAr7MnHYcfv`, authoring-
completion branch, SHA71ff793. Production: `dpl_FKdnftiM54PyU6dsccG7gwCMnpeK`,
main/c2139de. These are external read-only inspection results supplied by user,
not new provider API calls by this agent. Final authoring staging deployment
identity after Phase8A remains unverified; pin its actual SHA before execution.

`physcratic.com` has no branch-specific mapping; `staging.physcratic.com` points
to `codex/auth-hardening`, NOT this integration branch. The branch lacks the
DB/auth/mail overrides found for auth-hardening; broad P/P/D entries exist for
DATABASE_URL, BLOB_READ_WRITE_TOKEN and BETTER_AUTH_SECRET. Do not treat the
current Preview as isolated. No live writes are permitted pending verification.

[Canonical environment evidence](AUTHORING_ENVIRONMENT_EVIDENCE.md) lists every
variable scope and these Neon resources (all database `neondb`):

- `divine-mode-82940461` / main `br-quiet-dawn-b7m2zrt3`;
- same project / physcratic-staging `br-lingering-heart-b7gda0w4`;
- same project / physcratic-integration `br-solitary-thunder-b7h5q79t`;
- `wild-water-97019860` / main `br-hidden-surf-b7rb5nw6`.

**Actual Preview-connected Neon branch/endpoint/role, approved staging target,
private Blob store ID, backup and ledger remain UNKNOWN.** No listed branch is
selected by name. Resolve the effective connection/resource mapping read-only
before approving any configuration changes or migration plan. Historical project
name rationale and the additional physcratic project's role also remain unknown.

CI for the audited f876792 handoff is confirmed successful in PR41210409141 and
push41210403475. This update changes evidence documents only; track its own CI
without reopening the already satisfied f876792 runtime-code CI evidence.

Operator approval record must contain: verified Vercel team/project IDs and repo
binding, deployment ID/SHA/Preview scope, exact isolated Neon project/branch/DB
and role IDs, private Blob store ID, auth/mail origin/domain IDs, and backup ID.
Compare Preview and Production resource IDs and credentials using a privileged
secure comparison; record only different/shared/unknown, never values or hashes
of secrets. Shared mutable DB/Blob resources or credentials block staging writes.
Confirm Preview-scoped overrides (including branch-specific overrides), correct
BETTER_AUTH_URL and callback/verification URLs, and NEXT_PUBLIC_SITE_URL. Preview
must not fall back to a Production auth origin. Check final CI by SHA; never
substitute Phase8A CI or a Vercel build for final CI/runtime validation.

## 2. Inspect backup and ledger, then separately approve migration work

Using an approved read-only connection to the **verified staging target**:
record server_version (PG17), current_database/schema/user, table/constraint/index
inventory and migration-ledger location/entries. Inspect the actual ledger;
missing access is UNKNOWN, not an empty database. Compare schema to files and
ledger/checksums. If tables exist without a trustworthy matching ledger, STOP for
reconciliation; never replay migrations, insert guessed ledger history or use
IF NOT EXISTS to conceal drift. Confirm existing auth/base tables, especially
`user`, are compatible: authoring migrations do not bootstrap Better Auth.

Create a provider-supported snapshot/branch backup under separate approval;
record restore point, retention, target and an isolated recovery rehearsal.
Quiesce dependent writes/serving instances before schema rollout. Verify free
space/WAL headroom, connection capacity and lock timeout expectations.

The repository historically specifies a lock/checksum/source-commit ledger
contract but supplies **no deployed ledger DDL, fixed lock key or runner**.
Reconcile the existing operational mechanism first. If none exists, require
explicit operator review of a new ledger schema and the following proposed lock
namespace before any write. It is not evidence of an existing production ledger.

Proposed reviewed procedure, one direct non-transaction-pooled psql session:

1. Set `ON_ERROR_STOP`, begin transaction; acquire
   `pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0))`.
   All deploy operators must use the same agreed lock; otherwise this provides
   no cross-operator exclusion. Do not change a previously established lock key.
2. Lock the approved ledger table; compare every applied migration ID/checksum
   and source SHA. Approved new-ledger fields must include unique migration ID,
   SHA256, full source commit, applied timestamp and successful result. Bootstrap
   it only if separately approved after schema/ledger reconciliation.
3. From a clean checkout of the pinned final SHA, use `sha256sum migrations/*.sql`
   and compare to the readiness manifest. Apply only the missing contiguous UP
   suffix 0001→0006 using `\ir` with reviewed absolute paths in this same session.
   Do not release savepoints within migrations. Existing objects or checksum
   mismatch are errors. Do not use schema push or modify any migration file.
4. Insert a successful ledger entry for each applied UP in the same transaction,
   with its exact checksum and source SHA. Run schema/invariant verification and
   COMMIT once. Any error rolls back the transaction; reconcile before retrying.
   Keep operator evidence outside secret-bearing terminal history.
5. Inspect committed ledger/schema in a fresh read-only session, including FKs,
   sealing/attempt/reveal guards and discovery expression indexes/function.

Use the actual existing ledger's reviewed SQL, not guessed table/column names.
An operator must author/review the concrete ledger statements before execution;
this intentionally gated procedure is not a ready-to-run production script.
0005 must exist before explicit grants/reveals/assisted attempts are exposed;
0006 must exist before indexed word search is exposed. Complete the compatible
serving-instance rollout together; old cached clients may require reload.

## 3. Separately authorize isolated live staging validation

Only after gates1–2 pass and explicit approval for controlled staging writes:

- Register disposable author/student accounts; verify real email delivery and
  link expiry/single use, sign-in/out/return paths and verified-email gating.
  Test configured same-origin POSTs and reject foreign/missing origins, guest,
  unverified and cross-account access without disclosing existence/private data.
- Author creates multipart native math/text with numeric, expression and manual
  keys; upload statement image/PDF and private solution image/PDF to the isolated
  private store. Check autosave/recovery/uncertain writes, preview privacy,
  publication/current revision and search/filter/library navigation.
- Student submits all modes; check four feedback outcomes and immutable own
  history. Lose a committed response and explicitly retry the original key/body:
  same result/ordinal/assisted flag, no duplicate or regrading. Test stale revision,
  concurrent submit/reveal and publish/unpublish with two separate accounts.
- Explicitly approve native solution/all images and selected whole PDFs for an
  immutable part. No solution preload. Student deliberately reveals; verify
  ledger-before-disclosure, own-generation media access and later server-assisted
  attempts across parts, without rewriting previous attempts/retries.
- Revoke, expire, regrant and unpublish: deny future reveal/media requests and old
  generations. Delivered text/PDFs cannot be recalled. Verify guessed/cross-owner,
  part/revision and historical private assets stay denied; no raw Blob paths,
  keys, hints or credentials in public JSON/client bundles/logs.
- Test bounded/failed/interrupted Blob reads, unregistered files, retention of
  published history, quota/cleanup tombstones and only explicitly approved orphan
  cleanup. Do not destroy historical content to tidy the test.
- Inspect runtime errors/latency, query plans, rate/timeout behavior, connection
  pressure, no-store headers, noindex/private sitemap exclusion, desktop/mobile
  light/dark axe/keyboard/long math/title overflow, and legacy archive/practice.
  Record IDs and sanitized results, not student keys or uploaded private content.

## 4. Recovery, production gate and stopping point

If schema rollout fails before COMMIT: rollback and inspect; do not expose the
new app. After commit/new immutable data, prefer disabling exposure and an
explicitly reviewed forward fix. Never automatically run DOWN on a populated
system:0001 is destructive;0003/0004/0005 refuse populated retained state;
0005 cannot be rolled back over permissions/reveals/assisted history.0006 DOWN
removes only discovery objects but breaks dependent search.0002 loses limiter
state. Old app rollback may reject assisted booleans; approve compatibility first.

Restore a snapshot only to an isolated recovery target initially. Reconcile any
post-backup immutable attempts/reveals/media registry before approving a cutover;
never discard them silently. Preserve private Blob objects and registry history.

Production requires a separate successful staging report, final successful CI,
reviewed target isolation/ledger/backups, reviewed consolidated PR and explicit
manual approval for merge, production migration and deployment separately.
A PR or merge is not staging/production authorization. No production action is
part of Phase8B. Stop after audit/handoff and draft PR attempt.

Before gate1 write authorization, also close the current local library-browser
infrastructure gap in a recovered disposable workspace. The fresh authoring and
student suites passed; repeat the library with adequate scratch capacity. Retain
its desktop/mobile light/dark axe, private exclusion and keyset navigation checks.
