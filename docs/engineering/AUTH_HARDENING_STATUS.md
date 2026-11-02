# Authentication hardening execution update ? 2026-11-02

Production migration APPLIED, application NOT DEPLOYED. Both protections remain inactive in Production until the application release passes the live CAPTCHA gate.

- User authorized only public."rateLimit" and its required index on divine-mode-82940461 / br-quiet-dawn-b7m2zrt3 / neondb. Staging was not used.
- Exact reviewed SQL SHA256: 31e4898140cd53b129d9e999082eaaf7ef41c0cd2880955bc2d7d293ba8bfb22. The transaction tool supplied BEGIN/COMMIT around the unchanged six statement bodies. Executed once, successfully; no grants, backfill, existing-table changes or migrations 0001?0006.
- Production endpoint ep-snowy-heart-b7c1220y independently maps to the authorized branch. Runtime neondb_owner has schema USAGE and SELECT/INSERT/UPDATE/DELETE on the new table by ownership. Neon reports 21600 seconds of recovery history.
- Independent verification found exactly four required non-null columns, valid primary/unique/lastRequest indexes, zero rows, and unchanged identities/owners/kinds/RLS flags for all 99 pre-existing public objects. See evidence/auth-hardening/production-migration.json.
- PASS on ephemeral Linux with PostgreSQL 18.6: eight PostgreSQL integration/subtests, including two-instance concurrent limits, reset/persistence, trusted-IP cases and fail-closed storage/permission/connection failures; actual auth Terms/signup/verification and endpoint-limit regression.
- Initial Linux failures were corrected in test setup: initialize SDK identity tables inside the disposable schema before testing, and replace the obsolete memory-storage expectation. No shared fixture or migration was used.
- PASS: seven focused CAPTCHA/client/CSP/Terms tests; Next type generation; TypeScript; zero-warning lint; optimized Next production build (exit 0). Build used the real public site key, synthetic auth signing secret, no provider secret or Production DB credential. Unchanged static portrait and logo assets were supplied after initial transfer omissions; no app build workaround was added.
- Original local commits 963287e and 372e8da rebased cleanly onto latest main 77a0c9a; resulting commits 797818b and 0c9256a. Exact upstream Git object hashes were verified during import through the connector because shell Git transport is blocked.
- Public-key-only provider check: Google's script and anchor load for physcratic.com without invalid-key/domain errors. Production secret variable metadata exists, but a valid token/secret round trip is NOT VERIFIED. Sensitive secrets cannot be read back through the normal environment workflow. No provider configuration changed.
- Browser access host is unavailable; native browser attempts also failed to establish a controllable session. Public Production signup HTML loads through the Linux runner, but no live account, verification email, CAPTCHA token or login was exercised.

Remaining gate: prove live CAPTCHA keypair and fresh-client integration before pushing enforcement to main. Then require candidate GitHub CI, READY deployment and authorized positive/negative Production auth checks. The table alone does not activate rate limiting. Do not rerun the successful Production SQL.

---

The earlier preparation record below is historical; the execution update above supersedes its pending migration and local-environment test blockers.

# Final authentication hardening ? prepared, deployment blocked

Date: 2026-11-02. Baseline: main 19a5108a1a18ef9ce55b3d0c2aefd0f8708499a0.
Working checkout: C:/Users/THINKPAD/Downloads/physcratic-role-v2/auth-hardening.
No shared database write, migration, grant, provider configuration change, push or deployment has been performed.

## Implemented

Strict signup-only reCAPTCHA v3 server validation and fresh client token integration. Existing consent, verification, staging origins and request wrapper preserved. Better Auth database storage enabled with the prior endpoint limits. Additive standalone migration restored from the reference branch. No changes to migrations 0001?0006, dependencies or lockfile.

## Local validation

- PASS: nine focused tests covering real Better Auth HTTP signup, missing/invalid/reused token, action/hostname/score/malformed verdict rejection, provider failure, consent, email verification/no auto-login, fresh client tokens/retry, CSP origins and form rendering.
- PASS: Next type generation; TypeScript --noEmit; repository-wide ESLint with zero warnings; git diff --check.
- Tests used an untracked, in-process TypeScript transpilation harness because the normal tsx/test runner cannot spawn in this Windows sandbox. Dependencies are read through a junction to the existing Phase C installation; its lockfile SHA256 exactly matches this checkout: 112A62898588821A7D051DE447484A2E76663979ED2F7BB98276EF2984B0E5CE. Offline install was attempted and failed due to a missing cached tarball; no dependency was changed or downloaded.
- BLOCKED, not passed: disposable PostgreSQL tests. initdb cannot create/re-execute its restricted token or initialize the owned local data directory. No cluster was started and no test SQL reached a shared database.
- BLOCKED, not passed: optimized build, Windows spawn EPERM. Normal test transport-safety startup and tsx/esbuild also fail with spawn EPERM. No production build workaround or protection bypass was committed.
- lib/auth-rate-limit.pg.test.ts is automatically selected by the existing Linux database CI job through AUTHORING_TEST_DATABASE_URL. It exercises two independent auth instances/pools and a least-privilege fixture role: concurrent consumption, persistence/reset, per-path buckets, IPv4/header priority, missing/untrusted IP fallback, IPv6 /64, missing table, revoked UPDATE and connection failure. These tests are prepared but have not run successfully in this task.
- lib/staging-auth-review.test.ts retains actual production configuration coverage with mocked Google/mail, asserts database storage and exact endpoint rules, and lets the SDK initialize only its fresh local fixture database. It has not run successfully here.
- Full Linux suite is reserved for GitHub CI; no new candidate run exists because deployment prerequisites prevent pushing main.

## Read-only Production findings

- Project financial-dashboard / prj_phm4794zl2QBICu5MMbLFxcHAfFq, team_iKeP4uT5oRKgSX6f5zHpV09T; custom domain physcratic.com.
- Deployment dpl_G1yy51FGVdGn26BZCXpGKsEJhQ3j is READY, target production, serving baseline 19a5108a. Baseline GitHub Typecheck/unit and Database checks succeeded (run 41463303304); those checks do not cover these unpushed changes.
- Production DATABASE_URL resolves to project divine-mode-82940461, endpoint ep-snowy-heart-b7c1220y-pooler.c-13.us-east-1.aws.neon.tech, database neondb, runtime role neondb_owner. No credential values are recorded here.
- Read-only catalog inspection: public schema USAGE=true; existing user/session are owned by neondb_owner; public."rateLimit" DOES NOT EXIST.
- Production NEXT_PUBLIC_RECAPTCHA_SITE_KEY and RECAPTCHA_SECRET_KEY variable metadata exists; RECAPTCHA_ALLOWED_HOSTNAMES is physcratic.com. Presence does not prove a matching working v3 keypair. Secret was not retrieved or tested.
- Public signup inspection was attempted, but the web fetch could not access it and the browser access host is unavailable. No live signup, mail, consent acceptance, CAPTCHA completion or authentication POST was performed.

## Exact shared-infrastructure approval scope

The prepared AUTH_HARDENING_PRODUCTION.sql creates ONLY public."rateLimit" and its lastRequest index on divine-mode-82940461 / neondb, as neondb_owner. This role already has public USAGE; ownership gives it SELECT/INSERT/UPDATE/DELETE, so no separate GRANT is needed for the current binding. If the runtime role changes, recheck grants before deployment. Do not run SDK schema migration, drizzle push, or migrations 0001?0006 on shared environments.

After authorization and successful disposable-PG/build validation, apply only that SQL, read back columns/unique key/index and effective runtime privileges, then establish working CAPTCHA provider/client integration before pushing main. Any provider configuration repair needs its own explicit authorization. Git transport is also unavailable through the shell proxy; the connected GitHub API remains available for a non-force, latest-head-checked publication when all gates pass.

## Remaining release gates

1. Successful two-instance disposable PostgreSQL and actual-config regression tests, TypeScript/lint/build on a subprocess-capable runner.
2. Separate authorization and execution of the additive Production table migration; verify schema/privileges afterward.
3. Live matching v3 provider credentials, hostname/action/score behavior and fresh browser token integration verified without breaking registration. Shared test-account/mail writes require authorization.
4. Latest-main reconciliation, normal non-force push, passing candidate Linux CI, READY Production deployment and authorized live auth validation.

Neither requested protection is operational in Production: the unchanged deployed baseline lacks both. Current state is NO-GO for public launch on these two security requirements.

## Final head check

GitHub main advanced during this task to 77a0c9a0c975f9cdb8c09d3666aedcc34f2a4e29 (UI/theme/coaching/metadata changes). Comparison confirms no overlap with this authentication patch. The local preparation commit started from the latest main at task start, 19a5108a; reconcile onto the latest head before the eventual non-force push. Shell Git transport remains blocked. No remote refs were modified.
