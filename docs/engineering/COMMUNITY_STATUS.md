# Community implementation status

Updated: 3 November 2026, 03:42 WITA (UTC+8).

## Batch 1B: Settings, public profiles, images and optional setup

**Deployment: PENDING USER ACTION. NOT DEPLOYED BY CODEX.**

- Starting base: latest main `cfcbfaa97cb33db44e7bd85e520dd63c45c31a1d`. During work, main advanced through PR #80 to `5689bb193fe466faa6058202a4477f46886246d9`; integrated it normally as `3bcf7627b8f2e05b5309af20ffe3fa56a9260382`, preserving all new guides/metadata changes, then reran combined checks.
- Implementation SHA: `3b640c8c176bf32e5fde4a1be48635c4cccaded4`.
- Branch: `codex/community-batch-1b-2026-11-03`. Delivery: [PR #83](https://github.com/Physcratic/physcratic/pull/83). Final merge SHA: pending CI and merge, finalized afterward.
- Prior deliveries remain intact: Batch 0 PR #77 (`5209a47`), Batch 1A PR #79 (`07dcad9`). The user reports production migration 0007/runtime grants are **not installed**. No installation or production readiness is assumed here.

### Implemented screens and behaviour

- `/settings`: responsive Account Settings with Profile, Appearance and Images sections. Dashboard/sidebar and Learn desktop/mobile Settings entries now link here. Removed the old theme-only dialog; the same Light/Dark/System preferences, storage and default theme remain available to guests and when profiles/media are unavailable.
- Profile form reuses the Batch 1A API/validation: explicit first save, empty identity defaults, editable display name, permanent lowercase username with a clear pre-save warning and read-only control afterward, 500-code-point biography, education preferences, canonical favourite topics and default-private visibility. Includes loading/retry, conflict/error/success states, dirty-change warning, discard action, live preview and saved-public-profile link. Does not modify Better Auth name/email or verification records.
- `/u/[handle]`: server-approved public fields only, banner, overlapping avatar, biography, education and topic chips. Missing/private profiles have the same non-disclosing not-found page. All profile pages are noindex; no public member date, achievements, invented statistics, followers or comments.
- Verified signed-in users without a profile may see an optional dashboard setup invitation. Skip creates/publishes nothing. Completion/dismissal is versioned and scoped to the stable account ID in device-local browser storage, containing no profile draft fields. If storage is unavailable, automatic invitations are suppressed. Existing users are never redirected or forced through setup. Setup remains available through Settings. No signup/CAPTCHA/Terms/verification transport changes.
- Auth return-path allowlist additionally accepts only `/settings` (and its query), so the Settings sign-in link can return there. Existing dashboard targets and off-site/unsafe target rejection remain tested.

### Private image lifecycle

- Separate **default-off** media flag and migration 0008; profile fields can work with 0007 alone while images stay off. Avatar/banner changes require an existing own profile, verified Better Auth session and configured same-origin request.
- Raw PNG/JPEG/WebP bytes only. Client MIME/extension is not trusted. Input caps: avatar 2 MiB, banner 5 MiB. Actual image validation rejects invalid, SVG/HTML, animated, tiny, oversized-edge and excessive-pixel inputs. Limits: 20 megapixels, edges at most 8192 and at least 32 pixels. Sharp rotates orientation, centre-crops/resizes and re-encodes to metadata-free WebP: avatar 512×512, banner 1600×400, maximum 1 MiB output. No original filenames or EXIF/XMP/ICC are retained.
- Private Vercel Blob objects use server-generated `community-profile-media/<uuid>.webp` paths, no overwrite, and an explicit existing private-store binding. API responses contain application URLs/IDs only, never SDK URLs, store identifiers, OIDC credentials or paths. Existing private authoring/evidence storage is unchanged.
- Every image read checks current registry state and owner/public visibility. Image URLs bypass Next image optimization, use private/no-store responses and render a placeholder on unavailable storage. Opt-out immediately denies subsequent guest reads, including previously public IDs. Replacement/removal revokes old IDs before physical cleanup. Removing an image also cancels a reserved upload, preventing a late storage response from restoring it.
- Atomic shared limits: 5 image mutations/minute, 20 upload attempts/UTC day, at most 8 tracked objects/account, one active avatar and banner each. Profile-detail write quota is independent. Invalid/conflicting uploads consume quota.
- Pending/ambiguous PUTs are retained for one hour as cleanup evidence. Retired/deleting records support retries after storage failures. Cleanup processes at most three objects/call, outside database locks, during image changes or the owner's cleanup action. Inactive accounts retain bounded orphans until later activity/cleanup; no scheduler/infrastructure was introduced. Down refuses any nonempty media registry.

### Changed files and API routes

- Pages: `app/settings/page.tsx`, `app/u/[handle]/{page,not-found}.tsx`.
- UI: `components/community/{account-settings,appearance-settings,profile-card,profile-image,profile-media-controls,profile-setup-prompt}.tsx`; Settings links in `components/kokonutui/sidebar.tsx` and `components/learn-header.tsx`; gated invitation in `components/kokonutui/layout.tsx`; removed `components/settings-dialog.tsx`.
- Shared profile client/contracts: `lib/community/profile-client.ts`, `profile-media-contracts.ts`. Media server: `profile-image.ts`, `profile-media-api.ts`, `profile-media-route.ts`, `profile-media-server.ts`, `profile-media-storage.ts`.
- `GET /api/community/profile-media`: own metadata; `?handle=<handle>` returns metadata only for a currently public profile.
- `PUT/DELETE /api/community/profile-media/[kind]`: own avatar/banner upload/remove. `GET /api/community/profile-media/image/[id]`: authorized current image proxy. `POST /api/community/profile-media/cleanup`: bounded own orphan cleanup. Every route is disabled before loading DB/auth/storage bindings unless both feature flags are enabled.
- Additive `migrations/0008_community_profile_media.{up,down}.sql` and corresponding `lib/db/schema.ts` declarations. New tables: `community_profile_media`, `community_profile_media_limit`; SQL owns immutable identity/state-transition/delete guards.
- `package.json`/`pnpm-lock.yaml`: direct pinned `sharp@0.35.5`, already the version used transitively by Next, for supported server-side validation/re-encoding.
- `lib/submission-security.ts` and its test: narrowly extended safe Settings return target.
- Tests: `lib/community-profile-media.test.ts`, `lib/community-profile-pages.test.ts`, `tests/community-profile.test.ts`, `tests/community-profile-harness.tsx`, `tests/community-profile.browser.mjs`. This handoff is the only documentation change.

### Migration and flags: safe with the current production schema

- **No staging/production SQL executed.** Migration work ran only in disposable PostgreSQL 18.6 test containers, including CI services. Existing migrations 0001–0007 and historical release packages are unchanged. No account backfill/reset, infrastructure or Vercel settings changes.
- `COMMUNITY_PROFILES_ENABLED`: exact string `true` enables profiles; default OFF. Keep OFF until 0007/runtime grants are verified. Disabled Settings still supports appearance; public routes return not found without profile reads.
- `COMMUNITY_PROFILE_MEDIA_ENABLED`: exact string `true` **and** profiles enabled are required; default OFF. Keep OFF until 0008/grants/private store are verified. Disabled handlers do not load media server bindings, and profile UI/pages do not request media tables.
- `COMMUNITY_PROFILE_BLOB_STORE_ID`: user/operator must explicitly bind the intended existing **private** Blob store connected to the intended project with working request-scoped OIDC authorization. No store was created, selected remotely or configured by Codex. Missing storage produces nonleaking errors while profile details remain functional.
- SQL up/down source commit for 0008: `3b640c8c176bf32e5fde4a1be48635c4cccaded4`. Up SHA256: `02a7f6f1850e4092933426275e36431a967810dd1ce2644d6f09ee0780dd0e0b`. Down SHA256: `6d6231f80df6c503e3879b10401675b86aff3fb3f7b44cc5d7426ed34158c753`.
- Preserved 0007 up SHA256: `7fcba67760efa0d265c949f20dc3351a49721c9285c21e498b70013969e19f0e`, original source commit `bd3ee3bffbf360301faa8289e2c11b3d954108d8`.

### Verification

- Pinned `corepack pnpm install --frozen-lockfile`: passed after the direct Sharp dependency/lockfile update.
- `corepack pnpm exec next typegen && corepack pnpm exec tsc --noEmit`: passed. `corepack pnpm lint --max-warnings=0`: passed.
- `bash scripts/test-problem-authoring.sh corepack pnpm test`: 666 server tests, 665 passed, zero failures/skips, one inherited corpus punctuation TODO. All 29 component tests passed, including the incoming product-guide checks. Includes existing actual Better Auth, CAPTCHA/Terms, authoring, grading, private solutions and submission regressions.
- New media coverage: valid formats/dimensions/re-encoding/metadata removal, MIME spoofing/animation/size rejection, owner/guest/other-account access, origin rejection, cross-instance limits, daily/storage quotas, replacement/removal, remove-versus-late-PUT race, ambiguous upload and delete outage/retry, restricted runtime grants and migration up/down/up preserving 0007 profiles. Disabled route/page exports are tested without new schema.
- `AUTHORING_BROWSER_TOOLS=<local Playwright+axe tooling> CHROMIUM_PATH=/usr/bin/chromium bash scripts/test-problem-authoring.sh node --require ./tests/server-only-register.cjs --import tsx tests/community-profile.browser.mjs`: **91 assertions passed** using real production UI components/API factories, disposable PostgreSQL, actual Sharp and an in-memory private-storage boundary. Covers save/reload/permanent handle/duplicate identity, private/public changes, guest image revocation, image changes/failures/spoofs/size limits, onboarding skip/completion/account switch, flags, errors/retry, guest/unverified settings, native keyboard radio controls and System persistence. Axe reported zero violations at 1440px/375px in light/dark. Desktop/mobile screenshots were visually reviewed; synthetic artifacts are outside the repository under `/workspace/work/batch1b-ui-artifacts`.
- `corepack pnpm build`: passed. The actual built Next server was additionally checked with both flags OFF and an intentionally unreachable synthetic database: Settings/theme worked at 375px with no profile/media requests, missing/private profile URLs returned consistent 404, and all new API methods returned disabled 503/private-no-store. No live DB/Blob binding was used.
- `python3 -B scripts/phase-c-offline/run.py safety`: passed runner self-test, transport tests (5 pass, 2 expected skips) and ESLint scope guard (1 pass). `git diff --check`: passed. React lifecycle/privacy/serialization/accessibility review completed.
- New test-runner JSX compatibility, landmark issues, a theme-harness mismatch and the remove/upload race found during checks were fixed. Final checks have no new failures. Actual production Blob authorization/transport and deployed UI smoke remain unverified until the user configures/enables/deploys.
- GitHub CI/PR and final merge evidence are finalized after merge below.

### Exact later production-enablement prerequisites: user/operator only

1. Ship code with both flags OFF for current-schema compatibility. Separately authorize a migration window, recovery point and the correct production direct/non-pooled owner connection and current application runtime role. Never infer/reuse staging credentials. Check the existing production ledger/schema and reviewed file checksums. Do not replay migrations 0001–0006 or the frozen historical operator package.
2. The user reports 0007 absent. Confirm that before applying it. In an explicit transaction with `search_path=public,pg_catalog`, `lock_timeout='5s'`, bounded statement timeout and `SELECT pg_advisory_xact_lock(hashtextextended('physcratic:authoring:migrations:v1',0));`, execute the complete reviewed **0007 up file once if absent**, then **0008 up file once**. If 0007 is already installed, verify its ledger/checksum and grants and skip its SQL. If either migration is already present with drift, stop and reconcile rather than masking it with IF NOT EXISTS. Record each migration ID, reviewed checksum/source commit, actor/time and verified result in the existing `public.physcratic_production_migrations` ledger before committing. Roll back on failed checks.
3. Grant the confirmed existing runtime role the following privileges. Replace `CONFIRMED_RUNTIME_ROLE` with that reviewed role; do not create a role or grant PUBLIC access. Existing schema USAGE remains required:

   ```sql
   GRANT SELECT, INSERT, UPDATE ON public.community_profile,
     public.community_profile_write_limit TO "CONFIRMED_RUNTIME_ROLE";
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_profile_media
     TO "CONFIRMED_RUNTIME_ROLE";
   GRANT SELECT, INSERT, UPDATE ON public.community_profile_media_limit
     TO "CONFIRMED_RUNTIME_ROLE";
   ```

   Do not grant profile DELETE, schema CREATE or table ownership. No trigger-function EXECUTE grant is needed, as tested under a restricted role. Before/after commit verify new constraints/indexes/triggers, correct parents, no existing-user backfill, private defaults and runtime grants. Preserve existing profile/auth/authoring/attempt data.
4. **Profiles only:** after 0007/grants are verified, the user may enable `COMMUNITY_PROFILES_ENABLED=true` while leaving `COMMUNITY_PROFILE_MEDIA_ENABLED` OFF. Settings, optional setup and public text profiles work without 0008/media queries.
5. **Images:** only after 0008/grants, configure `COMMUNITY_PROFILE_BLOB_STORE_ID` to the intended already-existing private store and verify the intended project's per-request OIDC private put/get/delete access. Then the user may enable `COMMUNITY_PROFILE_MEDIA_ENABLED=true`. No permanent public URLs or legacy/public-store fallback is permitted. No storage provisioning or Vercel configuration is authorized to Codex here.
6. Only the user, through the GitHub account linked to the paid Vercel seat, triggers deployment using their normal meaningful README commit after the feature merge. The user verifies Production READY and a deployed SHA containing this feature merge, then smoke-tests `/settings`, explicit private creation, editing/reload, public lookup, image changes and guest revocation on opt-out/removal, plus existing sign-in/CAPTCHA/Terms/submission flows. Codex did not deploy, initiate Vercel builds/redeploys, change flags/settings or make a README-trigger commit; merge is not deployment evidence.
7. To roll back exposure, have the user disable the media flag (profiles can remain enabled on 0007), or disable profiles to gate both features, and redeploy. Preserve DB/storage data. Never run down on a populated production registry; 0008 down deliberately refuses it, and 0007 down refuses populated profiles. Local/CI up/down/up does not authorize production SQL.

### Outstanding and next phase

- No implementation blockers after local verification; merge requires green GitHub CI. Database installation/grants, private-store binding/authorization, feature enablement, Vercel deployment and production smoke remain **PENDING USER ACTION**.
- Onboarding dismissal is per account **on this device**, not cross-device server state. Orphan cleanup is activity/owner-driven and bounded; there is no new scheduled job. Image crops are centred, without a crop-editor UI.
- No achievements, medal claims/staff markers, followers, leaderboards or comments implemented. Next: **Batch 2A** in a fresh session on latest main. Migration 0008 is now reserved for profile media; check free IDs before any later migration. Stop here before Batch 2A.
