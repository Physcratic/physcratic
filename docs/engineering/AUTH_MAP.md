# Authentication map

Baseline: origin/main 77a0c9a0c975f9cdb8c09d3666aedcc34f2a4e29 (2026-11-02).

- Next App Router uses the Node auth wrapper in app/api/auth/[...all]/route.ts. Its 16 KiB body cap, timeout and generic 503 mapping are unchanged.
- lib/auth.ts passes the existing pg Pool directly to Better Auth 1.7.14. Staging origins and trusted client-IP configuration are unchanged.
- lib/signup-policy.ts contains the existing Terms before-hook and user-create hook, extracted without changing their policy. Consent must be explicit/current; audit version/time remain server-generated.
- Signup calls getSignupCaptchaToken immediately before submission, sending x-captcha-response with the existing Terms body. Sign-in and resend remain CAPTCHA-free.
- The server-only signup CAPTCHA plugin requires Google success=true, numeric finite score in [0.5,1], action=signup and an exact configured hostname. Missing/oversized tokens, missing configuration, malformed responses, provider errors and timeouts fail closed. Google siteverify supplies single-use/expiry enforcement across instances. No local token cache is treated as replay protection.
- A dedicated verifier is necessary because the locked upstream CAPTCHA plugin accepts a successful response without a numeric v3 score. Provider requests use a five-second abort signal, no cache and no redirects; provider secrets/payloads are never logged.
- Verification stays mandatory, one-hour expiry; neither signup nor verification automatically signs in. Existing mail delivery and recipient restrictions remain unchanged.
- Better Auth rateLimit.storage is explicitly database. Defaults remain 60/60s, sign-in 5/60s, signup/resend 3/60s. Locked adapter conditional increments and unique keys provide shared atomic consumption. Default proxy/IP resolution, IPv6 normalization and shared missing-IP fallback remain intact.
- migrations/20261031_auth_rate_limit.sql defines text id/key, unique key, integer count and bigint lastRequest plus retention index. lib/db/schema.ts mirrors it. Runtime needs schema USAGE and table SELECT/INSERT/UPDATE/DELETE, including pruning.
- CSP already allows Google/gstatic scripts, Google connections and Google/recaptcha.google.com frames. It remains report-only; no CSP enforcement policy changed.

See AUTH_HARDENING_STATUS.md for actual test evidence and deployment gates.
