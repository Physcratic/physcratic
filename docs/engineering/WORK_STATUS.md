# PR18 Phase 1 — authentication UX correctness

2026-10-31 (Asia/Makassar). Existing PR https://github.com/Physcratic/physcratic/pull/18.
Working branch codex/auth-ux-email-polish. Fetched PR18 head and named branch matched94a6fc1;
base origin/codex/auth-hardening2c01848. Head rechecked unchanged before committing corrections.
Full PR diff inspected. No main/base branch, DB/schema/env, Git identity, deployment or legal draft change.

## Verified implementation / corrections
- Public Terms: title + October2026; developer disclaimer/brand/version/TOC copy removed by PR.
  Sequential numbered headings and all substantive paragraphs come from canonical lib/terms.ts.
- Correction: removed forced desktop justification for more consistent paragraph spacing/readability.
- Consent: only Required. helper, no technical dialog copy. Required initially unchecked control,
  explicit I agree, separate trigger, dismissal/scroll never accepts; accessible Radix focus/keyboard retained.
- Signup password/security helper and compact Google disclosure remain as implemented, links preserved.
- Confirmed Resend6.35.0's Attachment accepts Buffer in typings but parseAttachments forwards it to
  JSON.stringify unchanged, producing a Buffer object in wire JSON rather than required base64 string.
  Correction passes EMAIL_LOGO_BASE64 directly; actual SDK fetch mock proves correct wire representation.
- CID contentId/contentType map to content_id/content_type; embedded PNG equals supplied public asset,
  valid2887-byte96x96 PNG. Logo is inside email body; it does not configure an inbox sender avatar.
- Added HTTPS/no-credentials/control-character URL validation before provider, including production;
  ordinary Better Auth HTTPS verification URLs and recipient policies are unchanged.
- Tests cover escaped HTML ampersands/quotes/angle brackets, unchanged raw plain-text URL, fallback,
  one primary Verify email action,1-hour expiry, sender/recipient/idempotency and attachment bytes/type/CID.
- No dependency additions, architecture rewrite or unrelated application change.

## Exact test evidence
Node24.19.0; pnpm10.20.0 selected on PATH.
- `pnpm exec tsx --test lib/verification-email.test.ts`: exit0, **6 pass**, actual SDK fetch mocked;
  allow-list/missing/malformed configuration, prod recipients, staging-origin signup and provider errors retained.
- `pnpm exec tsc --noEmit`: exit0, no diagnostics.
- `pnpm lint`: exit0,0 errors/1 existing no-img-element warning at imported-source-content.tsx:46.
- `pnpm test`: exit1, **106 total:104 pass,1 fail,1 skip**. Failure is inherited
  corpus-translation.test.ts:66 protected-editorial punctuation preservation mismatch; unrelated files untouched.
  PostgreSQL opt-in concurrency suite skipped without explicit disposable URL; not run against any live DB.
- `pnpm build`: exit1 after Inter fetch retries; next/font cannot download from Google Fonts under known
  Codex network restriction. No successful build claimed and no font/tooling/security bypass attempted.
- `PLAYWRIGHT_MODULE=/tmp/terms-browser/node_modules/playwright/index.mjs node tests/terms-consent.browser.mjs`:
  exit0 at1280x800 and375x667. Actual Terms page/React/Radix with Tailwind; canonical paragraph equality,
  heading numbers, visible date, removed technical copy, Required. helper, checkbox validity and explicit accept,
  checked/unchecked dismiss, keyboard trap/Escape/restore, scroll without consent and input preservation.
  Lightweight harness uses framework build-time env definitions and waits for React mount; no Next server E2E claim.
- `git diff --check`: passed. No real mail, provider call, production/staging DB connection or user modification.

## Independent complete-diff review
Reviewer separately reproduced SDK Buffer serialization bug and verified base64 correction/wire test.
Reviewed imports/types, HTML escaping/link safety, CID support, canonical legal content, consent accessibility,
CAPTCHA/rate/session policies and staging restrictions. No remaining confirmed implementation blocker found.
Security invariants unchanged: true/current Terms required, server version/time, CAPTCHA server validation,
DB-backed limits, email verification before explicit login, Preview recipient fail-closed and no token logging.
Active legal clauses/version/date and proposed docs/legal draft are byte-unchanged against PR base.
Vercel's existing check failure is Git-author team authorization, NOT code compilation; no bypass attempted.

## Phase 2 QA handoff only
- Full Next preview/browser visual QA when separately available: light/dark typography, responsive layout,
  screen reader announcements, focus visibility, checkbox/error and busy/retry states; automated harness is not visual approval.
- Gmail/Outlook/Apple Mail/mobile rendering: CID support, blocked images/alt text, dark mode, logo contrast,
  button/fallback wrapping, copy/paste and actual received1-hour link. No live emails sent in Phase1.
- Correct sender-avatar expectations separately: body logo does not establish inbox avatar/BIMI.
Stop after Phase1 technical review. No Phase2 execution or production-integration planning performed.
Not a full-production-readiness claim.
