# Post-handoff staging validation — local, unpushed

Base: `4e18931e1c3e2f18271e6ff9f274a158c0c40f9a`, branch
`codex/physcratic-authoring-completion`. This report supersedes the earlier
ENOSPC/PG18/unknown-ledger local blockers. It does not approve a push or establish
live deployment isolation. No remote Neon SQL, real Blob operation, email,
cloud configuration change, push, merge or deployment was performed.

## Verdict and audited changes

The Blob selection patch is suitable for a separately authorized push **after**
effective Preview DB/auth/mail isolation and configuration are established and
the serving-schema rollout is approved. It is not safe to use an automatic
Preview deployment to discover whether those resources are isolated.

The original `work/physcratic-staging-blob.patch` is preserved byte-for-byte:
SHA256 `6d9efad40f3383f03a80c56c8498f78d1f887485d40ef66380e651357354d5c9`.
The follow-up retains the storage adapter, route guards and dependency pins and
adds one runtime correction: an explicit staging marker on a deployment whose
environment says Production now fails closed. Production without that marker
continues to pass exactly the original SDK options. Other correctly identified
Preview branches without the marker retain their previous behavior.

Additional changes are local test infrastructure, tests, a checksum manifest and
operator documentation. No product feature, auth policy, database migration SQL,
ownership rule, API contract, retention or revision policy was changed.
`scripts/test-problem-authoring.sh` accepts an optional
`AUTHORING_TEST_POSTGRES_IMAGE`; its default remains `postgres:17-alpine`.

## Blob proof and limits

All production Blob imports were reinspected. Author media and authorized
solution reads use `privateAuthorStorage`. The two direct legacy solution-evidence
routes obtain the same guarded credentials for put, get and failure-cleanup del.
There are no other production Blob SDK imports in this checkout.

With the staging marker enabled, every operation requires matching branch,
Preview environment, Vercel project, staging store, current OIDC claims and a
relative registry path. Missing or conflicting input stops before the SDK.
An explicit Production environment cannot override an explicit staging marker.

Installed/pinned Blob 2.8.2 resolves explicit `token` first, then OIDC/store, then
legacy environment credentials. Our staging path passes **only** the validated,
nonempty `{ oidcToken, storeId }` pair, with no explicit `token` or environment
spread. That path returns from the SDK's OIDC branch before it can read the
legacy token. SDK rejection never invokes an application fallback. Full Blob URLs
are refused so a stored URL cannot select another store for get/del. Normal
Production supplies no credential overrides and preserves SDK behavior.

The actual SDK transport test disables network connections, exercises installed
OIDC 3.8.10 through a mocked Function context, and checks put/del staging headers
and the private get destination with conflicting shared credentials present.
The negative matrix includes missing OIDC, store, project/branch/environment,
claim mismatches, expiration, helper errors and a Production/staging-marker
conflict. Both author-media and solution-evidence path prefixes are covered.
No URLs or credentials are added to application responses or logs.

JWT decoding is a local consistency check; Blob verifies cryptographic validity
and store authorization. The proof assumes trusted Vercel system variables and
Function context, the pinned SDK and this code. The provider connection remains
Preview-wide, so it is not a provider-enforced branch-exclusive permission.
This proof does not claim that the deployed OIDC connection has been exercised.

## Disposable PostgreSQL 18.6 and preservation results

Test image: `postgres:18.6-alpine`, pulled digest
`sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5`.
The test server itself reports `server_version=18.6`; no approximate-version
substitution was needed. Tests connect only to `127.0.0.1` and a disposable test
database. The upgrade fixture creates its own separate database/public schema.

The local ledger reproduces the supplied contract exactly: `id text` primary
key; `sha256 text`, `source_commit text`, `result text`; `applied_at timestamptz`
default `clock_timestamp()`; `applied_by text` default `CURRENT_USER`; all columns
NOT NULL; lowercase 64-hex checksum check and `result='verified'` check.
Constraints/defaults, invalid checksum/result rejection and duplicate rejection
are tested. Entries 0001–0003 use the supplied historical source commit
`b191dd03d62aa4b01e7a3f08272b2417643f0d53` and exact supplied checksums.

The fixture populates all base tables, including two users, a published problem,
an unpublished draft, private parts/keys, immutable revision/part rows, media,
draft/revision media references and limit/usage rows, before upgrading. It
compares row JSON, table OIDs, row `xmin` and `ctid` after each migration.
Original ledger rows receive the same preservation check; only new ledger rows
are appended. It creates an attempt after 0004 and verifies that 0005/0006
preserve its answer, assistance flag, timestamp and physical identity.

Nine upgrade/checksum tests pass, covering:

- Exact checksums, supplied ledger schema/history and additive 0004→0006 rollout.
- An index present without its ledger entry stops before any migration DDL.
- Failure late in a combined 0004–0006 transaction rolls back its DDL and ledger
  appends, preserving the original records and ledger prefix.
- No permission/reveal grants are backfilled by 0005; prior solutions remain
  denied by default. Historical attempts remain unchanged.
- 0006 searches existing publication metadata and adds its four indexes without
  exposing the private/draft sentinels.
- Original publication and media remain readable; immutable revisions/attempts
  and referenced media remain protected. Storage bytes are memory fixtures.

All six UP files are unchanged from the base commit. Exact SHA256 values are in
`AUTHORING_MIGRATION_SHA256SUMS`; the first three match the supplied remote
ledger rows. Local append statements use the real column names/defaults and
complete successfully. That confirms compatibility with the **supplied** ledger
contract, not current remote schema/privileges or an established remote lock key.
Missing remote ledger entries are not evidence of absent tables, indexes,
constraints, triggers or functions. Live catalog reconciliation remains a gate.

## Browser and tool results

A clean source copy and fresh frozen install were created under a task-owned
`/tmp/physcratic-blob-validation-*` directory. `/tmp` initially had about 4.9 GB
free and the root filesystem about 4.2 GB; both had ample free inodes. Browser
builds/profiles/screenshots were placed in this fresh workspace. No shared or
user files, images, caches or volumes were deleted or pruned. ENOSPC did not recur.
Only the test-owned disposable PostgreSQL containers/databases were cleaned up.

Tools: pinned pnpm 10.34.9, Playwright 1.58.2, axe 4.11.1 and system Chromium
154.0.8037.57. All three complete browser suites pass on separate disposable
PostgreSQL 18.6 instances:

| Suite | Result and coverage |
| --- | --- |
| `tests/authored-library.browser.mjs` | PASS: filters/search, stable keyset pagination, reader/navigation, loading/errors, republish/unpublish, legacy tabs, keyboard, 1440/375px light/dark axe and overflow, draft/private exclusion. |
| `tests/problem-authoring.browser.mjs` | PASS: actual editor and unified editor→library→attempts→explicit solution/media workflow, autosave/recovery/conflicts, publication/privacy, keyboard/mobile/axe. |
| `tests/authored-student.browser.mjs` | PASS: all answer modes/outcomes, history/pagination/retries, account/revision races, explicit permissions/reveals, no preload, assisted attempts, desktop/mobile axe/overflow. |

These harnesses use real components and API factories with injected sessions and
memory media. They do not prove real Vercel auth delivery or Blob authorization.
The clean full suite passes **307/307**, zero failures/skips/TODOs: 40 focused
storage checks, nine migration-upgrade/checksum checks and six auth-review checks
are included. Clean Next type generation, TypeScript and lint with zero warnings
pass. The production build is verified with the exact candidate auth/site URL,
a disposable build-only secret and an initialized disposable PG18.6 auth schema;
no live credentials are used. A preceding build without a DB also exited zero
but reported schema-validation diagnostics, so it was repeated with the local
schema rather than treating that diagnostic as runtime readiness. Detailed logs,
local build helpers and browser screenshots are retained in `work/`. The 55 new
storage/upgrade/auth checks also pass on the unchanged default PG17 runner.

## Reproduce the local gates

From a checkout containing the reviewed changes, use the pinned package manager.
The runner creates/removes only its own localhost test container; it does not use
`DATABASE_URL` to select its target. The upgrade/auth fixtures assert localhost
and the disposable database name before creating their own test databases.

```sh
corepack pnpm install --frozen-lockfile
sha256sum -c docs/engineering/AUTHORING_MIGRATION_SHA256SUMS
corepack pnpm exec next typegen
corepack pnpm exec tsc --noEmit
corepack pnpm lint --max-warnings=0
AUTHORING_TEST_POSTGRES_IMAGE=postgres:18.6-alpine \
AUTHORING_TEST_EXPECTED_VERSION=18.6 \
bash scripts/test-problem-authoring.sh corepack pnpm test
```

In a **fresh task-owned** directory with adequate disk/inodes, install browser
tools separately (they are not added to application dependencies):

```sh
mkdir -p work/browser-tools
printf '%s\n' '{"private":true}' > work/browser-tools/package.json
npm install --prefix work/browser-tools --no-save --ignore-scripts --no-audit --no-fund playwright@1.58.2 @axe-core/playwright@4.11.1
export AUTHORING_BROWSER_TOOLS="$PWD/work/browser-tools"
export CHROMIUM_PATH=/usr/bin/chromium
for suite in authored-library problem-authoring authored-student; do
  AUTHORING_TEST_POSTGRES_IMAGE=postgres:18.6-alpine \
    bash scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server "tests/$suite.browser.mjs"
done
```

For this session the fresh source copy, frozen install, browser tooling and
scratch data were under `/tmp/physcratic-blob-validation-*`, leaving the original
checkout and original patch intact. `work/followup-workspace.json` records that
directory. The retained `work/build-on-disposable-postgres.sh` and
`work/init-build-auth.mjs` show the exact final build procedure: copy these two
local helpers into that fresh checkout's `work/` and run
`AUTHORING_TEST_POSTGRES_IMAGE=postgres:18.6-alpine bash scripts/test-problem-authoring.sh bash work/build-on-disposable-postgres.sh`.
They initialize only the runner's empty local auth database, set the candidate
origin and a disposable test secret, then build. Do not use that secret or
disposable database for a deployment. Never prune shared files/caches/volumes
to make these gates run; choose a task-owned filesystem with sufficient space.

## Actual Better Auth and email review

Candidate `BETTER_AUTH_URL`, tested locally through the actual installed auth
handler (no HTTP request to the deployment):

`https://financial-dashboard-git-codex-physcr-54d12a-neuterions-projects.vercel.app`

The supplied READY deployment `dpl_CairGvgTKpWzVX2QPGAYqcni9qYJ` is at base
`4e18931` and **does not contain this local patch**. It is a branch alias, not a
custom domain. `staging.physcratic.com` is a different branch and is not used.

The local auth test creates Better Auth's base tables only in a new disposable
database and replaces the delivery/scheduling callback with an in-memory capture.
Password hashing, terms hooks, verification JWT construction, the actual auth
handler, origin/callback middleware and database adapter are exercised. All
outbound fetches are blocked except a locally mocked Resend fetch.

- The explicit URL becomes the auth base with `/api/auth`; email links use its
  `/api/auth/verify-email` endpoint. The frontend's relative sign-in callback and
  `returnTo` survive. The React auth client uses same-origin `/api/auth`.
- Signup records a server-derived Terms version/time and leaves the user
  unverified without a session. An unverified password sign-in is denied and can
  request a fresh email. Invalid/expired tokens leave the user unverified.
- Verification JWT validity is one hour. Verification does not automatically
  sign in. Reusing a valid link for an already verified user is idempotent until
  expiry; **single-use invalidation is not implemented**. A fresh sign-in creates
  a Secure, HttpOnly, SameSite=Lax host-only cookie in the tested Preview setup.
- Foreign origins and off-origin callbacks are rejected. However, the current
  application also trusts `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL`, and
  Better Auth additionally accepts `BETTER_AUTH_TRUSTED_ORIGINS` if set. Explicit
  `BETTER_AUTH_URL` anchors links; it does **not** make the trusted-origin list
  stable-alias-only. Submission-origin checks also retain the Vercel origins.
  Inventory and approve that complete origin set; if stable-only trust is a
  release requirement, a separate scoped auth change/retest is still required.
- Missing `BETTER_AUTH_URL` is not runtime fail-closed: this branch can fall back
  to the Production project URL. A nonempty explicit branch override is therefore
  a mandatory operator gate, not a newly implemented auth runtime guard.
- Missing mail key/domain or an invalid domain throws before a mail HTTP call.
  The current callback runs delivery via Next `after()` and catches failures:
  signup/resend can return a generic success while delivery fails, but the user
  remains unverified and cannot sign in. There is no test outbox or delivery
  bypass in the deployed code.
- Sender is exactly `Physcratic <accounts@${RESEND_EMAIL_DOMAIN}>`. Resend's
  idempotency key is a SHA256 of the verification token, not the raw token.
  Local mocked delivery verifies sender, recipient and link. Real domain/API
  permission, Vercel `after()` lifecycle, delivery and link reachability remain
  future explicitly authorized runtime checks.

No reCAPTCHA integration or required variables exist in this checked-out branch.
Do not add speculative CAPTCHA configuration. Existing abuse controls include
required Terms acceptance, verified-email sign-in, bounded auth request bodies,
password limits, and enabled auth limits: overall 60/min, signup 3/min per IP/path,
sign-in 5/min, verification resend 3/min. The actual fourth registration request
is rejected with 429 and `X-Retry-After` in the local test. The default auth rate
storage is **per-process memory**, not a durable cross-instance quota. If no
client IP is resolvable, this SDK uses one shared per-path bucket rather than
disabling the limit. Verify trusted proxy/client-IP behavior in the eventual
deployment; do not claim these limits prevent distributed registration abuse.
Authoring/media/student quotas remain their existing database-backed policies.

## Exact configuration and remaining gates

All manual variables below must target Preview for
`codex/physcratic-authoring-completion` only, except the already Preview-wide
store connection noted explicitly. No Production or other-branch override is
part of this task.

| Name | Value or exact requirement |
| --- | --- |
| `AUTHORING_STAGING_BLOB_ENABLED` | Config value `1`, branch-only. |
| `AUTHORING_STAGING_BLOB_STORE_ID` | `store_3XHvtHs2UM4ZFD5d`; existing Preview-wide connection. Verify effective branch value. |
| `DATABASE_URL` | Secret for an approved isolated DB/runtime role. Candidate only: project `divine-mode-82940461`, branch `br-solitary-thunder-b7h5q79t`, endpoint `ep-green-waterfall-b7qaw260`, DB `neondb`. Confirm its effective mapping and isolation; no connection string is invented here. |
| `BETTER_AUTH_URL` | Exact candidate origin printed above, HTTPS, no trailing slash, nonempty. |
| `BETTER_AUTH_SECRET` | Independently generated staging secret of at least 32 random characters, distinct from Production; never the disposable test/build value. |
| `RESEND_API_KEY` | Approved staging-only sender credential supplied securely; no value is recorded here. |
| `RESEND_EMAIL_DOMAIN` | Operator-approved, verified staging sending domain without scheme/path. Code sends from `accounts@` that domain. The actual domain was not supplied. |
| `NEXT_PUBLIC_SITE_URL` | Same exact candidate branch origin, set before build. It controls public URL metadata, not auth trust. |

Ensure `BETTER_AUTH_TRUSTED_ORIGINS` is unset unless its exact additional origins
have been separately reviewed; it is not required. Verify the generated
`VERCEL=1`, `VERCEL_ENV=preview`, correct `VERCEL_PROJECT_ID` and
`VERCEL_GIT_COMMIT_REF` are exposed, and Function OIDC is available. These are
Vercel identity sources, not manual aliases to forge. No manual OIDC token,
additional Blob read/write token, webhook key or reCAPTCHA variable is required.

Before requesting push approval, close these actual outstanding gates:

1. Prove effective Vercel DB/role and auth/mail overrides are isolated, including
   their scope and the complete trusted-origin set. A candidate name/zero table
   counts/READY build do not establish that evidence.
2. Reconcile the approved target's live schema against its real ledger, confirm
   privileges and the shared migration lock contract, and obtain a backup and
   approved recovery plan. The supplied ledger contract/checksums and local PG18.6
   upgrade are confirmed; present remote drift is still unknown.
3. Explicitly authorize the next push/deployment/schema rollout, keep incompatible
   serving exposure withheld until 0004–0006 are applied under separate approval,
   and require fresh CI for the final commit. No migration is run by build/start.
4. After deployment, separately authorize read-only OIDC/store verification and
   then isolated auth/mail/Blob live tests. No probe upload to the shared store
   is needed. Use the exact procedures in `AUTHORING_RELEASE_RUNBOOK.md` and
   `AUTHORING_STAGING_BLOB.md`.
