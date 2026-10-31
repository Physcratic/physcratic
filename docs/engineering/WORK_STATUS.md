# PR18 Phase 2 — browser, accessibility and email QA

2026-10-31 UTC. PR: https://github.com/Physcratic/physcratic/pull/18.
Branch: codex/auth-ux-email-polish; fetched named head and PR ref both matched Phase 1
5164fe25849920579c629ee0904c63670e6789ce. Base codex/auth-hardening at 2c01848 untouched.
No deployment, real email, live DB access, secret/configuration change, legal publication or author rewrite.

## Confirmed corrections
- Auth/verification titles were divs: now h1; multiline signup heading has readable line height.
- Alert headings now expose level 2 rather than skipping from h1 to h5.
- Weak auth input/unchecked checkbox boundaries: scoped muted-foreground borders; strong focus rings.
  Measured boundary contrast: inputs 5.01:1 light/6.08:1 dark; checkbox 5.37:1 light/5.80:1 dark.
- Password guidance and Terms error are associated with their controls.
- Verification screen receives heading focus; returning restores focus to account heading.
- Sign-in/resend expose loading status; resend form exposes aria-busy. Existing disabled behavior retained.
- Terms scroll container now has a named region role (axe manual-review item confirmed and corrected).
- No email-template change needed: Phase 1 base64/CID/escaping and link validation remain intact.

## QA matrix and isolation
| Interface | Result | Evidence / limit |
| --- | --- | --- |
| Signup, sign-in, public Terms | Passed | All 5 viewports × light/dark; no horizontal overflow |
| Terms consent dialog | Passed | Explicit accept/uncheck, dismiss/Escape, Tab/Shift+Tab trap, focus restore |
| Verification-required / invalid / expired screens | Passed | Actual Next UI, mocked auth responses/query errors |
| Loading, CAPTCHA retry, stale Terms, resend errors/cooldown | Passed | Disabled/busy/status, preserved dialog inputs, fresh token per retry |
| Keyboard / automated accessibility | Passed | Axe selected WCAG 2/2.1/2.2 AA + app best practices; bounded claim |
| Email Chromium preview | Passed | 320/375/600px, both preferences, images allowed/blocked, long URL |
| Gmail / Outlook / Apple Mail | Not tested | No authorized mail delivery or client access |
| Safari / Firefox / physical devices / screen reader speech | Not tested | Manual follow-up required |

Viewports: 375×667, 390×844, 768×1024, 1280×800, 1440×900. Browser: system Chromium/Playwright 1.64.1;
axe 4.14.0. Full Next `pnpm dev`, real React/Radix/Tailwind/Inter. Disposable local PostgreSQL 16
initialized only for Better Auth startup; no live services. All browser auth requests mocked,
CAPTCHA stubbed and external browser requests blocked. This is NOT backend end-to-end verification.
All canonical Terms headings/paragraphs matched lib/terms.ts in page/dialog; title/date/version-hiding verified.
Local Inter 5.3.0 fixture via Next's existing font-test hook; actual Google-served binary remains unverified.
Axe incomplete items reviewed: absent closed-dialog aria-controls target is Radix's unmounted content;
indeterminate dialog-description background reviewed against theme colors and screenshots. No WCAG conformance claim.
Screenshots contain Next's local development indicator; its overlay is not production UI.

## Commands and actual evidence
Node 24.19.0 / pnpm 10.20.0; local tools remain outside package.json/pnpm-lock.yaml.
- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm lint`: exit 0; 0 errors, 1 inherited no-img-element warning in imported-source-content.tsx:46.
- `pnpm test`: exit 1; 106 tests, 104 pass, 1 fail, 1 skip. Inherited corpus-translation.test.ts:66
  semicolon/comma editorial-preservation mismatch; unrelated corpus untouched. Opt-in PG suite skipped.
- `pnpm exec tsx --test lib/verification-email.test.ts`: exit 0, 6 pass; actual Resend SDK wire fetch mocked.
- `PLAYWRIGHT_MODULE=/tmp/terms-browser/node_modules/playwright/index.mjs node tests/terms-consent.browser.mjs`:
  exit 0; 1280×800 and 375×667, including named-region regression.
- `PLAYWRIGHT_MODULE=/tmp/terms-browser/node_modules/playwright/index.mjs AXE_MODULE=/tmp/terms-browser/node_modules/@axe-core/playwright/dist/index.mjs node tests/auth-ux.browser.mjs`:
  exit 0; all 10 app combinations and 12 email preview combinations passed after final fixes.
  Separate keyboard input-focus checks also passed at all 10 combinations.
- `pnpm build` (launcher `build-network`): exit 1; Inter download fails under the Google Fonts network restriction.
- Local-font fixture `pnpm build` (launcher `build`): exit 0; full build completed, all 17 static pages generated.
  This uses local Inter via the existing Next test hook; it does not prove the ordinary network build passed.
- `git diff --check`: passed. Security/legal/runtime dependencies unchanged against Phase 1.

## Email, independent review and handoff
Actual mock-generated HTML/text, SDK payload and PNG attachment checked. Same HTTPS CTA/fallback URL,
escaping, 1-hour notice, one primary action, 96px PNG displayed at 72px, proportional supplied logo,
readable blocked-image alt and wrapped long URL. Browser dark preference retains explicit light palette;
client forced dark mode/CID/MIME/layout remain UNVERIFIED. Body logo is not an inbox avatar.
Independent reviewer inspected UI/test diffs and mobile/email screenshots; no further confirmed defect.
Security invariants unchanged: explicit current Terms + server version/time, server CAPTCHA, DB rate limits,
verification-before-login, preview allow-list, token lifetime/sender/production recipient policies; no token logging.
Artifacts: `/tmp/pr18-phase2/artifacts/index.html` (162 screenshots + axe reports/matrix); archive `/tmp/pr18-phase2-qa.zip`.
Reproduction and exact manual email checks: [AUTH_UX_QA.md](AUTH_UX_QA.md).
Before staging QA: resolve Vercel Git-author team authorization through normal permissions (not compilation),
confirm the ordinary Google-font build in a permitted environment and complete manual browser/mail checks above. Inherited suite failure remains open.
Stop after Phase 2. No Phase 3 integration/release work and no production-readiness claim.
