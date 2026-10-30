# Staging security readiness

2026-10-31 (Asia/Makassar). New isolated codex/staging-security-readiness from remote auth-hardening052fe92.
Original auth-hardening, main and problem-authoring branches untouched. Local c723d5b audit was not the base.
All remote heads fetched; no remerge/revert reversal, deployment, live migration, Neon connection or real email.

## Implementation
- verification-email-delivery.ts enforces server-only exact staging mailbox allow-list before Resend invocation.
  VERCEL_ENV=production preserves normal production mail; Preview/development/absent target restrict delivery.
  Max20 validated comma-separated recipients; no wildcards/empty entries, domain-case normalization.
  Staging link origin must match explicit HTTPS BETTER_AUTH_URL; provider errors sanitized, no token/body logs.
- scripts/staging-preflight.ts reads ONLY explicitly selected env file (Node parseEnv); no ambient PG/URL fallback.
  Rejects absent/encoded-redacted placeholders, routing query overrides, identity/origin/host ambiguity.
  Explicit read-only PG session queries actual DB/role/schema plus exact limiter PK/unique/type contracts.
  No user data reads or writes; never infers Neon branch isolation solely from schema/table/name/role.
- Existing auth/Terms/CAPTCHA/verification/session interfaces and production DB configuration preserved.
  Preflight is an operator deployment gate, NOT a newly installed runtime DB isolation guard.
- STAGING_RELEASE_PREFLIGHT.md: owner-friendly PowerShell procedures; AUTH_RELEASE_RECOVERY_PLAN.md:
  verified Git topology and future main-based integration preserving authoring, no production-release PR.

## Verified vs supplied
Founder supplies Neon project neon-indigo-dog / physcratic-staging, prepared staging schema/rateLimit,
Vercel team neuterions-projects / financial-dashboard, branch Preview overrides and author membership blocker.
These were NOT dashboard/Neon-verified. Staging migration must NOT be reapplied based on this guide.
Remote main0845052 has restored/merged authoring phases; stacked auth branches contain different revert merges.
Recovery requires future explicit integration; blind remerge or whole-tree copying would be unsafe.

## Actual checks
Node24.19.0, pnpm10.20.0; no new project dependencies/lock changes.
- `pnpm exec tsx --test lib/staging-preflight.test.ts lib/verification-email.test.ts
  lib/signup-captcha.test.ts lib/signup-captcha-client.test.ts lib/terms.test.ts`: **10 pass**, exit0; includes actual Better Auth staging-origin signup with recipient-gated fake transport.
- `pnpm test:auth:pg` with explicit disposable loopback AUTH_TEST_DATABASE_URL: **1 pass**, exit0.
  Actual PostgreSQL16 Docker; real30-request first-insert/reset waves, two instances, exact3 admitted;
  saturation, IP/path, outage and restored-state checks. No Neon or production connection; disposable container removed after tests.
- `pnpm exec tsx scripts/staging-preflight.ts /tmp/physcratic-preflight-local.env`: passed read-only identity
  and schema on synthetic local fixture; negative partial-key and wrong INCLUDE-index checks failed as expected.
  No actual provider invocation; temporary selected file contained only test configuration.
- `pnpm test`: **103 total:101 pass,1 fail,1 skip**. Inherited corpus-translation.test.ts:66 punctuation
  mismatch remains; opt-in PG skipped in default suite but independently passed above.
- `pnpm exec tsc --noEmit`: passed after fixing new optional-env typing and test-only Better Auth callback email mapping.
- `pnpm lint`: passed,0 errors/1 existing no-img-element warning at imported-source-content.tsx:46.
- `pnpm build`: failed fetching Inter via next/font; known Codex Google Fonts restriction, not production evidence.
- `git diff --check`: passes. No safety controls weakened or unrelated corpus files changed.
Tests use mocks, synthetic schemas and isolated PG; no actual staging integration/E2E claim.

## Independent review and findings
Independent security reviewer examined full implementation, auth source and recovery/operator documents.
See STAGING_SECURITY_FINDINGS.md for severity/evidence/impact/tests/approval matrix. No critical finding invented.
Fixed high staging arbitrary-recipient delivery risk; confirmed preflight placeholder/query/index assurance gaps
and repaired them. Runtime missing DATABASE_URL fallback, effective Preview scope and edge header trust remain
release gates; speculative production changes avoided. No policy draft changed or made binding.

## Owner next actions / remaining blockers
Resolve Vercel author authorization normally; no rewritten authors/CLI bypass. Review this branch first.
Configure explicit approved STAGING_VERIFICATION_EMAIL_ALLOWLIST (server only) and isolated sender credentials.
Supply independent Neon expected host/name/role and copied-data provenance; run read-only preflight ONLY with
staging authorization. Check effective Preview env branch scopes, explicit staging auth origin and Google v3 keys.
After separately authorized Preview deployment: complete allow-listed signup/mail/verification/sign-in, live
CAPTCHA replay/expiry/context, Terms accessibility, forged-XFF and shared-limit smoke; inspect safe logs.
Approve IP retention/cleanup, capacity/alerts and backups/rollback. No production readiness claim.
Before production, separately approve main-based auth recovery compatible with authoring and schema-first rollout.
