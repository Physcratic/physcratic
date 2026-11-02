# Community implementation status

Updated: 3 November 2026, 02:16 WITA (UTC+8).

## Batch 0: Arena navigation cleanup

- Base: latest `main`, `084dbada3ffada1eae71ae1fe20c9f43884d91c1`.
- Final implementation SHA: `32283e09bb544617214dfa720b8837d26df28577`. This handoff is a subsequent documentation-only commit.
- Branch: `codex/community-batch-0-2026-11-03`.
- Delivery: [PR #77](https://github.com/Physcratic/physcratic/pull/77). The PR records the authoritative merge status and final main merge SHA. Merge only after applicable CI checks pass.

### Implemented

- `components/physics/problem-library.tsx`: removed the Quick practice tab and its collection panel. Arena is first and the default for missing, unknown and legacy `collection=practice` values. Explicit archive, guided-exercise and authored links still select their respective collections.
- `lib/problem-collection-route.ts`: bounded collection selection and URL updates that preserve the current path, other query parameters and fragment. Tab changes and archive-to-guided transitions persist their collection; browser history changes synchronize the selected tab.
- `lib/problem-collection-route.test.ts` and `tests/problem-library.browser.mjs`: collection/URL regression coverage and browser navigation checks against an actual local production Next server.
- `tests/authored-library.browser.mjs`: updated the existing keyboard expectation from removed Quick practice to Guided exercises and asserted the persisted collection.
- `docs/engineering/COMMUNITY_GUIDEBOOK.md`: explicitly fetched and read from `codex/community-system-guidebook-2026-11-03`, then imported byte-for-byte for subsequent sessions on main.
- No "Two particles" brand title was found in app/components/site consumers. Existing Physcratic branding is unchanged. The authored submission UI already has green/red correct/incorrect feedback with readable labels; it was left intact.

### Compatibility and data

- No SQL additions or schema changes. No migrations executed in local, staging or production environments. Existing migrations 0001 through 0006 and historical release evidence are unchanged.
- No infrastructure changes or new feature flags. This UI-only batch requires no new tables and is safe with the existing production schema.
- Practice data, direct problem routes, practice API/grading and the existing random-practice entry remain available. The practice reader's legacy Back to collection link now opens Arena.
- Auth, CAPTCHA, Terms, verification, account records, private authoring/revisions/solutions, grading and Elo logic are unchanged. No user data was read or modified for this batch.

### Verification

Use `corepack pnpm` in this environment to select the repository-pinned pnpm 10.34.9. The host's plain pnpm was 11.25.0 and rejected the frozen lockfile's existing overrides; no dependency files were changed.

- `corepack pnpm install --frozen-lockfile`: passed with pnpm 10.34.9.
- `corepack pnpm exec next typegen && corepack pnpm exec tsc --noEmit`: passed.
- `corepack pnpm lint --max-warnings=0`: passed, no warnings.
- `corepack pnpm exec tsx --test lib/problem-collection-route.test.ts lib/dashboard-route.test.ts lib/practice.test.ts lib/site.test.ts tests/problem-card.test.ts`: 39 passed.
- `corepack pnpm test`: server suite 546 tests, 535 passed, 10 database-dependent skips, 1 inherited corpus punctuation TODO, 0 failures. UI suite 24 passed, 0 failures. No new skips/TODOs.
- `python3 -B scripts/phase-c-offline/run.py safety`: passed runner self-test, transport guards (5 passed, 2 expected skips) and ESLint scope guard (1 passed).
- `corepack pnpm build`: passed with the same synthetic build-only auth settings as CI, without live database credentials.
- `AUTHORING_BROWSER_TOOLS=/opt/codex/cua_node/lib/node_modules CHROMIUM_PATH=/usr/bin/chromium node tests/problem-library.browser.mjs`: 36 navigation assertions passed at 1440px and 375px. Verified default/legacy/unknown collection behavior, all remaining tab links, Arrow/Home/End keyboard navigation, query/fragment preservation, reload, history back/forward, no horizontal/tab overflow, and direct practice reader plus return link. No browser page errors.
- `git diff --check`: passed. Guidebook import matches the source branch exactly.

### Limitations and next session

- The navigation browser test stubs the public authored-library response with an empty valid page, isolating URL/UI behavior from database availability. It does not claim live authored-library or database integration verification. The updated PostgreSQL-backed authored-library browser suite was not run locally.
- GitHub CI and merge outcome are recorded on PR #77. Vercel preview attempts for `9fd02c3faeea88a93aca168432fd536a926f9af7` were inspected: both `financial-dashboard` (`dpl_D5ME2mPhmCfYw7BqT6SG5u4NxkFY`) and `physcratic-integration` (`dpl_d85WQfemm5SoT4KodBRbX37tyRPe`) are `BLOCKED`, with Vercel's project-collaboration/team-configuration error link, before a build ran. This matches the repository's documented contributor deployment restriction. No deployment permissions/configuration were changed. Preview UI, production deployment SHA and production smoke are not verified; a successful local build is not production evidence.
- Search/tag/difficulty controls retain their existing persistence behavior. This batch persists collection selection and preserves existing URL parameters; it does not add broader filter persistence.
- No Batch 1 or later work implemented. Next batch: **1A, public profile storage/API foundation**, in a fresh session starting from latest main and this handoff. Do not apply production SQL without environment-specific authorization.
