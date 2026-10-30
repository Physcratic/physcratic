# Phase 3 auth production hardening

Date: 2026-10-31 (Asia/Makassar). Branch codex/auth-hardening from codex/terms-review at 2f7870b.
NOT production-ready until release gates below are evidenced. No live credentials, DB, deployment or merge.
Proposed Terms draft and active policy text/version unchanged; Phase 1/2 branches untouched.

## Implementation
- Explicit Better Auth 1.7.14 built-in storage=database, existing pg Pool/Kysely; thresholds unchanged.
- Additive migrations/20261031_auth_rate_limit.sql + mirrored Drizzle rateLimit declaration:
  text id PK, required unique text key, integer count, bigint lastRequest; lastRequest cleanup index.
- Exact logical fields verified against installed getAuthTables in test, physical columns queried from PG.
- Migration reviewed by independent critic; transaction and lock/statement timeouts; no auto-runner.
  Only applied inside random isolated test schemas. No auth/user/consent table migration or history overwrite.
- Added opt-in test:auth:pg command; rejects non-loopback/non-*_test URLs and requires production mode
  before imports. Never reads DATABASE_URL. No Redis, runtime dependency or custom limiter introduced.
- Extended verification test: signup unverified/no session; email confirmation still no session; explicit
  login creates session and preserves server Terms version/time. No API/interface or legal text change.

## Exact verification
Node 24.19.0, pnpm 10.20.0; local disposable postgres:16 Docker, version 16 series, loopback port55439.
Image digest sha256:1beaa3084eee2676f20a9cd9928f0bf2c5bf674f8e49f81017912183d377c61c.
Test DB auth_hardening_test; random schemas created/dropped; test-only credentials, no production access.
- With AUTH_TEST_DATABASE_URL selecting that local DB and NODE_ENV=production set BEFORE process:
  `pnpm exec tsx --test lib/auth-rate-limit.pg.test.ts lib/signup-captcha.test.ts
  lib/signup-captcha-client.test.ts lib/terms.test.ts`: exit0, **7 passed, 0 skipped/failed**.
- Real PG: 30 simultaneous requests via two independent auth instances/pools; exactly3 admitted/27 denied
  on first-insert and expired reset waves, persisted count3, saturation retained across instances.
- Tests path isolation/trailing slash, different single-IP buckets, invalid/multi-hop/missing IP fallback
  with persisted no-trusted-ip|/ok assertion, IPv6 /64 grouping; other headers cannot override selected XFF.
- Missing table and refused connection fail closed; no downstream provider-boundary hook reached;
  restoring table retains saturated bucket. Direct Better Auth test models Next's generic503 mapping,
  not a claim that the Next route wrapper was exercised against PG or a full PG signup/mail E2E.
- `pnpm test`: exit1, **99 total: 97 passed, 1 failed, 1 skipped** (opt-in PG tested separately above).
  Existing lib/corpus-translation.test.ts:66 protected-editorial punctuation mismatch; outside auth scope.
- `pnpm exec tsc --noEmit`: exit0 (test-only readonly NODE_ENV assignment corrected before final run).
- `pnpm lint`: exit0, 0 errors/1 existing image warning at imported-source-content.tsx:46.
- `pnpm build`: exit1, next/font Inter fetch fails; existing Codex Google Fonts proxy403 restriction,
  not established production font defect. No TLS/network bypass or font rewrite.
- `git diff --check`: passes. Mocks prove CAPTCHA outcome handling, not live provider verification.

## Independent security/reliability review
GPT-6.1 Sol High read-only critic reviewed installed algorithm, migration, schema, tests and rollout.
No confirmed runtime defect in built-in DB adapter paths; conditional increment/reset and unique insert
retry verified in installed source AND real concurrent PostgreSQL execution, not mock-only claims.
Critic caught import-time NODE_ENV capture: corrected command/guard and persisted fallback-key assertion.
Confirmed limits are PER PATH, not aggregate; allowed requests move inactivity window, denied do not.
Built-in pruning only on expired reset is not guaranteed TTL for one-off keys; cleanup remains release gate.
CAPTCHA fails closed on missing config/provider errors; plugin's optional numeric-score shape limitation remains.
Terms strict validation/audit fields and verification/session behavior remain preserved by regression tests.

## Concise release checklist / blockers
See SIGNUP_CAPTCHA.md release gate and migrations/README.md for procedure, privileges and rollback.
- Inspect deployed DDL, establish isolated Preview/staging DATABASE_URL, backup/restore and reviewed schema-first
  migration, then separately authorize production migration before code. Nothing applied to live DB here.
- Confirm Vercel overwrites client XFF to one validated IP; default rejects untrusted chains/falls back shared.
  Confirm NAT/IPv6 bucket behavior, DB connection load/outage handling and monitoring; no invented trusted CIDRs.
- Approve normalized IP|path retention/access and monitored expiry cleanup: new DB persistence is not an
  implicit privacy-policy approval. Existing active/proposed legal texts are unchanged.
- Configure BETTER_AUTH_SECRET, canonical BETTER_AUTH_URL/origins, matching v3 public/secret/host keys,
  verified RESEND_EMAIL_DOMAIN/API permissions; prove after() delivery, real CAPTCHA score/context/replay/expiry,
  verification then explicit login, accessibility and normal staging build with font egress.
- Roll back app first, retain limiter table; prior memory limits weaken cross-instance protection.
  Never drop/truncate while any instance uses database storage. No automatic memory fallback on DB failure.
- Terms draft remains unapproved/document-only; all Phase 2 human approval gates remain open.
