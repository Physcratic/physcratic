# Signup CAPTCHA work status

Date: 2026-10-31 (Asia/Makassar). Branch: `codex/signup-captcha`.
Base: latest fetched main `80bef237f7c187b74ce83316f3dda780dae42792`.
Previous audit handoff was on `codex/auth-audit`, not main; its AGENTS/map are carried forward here.
Setup: [SIGNUP_CAPTCHA.md](SIGNUP_CAPTCHA.md). Architecture: [AUTH_MAP.md](AUTH_MAP.md).

## Changes
- Existing Better Auth 1.7.14 CAPTCHA plugin enabled only for `/sign-up/email`.
- Google v3 score threshold 0.5, action `signup`, explicit environment hostname allow-list.
- Missing secret or allow-list fails closed; public key required for browser submission.
- Fresh token generated at submit and sent via supported `x-captcha-response` fetch header.
- Accessible progress/error/retry; bounded script/execute wait; no token persistence or raw error logs.
- Existing Terms configuration moved unchanged to signup-policy.ts to share hooks with HTTP tests.
  No new Terms feature/text, session, credential, verification, dependency or DB behavior changes.
- Sign-in/resend/recovery deliberately remain CAPTCHA-free.

## Real validation evidence
Node 24.19.0; cached pnpm 10.20.0 selected on PATH (pnpm 11 ignores repository overrides).
Existing frozen dependency installation reused; no lockfile changes.
- `pnpm exec tsx --test lib/signup-captcha.test.ts lib/signup-captcha-client.test.ts lib/terms.test.ts
  lib/submission-security.test.ts lib/submission-request.test.ts`: exit 0, **17 passed, 0 failed**.
  Tests ran with sandbox escalation because tsx needs local IPC; no live Google/DB/email calls.
- `pnpm exec tsc --noEmit`: exit 0, no diagnostics.
- `pnpm lint`: exit 1, `sh: 1: eslint: not found` (existing baseline dependency/config gap).
- `pnpm build`: exit 1, next/font cannot fetch Inter from Google Fonts (existing network blocker).
- `git diff --check`: passed.
Full corpus suite not rerun: prior baseline 93/94 passed, unrelated translation punctuation failure.

HTTP tests use real Better Auth routing/plugin and production Terms hooks, disposable memory adapter,
mocked Google and stubbed mail: success creates one unverified user/account, no session, one mail;
missing token cannot bypass; invalid/expired/duplicate/low-score/wrong-action/wrong-host fail;
provider 503 fails closed; malformed consent and forged audit fields reject; unverified login rejects.
Sign-in, resend, recovery do not invoke CAPTCHA. Client tests prove fresh action tokens and retry.
Production Next error wrapper still maps provider 500 to generic 503; wrapper is unchanged.

## Security-focused critic review and repairs
Reviewed HTTP-only enforcement, default endpoints, key absence, replay, request context, logs and retries.
- Explicit endpoint list avoids the plugin default protecting sign-in and password reset.
- Empty hostname configuration is treated as missing secret, preventing an unrestricted allow-list.
- Upstream plugin catch logs raw exception/URL; wrapper suppresses that error logger.
- Failed client loading/execution now clears loader state so another submission can retry.
- Regression assertion corrected: Better Auth rejects forged input:false audit fields (FIELD_NOT_ALLOWED),
  rather than silently ignoring them. Existing Terms hooks and strict validation remain unchanged.
- Google siteverify is the authority for expiry/single-use, including across Vercel instances.
  Mock duplicate/expired results prove rejection handling, not real Google replay guarantees.
- Plugin checks score when supplied, plus required action/hostname. Correct v3 keys/real score require staging.
No further source-backed bypass found in reviewed scope; this is not an exhaustive security scan.

## Unresolved production blockers / next verification
- Better Auth limiter still uses module-memory storage: Vercel instances/restarts do not share counters.
  Require shared atomic limits and validated proxy/IP handling before claiming global abuse protection.
- No live schema evidence or migrations in checkout; PostgreSQL parity remains unknown.
- No live provider, Vercel, Resend, PostgreSQL or browser/screen-reader testing performed.
- Staging: provision compatible separate keys, verify action/score/host, real expiry/replay, mail/verification,
  blocked-script recovery, keyboard/screen-reader flow and endpoint exclusions per SIGNUP_CAPTCHA.md.
- No production credentials accessed/configured; no merge, deployment, live migration or Terms work.
