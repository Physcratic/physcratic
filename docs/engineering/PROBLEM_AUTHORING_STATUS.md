# Problem authoring implementation status

- Updated: 2026-10-31 (Asia/Makassar). Phase 3 ONLY; phases 0/1/2 merged.
- Fresh fetched base: `6837ae319d2e8a856e2188e5a269d96050deef84` (Phase 2 PR #13).
- Branch: `codex/problem-authoring-phase-3`; implementation `1ae01a1`; delivery update HEAD via git log -1.
- Delivery: pushed and remote verified; draft PR creation blocked by GitHub API Forbidden.
- Compare: https://github.com/Physcratic/physcratic/compare/main...codex/problem-authoring-phase-3?expand=1
- Read WORK_STATUS/map/status first; no AGENTS.md. Inspected only affected auth/layout/math/editor/API dependencies; no repeated audit.

## Completed Phase 3
- `/dashboard/author`: dynamic server gate using existing Better Auth session; unauthenticated redirect, unverified notice, verified author workspace only. No auth changes.
- Sidebar Problem studio entry; responsive draft manager uses Phase 2 paginated list/create/read/delete, explicit deletion confirmation and visible failures.
- Native Tally-style document editor: title/tags/difficulty/provenance; sections, subparts, text/math blocks, inline math spans; add/edit/delete/reorder while preserving IDs/order.
- Existing KaTeX with trust:false, maxExpand/maxSize, MathML and invalid-equation feedback. Cursor-aware equation templates; no browser CAS/answer evaluation.
- Author-only panels for numeric values/units/tolerances, expression variables/domains/angles/exclusions, manual keys, hints and worked solutions.
- Local numeric prefixes/blank fields and expression drafts remain recoverable; Phase 1 contracts gate saving/publishing. Server schemas/APIs unchanged.
- Debounced 1800ms autosave, one request at a time; saves serialize newer edits against acknowledged versions; explicit saving/saved/error indicators and manual retry.
- 409 freezes automatic writes and preserves local content; author loads/inspects latest, explicitly chooses server content or local replacement against that version.
- Owner+problem-scoped sessionStorage backups, beforeunload protection, explicit local restore/discard/private JSON download; no automatic overwrite of either copy.
- Uncertain in-flight saves remain protected even after undo-to-old-baseline and repeated reloads; malformed/raw backups are preserved for explicit export/discard.
- Safe local student preview uses shared allowlisted content serializer, unmounts private panels and conflict-inspection JSON, handles invalid aggregate documents safely.
- Publication checks from publishableDraftSchema; publish/unpublish use Phase 2 versioned APIs after save, display clear confirmation/state and never mutate old revisions.
- Keyboard move controls and focus restoration after reorder/delete; position announcements, associated labels/help, inline error indicators and 375px responsive layout.
- Tiptap/dnd-kit evaluated: explicit native schema plus move buttons cover current math/order/accessibility needs; no extra product dependencies or licensing risk.
- No image/PDF uploads, CAS grading, solver submissions, comments/stars, migrations, package/lockfile edits or Phase 4 implementation.

## Test evidence and inherited blockers
- Editor state tests: 15/15 PASS; contracts targeted: 13/13 PASS.
- Tests cover debounce, edits during save, 503 retry, 409 pause/explicit resolution, private/partial-field recovery, repeated reload, uncertain undo, malformed backup, publication version/lock and HTTP adapter.
- Chromium + actual editor + Phase 2 HTTP handler factory + disposable PostgreSQL17: PASS end-to-end create/list/open/delete, inline math rendering, sections/parts, keyboard reorder/delete, negative fractional numeric/domain values.
- Browser additionally verifies 503 autosave failure/reload recovery, 409 keep-local resolution, immutable publish/unpublish, public/preview key isolation and original statement round-trip.
- axe desktop and 375px mobile scans: zero violations in tested states; no mobile horizontal overflow. Independent desktop/mobile visual inspection found no clipping/blocker.
- Full suite with PostgreSQL integration enabled: 131/132 PASS; only inherited lib/corpus-translation.test.ts:66 punctuation mismatch fails (Phase 2 baseline 116/117).
- Disposable PostgreSQL integration from full suite: 10/10 PASS, including original Phase 1 sealing regressions and 0002 limiter rollback/up. Containers removed by trap.
- TypeScript PASS after next typegen. Run typecheck sequentially with build/typegen to avoid .next generated-file races.
- Lint: inherited failure, eslint executable/dependency/config absent.
- Build: inherited next/font blocker fetching Inter from fonts.googleapis.com; no claim of complete production build.
- git diff --check PASS; only editor/entry/tests/handoffs changed. Phase 1/2 contracts, APIs, migrations and auth behavior preserved.
- Session-local logs: /tmp/physcratic-p3-full.log, /tmp/physcratic-p3-check-{0,1,2}.log; final typegen/tsc terminal exit 0.
- Screenshots: /tmp/physcratic-editor-desktop.png and /tmp/physcratic-editor-mobile.png (session-local; not committed).

## Reproducible checks / test limitations
- pnpm10.20.0 reused via node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs; no dependency changes.
- Targeted: node_modules/.bin/tsx --test lib/problem-authoring-editor.test.ts lib/problem-authoring.test.ts.
- Full with DB: bash scripts/test-problem-authoring.sh node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs test.
- Browser test tools installed outside repository: npm install --prefix /tmp/physcratic-editor-test --no-save playwright @axe-core/playwright.
- Browser: AUTHORING_BROWSER_TOOLS=/tmp/physcratic-editor-test bash scripts/test-problem-authoring.sh node_modules/.bin/tsx tests/problem-authoring.browser.mjs.
- Chromium defaults /usr/bin/chromium; override CHROMIUM_PATH. Harness bundles real editor via existing esbuild/tsx and app CSS; server injects verified session into real handlers.
- Live Better Auth login/email delivery/Next SSR/browser staging path is not exercised; server gate typechecked/read-reviewed, auth unchanged. No ambient DATABASE_URL or production data used.

## Independent accessibility / UX / correctness review
- Independent read-only reviewer found and verified fixes for in-flight undo loss, invalid backup deletion, negative/partial numeric typing, delete/reorder focus and help associations.
- Regression tests reproduce these state-loss paths. Recovery uncertainty survives repeated reloads; invalid buffers remain private/recoverable; server validation stays strict.
- No remaining blocking findings after fixes; preview/key separation, verified author gate, safe math rendering and version decisions reviewed.
- Screenshot visual inspection and browser axe checks supplement source review; mathematical validity remains Phase 5, media ownership Phase 4.

## Exact next task
- User reviews/merges Phase 3 only. No automated merge/deployment or production migrations.
- After merge and separate request: Phase 4 ONLY from fresh main, read handoffs and inspect author media/API/editor dependencies only.
- Add verified-owner author media registry/uploads, MIME/signature/size/quota checks, scoped public statement versus private solution/draft access; remove Phase 2 media denial only with ownership checks/tests.
- Preserve native text, stable block IDs, ordered round-trip, autosave/409/recovery and immutable revisions. No PDF OCR/import or mathematical grading.
- Run targeted/full checks, independent security critic, update handoffs, commit/push/draft PR and stop.
