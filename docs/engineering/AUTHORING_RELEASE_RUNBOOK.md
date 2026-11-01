# Controlled staging operator runbook — Phase 8B

**Status: execution blocked pending target identification and isolation evidence.**
This document authorizes no shared writes, account creation, mail, uploads,
migrations or deployment. Obtain explicit approval at each gate below. Never put
credentials, connection strings or secret values in the approval record/logs.

Post-Phase-8B local preparation: see [staging Blob isolation](AUTHORING_STAGING_BLOB.md)
for the unpushed patch, exact branch-only configuration, SDK fallback proof and
read-only verification proposal. **Do not push runtime changes:** an automatic
Preview deployment could still use unverified DB/auth configuration. Do not merge
PR #27 or deploy. The supplied new staging Blob connection is Preview-wide, not
branch-exclusive; only the proposed application guard restricts its selection.

Latest [local validation](AUTHORING_STAGING_VALIDATION.md): 307/307 full tests,
all three browser suites, populated upgrade with the exact supplied ledger on
PostgreSQL 18.6, types, zero-warning lint and configured build pass. This closes
the local ENOSPC/PG18 test gaps; it authorizes no remote action. Original patch
`work/physcratic-staging-blob.patch` remains unchanged.

Supplied subsequent read-only evidence identifies candidate Neon
`divine-mode-82940461` / `br-solitary-thunder-b7h5q79t` / `neondb` as PostgreSQL
**18.6**. Its existing `public.physcratic_integration_migrations` ledger verifies
0001–0003 with matching checksums, with no entries for 0004–0006. The three reported
application tables have zero rows. This does not establish target approval or
Vercel connection isolation. Do not replay migrations, create another ledger or
apply 0004–0006 in this task. Local PG18.6 compatibility is now verified; actual
target isolation, schema drift, privileges and recovery still require review.

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
not new provider API calls by this agent. Subsequent supplied READY branch alias:
`https://financial-dashboard-git-codex-physcr-54d12a-neuterions-projects.vercel.app`,
deployment `dpl_CairGvgTKpWzVX2QPGAYqcni9qYJ`, SHA
`4e18931e1c3e2f18271e6ff9f274a158c0c40f9a`. It does not contain the local
patch. Pin the new actual deployment SHA after a separately authorized rollout.

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
backup and effective deployment isolation remain UNKNOWN.** The supplied Blob
staging ID is `store_3XHvtHs2UM4ZFD5d`; the candidate database ledger is described
above. Neither proves the effective Preview configuration. No listed branch is
selected by name. Resolve the effective connection/resource mapping read-only
before approving any configuration changes or migration plan. Historical project
name rationale and the additional physcratic project's role also remain unknown.

CI for the audited f876792 handoff is confirmed successful in PR41210409141 and
push41210403475. This local patch includes runtime changes and needs fresh CI on
its eventual final commit; the older runtime-code CI gate remains historical.

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

Before requesting push approval, verify these effective Preview branch overrides
for `codex/physcratic-authoring-completion`:

| Variable | Exact value/requirement |
| --- | --- |
| `AUTHORING_STAGING_BLOB_ENABLED` | Config `1`, branch-only; never Production or Preview-wide. |
| `AUTHORING_STAGING_BLOB_STORE_ID` | Existing Preview-wide value `store_3XHvtHs2UM4ZFD5d`; verify effective branch value. |
| `DATABASE_URL` | Approved isolated runtime-role secret. Candidate endpoint `ep-green-waterfall-b7qaw260`, project `divine-mode-82940461`, branch `br-solitary-thunder-b7h5q79t`, DB `neondb`; mapping/isolation must be proven first. |
| `BETTER_AUTH_URL` | `https://financial-dashboard-git-codex-physcr-54d12a-neuterions-projects.vercel.app` |
| `BETTER_AUTH_SECRET` | Independent staging secret, at least 32 random characters, different from Production; supply securely. |
| `RESEND_API_KEY` | Approved staging-only sending credential; supply securely. |
| `RESEND_EMAIL_DOMAIN` | Approved verified staging sending domain; no scheme/path. Sender is `accounts@` that domain. Actual domain still requires operator selection/verification. |
| `NEXT_PUBLIC_SITE_URL` | Same exact branch origin as `BETTER_AUTH_URL`, before build. |

Do not manually create OIDC tokens or override `BLOB_STORE_ID`; no additional
Blob token/webhook/reCAPTCHA variable is required. Verify Vercel system identity
variables/OIDC as specified in the Blob report. Keep `BETTER_AUTH_TRUSTED_ORIGINS`
unset unless separately reviewed. The code still trusts generated `VERCEL_URL`
and `VERCEL_PROJECT_PRODUCTION_URL`; explicit auth URL anchors email links but
does not remove these origins. Approve the complete effective origin set. A
stable-alias-only trust requirement needs a separate scoped auth change/retest.

## 2. Inspect backup and ledger, then separately approve migration work

Using an approved read-only connection to the **verified staging target**:
record actual server_version (candidate and exact local test: PG18.6), current_database/schema/user, table/constraint/index
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

Preserve the existing `public.physcratic_integration_migrations` ledger. Its
supplied columns are `id text PRIMARY KEY`, `sha256 text NOT NULL` with lowercase
64-hex check, `source_commit text NOT NULL`, `applied_at timestamptz NOT NULL
DEFAULT clock_timestamp()`, `applied_by text NOT NULL DEFAULT CURRENT_USER`,
`result text NOT NULL CHECK(result='verified')`. Do not bootstrap another ledger,
rewrite old entries or add guessed history. The existing runner/lock key was not
supplied: verify it before adopting the proposed lock namespace below.

Read-only preflight must retrieve ledger columns/defaults/constraints and every
entry, not just row counts. Require exactly the known prefix 0001–0003 with
source `b191dd03d62aa4b01e7a3f08272b2417643f0d53`, result `verified` and the
checksums in [the six-file manifest](AUTHORING_MIGRATION_SHA256SUMS). Compare all
six UP files to that manifest (`sha256sum -c docs/engineering/AUTHORING_MIGRATION_SHA256SUMS`).
An unexpected ledger suffix or checksum/source mismatch is a reconciliation stop.

Also inventory columns, checks, FKs, indexes, triggers and function definitions
for the 0001–0003 objects against the SQL and disposable baseline. Verify the
actual Better Auth base schema; these migrations do not initialize it. Inspect
all tables before inferring anything from the three supplied zero row counts.
For a ledger ending at 0003, these **new** 0004–0006 objects must be absent:

- Tables: `authored_student_rate`, `authored_attempt`,
  `authored_solution_permission`, `authored_solution_permission_media`,
  `authored_solution_reveal`.
- Indexes: `authored_attempt_history_idx`, `authored_attempt_problem_idx`,
  `authored_attempt_revision_idx`, `authored_solution_reveal_authorization_idx`,
  `authored_problem_discovery_idx`, `authored_revision_discovery_search_idx`,
  `authored_revision_discovery_metadata_idx`, `authored_revision_discovery_difficulty_idx`.
- Functions (any overload): `authored_attempt_guard`,
  `authored_solution_permission_guard`, `authored_solution_media_guard`,
  `authored_solution_reveal_guard`, `authored_discovery_terms`.

Use `pg_class`/`pg_namespace`, `pg_proc`, `pg_constraint`, `pg_trigger`,
`pg_get_indexdef`, `pg_get_functiondef` and `information_schema.columns`; ensure
the inspecting role can see the entire target schema. Any such unledgered
object is drift even if its definition looks correct. Stop rather than replay,
drop/recreate, use `IF NOT EXISTS`, or invent its history. The local test injects
this exact missing-entry/present-object condition and proves refusal before DDL.

Proposed reviewed procedure, one direct non-transaction-pooled psql session:

1. Set `ON_ERROR_STOP`, begin transaction; acquire
   `pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0))`.
   All deploy operators must use the same agreed lock; otherwise this provides
   no cross-operator exclusion. Do not change a previously established lock key.
2. `LOCK TABLE public.physcratic_integration_migrations IN EXCLUSIVE MODE` and
   repeat the ledger/catalog assertions within the transaction. Require the
   verified prefix and absence of the proposed suffix's objects. All migration
   actors must honor the same lock; a table lock alone does not stop arbitrary DDL.
3. From a clean checkout of the pinned final SHA, verify the six-file manifest.
   For the supplied prefix, apply only **0004→0005→0006** using `\ir` with
   reviewed absolute paths in this same session. Never replay 0001–0003.
   Do not release savepoints within migrations. Existing objects or checksum
   mismatch are errors. Do not use schema push or modify any migration file.
4. Insert a successful ledger entry for each applied UP in the same transaction,
   with its exact checksum and source SHA. Run schema/invariant verification and
   COMMIT once. Any error rolls back the transaction; reconcile before retrying.
   Keep operator evidence outside secret-bearing terminal history.
5. Inspect committed ledger/schema in a fresh read-only session, including FKs,
   sealing/attempt/reveal guards and discovery expression indexes/function.

Concrete append statements for the supplied ledger, after each corresponding UP,
in the same transaction (psql `release_sha` must be the approved full source SHA;
never use a disposable test/build value):

```sql
INSERT INTO public.physcratic_integration_migrations(id,sha256,source_commit,result)
VALUES ('0004_authored_attempts','e52abd4fa47e2c8abdc609fdc79c32c2f78a284df90b859463ae217abed7e423',:'release_sha','verified');
INSERT INTO public.physcratic_integration_migrations(id,sha256,source_commit,result)
VALUES ('0005_authored_solution_access','65dfc1a1137cf963b7e579931fde6d8c315d0bfb8dbd6c465a8cc70d741335e4',:'release_sha','verified');
INSERT INTO public.physcratic_integration_migrations(id,sha256,source_commit,result)
VALUES ('0006_authored_discovery','3ed763699a4e58512604fe6b738dc7e8440c1f2291501e1c29fa2da07dd8a37f',:'release_sha','verified');
```

Do not run these inserts on their own or to bless pre-existing unledgered objects.
Validate permissions, defaults and the approved source SHA before execution;
then assert the exact six-entry ledger, valid FKs/triggers/indexes and preserved
record counts/IDs before COMMIT. The tested SQL is compatible with the supplied
ledger on PG18.6; actual target drift/role/lock/backup review is still required.
0005 must exist before explicit grants/reveals/assisted attempts are exposed;
0006 must exist before indexed word search is exposed. Complete the compatible
serving-instance rollout together; old cached clients may require reload.

## 3. Separately authorize isolated live staging validation

Only after gates1–2 pass and explicit approval for controlled staging writes:

- Register disposable author/student accounts; verify real email delivery and
  one-hour link expiry, idempotent replay without automatic sign-in, fresh
  password sign-in/out/return paths and verified-email gating. This SDK's signed
  verification links are not single-use tokens; do not claim otherwise.
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

The local library-browser infrastructure gap is now closed. All three suites
pass in the clean disposable workspace on PG18.6; retained evidence includes
library desktop/mobile light/dark axe, privacy and keyset navigation. Reproduction
commands, evidence scope, auth behavior and remaining gates are in the validation
report. No local pass substitutes for the separately approved live checks above.
