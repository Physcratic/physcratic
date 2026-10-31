# Problem authoring implementation status

- Updated: 2026-10-31 (Asia/Makassar). Phase 6B ONLY; phases0–6A merged.
- Fresh fetched main/base `268a4e61f08e960140bf691d77090deb17af88e1` (Phase6A PR#21). Verified exact reviewed Phase6A uncapped-practice tree, including numeric/dimensionless/symbolic infrastructure.
- Branch `codex/problem-authoring-phase-6b` created from fresh main. Required handoffs/policies read first; inspected affected public reader/session/UI/attempt/grading/media contracts only. No repeated audit.
- Final commit: `git log -1`; delivery PR/compare links below. No merge/deploy/production changes.

## Completed Phase 6B

- Public `/dashboard/authored/[id]` reader with safe serializer, ordered context/sections/parts, tags/difficulty, native text/inline/display KaTeX, images and revision-pinned public statement PDF links. Published author editor links to student view.
- Existing safe public GET/media proxy only; no private/draft/historical-statement fetch, static legacy answer model, browser worker or client grading. No private hints/solutions/PDFs/keys rendered.
- Guests can read; verified Better Auth shell gates submission/history. Account-key remount, request cancellation/generation guards and API401/403 invalidation prevent stale private view reuse. Public route identity remounts on problem navigation.
- Numeric input shares blank/ASCII1 dimensionless policy; rejects incomplete/nonfinite/nonzero-underflow input while retaining signed zero/subnormals. Binary64 precision is explicit. Bounded opaque expression text and conservative grammar guidance; manual answers explicitly ungraded.
- Per-part local input stored in tab sessionStorage scoped to account/problem and immutable revision/part. Reload/navigation restoration never auto-submits. Downloadable work, storage-error pause and malformed-copy preservation avoid silent loss.
- Durable exact intent+UUID before POST, synchronous duplicate guards, original-body/key retries, atomic pending-to-receipt acknowledgement and separate Start another attempt transition. Failed acknowledgement writes retain pending replay. One unresolved intent pauses new sends.
- Clear401/403/404/408/409/429/5xx/network states; Retry-After countdown. Read failures have read-specific messages. Only explicit retries; no hidden fresh keys after uncertain delivery.
- Current-publication revalidation hides withdrawn/stale content; explicit reload required after stale selection. Background focus/poll cannot abort explicit reload or clear stale latch. Old buffers/pending remain tied to old IDs; no silent retargeting.
- Four fixed feedback explanations, including review not necessarily wrong; no raw grader diagnostics. Own counts are exact decimal strings; temporary60 requests/20POST per minute and100/rolling24h shown without lifetime cap.
- Own50-row cursor history with answers/outcomes/timestamps/immutable selection, empty/loading/error/retry states and Previous/Next. Historical IDs never load withdrawn statements or use new revision labels. Success resets/refetches page+cursor together.
- Responsive statement/answer layout, multipart jump/focus, accessible labels/statuses/headings/buttons, opt-in keyboard-scrollable long formulas. No editor dependency, new endpoint, migration, auth/media policy, grading math, submission limit, reveal/social/Elo changes.
- State machine and recovery/visibility constraints: [AUTHORED_STUDENT_UI.md](AUTHORED_STUDENT_UI.md). Existing [student API policy](AUTHORED_STUDENT_SUBMISSIONS.md) and [symbolic limits](SYMBOLIC_GRADING_POLICY.md) preserved.

## Verification

- Final targeted model/backend/math/contract + disposable PostgreSQL:64/64 PASS (including8 new model tests).
- Rendered browser+actual API factories/grader+disposable PG17+memory storage PASS: public/verified gates, all modes/four outcomes, math/media, multipart focus, navigation/reload recovery, lost committed response/same-key replay, duplicates,408/429/503/read503, own history/50+ cursor gap regression, IDOR/account race,401 restoration, publication409/reload-focus race/unpublish, private isolation.
- Desktop1440/mobile375 axe: zero violations; keyboard formula scrolling and no page overflow PASS. Screenshots visually reviewed independently. Test artifacts remain in /tmp, not committed.
- Full suite:192/193 PASS; sole inherited corpus punctuation assertion `lib/corpus-translation.test.ts:66` matches baseline. No Phase6B regression.
- Next typegen + TypeScript PASS. Lint attempted: inherited missing ESLint. Build attempted: inherited Inter/Google Fonts network EPERM; worker-disabled diagnostic confirms font failure without tracked config edits.
- Independent read-only UX/accessibility/security/data-integrity review completed. Fixed all five confirmed findings: read deadlines, numeric underflow, history cursor gap, stale reload/focus race and misleading read errors. Reviewer reran8/8 model tests and inspected passing browser log/screenshots; no remaining confirmed blockers.

## Commands / practical limits

- Targeted: `scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server --test lib/authored-student.test.ts lib/authored-attempt-api.test.ts lib/authored-grading-db.test.ts lib/authored-grading.test.ts lib/authored-numeric-grading.test.ts lib/authored-symbolic-grading.test.ts lib/problem-authoring.test.ts`.
- Browser: `AUTHORING_BROWSER_TOOLS=/path/to/tooling scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/authored-student.browser.mjs` (Playwright/axe + Chromium; existing editor harness uses the same external-tool pattern).
- Full: `scripts/test-problem-authoring.sh node /tmp/physcratic-npm/_npx/fed63785a0df9524/node_modules/pnpm/bin/pnpm.cjs test`. TypeScript: `node_modules/.bin/next typegen` then `node_modules/.bin/tsc --noEmit`, sequential with build.
- Only isolated localhost physcratic_authoring_test databases/memory storage; no ambient DATABASE_URL, production migrations/files/data. Browser auth sessions injected into production factories; real Better Auth shell/Next route typechecked/read-reviewed, live staging/Vercel not exercised.
- sessionStorage recovery is tab-local, not cross-device or durable after tab/data removal. Storage unavailable blocks new POSTs safely. Malformed copies preserved for download; no silent reset. Persistent own server history is separate.
- no-reveal-v1 still prevents automatic answer disclosure on submission/grading, while permitting a future separately authorized explicit solution-view feature. None added.

## Delivery / next task

- Implementation commit `a111a5f` pushed. Draft PR creation attempted via both gh GraphQL and GitHub REST pulls endpoint; both POSTs returned Forbidden. No PR number was created; branch is ready for manual draft creation.
- Open PR: https://github.com/Physcratic/physcratic/pull/new/codex/problem-authoring-phase-6b
- Compare: https://github.com/Physcratic/physcratic/compare/main...codex/problem-authoring-phase-6b?expand=1
- Stop after Phase6B review handoff. No merge/deployment/production data; no next phase or explicit solution reveal without a separate request.
