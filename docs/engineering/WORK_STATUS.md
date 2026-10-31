# Batch 0 — email verification state UX

2026-10-31. Base `codex/auth-hardening` at `4c0b2c9`; work branch `codex/verification-state-ux`.
Founder reports staging test account is verified and signs in. No delivery incident is established.
No Resend implementation/configuration, live data, migration, deployment or integration change.
Previous PR18 visual QA evidence remains in Git history and AUTH_UX_QA.md.

## Findings and changes
- Installed Better Auth 1.7.14 verifies the password before returning EMAIL_NOT_VERIFIED.
- Verified login creates a session and sends no verification mail. Existing signed-in page redirects
  and successful-login dashboard navigation are unchanged.
- With requireEmailVerification/autoSignIn=false, duplicate signup returns synthetic success with
  emailVerified=false even for a verified account. It creates neither a new account nor email.
  This response cannot establish the real account's verification state.
- Unauthenticated resend returns the same `{status:true}` for verified, unknown and unverified
  addresses; only unverified accounts invoke the configured email callback.
- Correction: only EMAIL_NOT_VERIFIED login shows an account-specific "Verify your email" prompt.
  Signup (including duplicates) and unauthenticated recovery show generic "Account next steps"
  with sign-in guidance. No account-existence or verification lookup was introduced.
- Resend acknowledges the request without promising delivery. The existing asynchronous provider
  callback means HTTP success cannot confirm delivery; no provider investigation was performed.
- CAPTCHA, Terms version/server timestamp, rate limits, verification lifetime, no automatic sign-in,
  preview recipient restrictions and all mail-provider behavior remain unchanged.

## Verification
- New lib/verification-state.pg.test.ts uses a randomly isolated schema in disposable loopback
  PostgreSQL16, real Better Auth HTTP handlers, mocked Google and an in-memory email callback.
  Covers wrong/correct passwords, verified/unverified/unknown login, duplicate signup for both states,
  resend for all states, persisted session, no automatic sign-in and unchanged consent audit.
  Each request uses a distinct test IP to isolate state behavior from limiter saturation.
- `AUTH_TEST_DATABASE_URL=<disposable-loopback-URL> pnpm exec tsx --test lib/verification-state.pg.test.ts`:
  PASS (1 test); no live DB or real mail. Fixture URL rejects non-loopback/non-*_test databases.
- `pnpm exec tsc --noEmit`: PASS.
- `pnpm lint`: PASS, one inherited no-img-element warning in imported-source-content.tsx:46.
- `pnpm test`: inherited failure;107 tests,104 pass,1 fail,2 opt-in PG skips. Failure is unchanged
  corpus-translation.test.ts:66 editorial punctuation mismatch. Dedicated PG test above ran explicitly.
- Browser: `PLAYWRIGHT_MODULE=/tmp/terms-browser/node_modules/playwright/index.mjs AXE_MODULE=/tmp/terms-browser/node_modules/@axe-core/playwright/dist/index.mjs QA_ARTIFACTS=/tmp/batch0/artifacts node tests/auth-ux.browser.mjs`: PASS, all 10 viewport/theme combinations.
- `PLAYWRIGHT_MODULE=/tmp/terms-browser/node_modules/playwright/index.mjs node tests/verification-login.browser.mjs`: PASS; generic recovery/resend wording and verified dashboard navigation request (API mocked).
- `pnpm build` via `node tests/auth-ux-local.mjs /tmp/terms-browser build-network`: PASS, all 17 static pages generated.
  Existing Next cache includes the prior local Inter fixture; this verifies compilation/build completion,
  not fresh Google Fonts download access. Production font source is unchanged.
- `git diff --check`: PASS.

## Handoff
Staging needs this UI update only if these revised prompts are desired; verified login itself already
works and needs no server/Resend/data repair. Staging has not been changed by this task.
Review the focused PR before any separately authorized staging deployment.
No merge, deployment, live modification or integration work performed.
