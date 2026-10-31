# Problem authoring implementation status

- Updated: 2026-10-31 (Asia/Makassar). Phase 4 ONLY; phases 0–3 merged.
- Fresh fetched main/base: `0845052fff6cf36760fa8c69e5b9a1d89a22447d` (Phase 3 PR #14).
- Branch: `codex/problem-authoring-phase-4`; final commit via git log -1.
- Delivery: pending final verification/commit/push; PR creation attempted after push.
- Read WORK_STATUS/map/status first; no repository-wide audit or unrelated auth changes. Intentional CAPTCHA removal preserved.

## Completed Phase 4
- Server-owned registry with pending/ready/deleting lifecycle, immutable metadata/content identity, safe owner metadata projection, daily budget and draft/revision bindings.
- Explicit additive 0003 up/down SQL, Drizzle declarations, ready-state/FK/sealing/immutability/deferred xmin checks. Existing 0001/0002 unchanged.
- Verified-author, strict-owner upload/list/delete/cleanup; existing Better Auth and configured-origin helpers reused. No client owner/blob pathname authority.
- Four immutable purposes: statement-image, solution-image, statement-pdf, solution-pdf. Same-problem/owner/ready/purpose validation replaces old media denial on saves/publication.
- Multipart actual-byte limit, 15s parse deadline, 3MiB/file; exact declared MIME versus binary signature/structure; SVG/HTML/animated WebP rejected; image dimension/pixel caps.
- 60 shared writes/minute, 30 uploads/day including failures, 100 tracked files/100MiB per owner; atomic persistent quota reservations and server-generated nonce paths/hash.
- Existing Vercel Blob SDK with private access only, no overwrite, 10s operation timeouts; no storage URLs/redirects/tokens in responses or document fields.
- Owner reads all own ready files. Public reads only statement assets bound to current or explicitly selected same-problem historical revision while problem is published.
- Unpublish revokes anonymous current/history media access. Private solution images/PDFs remain author-only, including during publication; public JSON and preview exclude solution asset IDs.
- Local proxy responses no-store/nosniff/same-origin/no-referrer/sandbox; PDFs forced attachment download; images rendered with descriptive alt/caption.
- Publication atomically pins exact statement+private reference set; parts/private keys/media bindings inserted before final immutable revision, no released savepoints.
- Parent/media locks serialize save/link/publication/retirement; saved drafts and all historical references protect files permanently.
- Owner-triggered cleanup <=5 objects/request: unlinked ready >24h, pending/deleting >1h. Mark row -> delete private blob -> remove registry; failures retain retryable tombstones.
- Recent ambiguous PUT failures retain >=1h tombstones and repeat storage deletion; last deleted-draft orphan prunes empty never-published parent to recover problem quota.
- Editor statement/hint/worked-solution images, private proxy previews, alt/caption, replacement/removal; optional statement/private solution PDFs upload/replace/download/remove.
- Removing/replacing alters references through existing versioned autosave; immutable published history retained. File manager exposes retention state, safe unused deletion and cleanup; workspace cleanup works without active drafts.
- Pending uploads freeze editing/navigation/publication and conflict-copy replacement, protect unload, show progress/error; failures retain original references. Successful edits invalidate stale server comparison.
- Existing autosave, explicit 409 choices, tab recovery, native text/math, practice/archive/auth behavior preserved. No new product dependencies/package/lockfile changes.
- No OCR/conversion, grading, submissions, social features, Phase 5, production migrations/storage operations, deployment or merge.

## Verification evidence
- Targeted author-media/API/contracts/editor: 49/49 PASS, disposable PostgreSQL17 and isolated memory storage.
- Security tests: missing/unverified sessions, origin/cross-account/guessed IDs, spoofed MIME/SVG/truncation/actual oversize, private/public purpose reuse, cross-problem/pending references.
- Lifecycle tests: failed/ambiguous PUT and DELETE retry, aggregate/daily quotas, old orphan grace, empty-parent quota recovery, immutable/history retention, concurrent publication/link/delete.
- SQL: empty-registry 0003 up/down/up, populated down refusal, exact missing/extra binding rejection, original Phase 1 sealing tests and 0002 rollback/reapply.
- Browser: real editor + actual API factories + disposable PG + mock private storage, injected verified session; upload/proxy preview/replacement/failure/PDFs/private preview, reload recovery and 409 decisions.
- Delayed positive upload during conflict comparison verifies both copy-replacement actions disabled until callback and old comparison invalidated afterward.
- Desktop/mobile axe scans zero violations; 375px no horizontal overflow. Existing math/keyboard CRUD/publication/privacy/round-trip assertions retained.
- Full suite with PostgreSQL enabled: 142/143 PASS; only inherited lib/corpus-translation.test.ts:66 punctuation mismatch fails. No Phase 4 regression.
- TypeScript PASS; run sequentially after build/typegen to avoid .next generated-file races.
- Lint inherited blocker: eslint executable/dependency/config absent.
- Build inherited blocker confirmed: next/font cannot fetch Inter from Google Fonts (network EPERM). Normal worker hides details; diagnostic with in-process webpack worker disabled reports only app/layout.tsx font failure. No tracked configuration changed.
- git diff --check PASS. Logs /tmp/physcratic-p4-{target,full,browser,typecheck,lint,build}.log; session-local, not committed.

## Independent adversarial review
- Read-only independent reviewer checked ownership/verified session/origin, private storage/proxy visibility, exact revision binding, race locks, quota and lifecycle.
- Confirmed/fixed storage Buffer serialization signature, empty-problem quota leak after final orphan, and upload callback versus conflict-copy replacement race.
- Added quota/tombstone and gated positive-upload browser regressions; reviewer reread final fixes and reported no remaining confirmed actionable blockers.

## Commands and limits
- Targeted: bash scripts/test-problem-authoring.sh node_modules/.bin/tsx --test lib/author-media.test.ts lib/author-media-api.test.ts lib/problem-authoring-api.test.ts lib/problem-authoring.test.ts lib/problem-authoring-editor.test.ts
- Full: bash scripts/test-problem-authoring.sh node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs test
- Browser: AUTHORING_BROWSER_TOOLS=/tmp/physcratic-editor-test bash scripts/test-problem-authoring.sh node_modules/.bin/tsx tests/problem-authoring.browser.mjs
- Browser tools outside repository: playwright, @axe-core/playwright; Chromium /usr/bin/chromium. Tests never use ambient DATABASE_URL or real Blob credentials/files.
- Live Better Auth login/email and deployed Vercel private Blob/staging flow not exercised; production adapter typechecked/reviewed, storage behavior tested through isolated mocks.
- Signature/structure checks are not complete decoding, PDF sanitization or antivirus. PDF handling deliberately forces download and never embeds active content.
- Explicit private Blob configuration + reviewed 0003 migration/ledger needed for separately authorized release; no startup/build migration. Populated-registry rollback refuses; preserve history/storage.

## Exact next task
- Review Phase 4 branch/PR; stop here. No automatic merge/deploy or production migration.
- Later phases require a separate request after merge, fresh main and handoffs first; inspect only affected code. Grading remains Phase 5 with approved domain/resource/privacy contracts.
