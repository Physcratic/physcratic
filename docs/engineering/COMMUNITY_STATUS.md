# Community implementation status

Updated: 3 November 2026, 02:42 WITA (UTC+8).

## Batch 1A: profile backend

**Deployment: PENDING USER ACTION. NOT DEPLOYED BY CODEX.**

- Base: latest main `f13a74b36d0379be3cab93ed0ce6c77c02ba78ce`, including the user's deployment-trigger commit after Batch 0.
- Implementation SHA: `bd3ee3bffbf360301faa8289e2c11b3d954108d8`.
- Branch: `codex/community-batch-1a-2026-11-03`.
- Final merge SHA: pending CI and merge; finalized after merge.
- Batch 0 remains merged through PR #77 (`5209a47b2d099b3e9dce4f49fbdf45abe1a3974b`). No Batch 0 implementation was repeated.

### Implemented and changed files

- `migrations/0007_community_profile.up.sql` and `.down.sql`: additive profile and shared write-limit tables, Better Auth user foreign keys, case-insensitive handle uniqueness, field constraints, immutable user ID/handle/creation time, server-owned update timestamps, default-private visibility. Down refuses to remove populated profiles.
- `lib/db/schema.ts`: corresponding additive Drizzle declarations. Existing Better Auth/authored/submission schema definitions are unchanged. SQL remains authoritative for the update trigger; do not use schema push.
- `lib/community/profile-contracts.ts`: strict Zod PATCH contract, reserved handles, bounded text, education preferences, canonical topic IDs and write policy.
- `lib/community/profile-api.ts`: session-bound own reads/edits, explicit publication, guest lookup, transaction/ownership/concurrency enforcement, persistent rate limiting and generic errors.
- `lib/community/profile-route.ts` and `profile-server.ts`: explicit default-off gate before loading auth/database bindings.
- `app/api/community/profile/route.ts`: own GET/PATCH. `app/api/community/profile/[handle]/route.ts`: public GET.
- `lib/community-profile.test.ts`: contract, disabled production-route exports, HTTP boundary and disposable PostgreSQL coverage.
- `docs/engineering/COMMUNITY_GUIDEBOOK.md`: incorporates the roadmap branch's current model recommendations and mandatory user-owned deployment procedure. Main's guidebook had no later edits to preserve. Other main changes, including README, remain untouched.
- This handoff: `docs/engineering/COMMUNITY_STATUS.md`.

### API contract and privacy

- `GET /api/community/profile`: authenticated owner only, returns `{profile:null}` until the first explicit save. Reading never initializes or publishes a profile.
- `PATCH /api/community/profile`: verified session and configured same-origin request required. First save requires `handle` and returns 201; subsequent partial saves return 200. Body accepts only `handle`, `displayName`, `bio`, `educationLevel`, `favoriteTopicIds`, `publicVisibility`. Account ID is taken only from the session; identity/role/extra selectors are rejected.
- Handles normalize to lowercase ASCII, 3–24 characters, first character alphanumeric, remaining characters alphanumeric/underscore. Reserved handles are blocked in both API and PostgreSQL. Handles are permanent once created: attempted rename returns 409; case-only equivalent updates are accepted. No old-handle redirects, aliases or reassignment API. A future rename policy requires a separate reviewed change.
- Defaults: empty display name/bio/topics, `educationLevel=prefer-not-to-say`, `publicVisibility=false`. No account email, real name, contest identity or other private data is copied automatically. Display name is editable independently of Better Auth and any verification records.
- Display name limit: 80 Unicode code points. Bio limit: 500. Education values: `high-school`, `university`, `other`, `prefer-not-to-say`. Favourite topic IDs are unique selections from the six `physicsTopics` IDs in `lib/physics-taxonomy.ts`, not method tags. These are preferences, never authorization roles.
- `GET /api/community/profile/{handle}`: guest-accessible only after explicit publication; returns handle/displayName/bio/educationLevel/favoriteTopicIds. No user ID, email, timestamps, session, attempts, certificate or private authoring fields. Missing, private and invalid handles return the same 404. Opt-out takes effect on subsequent reads.
- All responses use `Cache-Control: private, no-store, max-age=0`, `Vary: Cookie`, `nosniff` and noindex headers, including public lookups, so visibility changes are not served from a shared cache.
- PATCH is limited to 10 requests per fixed database-clock minute per verified account across instances. Invalid/conflicting saves consume quota. Buckets are bounded to one row/account and counters saturate at 11. Limit returns 429 with `Retry-After: 60`; JSON bodies are capped at 8 KiB and body reads at 5 seconds. No process-local limiter.

### Migration and compatibility

- New schema: **0007 only**. No changes to or reruns of 0001–0006. No existing account data is backfilled, published or modified.
- SQL executed only in disposable local PostgreSQL 18.6 containers, removed by the test harness. **No staging or production SQL executed.** Historical release packages and infrastructure are unchanged.
- `COMMUNITY_PROFILES_ENABLED` is server-only and enables routes only for the exact string `true`. Unset, false and all other values disable every profile route with a stable 503 before loading the profile server/auth/database dependencies. Do not enable until 0007 and runtime grants are installed.
- Compatible with the currently deployed schema while disabled: no new-table queries, signup hooks, startup migrations, existing page/API consumers or auth behavior changes. Enabled but missing schema fails closed with a generic 503.
- Up-file SHA256: `7fcba67760efa0d265c949f20dc3351a49721c9285c21e498b70013969e19f0e`.
- Down-file SHA256: `28a56972a98f77483dddd1442d113b4603e088a04fc475f296cee10f4ae63ad2`.

### Verification

- `corepack pnpm install --frozen-lockfile`: passed, pinned pnpm 10.34.9, no dependency changes.
- `corepack pnpm exec next typegen && corepack pnpm exec tsc --noEmit`: passed. An initial optional-row typing issue was corrected before final checks.
- `corepack pnpm lint --max-warnings=0`: passed.
- `bash scripts/test-problem-authoring.sh node --require ./tests/server-only-register.cjs --import tsx --test lib/community-profile.test.ts`: 14 passed, no skips/failures. Includes creation/partial edits, guest privacy and opt-out, duplicate/case/concurrent handles, same-owner concurrent writes, reserved/invalid/oversized input, IDOR/session spoofing/CSRF, verified-write requirement, cross-instance quota/reset, runtime grants, constraints, missing-schema handling, and migration up/down/up with account preservation and populated rollback refusal.
- `bash scripts/test-problem-authoring.sh corepack pnpm test`: 625 server tests, 624 passed, no skips/failures, 1 inherited corpus punctuation TODO. Includes existing Better Auth, authoring, submissions, private solution and grading regressions against disposable PostgreSQL. All 24 component tests passed.
- `python3 -B scripts/phase-c-offline/run.py safety`: passed runner self-test, 5 transport tests (2 expected skips), and 1 ESLint scope guard.
- `corepack pnpm build`: passed using synthetic build-only auth settings, with profiles disabled and no live database binding.
- Built local Next server with an intentionally unreachable synthetic loopback database: own GET, own PATCH and public GET all returned the expected disabled 503 JSON and private/no-store headers. The existing Better Auth initializer logged the unavailable synthetic database; no profile feature was enabled. Separate loader-counter tests prove disabled profile handlers never load their auth/database dependencies.
- `git diff --check`: passed. GitHub CI and final merge result are recorded after merge below.

### Later production migration: user/operator action only

1. Keep `COMMUNITY_PROFILES_ENABLED` unset/false. Separately authorize a production migration window and select the correct production database, direct non-pooled owner connection and current runtime role from trusted deployment bindings. Do not infer credentials/roles or reuse a staging connection. Take the normal recovery point. No production action is authorized or performed by this batch.
2. Check out the merged feature code. Verify the 0007 up-file SHA256 above. Inspect the existing production migration ledger and confirm 0001–0006 are already installed, 0007 is absent, and the two new table/function names are unused. If 0007 already exists or checksums/schema differ, stop and reconcile; never replay prior migrations or use IF NOT EXISTS to mask drift.
3. In one explicit owner transaction, set `search_path=public,pg_catalog`, `lock_timeout='5s'`, and a bounded statement timeout. Acquire the existing common migration lock with `SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0));`. Execute **only the complete reviewed `migrations/0007_community_profile.up.sql` once**. Do not run the frozen six-migration historical operator package.
4. In that transaction grant `SELECT, INSERT, UPDATE` on `public.community_profile` and `public.community_profile_write_limit` to the confirmed runtime role. Retain existing schema USAGE. Do not grant DELETE, table ownership, schema CREATE, or public access. The update trigger works without an EXECUTE grant on its trigger function, as tested under a restricted runtime role.
5. Verify the new tables, checks, unique handle index, foreign keys, immutable-update trigger and default false visibility, with no existing accounts backfilled. Record `id=0007_community_profile`, the up-file SHA256 above, source commit `bd3ee3bffbf360301faa8289e2c11b3d954108d8`, applying role/time and verified result in the existing `public.physcratic_production_migrations` ledger before commit. Roll back the transaction if any check fails. Reconnect and confirm installed objects and runtime grants after commit.
6. Only after installation/grants are verified, the **user** may set server-side `COMMUNITY_PROFILES_ENABLED=true` for the intended deployment. The user personally triggers Vercel through the authorized paid-seat GitHub account, using their normal meaningful README commit. Codex must not deploy, initiate Vercel builds/redeploys, edit deployment settings or create deployment-trigger commits.
7. The user verifies the Production deployment is READY and contains the feature merge, then smoke-tests guest private/missing 404s, authenticated own read/save, opt-in lookup and opt-out. Existing sign-in, submissions and authoring should still work. No production SHA/READY/smoke is claimed here. Before UI Batch 1B these APIs require a deliberate authenticated client; no profile UI ships in 1A.
8. Roll back exposure by disabling the flag and having the user redeploy. Preserve all profile data; do not run down on populated production. The down file is for disposable verification and deliberately refuses populated profiles.

### Outstanding and next phase

- No implementation blockers after local verification; merge is gated on GitHub CI. Production migration, runtime grants, feature enablement and Vercel deployment remain **PENDING USER ACTION**.
- No profile/onboarding/settings/media UI, handle rename, badges, roles, comments or other future phases implemented.
- Next phase: **Batch 1B**, starting from latest main, this handoff and the guidebook. Confirm schema/application readiness before enabling or using profiles.
