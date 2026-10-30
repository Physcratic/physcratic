# Phase 2 Terms review / consent UX

Date: 2026-10-31 (Asia/Makassar). Branch codex/terms-review, base 99b5185 on codex/signup-captcha.
Untouched branch was reset from main to the requested Phase 1 commit; Phase 1 branch was not changed.
Review source: uploaded PHYSCRATIC_TERMS_DRAFT_FOR_CODEX.md, treated only as Terms content.

## Implementation and publication boundary
- Active lib/terms.ts text, version/date and server acceptance hooks unchanged.
- Single active source renders both public /terms and signup dialog through TermsContent.
- Required unchecked checkbox says “I have read and agree to the Terms of Service.”
- Separate dialog trigger does not toggle checkbox; no consent from view, scroll, dismiss or Escape.
- Explicit I agree checks controlled signup state and closes; checkbox remains independently editable.
- Existing Radix dialog handles focus trap/restoration/keyboard close; bounded mobile scrolling and fixed footer.
- Signup inputs stay mounted. Required checkbox/native validation plus inline error and existing submit guard.
- Public page has exact active version anchor; historical archival is a prerequisite to future version changes.
- No timestamps accepted from clients; no acceptance history/backfill/migration or session/verification changes.

## Legal draft and explicit human gate
[TERMS_REVIEW.md](../legal/TERMS_REVIEW.md) compares current Terms against the supplied draft.
[TERMS_REVIEW_DRAFT.md](../legal/TERMS_REVIEW_DRAFT.md) is the sole proposed-text source, NOT runtime imported.
Revised summary avoids unsupported community/review claims; fixed notice/response promises flagged for approval.
Remaining numbered provisions are unresolved proposals, not verified current capabilities or approved terms.
Founder must verify identity/entity/jurisdiction/contact/date fields and referenced policy URLs.
Legal review required for age/guardian model, private/public licence scope, deletion, moderation/appeals,
certificate privacy, copyright processes, SGD100 liability cap, indemnity, Singapore forum and notice periods.
No details fabricated. No claim of globally absent infrastructure: affected signup/Terms code does not establish it.
Publication requires founder/legal approval of exact text/hash/version, operational evidence, archived prior policy,
new approved version/date and separately reviewed notice/reacceptance plan. No automatic approval toggle.
Existing provisional text is not newly approved by this PR; proposed revision is not made binding.

## Validation evidence
Node 24.19.0, pnpm 10.20.0. No project dependencies/lockfile changed.
- `pnpm exec tsx --test lib/signup-captcha.test.ts lib/signup-captcha-client.test.ts lib/terms.test.ts`:
  exit 0, 6 passed. Actual Better Auth HTTP pipeline with memory DB and mocked Google/mail.
  Missing/false/string/stale consent and forged fields reject; valid signup has no session and unverified email.
  Added missing-field cases and assertion that rejected requests/login leave original acceptance record unchanged.
- `PLAYWRIGHT_MODULE=/tmp/terms-browser/node_modules/playwright/index.mjs node tests/terms-consent.browser.mjs`:
  passes Chromium desktop 1280x800 and mobile 375x667. Native unchecked/checked validation, checkbox keyboard,
  dialog accept/dismiss, unchanged false/true states, Tab trap, Escape/focus restoration and input preservation.
  Harness bundles actual React/Radix component with real Tailwind; does not claim full live signup E2E.
  Playwright installed only in /tmp; harness uses existing tsx/esbuild plus system Chromium, no runtime dependency.
  Initial harness role locator could not access background checkbox while modal aria-hides it; corrected locator.
- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm lint`: exit 0, 0 errors, existing no-img-element warning at imported-source-content.tsx:46.
- `pnpm build`: exit 1, next/font Inter fetch denied by existing Codex network policy; no font changes.
- `git diff --check`: passes. Full corpus suite not rerun (previous unrelated punctuation failure).

## Independent critic passes
Separate reviewer completed security, legal/factual consistency and UX passes.
Confirmed active source/hooks unchanged, document-only revision, no implicit acceptance/history migration.
Required separate label/trigger and archive-before-publication gate; both implemented/documented.
Flagged unsupported feature/process claims and legal clauses in review matrix, not activated as product promises.
Browser checks address recommended focus/mobile/checked-dismiss cases. No further confirmed runtime issue found.

## Remaining review and staging checks
Founder/legal decisions above remain open; do not publish the proposed revision without explicit approval.
Verify screen reader announcements and full staging signup/mail flow; mocked/browser harness is not live staging.
Phase 1 CAPTCHA real key/domain/replay checks, shared PostgreSQL limiter readiness and deployed DB parity remain open.
No merge/deployment/live DB changes or approval of legal content performed.
