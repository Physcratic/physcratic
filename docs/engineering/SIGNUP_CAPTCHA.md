# Signup reCAPTCHA v3 setup

Uses the existing Better Auth 1.7.14 CAPTCHA plugin with Google reCAPTCHA classic v3 siteverify.
Do not use v2 test keys or Enterprise API credentials. No new dependencies; Phase 3 adds a limiter table.

## Configuration
Set these through environment configuration; never commit or print credentials:

| Variable | Scope | Meaning |
| --- | --- | --- |
| NEXT_PUBLIC_RECAPTCHA_SITE_KEY | Browser/build | Public v3 site key |
| RECAPTCHA_SECRET_KEY | Server/runtime | Matching secret key |
| RECAPTCHA_ALLOWED_HOSTNAMES | Server/runtime | Comma-separated exact hosts, no scheme/port/path |

Production: register `physcratic.com` in Google's reCAPTCHA admin console and set the server allow-list
to `physcratic.com`. Add `www.physcratic.com` to both only if signup actually runs there.
Never derive allowed hostnames from request headers. Missing secret/allow-list blocks server signup;
missing public key blocks browser submission. Public-key changes require a new Next build.
Staging: use a separate v3 key pair and stable staging hostname, registered and explicitly allow-listed.
Avoid registering the shared `vercel.app` domain; prefer a staging domain or specific preview hostname.
Local: use a separate development v3 key pair permitting `localhost`, allow-list only `localhost`,
and store in untracked `.env.local`; preserve existing auth base URL/origin settings.
Never use production secrets locally or put the secret in NEXT_PUBLIC variables.
No deployment environment or credentials were changed by this task.

## Contract
Only `/sign-up/email` is protected; explicitly excludes sign-in, resend and recovery in this phase.
At submit, browser loads Google's script, executes action `signup`, and sends a fresh token through
Better Auth fetch options `headers: { 'x-captcha-response': token }`. Terms fields remain in the body.
Tokens are not stored or reused. Loading/execution have time bounds; failure restores submit for retry.
Progress is announced with a live status; errors use the existing alert. Google's badge remains visible;
signup includes Google privacy/terms links. An execution finishing after timeout is discarded.

Plugin checks Google success, score >= 0.5 when present, exact action `signup`, explicit hostname allow-list.
Google v3 keys must return score; this is a live staging assertion, not a v2 compatibility mode.
Expiry (~2 minutes) and single-use are enforced by Google's siteverify (`timeout-or-duplicate`),
not an instance-local replay cache. Provider outage fails closed; wrapper maps 5xx to generic 503.
Plugin raw exception/URL logging is suppressed so provider diagnostics and tokens are not logged.

## Production blockers and staging checklist
- Limiter now uses existing PostgreSQL: migration must precede code deployment.
  Verified Vercel proxy/IP handling and capacity/retention remain release gates.
  CAPTCHA does not replace limits and does not protect sign-in/resend mail abuse in this phase.
- Deployed DB parity and migration history remain unknown; no live DB was queried.
- Verify actual key pairing, host/action/score, false positives, and Google/network/CSP access in staging.
- Complete signup, receive mail, verify email, explicitly sign in; confirm signup creates no session.
- Reuse a real verified token and submit another after >2 minutes: reject both without new user/mail.
- Verify direct HTTP omission, wrong action/hostname, provider outage, blocked script, retries and screen reader flow.
- Confirm sign-in/resend/recovery remain CAPTCHA-free and missing/stale Terms still reject.
- Review provider data processing/privacy before enabling production. Do not relax CSP blindly.
Deterministic tests mock Google and mail with a disposable in-memory DB; they do not establish live
Google, Resend, Vercel, PostgreSQL or accessibility compatibility. No live provider verification performed.

## Shared limiter implementation
Uses Better Auth 1.7.14's existing `rateLimit.storage: "database"` with the existing PostgreSQL Pool.
No Redis, new database, custom limiter, or application dependency is needed. Establish the required table
through the reviewed migration BEFORE deploying this configuration.
Installed `dist/api/rate-limiter/index.mjs` uses unique-key insert/collision retry, conditional
`incrementOne` with `count < max`, and compare-and-set window reset. Its Kysely adapter emits guarded
PostgreSQL UPDATE/RETURNING; it does not use a racy separate read/write increment.
Required Better Auth model: `rateLimit`, id primary key, key unique/not-null, count not-null integer,
lastRequest not-null bigint milliseconds (confirm generated DDL against the locked version).
Preserve adapter-generated IDs, configure an expiry-cleanup strategy/index appropriate to traffic,
and keep existing connection/statement timeouts. Built-in pruning runs on expired-window reset.
Before activation: isolated PostgreSQL concurrent first-insert/reset/saturation tests, outage behavior,
cleanup/query-plan checks, and Vercel trusted-proxy/IP-header validation. Missing IP uses a shared
per-path bucket; spoofable/unverified IP headers can undermine limits. Database failure must not
fall back to process memory. Never activate database storage before the table is ready.
Limiter runs before CAPTCHA provider verification. Actual production capacity/edge controls are unknown.

## Build and lint readiness
Inter uses standard `next/font/google`; no font redesign is required by evidence in this checkout.
Codex proxy denied CONNECT to both fonts.googleapis.com and fonts.gstatic.com with HTTP 403.
The enforced network allow-list excludes both hosts. This explains the local build failure, but
is not proof of production build success: verify a normal Vercel staging build with font access.
Do not disable TLS, bypass the proxy, or replace fonts merely to make this environment appear green.
Lint uses ESLint 10, the TypeScript parser, and the Next 15 plugin (recommended/Core Web Vitals rules),
plus basic correctness rules; TypeScript remains the type checker. Use Node ^20.19, ^22.13 or >=24
for ESLint 10 (verified here on Node 24.19). No unrelated image warning was auto-fixed.

## Phase 3 implementation and release gate
The branch selects built-in database storage and verifies its behavior against disposable PostgreSQL 16.
Migration: migrations/20261031_auth_rate_limit.sql; procedure/rollback: migrations/README.md.
Current limits remain unchanged and PER PATH (60/60 default, sign-in 5/60, signup/resend 3/60).
Allowed requests move lastRequest; denied requests do not. These are inactivity-window buckets, not a global
aggregate auth cap. 429 uses Better Auth's X-Retry-After header. No Redis/custom storage/dependency added.

Before production (still blocked until evidenced):
- Apply reviewed additive migration before code in isolated staging, then separately authorized production;
  prove deployed auth/Terms schema parity and runtime DB role privileges. Do not run migrations on app boot.
- Vercel environments: server DATABASE_URL points to correct environment, no production DB in Preview;
  stable >=32-character BETTER_AUTH_SECRET, explicit canonical BETTER_AUTH_URL for each environment.
  Confirm trusted origins/callbacks match production and stable staging domains; review auto-added preview domains.
- Configure matching classic v3 public/secret keys and exact hostname list, isolate staging keys, rebuild public key.
  Prove live score/action/hostname, single-use/expiry rejection, outage/timeout, accessible retry and no signup session.
- Resend: server RESEND_API_KEY, verified RESEND_EMAIL_DOMAIN (accounts@domain), provider permissions/DNS,
  actual Next after() delivery, one-hour verification then explicit login. Signup success alone is not delivery proof.
- Prove Vercel strips/overwrites client-supplied x-forwarded-for and passes one validated IP before relying on buckets.
  No arbitrary header/CIDR trust added. Missing/invalid/multi-hop value shares fallback; IPv6 /64 and NAT share buckets.
- Approve retention/access for newly persistent normalized IP|path keys. Built-in reset pruning is not guaranteed TTL;
  plan monitored bounded expiry cleanup/index query plans and DB connection/capacity/outage alerting before launch.
- Normal staging build must fetch Inter; Codex's denied Google Fonts access is not evidence of a production defect.
- Keep Terms legal draft inactive; existing consent records/version and explicit dialog acceptance unchanged.
- Rollback app first and retain rateLimit table; memory rollback loses cross-instance protection. No live changes here.
