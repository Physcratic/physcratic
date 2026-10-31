# Auth architecture map

Baseline: `80bef237f7c187b74ce83316f3dda780dae42792` (main fetched for this audit).
Scope: signup/sign-in, Terms, auth HTTP wrapper, email, DB declarations, related tests/config.
This is a source audit; production settings, live DDL, and external edge controls are unseen.

## Runtime and dependencies
- Next.js 15.5.28 App Router, React 19, TypeScript; pnpm lockfile.
- Better Auth 1.7.14 (manifest range ^1.7.14), pg 8.23.1, Drizzle 0.45.4, Resend 6.35.0 locked.
- `lib/auth.ts` passes the pg Pool directly to Better Auth, not the Drizzle adapter.
- `lib/db/index.ts` exposes the same Pool through Drizzle for application queries.
- Pool: max 5, connect 5s, idle 30s, statement 10s, idle transaction 15s.
- `DATABASE_URL` selects PostgreSQL; auth signing configuration relies on framework environment handling.
- `BETTER_AUTH_URL` overrides production Vercel domain, then Vercel preview URL, then V0 runtime URL.
- Production trusted origins include Vercel domains; development adds localhost and configured V0 URLs.
- Development explicitly uses Secure/SameSite=None cookies for cross-site previews.
- `next.config.mjs` sets API no-store/noindex and global security headers.
- README documents v0 linkage and automatic deployment on merge to main; no tracked deployment workflow found.

## Signup sequence
1. `app/sign-up/page.tsx` sanitizes returnTo with `safeReturnPath` and redirects existing sessions.
2. `components/auth-form.tsx` collects name/email/password and an initially unchecked required checkbox.
3. `lib/auth-client.ts` uses Better Auth React client, default same-origin API routing.
4. Signup sends credentials/callbackURL plus `termsAccepted` and current `termsVersion` in fetch body.
5. `app/api/auth/[...all]/route.ts` runs Node handlers; POST caps body at 16 KiB and 15 seconds.
6. The wrapper delegates to Better Auth, converts server failures to generic 503, oversize to 413, timeout to 408.
7. `lib/auth.ts` before middleware checks `/sign-up/email` using `getTermsAcceptance`.
8. Its user-create DB hook checks again and merges server-generated Terms version/time into the user.
9. Better Auth creates the account/verification data; email delivery is scheduled with Next `after()`.
10. `lib/verification-email.ts` sends via Resend; domain/key must exist; token hash is the idempotency key.
11. UI displays generic account next steps after signup (including synthetic duplicate success). Signup autoSignIn is false; verification expires after 1 hour.
12. Verification does not sign in automatically. Password sign-in requires verified email, length 8–128.
13. Unverified sign-in can send mail again; explicit resend uses `/send-verification-email`.
14. Successful sign-in navigates to sanitized `/dashboard` destination; session lasts 7 days, updates daily.

## Key files and contracts
- `app/sign-in/page.tsx`: session redirect, safe returnTo, verification status UI flags only.
- `components/verification-notice.tsx`: only EMAIL_NOT_VERIFIED login enables account-specific verification copy.
  Signup/recovery stay generic; resend acknowledgment does not confirm delivery. Cooldown is not a security boundary.
- `lib/submission-security.ts`: return path restricted to `/dashboard` and rejects backslashes/control chars.
- `lib/submission-server.ts`: downstream session lookup and configured submission-origin checks.
- `lib/verification-email-delivery.ts`: Preview/unknown targets require server mailbox allow-list; production target unchanged.
- `scripts/staging-preflight.ts`: explicit selected-file, read-only DB identity/schema gate, not runtime isolation proof.
- `lib/terms.ts`: canonical text/version `2026-10-30-draft-1`; strict true + exact version required.
- `components/terms-content.tsx`: shared active policy renderer for public page and consent dialog.
- `components/terms-consent.tsx`: controlled checkbox + explicit-accept Radix dialog; no implicit consent.
- Proposed legal revision remains document-only in docs/legal; publication requires recorded founder/legal approval.
- `app/terms/page.tsx`: displays provisional terms; legal identity/contact and privacy notice remain launch work.
- `lib/terms.test.ts`: rejects missing/false/string/stale acceptance; verifies server audit values.
- `lib/submission-security.test.ts`: safe redirects/origins; `lib/submission-request.test.ts`: body limits/timeouts.
- `lib/signup-captcha*.test.ts`: real Better Auth HTTP pipeline, memory DB, mocked Google/mail.
- `lib/signup-policy.ts` shares unchanged production Terms hooks with those tests.
- Real PostgreSQL limiter tests: lib/auth-rate-limit.pg.test.ts; live provider/deployed DB parity unverified.

## Database invariants and migration status
- `lib/db/schema.ts`: user id PK; email unique/not-null; emailVerified default false/not-null.
- Terms version and timestamptz acceptance time are nullable, allowing legacy users without consent records.
- Terms fields are `input:false` in auth config; create hook overwrites submitted audit values.
- No DB constraint pairs the Terms fields or requires acceptance on every insert; do not backfill assumed consent.
- Session id PK, token unique/not-null, userId FK cascades on user deletion.
- Account id PK, userId FK cascades; credential password is handled by Better Auth, not custom hashing.
- Verification stores id/identifier/value/expiry; schema alone does not establish deployed token behavior.
- migrations/20261031_auth_rate_limit.sql adds only the limiter table; no automatic migration runner.
- Existing auth-table/Terms deployed DDL remains unverified; follow migrations/README.md schema-first rollout.
- No deployed DDL snapshot was supplied; Terms-column existence/types and constraints are UNVERIFIED.
- Missing deployed Terms columns could break signup; this is a conditional risk, not observed divergence.
- Next DB task needs a redacted read-only schema export and migration history; do not run push/migrate on live DB.

## Security findings and insertion points
- Phase 3 explicitly sets rateLimit.storage=database using the existing pg Pool, without Redis/custom storage.
- Evidence: locked Better Auth `dist/context/create-context.mjs` selects memory without explicit/secondary storage;
  `dist/api/rate-limiter/index.mjs` uses a module Map. Restarts/other instances do not share counters.
- Config: per-path default 60/60s, sign-in 5/60s, signup/resend 3/60s; allowed requests move lastRequest.
- Deployment-wide abuse exposure depends on unseen scaling/edge controls; none are assumed.
- Signup uses Better Auth CAPTCHA plugin with Google v3; see [SIGNUP_CAPTCHA.md](SIGNUP_CAPTCHA.md).
- Fresh token in x-captcha-response; server enforces signup only, score 0.5/action/hostname.
- Sign-in/resend/recovery remain CAPTCHA-free; shared storage implemented, schema-first deployment required.
- Real isolated PG validates atomicity across two instances; deployment/IP/retention prerequisites
  remain release gates in SIGNUP_CAPTCHA.md. No live database migration was performed.
- No demonstrated Terms HTTP bypass: both hooks reject omission/stale version; valid programmatic consent is expected.
- Nullable legacy fields and absence of reacceptance gating are not evidence of a signup bypass.
- Integration tests must verify body parsing retains Terms fields and hooks persist authoritative audit values.
- Delivery errors are logged after response; UI success does not prove delivery. No provider readiness was tested.

## Independent adversarial review
A separate read-only reviewer challenged Terms bypass, limiter assumptions, CAPTCHA and schema drift.
It rejected an unsupported Terms-bypass claim and classified DB parity as unknown.
Parent subsequently confirmed memory default against installed locked Better Auth source.
No exploit, production load test, real email, or live database query was performed.

## Phase 3A integration
- Reviewed auth source3a34ccb restored selectively onto main058fa3c; all authoring modules retained.
- rateLimit appended to main schema; both migration families retained. No identity or consent backfill.
- Existing submissionUser -> Better Auth session bridge unchanged; real cookie cross-feature tests added.
- Exact evidence and Preview restrictions: INTEGRATION_STATUS.md.
