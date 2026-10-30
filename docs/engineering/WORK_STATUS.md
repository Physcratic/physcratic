# Signup CAPTCHA production readiness

Date: 2026-10-31 (Asia/Makassar). Existing branch `codex/signup-captcha`, PR #3.
Continues commit `2810bcc`; no Phase 2, new PR, merge, deployment or live DB/config changes.
Setup and limiter design: [SIGNUP_CAPTCHA.md](SIGNUP_CAPTCHA.md); architecture: [AUTH_MAP.md](AUTH_MAP.md).

## This increment
- Added only three dev dependencies: ESLint 10.14.0, TypeScript parser 8.72.1, Next plugin 15.5.28.
  Flat config parses JS/TS/TSX with Next recommended/Core Web Vitals and basic correctness rules;
  generated/build/content output ignored. No unrelated source files fixed or rules suppressed for warnings.
- Added whitespace-only secret/hostname-list cases, transport-failure rejection and raw-log redaction tests.
- Confirmed correctly configured mock signup still creates one unverified user/account and mail, no session.
- Server plugin remains always installed: absent/blank secret OR empty host list fails closed only on signup.
  Existing browser test rejects absent public key; configured browser retries request fresh action tokens.
- No CAPTCHA, Terms, credential/session or font implementation changes were necessary in this increment.

## Exact checks and results
Node 24.19.0; pnpm 10.20.0 on PATH. ESLint 10 requires ^20.19, ^22.13 or >=24 Node.
`pnpm add -D eslint@^10 @typescript-eslint/parser@^8 @next/eslint-plugin-next@15.5.28 --ignore-scripts`
was performed in two steps; final manifest/lockfile use the versions above (no runtime dependency changes).
- `pnpm exec tsx --test lib/signup-captcha.test.ts lib/signup-captcha-client.test.ts lib/terms.test.ts
  lib/submission-security.test.ts lib/submission-request.test.ts`: exit 0, **18 pass, 0 fail**.
  Escalated for tsx IPC; memory DB, Google fetch mock and mail stub; no real Google/DB/mail requests.
- `pnpm exec tsc --noEmit`: exit 0, no diagnostics.
- `pnpm lint`: exit 0, **0 errors, 1 warning**: existing no-img-element at
  components/physics/imported-source-content.tsx:46, left unchanged.
- `pnpm build`: exit 1 after font retries; `app/layout.tsx` next/font cannot fetch Inter.
- `curl -I --max-time 15` to Inter CSS at fonts.googleapis.com and to fonts.gstatic.com:
  both exit 56, `CONNECT tunnel failed, response 403`; proxy response HTTP/1.1 403 Forbidden.
  Current enforced Codex allow-list excludes both hosts. No proxy/TLS bypass or font substitution attempted.
- `git diff --check`: passed.
Full corpus suite not rerun; prior baseline 93/94 passed with unrelated corpus punctuation failure.

## Independent security/reliability critic review
Separate read-only reviewer examined locked plugin/adapter source, config, client retry and logs.
- No silent-disable path found; recommended blank-config and transport/log tests, now added and passing.
- Correct-config HTTP happy path remains available. Sign-in/resend/recovery never invoke CAPTCHA.
- No token/secret logging found; upstream error logger is suppressed and tested with a sensitive sentinel.
- Plugin validates numeric score when supplied plus action/host, but does not require a numeric v3 score.
  This upstream malformed-response limitation is not an observed attacker-controlled bypass; configure v3
  keys and assert live scores in staging. No claim of strict provider response-shape validation.
- Timeouts discard late results and loader state resets for retry; replay/expiry are Google's responsibility.
No confirmed implementation defect required a runtime change; review gaps repaired with targeted tests/docs.

## Shared limiter decision and remaining blockers
- Current module-memory storage is not shared across Vercel instances/restarts.
- Smallest sound candidate: Better Auth's built-in `rateLimit.storage: "database"` on existing PostgreSQL.
  Installed limiter uses guarded increments/reset CAS/unique insert retry; Kysely uses UPDATE RETURNING.
- Needs a reviewed rateLimit table migration (id PK, unique key, count, bigint lastRequest), isolated real
  PostgreSQL concurrency/outage/cleanup tests, and validated Vercel proxy/IP resolution before activation.
  No Redis/new database/custom limiter was introduced; storage remains unchanged until readiness is proved.
- Build failure is explained by Codex network denial, not evidence of a production font defect.
  Normal Vercel staging build remains unverified; neither build success nor failure in production is claimed.
- Database parity/migration history still unknown; no live database inspected.

## Required manual configuration / staging evidence
Set environment-specific classic Google v3 public site key, server secret and exact host allow-list;
production physcratic.com, separate registered stable staging/localhost keys. Rebuild when public key changes.
See SIGNUP_CAPTCHA.md for names/values; never put the secret in NEXT_PUBLIC variables.
Verify live score/action/hostname, real single-use/expiry rejection, provider outage and blocked-script retry,
mail/verification then explicit sign-in, endpoint exclusions, keyboard/screen-reader behavior and privacy.
Confirm staging build egress for fonts and server siteverify/browser script access. No credentials provisioned here.
