# Shared authentication rate limiter release

Extracted from validated candidate 3ea41c3 onto main 77a0c9a. Runtime change: explicitly select Better Auth PostgreSQL rate-limit storage. Preserve the existing 60/60s default, sign-in 5/60s, signup/resend 3/60s, trusted IP resolution, Terms, verification and generic fail-closed HTTP wrapper.

The rateLimit table and required indexes already exist on Production divine-mode-82940461 / br-quiet-dawn-b7m2zrt3 / neondb. Runtime permissions were independently verified. DO NOT run migrations/20261031_auth_rate_limit.sql again; it is retained solely as the completed schema reference and disposable-test fixture. No migration or grant accompanies this release.

The exact two-instance PG test from the passing Linux PostgreSQL 18.6 candidate is retained. It validates concurrent consumption, persistence/reset, IP behavior and failure on missing table, revoked permissions or disconnected storage. Update the actual-configuration regression to require database storage. GitHub CI covers the complete Linux suite.

No CAPTCHA enforcement/client code, validation-only vercel.json or CI branch override is included. Production deployment configuration is inherited unchanged from main. CAPTCHA remains a separate release gate.
