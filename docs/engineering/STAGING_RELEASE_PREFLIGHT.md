# Staging release preflight — human-operated, no deployment authorization

2026-10-31. Target reported by founder: team neuterions-projects/project financial-dashboard,
Neon project neon-indigo-dog/branch physcratic-staging; staging.physcratic.com. These are supplied facts,
not dashboard-verified from Codex. Founder reports existing staging tables/rateLimit and Preview overrides.
**Do not reapply migrations.** Inspect evidence only. No Neon or Vercel connections performed by this task.

## Before Preview deployment (operator, not executed)
- [ ] Resolve commit-author Vercel-team authorization through an authorized team member. Never rewrite author,
  borrow credentials, bypass checks, or deploy via CLI to evade this blocker.
- [ ] Verify exact project/team, target Preview, branch codex/auth-hardening and its commit052fe92;
  review this separate readiness branch before deciding how to incorporate its changes. No push to original.
- [ ] Verify Git branch-specific Preview scopes in the dashboard. Do not assume CLI pulls/builds use them:
  CLI tooling needs the correct project, Preview target and Git branch selection confirmed by an authorized
  operator; inspect effective scope metadata before using output. No CLI deployment is authorized here.
- [ ] Obtain Neon branch/resource metadata and expected endpoint host/database/role independently of DATABASE_URL.
  Confirm separate staging runtime role cannot access production; inspect branch parent/data provenance.
  Automatically created branches may contain copied production rows—use synthetic data, not a copied live dataset.
- [ ] Confirm existing staging user/account/session/verification/Terms and rateLimit DDL, privileges and index.
  Founder says additive migration already applied. A table's presence alone does NOT prove isolation.
- [ ] Select explicit staging env export (untracked file outside repo or ignored .env.staging.local), restricted
  local file permissions. Never paste secret values, console output, SQL results, or entire terminal transcripts
  into PowerShell/chat. Set secrets through approved tools; do not use inline credential command arguments.

Required selected file names (values only in approved environment management):
- VERCEL_ENV=preview and DEPLOYMENT_STAGE=staging (preflight assertion), DATABASE_URL (staging only).
- EXPECTED_STAGING_DB_HOST / EXPECTED_STAGING_DB_NAME / EXPECTED_STAGING_DB_ROLE from independent Neon metadata.
- BETTER_AUTH_URL=https://staging.physcratic.com; separate stable BETTER_AUTH_SECRET >=32 characters.
- NEXT_PUBLIC_RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY: matching staging classic-v3 key pair;
  RECAPTCHA_ALLOWED_HOSTNAMES=staging.physcratic.com, explicitly registered in Google console.
- RESEND_API_KEY / RESEND_EMAIL_DOMAIN: approved staging sender, ideally separate provider credential/domain.
- STAGING_VERIFICATION_EMAIL_ALLOWLIST: comma-separated exact approved test mailbox addresses (1–20),
  no wildcard, empty element, display-name syntax or domain-wide permission. Local part matches exactly;
  domain matches case-insensitively. Server rejects missing/invalid/unknown targets before any provider call.
  VERCEL_ENV=production retains unrestricted existing production delivery. Other/absent targets restrict mail.

Safe PowerShell checks (repository folder; commands below do not deploy):
```powershell
git status --short --branch
git log -1 --format=fuller
git rev-parse origin/codex/auth-hardening
pnpm exec tsx scripts/staging-preflight.ts C:\Secure\physcratic-staging.env
pnpm exec tsc --noEmit
pnpm lint
```
Use a compatible pnpm10 and supported Node24 as verified here. Preflight reads ONLY that file, rejects
placeholders/ambiguous URLs, sets read-only transactions, queries DB name/role/schema without row writes,
and prints no values. **Only an operator authorized for staging may run the preflight against Neon.**
Independent host attestation remains mandatory; matching pg database/role cannot prove Neon branch ownership
or copied-data isolation. No secret fetching/automatic fallback from PGHOST or ambient DATABASE_URL occurs.
- [ ] Confirm Resend sender/DNS/permissions, approved inboxes, CAPTCHA hosts, stable origin and Preview access
  protection. Without explicit BETTER_AUTH_URL, source prefers production URL before Preview URL.
- [ ] Before any permitted Preview build, verify isolation and egress to Google Fonts/reCAPTCHA, Resend, Neon.
  Public-key changes need rebuild. Preview deployments can still have production-mode Node settings.

## After separately authorized Preview deployment (not performed)
- [ ] Verify project, Preview target, actual Git commit, stable staging domain, effective scopes and DB attestation.
- [ ] Homepage/signup load; production domain does not redirect to staging; monitor errors without token/body logs.
- [ ] Inputs survive Terms open/close, keyboard/focus/mobile work; opening/dismissing does not accept.
- [ ] Missing/stale Terms or missing/invalid CAPTCHA reject direct requests. Current-version true is the
  intended API consent signal; server cannot prove someone physically clicked/read the checkbox.
- [ ] Real v3 token action/signup, hostname, score, expiry and duplicate verification tested with approved accounts.
- [ ] Create test account only in staging DB. Assert stored current consent/server time, unverified/no session.
- [ ] Only allow-listed inbox receives verification; unauthorized/missing-list requests make no Resend call.
  Since after() delivery is asynchronous, account may exist with delivery blocked: stays unverified/no session.
  Generic UI response is not delivery proof. Configure allow-list then use controlled resend; do not delete real users.
- [ ] Confirm verification link stays on staging; verification creates no session, explicit sign-in does.
- [ ] Test server errors/provider outage and recovered resend; no account-enumeration claims based on UI alone.
- [ ] Verify cross-instance429 counters, spoofed XFF overwritten by edge, missing/multi-hop fallback, NAT/IPv6 buckets.
- [ ] Monitor DB connections/counts/503/429, persisted-IP retention, bounded cleanup ownership and alerting.
- [ ] Production sanity is metadata/manual observation only unless separately approved; no production test writes/mail.

## Before production release
- [ ] Follow AUTH_RELEASE_RECOVERY_PLAN.md on a future main-based integration branch; preserve authoring phases.
  Do not remerge/reverse reverts or copy the old tree. No production-release PR created by this task.
- [ ] Review full auth and authoring regressions, isolated PG concurrency, normal build and staging smoke evidence.
- [ ] Confirm production schema and migration order; stage's migration does not establish production readiness.
  Any necessary production migration needs separate approval, backup/restore plan and schema-before-code rollout.
- [ ] Production env/recipient behavior/origins/provider settings explicitly reviewed; no staging DB/keys in production.
- [ ] Obtain deployment and legal-policy-status approval; proposed Terms remain document-only, never auto-activated.
- [ ] Rollback app first; retain limiter table and all consent records. Memory rollback weakens shared limits.
- [ ] Name monitoring owner and release stop conditions. No software release is authorized by this checklist.
