# Minimal authoring staging blocker fixes — local, not deployed

This supplements, and does not replace, `AUTHORING_NEON_RELEASE_AUDIT.md` and the
preserved staging validation/Blob patch artifacts. The old audit accurately
describes the code before these explicitly requested mail/origin/database fixes.
**Current execution decisions: NO-GO staging migrations; NO-GO push/deploy.**
The local code gates are ready for review; effective environment isolation,
complete remote drift evidence and real backup/recovery evidence are outstanding.

Target remains branch `codex/physcratic-authoring-completion`, local HEAD
`4e18931e1c3e2f18271e6ff9f274a158c0c40f9a`; Vercel project
`prj_phm4794zl2QBICu5MMbLFxcHAfFq`. No remote SQL, credentials retrieval, Vercel
configuration changes, live accounts/mail/Blob operations, commit, push, merge,
rebase or deployment occurred in this follow-up.

## Local changes and scope

- `lib/authoring-staging.ts`: one server-only boundary for the exact authoring
  Preview/project/branch and existing `AUTHORING_STAGING_BLOB_ENABLED=1` opt-in.
  Missing/mismatched staging identity fails closed. Normal Production without
  the marker and unrelated branches retain the previous behavior.
- `lib/verification-email.ts`: before constructing/calling Resend, staging
  verifies an exact recipient in `STAGING_VERIFICATION_EMAIL_ALLOWLIST` and a
  canonical verification link/callback. Missing/empty/malformed configuration
  refuses delivery. Lists are comma/newline separated, max 50 valid addresses,
  max 4096 characters; comparison trims and lowercases addresses. No wildcards,
  domain-only grants, implicit plus-address equivalence or display names.
  No recipient, token, URL or secret appears in the fixed refusal message.
  Production recipients and sender/idempotency behavior are unchanged.
- `lib/runtime-database.ts` and `lib/db/index.ts`: staging rejects any nonempty
  `PG*`, `POSTGRES`/`POSTGRES_*` or `DATABASE_URL_*` alias before pool creation.
  It accepts only explicit complete `DATABASE_URL` credentials for direct or
  pooled `ep-green-waterfall-b7qaw260` on `.neon.tech`, database `neondb`, TLS
  require/verify-full; passes separate host/user/password/database/SSL options,
  with certificate verification and channel binding enabled. No inherited
  alias or connection-string parameter can choose another target. Pool limits
  and timeouts and normal Production connection behavior are unchanged.
- `lib/auth.ts` and `lib/submission-server.ts`: staging uses only the exact
  stable origin below. Automatic immutable-deployment and Production origins
  are excluded. Extra `BETTER_AUTH_TRUSTED_ORIGINS` values refuse staging startup.
  Production's previous origin calculation is retained.
- Tests exercise the real Better Auth handler on a disposable local DB, real
  verification JWT/callback construction and mocked mail/Blob HTTP transports.
  The sender allowlist covers signup, unverified sign-in and resend because all
  three use the same server-side verification sender. Unauthorized registration
  may still create an **unverified** row; this is a delivery restriction, not a
  new registration feature. No automatic sign-in occurs after verification.
- The release checker additionally rejects unhealthy internal FK enforcement
  triggers and non-origin replication mode. The four canonical PG18.6 schema
  baselines, all six migration UP files and all migration history are unchanged.
  The existing suffix-only runner/advisory lock/ledger transaction is preserved.
- `.github/workflows/ci.yml`: pins its disposable service to PG18.6, asserts the
  upgrade test's version, and adds the existing reviewed release-package plus
  mocked mail-transport checks. No deployment step or live credential is added.
- Backup READ ONLY metadata/integrity SQL and a synthetic local encrypted
  dump/restore/cutover rehearsal are documented in `AUTHORING_STAGING_BACKUP.md`.
  No actual staging backup was captured in this task.

The Blob adapter and both legacy solution-evidence routes were not edited by
this follow-up. Tests again prove explicit OIDC/store selection on **get, put
and del**, registry-only paths, and no retry/fallback to the shared token on
missing/malformed/expired/wrong OIDC, identity/store mismatch or SDK failure.
The shared Production-capable token is still a process credential exposure to
other code if inherited; this guard proves these operations do not use it.

## Reconcile the supplied Neon observations with the complete baseline

`expected-results.json` now records the latest user-provided observations and
their provenance without relabeling them a completed remote preflight. They
support schema v3 but do not certify it. The earlier `solution_attempt` is a
legacy table, is not `authored_attempt`, and must remain in the full backup.

| Supplied observation | Meaning / remaining check |
| --- | --- |
| Ledger 0001–0003 verified; no 0004–0006 entries | Recheck all six columns/defaults/constraints and exact three hashes/source/applied fields, not merely IDs/result. Never replay the historical prefix. |
| `authored_attempt` absent | Also verify `authored_student_rate`, `authored_attempt_guard()` and every 0004 index/constraint/trigger are absent. |
| Three 0005 permission/media/reveal tables absent | Also check `authored_solution_permission_guard`, `authored_solution_media_guard`, `authored_solution_reveal_guard`, all overloads and all named 0005 indexes/triggers. |
| Discovery function `(jsonb)` and four indexes absent | Verify every overload is absent and no name/object collision exists elsewhere. |
| Existing baseline tables/legacy table observed | Compare full canonical v3 catalog: 11 authoring tables, eight helper functions, columns/defaults/types/nullability, constraints/validation, indexes/readiness, triggers/enabled state, policies/RLS and extra objects. |

Run the existing guarded `collect-readonly` only after remote read authorization;
it must report `EXACT_MISSING_SUFFIX`, ledgerPrefix=3, catalogVersion=3 and exactly
0004→0005→0006. Wrong hashes/source, partial objects, a complete unledgered suffix,
extra/changed definitions or an incomplete/timeout result remain a hard stop.
No schema push, silent ledger repair, DOWN or baseline regeneration is allowed.

Read-only supplements are separate from every write procedure:

- `baseline-supplement-readonly.sql`: internal FK trigger inventory (four per
  authoring FK, all `O`/origin-enabled), `session_replication_role=origin`, full
  auth columns/defaults and database collation. The guarded classifier also
  checks FK health and replication mode automatically.
- Existing preflight: inspect public constraints/indexes/triggers, function
  signatures/security metadata, all public table counts, owners, privileges and
  RLS visibility. Earlier zero counts for three tables do not establish emptiness.
- Compare auth prerequisites against `lib/db/schema.ts` and initialized Better
  Auth 1.7.14, including terms fields, unique email/token keys and relationships.
  The local migration baseline intentionally uses only `user.id`; a successful
  authoring classifier is not proof of a complete auth schema. Do not auto-run
  Better Auth migrations on Neon to cure a discrepancy.
- `backup-metadata-readonly.sql`: extension versions, encoding/locale,
  ownership/ACL/default grants, current role capabilities/memberships, large
  objects, DB size and nonportable-object counts. Review functions' effective
  owners/SECURITY DEFINER privileges separately; portable catalog matching
  deliberately excludes environmental owner OIDs.

These certify the migration-owned baseline plus reviewed prerequisites; no
claim of zero drift for unrelated legacy objects can be made without an approved
historical reference for those objects. Full-database backup preserves them.

## Smallest required effective environment changes

Stable origin, exactly (no trailing slash):
`https://financial-dashboard-git-codex-physcr-54d12a-neuterions-projects.vercel.app`

| Variable / binding | Required authoring Preview value or policy |
| --- | --- |
| `DATABASE_URL` | Complete staging-only credentials; target endpoint `ep-green-waterfall-b7qaw260` (pooler allowed for app), DB `neondb`, sslmode=require/verify-full. Production endpoint must differ. |
| `BETTER_AUTH_SECRET` | Strong branch-only secret, different from Production. |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL` | Exact stable origin above. |
| `AUTHORING_STAGING_BLOB_ENABLED` | `1`, branch-only Preview. |
| `AUTHORING_STAGING_BLOB_STORE_ID` | `store_3XHvtHs2UM4ZFD5d`; private store linked for Preview OIDC. |
| `RESEND_API_KEY`, `RESEND_EMAIL_DOMAIN` | Approved mail configuration/domain for `accounts@domain`, with verified sender; key presence alone proves neither sender readiness nor recipient authorization. |
| `STAGING_VERIFICATION_EMAIL_ALLOWLIST` | Add/verify a branch-specific Preview value containing only explicitly approved test addresses in the format above. Presence of a shared variable is insufficient. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Absent/empty, or exactly the stable origin; no inherited additional origins. |
| Vercel system identity / OIDC | `VERCEL=1`, `VERCEL_ENV=preview`, exact project and branch. SDK obtains fresh request-context OIDC; do not manually set a JWT or add a staging RW token. |
| All inherited PostgreSQL aliases | Absent/empty in the **effective authoring Preview**. See below; setting an alias to a second staging URL still fails the deliberate no-alias policy. |

No reCAPTCHA configuration or new feature flag is required. Rate limits remain
per-process Better Auth memory limits: 60/min default, signup 3/min, sign-in
5/min, resend 3/min per path/client bucket. These are not distributed abuse
protection; verification and the recipient guard protect the controlled staging
mail workflow. No claim of a public-registration abuse solution is made.

Previously inspected metadata exposes shared Preview aliases including
`DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`,
`POSTGRES_URL_NO_SSL`, `POSTGRES_HOST`, `PGHOST_UNPOOLED`, `POSTGRES_PASSWORD`,
`POSTGRES_USER`, `PGUSER`, `PGDATABASE`, `POSTGRES_DATABASE`. Values were not
decrypted here. Also inventory `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGSERVICE`,
`PGSERVICEFILE`, `PGPASSFILE`, `PGOPTIONS`, `PGSSLMODE`, `POSTGRES_URL_NON_POOLING`
and every matching alias, not just this list.

Operator changes must remove these inherited credentials from this Preview,
using verified branch-specific empty overrides if supported, or a separately
reviewed rescope that preserves required Production/other-branch behavior.
Never replace shared Production values globally. If Vercel cannot represent an
empty override, do not assume it worked; resolve the scopes first. With nonempty
aliases still inherited, the new code intentionally refuses staging startup.
It does not retroactively remove credentials from an old deployment process.

Secure verification: resolve the exact branch Preview and Production environments
in a trusted local process/provider UI without printing values or saving env
files into Git. Include inherited aliases/system identity, not just the seven
explicit overrides. Feed an in-memory object `{preview:{...},production:{...}}`
to `node scripts/authoring-release/operator.mjs audit-env-stdin` through stdin
from the trusted secret broker. Do not put JSON/URIs in argv, use `tee`, log the
input, display env files or hash passwords. Output contains endpoint IDs, names
and booleans only. Require the expected Preview endpoint/database/TLS, distinct
Production endpoint, different auth secrets, valid staging identity/origin,
and `nonempty_aliases_blocking_staging_database=[]`. Privately review the actual
approved allowlist; no email send is needed to inspect it. Verify the **fresh
deployment SHA** afterward: the local audit's enforcement claim describes the
reviewed source, not the old deployed commit or arbitrary runtime processes.

## Backup, migration and release gates

1. Authorize only the required effective-value inspection and read-only remote
   baseline/backup metadata work. Resolve any discrepancy before writes.
2. Authorize a real encrypted full staging backup and local PG18.6 restoration
   under `AUTHORING_STAGING_BACKUP.md`. Validate fingerprints/schema/ledger and
   separately validate Neon owner/ACL/role restoration and a usable cutover
   destination. The locally tested same-branch database/rename method needs
   provider quota/storage support and real privileges; it is not presumed usable.
   Alternatively obtain approved snapshot restore capacity and rehearse it.
   Until this evidence exists, migration recovery flags stay false and NO-GO.
3. Resolve alias scopes, allowlist values, strict origin settings and explicit
   database/Production separation. This task changes no Vercel configuration.
4. Review the final local diff and decide explicitly whether to defer main's
   changes. Previous fetch showed six commits behind main, twelve unique ahead;
   refresh refs before action. Do not automatically merge/rebase or force push.
5. When authorized, create a reviewed local commit of approved source, tests,
   CI, docs and operational package, excluding `work/`, secrets and backups.
   Bind its exact SHA and new `PACKAGE_SHA256SUMS` digest to a private copy of the
   deliberately false approval template. Review the common advisory lock
   `hashtextextended('physcratic:authoring:migrations:v1',0)`, roles, quiescence,
   fresh recovery evidence and exact missing suffix. Never reuse an approval
   bound to the prior package digest.
6. With a separate migration write approval and writers quiesced, use the
   existing `execute-missing-suffix` procedure only. It rechecks the baseline
   under lock, applies unchanged UP SQL for only the verified suffix and inserts
   the six-column ledger rows in the same transaction. Existing records/OIDs/
   xmin/ctid and historical ledger rows are checked unchanged. After COMMIT run
   the independent read-only post-commit validation on a new connection. Failure
   before COMMIT rolls back; uncertain COMMIT is a stop/inspect, never replay.
7. Only after explicit push/deploy authorization, push the reviewed SHA normally
   to the **exact** integration branch. Account for automatic Vercel Preview
   deployment; agree any necessary exposure/deployment hold before pushing.
   Require fresh CI on that SHA (frozen install, types, zero-warning lint, full
   PG18.6 tests, release package/mail guard, build) and the browser evidence.
   A prior READY deployment does not include these local changes. Verify the
   new deployment's endpoint/origin/OIDC configuration before separately approved
   isolated test accounts, mail or Blob writes. No Production rollout is included.

No additional MVP features or migration edits are required by the identified
code gaps. Remaining gates are operator evidence/configuration/approval, not
permission to guess that missing schema or recovery capacity is safe.

## Validation and preservation

Logs and a before-edit archive are retained in `work/staging-blocker-fixes/`.
The original three Blob patch artifacts and `AUTHORING_STAGING_VALIDATION.md`
retain their exact prior SHA256 values. `prepared-package-before-fixes.tar.gz`
preserves the previous package, app files and audit; `before-sha256.json` records
its file hashes. The unchanged canonical baselines and migration bytes were
verified against those records. New delta/combined patch and audit manifest
are written separately; the old patches and audit manifests remain unchanged.
Disposable local test reports are regenerated by the preserved test runner.

Current verification: 314/314 application tests on disposable PG18.6; 16/16
release-package/CLI checks; 41/41 Blob+mail transport checks; actual read-only
psql preflight and supplement; encrypted synthetic full-DB restore/cutover with
mutation/corrupt-archive refusal; TypeScript; zero-warning lint; production
build in the disposable source/dependency workspace. Browser results and exact
artifact digests are recorded in the final follow-up manifest. All three browser
suites passed again in this follow-up. Every mail/Blob
transport is mocked; all SQL executed here was disposable local SQL.
