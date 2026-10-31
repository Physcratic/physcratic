# Problem authoring implementation status

- Phase6C-B ONLY,2026-10-31; follows Phase6C-A c259602 on the same integration branch. Original baseline: Phases0–6B merged; PR#22 baseline `a8fac8f83722bfa9faed9a867cbb1582aa0b599f` freshly fetched and exactly matches reviewed Phase6B tree.
- Integration branch `codex/physcratic-authoring-completion` created from that main. Preserve this branch for6C-B/7/8A/8B; separate phase commits/pushes, never reset/overwrite prior work. No individual PR; one consolidated PR at release-readiness gate.
- Required WORK_STATUS/map/status/student policy read first. Inspected affected revision/private-part/owner/media/attempt/grader/auth contracts only; no repeated repository audit.
- Phase commit: `git log -1` after checkpoint delivery. No UI, merge/deploy/shared or production data/migrations/storage changes.

## Completed Phase6C-B

- Author immutable-revision/part permission controls, explicit complete image/native approval and selected PDFs, optional expiry, configured status/version, deliberate confirmation and revoke. Ambiguous/409 PUT clears metadata and requires GET, preserving draft autosave.
- Student explicit confirmed reveal independent of submission/outcome; solutionViewSchema + exact selection/dedicated media URL checks, safe text/KaTeX/images and controlled PDF downloads/failures. No preload, worker, key/hint rendering or client assisted derivation.
- Private snapshot only in memory, cleared on account/part/revision/focus/visibility/access uncertainty or five-minute timeout. Server record assisted labels preserve original attempts/retries. Phase6C-A APIs/migrations unchanged.
- Full205/206 PASS; inherited corpus punctuation only. TypeScript PASS. Extended real browser/PG + mocked storage PASS: grants/revoke, PDF-only, no preload, before-submit assistance, image/math, actual PDF/failure, multipart/account/stale, permission failure, desktop/mobile axe and existing recovery/IDOR cases.
- Independent focused review findings corrected and browser verified; final reviewer followup hit tool usage limit, no additional completed independent pass claimed. Details: [AUTHORED_SOLUTION_UI.md](AUTHORED_SOLUTION_UI.md).
- No individual PR/merge/deploy/shared DB. Stop after separate6C-B commit/push; await next phase prompt on same branch.

## Completed Phase6C-A

- Additive explicit0005 adds per-immutable-revision/part permission, explicit media bindings and immutable reveal ledger. Empty/default deny; no existing solution auto-approved; sealed content and old attempt records untouched.
- Verified owner GET/PUT /drafts/[id]/solutions/[partId]/permission with exact revision, independent optimistic permission version, explicit enable/media/expiry, server authorization generation. Shared60/min author write bucket; origin/20KB/5s body and SQL/lock/idle deadlines.
- Whole part worked-solution blocks approved together; every native solution image requires explicit inclusion. Hint-only/other-part/statement/foreign files rejected. Optional revision solution PDFs gain explicit per-part association, never automatic inclusion. PDF-only solution supported. Owner metadata deduplicates repeated image IDs.
- Revocation works for owned historical/unpublished revisions; enabling requires exact current publication. Each change rotates generation, removing/replacing media approvals. DB time expiry/unpublication deny future student access. Previously delivered/downloaded content cannot be recalled.
- Separate verified same-origin POST /[id]/solutions/[partId]/view, strict {revisionId}, no previous submission/correct answer required. Selects only worked solution, never key/tolerances/hints/other private parts. Runtime response allowlist with approved local proxy refs only.
- Durable immutable event committed before response; unique own revision/part/generation receipt reused for repeated/concurrent views. Current authorization/publication/expiry rechecked even on receipt reuse. Regrant requires a new explicit reveal. Commit failure rolls back ledger and discloses no solution.
- Dedicated verified media proxy requires current-generation own reveal + exact current publication/permission/approved part binding on every GET. Bounded4s whole private read,3MiB/exact bytes, final expiry check, late/stalled stream cancellation. No raw private URLs, paths, redirects or credentials; private/no-store/VaryCookie/nosniff/CORP/sandbox/no-referrer headers.
- Existing generic private media remains owner-only; historical revision retention/cleanup and private Vercel Blob adapter unchanged. Storage mocks only in tests.
- Conservative multipart attribution: any explicit reveal assists every later NEW attempt on that immutable revision, across all parts/outcomes. Revocation/expiry does not erase assistance; other users/new revisions independent.
- SQL derives future assisted boolean from ledger under existing user advisory6 → parent SHARE ordering. Reveal adds permission SHARE; owner writes parent UPDATE before permission/bindings, no student lock. Media holds parent/permission through buffering; no extra pool checkout. Existing idempotency lookup precedes publication/assistance, preserving original committed flag/result/selection after help/unpublish/new version.
- Server/client attempt contracts accept derived boolean; original false receipts/history remain compatible. Grading math/keys/tolerances/engine/outcomes/quotas unchanged. no-reveal-v1/reveal="disabled" still mean automatic grade disclosure disabled; explicit-solution-v1 is separate. No automatic public/student preload.
- Detailed API/locking/PDF approval/assistance/migration/rollback boundaries: [AUTHORED_SOLUTION_ACCESS.md](AUTHORED_SOLUTION_ACCESS.md).

## Verification and independent review

- Targeted solution-access + legacy attempt + student state:34/34 PASS, no skips. New SQL up/down/up retains exact old unassisted attempt; populated new-state rollback refused.
- Full suite206 tests:205 PASS, sole inherited corpus punctuation assertion `lib/corpus-translation.test.ts:66`, matching merged baseline. No Phase6C-A regression.
- Existing real student browser/API/grader/disposable PostgreSQL regression PASS through0005, including multipart/math/media, all outcomes, retries/reload/pagination, IDOR/account changes, revision/unpublish and desktop/mobile accessibility/overflow. No new UI implemented.
- Next typegen/TypeScript PASS. Available lint/build attempted: inherited ESLint missing; inherited Inter/Google Fonts network EPERM confirmed by worker-disabled diagnostic, with no tracked configuration workaround.
- Independent read-only security/data-integrity review:21/21 solution/student cases rerun in its own disposable PG; no remaining confirmed blockers. Fixed authorization-generation index, duplicate image metadata and internal storage TypeError400 classification (now503 after input validation).
- Added deterministic attempt-first and reveal-first races, media/revoke and unpublish ordering; commit-failure rollback; every outcome/own history/original idempotent flags; SQL FKs/current-generation/immutability/derived flags; explicit PDF-only and per-part binding checks; storage truncation/size/TypeError/deadline failures; poolmax1 and shared persistent rates.
- Local evidence /tmp/6ca-{targeted,full,browser,typegen,typecheck,lint,build,build-diagnostic}.log; independent /tmp/6ca-independent-review.log. Not production/staging verification.

## Commands / release boundaries

- Targeted: `scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server --test lib/authored-solution-api.test.ts lib/authored-attempt-api.test.ts lib/authored-student.test.ts`.
- Full: `scripts/test-problem-authoring.sh node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs test`.
- Existing browser: `AUTHORING_BROWSER_TOOLS=/path/to/tooling scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/authored-student.browser.mjs` (Playwright/axe/Chromium); typegen then tsc sequential with build.
- Only explicit local disposable PostgreSQL containers/unique schemas and isolated memory storage. Production Better Auth adapters typechecked/read-reviewed; live Better Auth/Vercel/private Blob/staging/deployment not tested.
- No merged migrations edited.0005 must be separately authorized/applied after0004 using the existing migration lock/checksum/source-commit ledger. No runtime/build migration/schema push. Down refuses permissions/reveals/assisted history rather than deleting them.
- Permissions assert the author's approval of the entire selected PDF for that part; no PDF page classification/sanitization or recall guarantee. Ledger measures explicit app student reveal, not offline knowledge/author editing.
- No contests/Elo/ranking/leaderboards/comments/stars/social/subscriptions or unrelated work. No README deployment commit/account impersonation. User alone triggers authorized deployment after explicit readiness handoff, using isolated staging separately from production.

## Next checkpoint

- Phase6C-B complete: stop after its commit/push, await next separately supplied phase.
- Next phase must read handoffs and reuse exact explicit permission/reveal/media contracts and server-derived assistance on this SAME integration branch. No repeat audit or automatic solution preloading.
- Branch: https://github.com/Physcratic/physcratic/tree/codex/physcratic-authoring-completion
