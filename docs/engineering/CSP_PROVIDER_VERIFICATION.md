# X3C isolated provider verification handoff

2026-11-03. **All real-provider flows are BLOCKED, not verified.** The managed environment has no bound provider secrets, disposable resource identities or approved disposable HTTPS origin. HTTP egress is restricted to configured package destinations; Google verification, Resend, Blob and a disposable deployment have no test access grant. No provisioning, configuration changes, provider calls, account creation, migrations or grants were performed by this preparation.

`node scripts/csp/providers.mjs` is an offline, fail-closed preflight. It prints only provider names, missing variable names and fixed blocker codes; exit 2 means blocked. Even a complete configuration returns `PREPARED_NOT_VERIFIED`, never PASS. Attestations do not prove resource isolation or authorise execution. Do not place secrets in the repository or CLI arguments.

## Required setup, outside this change

An operator must identify **pre-existing, explicitly approved disposable** resources. Creating infrastructure, registering domains/keys, changing settings or borrowing existing authoring Preview resources is outside this task. Resource creation or missing network permissions require separate authorisation.

Common controls:

- `X3C_PROVIDER_ORIGIN`: isolated HTTPS origin, root path only. Production domains, the existing financial-dashboard deployment family and Production project ID are rejected. Browser/server egress must deny Production and permit only exact approved test origins and provider endpoints.
- `X3C_DISPOSABLE_RESOURCES_ACK=reviewed-disposable-only` and `X3C_PROVIDER_EGRESS_ACK=reviewed-provider-egress`: operator review markers, not security credentials or proof of access.
- Auth DB must be a fresh loopback PostgreSQL instance owned by the existing disposable-test runner, database `physcratic_authoring_test`. Never a forwarded Production port, shared Neon branch or database containing real users. No schema setup is executed by the preflight. Any missing schema/table prerequisites remain blocked under the no-migration/no-grant constraint.
- Two disposable test accounts, controlled inboxes, short resource leases and a teardown owner. Report roles as fixture A/B, not email addresses or user IDs. Keep cookies, tokens, passwords and mail bodies in memory. Disable HAR, traces, storage-state files and screenshots that could retain them. Persist only fixed assertions/status codes and privacy-projected CSP summaries.

| Flow | Required X3C bindings | Map into a dedicated isolated runner only | Acceptance evidence |
| --- | --- | --- | --- |
| Better Auth | `X3C_AUTH_DATABASE_URL`, `X3C_AUTH_SECRET` | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` = approved origin | Real signup/verification/sign-in, session cookie, protected access, logout and expired/revoked session |
| reCAPTCHA v3 | `X3C_RECAPTCHA_SITE_KEY`, `X3C_RECAPTCHA_SECRET_KEY`, `X3C_RECAPTCHA_ALLOWED_HOSTNAME` | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` at **build time**, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_ALLOWED_HOSTNAMES` at runtime | Real client execution and server `siteverify`: success, finite score 0.5–1, action `signup`, exact hostname; invalid/replayed tokens rejected |
| Resend | `X3C_RESEND_API_KEY`, `X3C_RESEND_EMAIL_DOMAIN`, `X3C_MAIL_RECIPIENT` | Dedicated send-only key/domain, `RESEND_API_KEY`, `RESEND_EMAIL_DOMAIN`; controlled inbox reader | Message actually delivered; callback stays on isolated origin; valid verification works, expired/reused link fails safely; resend/rate-limit behaviour |
| Private Blob | `X3C_BLOB_READ_WRITE_TOKEN`, `X3C_BLOB_STORE_ISOLATION_ACK=distinct-disposable-private-store` | `BLOB_READ_WRITE_TOKEN` for a distinct disposable private store | Upload and byte-identical authorised download through actual app proxy; unauthorised account rejected; no external redirects/public caching; cleanup only attested objects |
| Vercel Analytics | `X3C_VERCEL_PROJECT_ID`, `X3C_ANALYTICS_READ_ACCESS_ACK=disposable-project-read-access` | Distinct disposable project with actual analytics script/ingestion and read access | Real script loads, controlled event accepted and appears in that project's aggregate view. HTTP 2xx alone is insufficient |

Do not use generic always-pass CAPTCHA mocks as proof of v3 scoring. A site key must be registered for the exact disposable hostname. Resend's sandbox recipient restrictions may require an account-owner inbox or a separately approved verified test domain; Production mail domains are rejected. A Blob prefix in a shared store is **not** isolation. Do not enable `AUTHORING_STAGING_BLOB_ENABLED`, alter `VERCEL_*` identity, or repurpose the hard-coded authoring Preview/store guard in `lib/authoring-staging.ts` and `lib/author-media-storage.ts`.

## Execution protocol once prerequisites and execution are separately approved

The X3B loopback harness intentionally substitutes auth/API responses and synthetic analytics/CAPTCHA. Its child environment strips credentials and blocks provider egress. **It cannot perform these provider checks unchanged.** A dedicated runner must validate disposable resource ownership, remove API/provider mocks, map only the above bindings into a fresh process, and enforce exact egress destinations. No such live runner is enabled by this PR.

1. Validate origin/project/store ownership, DB runner ownership, resource leases and allowed inbox recipients. Fail before starting if any identity is ambiguous. Confirm actual auth schema and rate-limit table already exist in the disposable service without applying migrations/grants here.
2. Build with the disposable public CAPTCHA site key. Apply experimental CSP only to that isolated test process. Record build/policy IDs and engine names, never raw policies/nonces or URLs. Run Chromium, Firefox and WebKit, observing both functional assertions and report delivery.
3. Through real UI/API, create fixture A with current terms and a fresh v3 token. Assert signup cannot bypass CAPTCHA. Verify missing, invalid and replayed tokens fail. Use actual delivery to follow the email verification link in memory. Never persist the link or token.
4. Sign in through `/api/auth/sign-in/email`, verify the browser cookie via `/api/auth/get-session` and owner-only UI, then `/api/auth/sign-out`. Check session expiry/revocation and access failure. Resend via `/api/auth/send-verification-email`; verify delivery and safe expired-link handling. Do not add unsupported password-reset flows.
5. With A/B, exercise actual author/student private upload and download routes using synthetic PNG/PDF bytes. Assert owner permissions, revision/solution access, attachment disposition, `private, no-store`, nosniff, same-origin CORP and existing `sandbox; default-src 'none'` where applicable. Do not whitelist Blob in browser CSP: storage calls stay server-side.
6. In the disposable Vercel project only, load the real analytics script, send a fixed synthetic event and confirm aggregate ingestion with read access. Do not attach identity metadata. Repeat the dashboard, reader, calculator and private-media flow under the candidate and inspect privacy-projected CSP evidence.
7. Stop and classify any failure as functional breakage, expected block with verified fallback, environment limitation or unexplained violation. Delete only explicitly attested disposable accounts/objects according to the approved lease; never execute broad cleanup or change Production/staging settings.

## Present evidence and blockers

Existing authenticated fixtures from X3B cover injected sessions, disposable SQL and in-memory storage. They establish application contracts, not provider transport or live cookies. X3C reuses those contracts and the three-engine harness; it does not relabel mocks as real-provider success.

Current blockers: no isolated HTTPS origin; no disposable resource/egress attestation; no auth DB/secret binding; no registered v3 key/secret/hostname; no isolated Resend sender/inbox credentials; no distinct private Blob store token; no distinct Vercel Analytics project/read permission. Provisioning and network-policy changes are forbidden in this task. There is no authenticated Production fallback.

**Provider GO requires all actual assertions above to pass on the immutable candidate with attested disposable services.** Until then, provider compatibility and eventual Production enforcement remain NO-GO.
