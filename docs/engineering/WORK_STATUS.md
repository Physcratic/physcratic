# Auth audit work status

Audit date: 2026-10-30 UTC. Branch: `codex/auth-audit`.
Baseline main: `80bef237f7c187b74ce83316f3dda780dae42792`.
Documentation only; no application/dependency/DB changes, deployment, or real mail.
Architecture and evidence: [AUTH_MAP.md](AUTH_MAP.md). Durable rules: [AGENTS.md](../../AGENTS.md).

## Baseline checks (actual results)
Environment: Node 24.19.0; default pnpm 11.25.0.
- Initial `pnpm install --frozen-lockfile --ignore-scripts` failed:
  `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`; pnpm 11 ignores package.json pnpm.overrides.
- `npx --yes pnpm@10.20.0 install --frozen-lockfile --ignore-scripts` succeeded, unchanged lockfile.
- Initial four checks under pnpm 11 failed before execution: `ERR_SQLITE_ERROR: unable to open database file`.
- Re-ran requested commands with cached pnpm 10.20.0 first on PATH:

| Command | Actual result |
| --- | --- |
| `pnpm test` | Exit 1: 94 tests, 93 pass, 1 fail. Both Terms tests pass. |
| `pnpm exec tsc --noEmit` | Exit 0, no diagnostics. |
| `pnpm lint` | Exit 1: `sh: 1: eslint: not found`; no tracked ESLint config/dependency found. |
| `pnpm build` | Exit 1: next/font cannot fetch Inter from Google Fonts in app/layout.tsx. |

Test failure: `lib/corpus-translation.test.ts:66`, protected editorial drafts preservation;
semicolon versus comma in the English friction paragraph. Outside auth scope; left unchanged.
Test initially hit sandbox `listen EPERM` for tsx IPC; retry with escalation produced counts above.
Build initially reported generic webpack failure; escalated retry exposed the Google Fonts error.
No broader corpus investigation or font/network configuration changes were made.

## Findings and blockers
- Confirmed in installed Better Auth 1.7.14 source: configured rate limiter defaults to module memory.
  Limits do not survive restart or coordinate across instances; actual edge/scaling controls are unknown.
- No CAPTCHA in reviewed auth flow; server enforcement must cover account creation and email-triggering paths.
- No demonstrated Terms acceptance bypass; helper tests do not verify actual HTTP hooks or persisted consent.
- No tracked migrations, SQL, migration config/journal or migration command; schema parity cannot be established.
- No live DB accessed or secrets inspected. Need redacted read-only DDL/history to compare deployed auth tables,
  especially nullable Terms version/time columns, types, uniqueness and foreign keys. No observed drift claimed.
- Provisional Terms explicitly require operator identity/contact, legal review and separate privacy notice.
- Independent adversarial reviewer challenged findings; rejected unsupported bypass/drift claims.
- Security skill references could not be loaded; this is a scoped source audit, not a completed automated scan.

## Next exact implementation task
Add an isolated auth HTTP integration harness with disposable PostgreSQL and stubbed email (no live services).
Pin the compatible pnpm major as part of reproducible test setup; do not silently update dependencies.
Exercise the actual auth route and both hooks: missing/false/string/stale Terms -> 400 and no user/account;
valid current Terms -> persisted current version/server timestamp; forged audit fields ignored.
Verify no signup session, unverified login rejected, verification then explicit login, resend behavior,
body limit failures, and safe callbacks. Avoid coupling tests to real provider delivery.
Acceptance: tests prove persisted consent and verification boundaries using locked Better Auth 1.7.14.
Then design a reviewed migration baseline and atomic shared limiter with cross-instance/concurrency tests;
choose CAPTCHA provider/configuration only with concrete requirements and server-side negative tests.
Do not apply any production migration as part of that harness task.
