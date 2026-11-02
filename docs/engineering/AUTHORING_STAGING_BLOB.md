# Authoring Preview Blob isolation — local preparation

Prepared against handoff `4e18931e1c3e2f18271e6ff9f274a158c0c40f9a` on
`codex/physcratic-authoring-completion`. This is an unpushed local patch, not a
deployment or approval to change infrastructure. No remote configuration,
migrations, mail, users, or real Blob operations were performed.

Follow-up audit and PostgreSQL 18.6/browser/auth results are recorded in
[staging validation](AUTHORING_STAGING_VALIDATION.md). The original patch file
is preserved; use the separately retained reviewed diff for subsequent review.

## Behavior and boundary

The authoring branch requires all of these before **each** Blob operation:

- `VERCEL=1`, `VERCEL_ENV=preview`, the exact Git branch above, and
  `VERCEL_PROJECT_ID=prj_phm4794zl2QBICu5MMbLFxcHAfFq`.
- `AUTHORING_STAGING_BLOB_ENABLED=1` and
  `AUTHORING_STAGING_BLOB_STORE_ID=store_3XHvtHs2UM4ZFD5d`.
- A current nonempty OIDC token from `getVercelOidcToken()` inside the Function
  request context. Claim consistency checks require the financial-dashboard
  project ID/name, neuterions-projects team, Preview environment, standard team
  audience/subject, team or global issuer, expiry and not-before time.
- A relative `author-media/` or `solution-evidence/` registry path. Full URLs,
  traversal and URL syntax are refused before the SDK can use a URL's host.

Missing or mismatched inputs throw a fixed credential-free error before any
Blob call. The branch itself requires the opt-in: deleting the marker does not
restore shared storage. A marker on another branch fails closed. A deployed
non-Production environment missing environment/branch identity also fails closed.
Production without a staging marker returns the original SDK options. An
explicit staging marker fails closed even if the environment says Production;
correctly identified other Preview
branches ignore the Preview-wide staging-store variable unless misconfigured
with the branch-only marker. Local development without that branch/marker keeps
the original SDK behavior. This policy trusts Vercel's system variables and its
Function request context; it cannot protect against an administrator deliberately
replacing the code or forging the entire deployment configuration.

Decoded JWT claims are consistency checks, **not local signature verification**.
Blob remains responsible for verifying the token signature and authorization for
the selected store. A fabricated or otherwise invalid token can only be sent to
the pinned staging store, where it must be rejected; it cannot select the shared
store. Token/helper failures and SDK denials never retry with legacy credentials.

The existing `AuthorStorage` interface, private access, non-overwrite policy,
ownership checks, revision pinning, solution permissions, retention and cleanup
tombstones are preserved. Production call sites are `problem-authoring-server.ts`
(upload/read/delete/cleanup) and `authored-solution-server.ts` (authorized private
solution reads). Both already use `privateAuthorStorage`. The two direct legacy
solution-evidence routes now use the same credential guard for upload, download
and failure cleanup; otherwise that Preview would retain a shared-store path.
They retain their existing response, auth, storage and timeout options. No
migration or application API signature changed. SDK URL metadata is discarded;
existing API error handling returns generic messages and no token is logged.

## Version-specific fallback proof

Frozen installation resolved `@vercel/blob` **2.8.2**, with transitive
`@vercel/oidc` **3.8.10**. The patch pins Blob at that exact version and makes
that same OIDC version a direct dependency; no SDK package upgrade is involved.

Inspected installed source:

- Blob `dist/chunk-XKVPKJPO.js`, `resolveBlobAuth`: explicit `token` takes
  precedence; next is explicit nonempty `oidcToken` (otherwise the OIDC helper)
  paired with explicit `storeId` (otherwise `BLOB_STORE_ID`); finally it can use
  `BLOB_READ_WRITE_TOKEN`. The SDK's internal OIDC wrapper swallows helper
  failures, making a storeId-only change unsafe.
- The adapter instead obtains/validates OIDC itself and passes exactly the
  nonempty `{ oidcToken, storeId }` pair, with **no `token` option**. It never
  spreads environment variables, changes global credentials, or caches a token.
  SDK resolution therefore returns from its OIDC branch before legacy fallback.
- Blob `put` and `del` use `requestApi`, which sends the normalized staging ID in
  `x-vercel-blob-store-id` and OIDC in `Authorization`. `get` uses the same auth
  resolver, constructs the private URL from that staging ID and sends OIDC.
- OIDC 3.8.10 `get-context`/`get-vercel-oidc-token-sync` prefer the trusted Function
  request-context header, then `VERCEL_OIDC_TOKEN`; the public async helper checks
  expiry and can attempt local refresh. The adapter calls it per operation and
  propagates failure as a fixed error. This version does **not** implement the
  token-file source documented for OIDC 4.x; no token-file behavior is assumed.

Official references (installed source governs version-specific behavior):
[Blob authentication](https://vercel.com/docs/vercel-blob/using-blob-sdk#authentication),
[OIDC helper and claims](https://vercel.com/docs/oidc/reference).
Dependency updates must re-run the SDK transport test and review this proof.

## Required operator configuration — proposal only

Project: `neuterions-projects/financial-dashboard`
(`prj_phm4794zl2QBICu5MMbLFxcHAfFq`).

| Variable | Required value | Scope/action |
| --- | --- | --- |
| `AUTHORING_STAGING_BLOB_ENABLED` | `1` | **New Config variable**, Preview restricted to Git branch `codex/physcratic-authoring-completion` only. No Production, Development or Preview-wide value. |
| `AUTHORING_STAGING_BLOB_STORE_ID` | `store_3XHvtHs2UM4ZFD5d` | Existing Preview-wide connection variable. Verify the effective branch value; no additional variable is needed if it matches. |

These are nonsecret configuration values. No additional read/write token, secret,
manual `VERCEL_OIDC_TOKEN`, `BLOB_STORE_ID` override, or webhook key is required.
The existing `AUTHORING_STAGING_BLOB_WEBHOOK_PUBLIC_KEY` is unused by these
server-side operations. Leave Production and other branch credentials unchanged.
The connection itself remains Preview-wide; application branch gating does not
make the provider's connection branch-exclusive.

Verify Vercel exposes the system variables listed above and supplies current
OIDC in Functions. Do not manually forge system identity variables. If the
automatic system-variable exposure is disabled or claims differ, the operator
must resolve that mismatch before validation; the code deliberately refuses it.
Do not execute configuration changes or deploy as part of this preparation.

## Proving selection without touching the original store

1. Review the pinned dependency source and run the focused test:
   `corepack pnpm exec tsx --conditions=react-server --test lib/author-media-storage.test.ts`.
   The transport test disables all network connections using the SDK's own
   Undici MockAgent. It mocks Vercel's Function context, runs the actual installed
   OIDC helper and Blob SDK, and verifies staging put/get/del destinations and
   credentials despite a conflicting shared `BLOB_STORE_ID` and legacy token.
   Missing/mismatched inputs make zero SDK calls. A mocked 403 surfaces without
   legacy retry. No upload to either actual store is necessary for these proofs.
2. After independent DB/auth isolation review and separate approval for a
   deployment, pin its SHA/deployment ID, project, environment and branch, and
   verify effective variable scopes read-only. Do not use an old Preview to
   validate this unpushed patch.
3. Only under separate authorization for a read-only storage check, execute a
   trusted server-side diagnostic **inside that Function's request context**:
   obtain `authoringPreviewBlobCredentials("author-media/preflight")`, require
   `storeId === "store_3XHvtHs2UM4ZFD5d"` and a nonempty `oidcToken`, then call
   Blob `list({ ...credentials, limit: 1 })`. Discard the returned object metadata;
   record only success, the nonsecret staging store ID, deployment ID/SHA and
   branch. Never print credentials, decoded JWTs, raw URLs, paths or object lists.
   This checks reachability/authorization for the explicit staging store without
   writes or any operation against `store_d3dkNrocHUVOhMdE`. Failure is a stop,
   not permission to retry with default SDK credentials. This diagnostic is a
   proposed operator procedure, not a new application endpoint or executed check.
4. Any later test upload needs explicit isolated-staging write authorization.
   Use only the guarded application path and verify the object in the staging
   store. There is no reason to upload a probe to the original store.

## Remaining release blockers

The supplied evidence identifies private staging store
`physcratic-authoring-staging`, ID `store_3XHvtHs2UM4ZFD5d`, Preview connection
and zero objects. The original `financial-dashboard-blob`, ID
`store_d3dkNrocHUVOhMdE`, remains connected to Production/Preview/Development.
These facts were supplied by the operator, not reverified with live storage calls.

The candidate Neon `divine-mode-82940461` / `br-solitary-thunder-b7h5q79t` /
`neondb` is PostgreSQL **18.6**; the follow-up now tests that exact version locally. Supplied read-only
evidence reports zero `public.user`, `authored_problem`, `author_media` rows and
an existing `public.physcratic_integration_migrations` ledger: 0001–0003 verified
with matching repository checksums; no entries for 0004–0006. Do not replay the
first three, infer approval from an empty table, bootstrap another ledger, or
apply the remaining migrations. Actual Vercel DB endpoint/role isolation,
approved auth/origins/mail configuration, backups/recovery, current schema drift,
final CI and runtime staging validation remain blocking. Never push this patch
while automatic Preview deployment could attach it to unverified DB/auth.

The staging **credential-selection path is fail-closed in the pinned code and
mock transport tests**. A deployed end-to-end environment is not yet verified.
No push, PR #27 merge, deployment or shared infrastructure mutation is authorized.

## Initial local validation results (historical)

- Focused storage tests: **39 passed**, zero failures/skips, including actual SDK
  mock transport and installed OIDC request-context retrieval.
- Existing media authorization/cleanup and authored solution lifecycle tests:
  **20 passed** against disposable local PostgreSQL 17 and memory storage.
- Full `pnpm test` via the disposable PostgreSQL runner: **291 passed**, zero
  failures/skips. Migration fixture work occurred only in disposable local test
  schemas; the candidate Neon database was not accessed.
- TypeScript `tsc --noEmit`: passed. Repository `pnpm lint`: passed.
- `pnpm build`: passed. Better Auth reported missing local base URL/default
  secret during build because no live credentials/configuration were supplied;
  this build does not prove runtime auth readiness.

Use `corepack pnpm` for this checkout's pinned pnpm 10.34.9. The host's default
pnpm 11 rejected the frozen lockfile's override configuration; using the pinned
version installed it successfully without changing resolved packages.

Follow-up: 307/307 full tests pass on PostgreSQL 18.6, including 40 focused
storage checks, nine upgrade/checksum checks and six actual-auth review checks.
All three clean-workspace browser suites, types, zero-warning lint and configured
production build pass. See the validation report for scope and remaining gates.
