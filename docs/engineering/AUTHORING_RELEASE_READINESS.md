# Phase 8B release readiness — 2026-10-31 (Asia/Makassar)

**Verdict: BLOCKED for controlled live staging validation until target/isolation
and ledger evidence is established.** Code validation is separate from runtime
readiness. No shared writes/deployment were authorized or performed.

## Current evidence update — supersedes initial unknown mapping/CI notes below

External read-only account inspection supplied by user confirms the Vercel→GitHub
mapping, exact project/deployment IDs, domains and Neon inventory. No secret
values were decrypted/disclosed; no configuration, database or storage write.
See [canonical environment evidence](AUTHORING_ENVIRONMENT_EVIDENCE.md).

`financial-dashboard` is project `prj_phm4794zl2QBICu5MMbLFxcHAfFq` connected to
Physcratic/physcratic. Its8A Preview and Production IDs/SHAs are verified in that
evidence. `staging.physcratic.com` serves auth-hardening, not authoring-completion.
Broad P/P/D DB/Blob/auth entries and absent authoring-specific overrides leave
isolation NOT ESTABLISHED. Available Neon branch IDs do not prove connectivity.
The effective authoring DB/role/Blob store/origin, approved isolated target,
backups and remote schema/ledger remain UNKNOWN. Live auth/mail/Blob tests,
cleanup, uploads and migrations against the current Preview remain prohibited.

The agent independently verified successful jobs AND exact checkout SHA for
f876792 in PR run41210409141 and push run41210403475. Its remote-CI gate is now
SATISFIED (install/types/lint/full unit+PG/build). This documentation-only evidence
follow-up changes no application or migration code; its separate CI must not be
confused with those confirmed runs. Current library rerun remains ENOSPC-blocked;
no new browser execution is claimed. Final verdict remains BLOCKED for isolation,
remote schema/ledger/recovery verification and recovered library rerun. Real
Better Auth/email/origin and private Blob validation remain later gated tasks.

## Initial audit record (historical; retained for provenance)

## Audited revision and integration

Audited code/test SHA: `32761ee914e5030260497ec6bf02e3844dc0a2d7`.
Phase8A `71ff793c83c3ab58e4890c4623815052a061eeb8`,6C-A `c259602`,6C-B
`0418b9a`,Phase7 `8293f26` remain ancestors. Main `a55bb1a` SEO work integrated
non-destructively by `a3269e79608fbbba99618343a3f71c47fbba033c`. Only readiness-log
conflict: retained both incoming Batch3 and integration Phase7/8A entries. Local
Inter and incoming root metadata both preserved. No authored/private sitemap
entries; authored reader retains generic noindex/nofollow and APIs no-store.

Reviewed complete change inventory versus main (67 paths) and affected contracts.
No contest/Elo/ratings/leaderboard/comments/social/payment/subscription
implementation introduced; main's existing views/SEO are preserved. Cross-phase
dependencies:0005 + compatible server/client assisted boolean before explicit
solution exposure;0006 before indexed search; trusted application DB role rather
than generic client access; private Blob and verified configured-origin sessions.

The only Phase8B source repair is typed fixtures in two incoming SEO tests:
three `no-explicit-any` errors blocked the restored zero-warning CI gate. No
assertion or product behavior changed. Final handoff commit follows this SHA
with documents only; its exact SHA is provided in delivery/git log. Fresh CI for
that final SHA is required/requested; never carry Phase8A status forward.

## Independent security and migration audit

A genuinely independent read-only security reviewer covered auth/email/origin,
ownership/IDOR, public/private revision separation, numeric exact binary64 and
bounded conservative symbolic grading, immutable history/original retries,
user→parent→permission lock ordering, SQL-derived assistance, grants/generations/
revocation/expiry, media/resource/retention rules, metadata queries/keysets and
browser account/revision races. **83/83 adversarial regression checks pass,0
fail/skip/TODO; no confirmed release-blocking application defect.** No reviewer
edited source. Independent fresh browser attempts failed before execution from
local disk exhaustion; previous8A evidence reviewed, not represented as new pass.

Independent migration audit:51/51 PG checks pass,0 fail/skip/TODO. Separate
PostgreSQL17.11 proof applied UP0001→0006, empty DOWN0006→0001 and UP0001→0006
again, preserving preexisting user/legacy sentinels. Existing suites cover
populated rollback refusal, old unassisted records surviving0005, immutable
constraints/locking/concurrency and usable exact discovery expression indexes.
No migration file differs from71ff793.0005 expands the assisted guard only for
new inserts; no historical rewrite.0006 adds four indexes/immutable simple-text
function matching the query. No startup/build/deploy migration hook found.
Ledger contract exists in docs, but no deployed ledger schema/runner/fixed key
is supplied. The gated runbook defines a proposed lock convention only after
operator reconciliation; remote ledger state remains **UNKNOWN**.

## GitHub and Vercel evidence

GitHub Actions [run41208646313](https://github.com/Physcratic/physcratic/actions/runs/41208646313)
job124558822559 independently fetched: successful install/types/lint/full PG/build;
checkout log contains the exact Phase8A SHA. GitHub combined status for71ff793
contains Vercel success linked to
[financial-dashboard deployment](https://vercel.com/neuterions-projects/financial-dashboard/AMNA9Vhxs7na5RN5ZZAr7MnHYcfv).
User reports READY/Preview/exact SHA. Provider API metadata was not accessible;
READY/Preview and project purpose cannot be independently verified here. These
are old-SHA build/status evidence, not final-SHA or runtime readiness.

No Vercel/Neon connector, CLI authorization or local project mapping was available;
managed runtime reports no configured credentials/identities for those services.
Do not infer provider absence or empty remote databases from that. Read-only
mapping/isolation evidence was requested. No attempt to bypass network policy,
read secret files, pull secret values or access guessed database endpoints.

| Required configuration | Expected scope | Observed remote presence/isolation |
| --- | --- | --- |
| DATABASE_URL | distinct Preview/Production DB/role/Neon branch | UNKNOWN |
| BETTER_AUTH_SECRET | independently scoped runtime auth secret | UNKNOWN |
| BETTER_AUTH_URL | exact Preview origin/callback versus Production | UNKNOWN |
| RESEND_API_KEY, RESEND_EMAIL_DOMAIN | staging mail identity/delivery | UNKNOWN |
| BLOB_READ_WRITE_TOKEN | distinct private Blob store/credential | UNKNOWN |
| NEXT_PUBLIC_SITE_URL | intentional public canonical origin | UNKNOWN |
| VERCEL_ENV, VERCEL_URL, VERCEL_PROJECT_PRODUCTION_URL | provider scope/origin fallbacks | UNKNOWN |

Names above come from code/SDK requirements, not evidence of configured values.
If mutable credentials/resources are shared, block validation. Sharing is not
asserted as fact; isolation is unverified. Build success does not verify mail,
private storage, auth callbacks, schema/ledger, or protected runtime routes.

## Local quality evidence and limits

Frozen fresh installation on Node22.22.2/pnpm10.34.9 passes. Full merged-tree
PostgreSQL17 suite:252 pass,0 fail,0 skip,0 TODO (27 incoming SEO checks included).
Typed-fixture-only correction retains assertions and targeted tests pass.
Typegen/TypeScript, zero-warning ESLint and real production build pass. Build
warns about missing local runtime auth URL/secret; it exits successfully, and
this is not evidence that staging auth is configured. Static client chunk scan
finds no private SQL table/grader or Blob/mail token identifiers. Source server-only
boundaries and allowlisted serializers also reviewed; not a secret-value audit.

Concurrent initial Docker/browser/migration attempts failed from local disk
exhaustion, not treated as application failures or passes. Removed only own
scratch installations/build cache, preserved logs; migration reruns passed.
Final browser outcomes are recorded in the checkpoint addendum below. Injected
sessions/memory storage do not verify real deployed auth or Blob behavior.

## Exact migration manifest

UP order0001–0006; `.test.sql` is disposable verification only, never a release
migration. All source files unchanged. Shared/staging/production application and
ledger state: **UNKNOWN** pending authorized inspection.

| File | SHA256 |
| --- | --- |
| `0001_problem_authoring.down.sql` | `d00f9ee23522d8cc1865e72138900ad77207a46889b9850cd6925a1fc2741338` |
| `0001_problem_authoring.test.sql` | `f3afdc028dd129fdfa55df4867e867d8047c1b61cf2d649bb42effbef19d593d` |
| `0001_problem_authoring.up.sql` | `83ec2e53f95829aa6932a327dfd0362a3c197e190ddbcfb00a67d24a05c93d09` |
| `0002_authored_write_limit.down.sql` | `bb10ee3f4dc7af0a8e2d8d92e2be0bcd9dc900bc42e3ee85c6402565a1ec3677` |
| `0002_authored_write_limit.up.sql` | `c10cd7ecb9d6da65e0e95012a7dd199edac02e7a54b4fc8de86bb6c59bdc553b` |
| `0003_author_media.down.sql` | `5f0ba29f2207a674746518a6f85c2267b19aad787fe6808ac4c771936896e662` |
| `0003_author_media.up.sql` | `db4e91998388dafd964507571fc408f2f74fdd8b1af466469674911dc4b6db3a` |
| `0004_authored_attempts.down.sql` | `e6fd5f687a87c5dd2309a5e7142ee93c13c0162b5116aaaeb67b99816181e60a` |
| `0004_authored_attempts.up.sql` | `e52abd4fa47e2c8abdc609fdc79c32c2f78a284df90b859463ae217abed7e423` |
| `0005_authored_solution_access.down.sql` | `a9e86a117c1d256c6a51961730c73d90bad64a18c28272113fdfaa7fad3d99fb` |
| `0005_authored_solution_access.up.sql` | `65dfc1a1137cf963b7e579931fde6d8c315d0bfb8dbd6c465a8cc70d741335e4` |
| `0006_authored_discovery.down.sql` | `dd21eebf05319415dee31c51c9f0f3ba0e45f921595e7633750f5b0fe0b50709` |
| `0006_authored_discovery.up.sql` | `3ed763699a4e58512604fe6b738dc7e8440c1f2291501e1c29fa2da07dd8a37f` |

Rollback limits:0001 destructive;0003/0004/0005 refuse populated retained state;
0002 discards limiter state;0006 removes search dependencies only. Disable
exposure and prefer compatible forward recovery, never purge immutable records
or media to force DOWN. See [operator runbook](AUTHORING_RELEASE_RUNBOOK.md) and
[prioritized blockers](AUTHORING_RELEASE_BLOCKERS.md). No live user creation,
email, upload, shared migration, environment change, deployment or merge executed.

## Final checkpoint addendum

- Current merged-tree frozen install, typegen/TypeScript,0-warning lint and actual
  Next build PASS; targeted typed SEO fixtures15/15 PASS. Full252/252 has0 skips/
  TODO. No change to product code after these checks; handoff changes docs only.
- Fresh authoring/unified workflow and student/solution browser PASS, including
  desktop/mobile axe, math, privacy, retries/account/revision/assistance cases.
- Current library browser rerun remains **BLOCKED before execution**: repeated
  ENOSPC at `mkdtemp` even with tmpfs PostgreSQL. Its8A successful light/dark,
  keyboard/overflow/privacy evidence was reviewed, not counted as a new pass.
  Rerun it in a recovered disposable workspace before staging validation.
- Build/auth warnings are local missing runtime configuration, not staging
  configuration evidence. Remote target/isolation and ledger remain UNKNOWN.
- Fresh GitHub CI for final handoff SHA must be obtained/requested after push.
  No Vercel/Neon evidence arrived to resolve the mapping question during audit.
- Proposed consolidated draft body is in AUTHORING_CONSOLIDATED_PR.md. Draft PR
  creation is attempted after this handoff verification; if denied, manual URL:
  https://github.com/Physcratic/physcratic/compare/main...codex/physcratic-authoring-completion?expand=1

### Draft PR and final remote observation

Consolidated draft PR created successfully: https://github.com/Physcratic/physcratic/pull/27
(base main, head existing integration branch). No merge/auto-merge enabled.
GitHub status for the first handoff55b5f68 reports **two** pending Vercel project
contexts: `physcratic` (GHmSvhzBTsrnBPMfBDkTpkhkYmKY) and
`financial-dashboard` (EK2MxGgEfVcZYySx2D9irTxymmfi), both in
`neuterions-projects`. This strengthens the need to verify intended mapping and
isolation; it is not proof either is safe or Production/Preview scoped. These
statuses arose from existing repository automation; no deployment API invoked.
Final delivery includes this documentation-only observation after55b5f68; require
CI for the exact final delivery SHA, not55b5f68 or71ff793. PR workflow lookup was
empty at observation time (API filters PR-triggered runs); absence is not success.
