# Phase C shipping verification

This record supersedes the earlier review's temporary push/merge execution gate.
User explicitly authorized test-only shipping, PR/merge and safe Production GET
checks. It does not authorize provider changes, shared DB writes or migrations.

Reconciled onto fetched main c426aaf31f53328d2123e7b419920dd9a3d6fe23.
Original reviewed commit 871a87497bda420c0ea986fca1a9c7d135026e6a remains
recoverable. Only conflict was an appended readiness-log section: both records
were preserved. Main's recent UI/taxonomy/font changes are not part of this patch.
No application runtime file, SQL migration, package or lockfile is changed by it.

## Windows failures and Linux gate

The nine failures are not nine application regressions:
- Seven Bash script cases are rejected by the intentional native-process guard.
- One deployment-workflow regex assumes LF and sees CRLF on Windows.
- Smoke-workflow test setup similarly assumes LF and cannot parse its step.
These files are unchanged by Phase C. WSL has no installed distribution; Docker
and a local Linux toolchain are unavailable. Current-main Ubuntu CI already
passed (run 41457926735). Candidate Ubuntu CI is the authoritative final gate. The existing CI workflow
also runs the isolated guard/env/config checks through the credential-scrubbing
runner. No second test framework, deployment job or shared service is added.
No guard exemption, skipped meaningful test or production logic workaround added.

## Deployment effects

Verified financial-dashboard project prj_phm4794zl2QBICu5MMbLFxcHAfFq,
team team_iKeP4uT5oRKgSX6f5zHpV09T. Its current READY main deployment was
c426aaf and held physcratic.com before this release. Integration is a separate
linked project; its latest main deployment is CANCELED and protection is all.
No deployment configuration or environment values were read or changed.
Current Production build logs run vercel build then pnpm run build. Package build
is only next build; no prebuild/postbuild/prepare migration or seed hook. CI uses
synthetic build values and disposable PG18.6, not shared DB credentials. SQL in
its fixture tests initializes new service-container DBs only. Codex Preview
repository-dispatch smoke is explicitly excluded. Existing production smoke
script uses GET only. No Preview runtime endpoints will be invoked.
Import-time Better Auth schema validation reads schema metadata; the build does
not invoke runMigrations. Runtime auth/Blob/DB behavior is unchanged by this patch.

## Confirmed high-priority launch blockers

Latest main lib/auth.ts has Terms validation but no CAPTCHA plugin/server hook.
lib/security/csp.ts explicitly says signup CAPTCHA is not on main. Allowlisted
script origins are not server-side action/score/hostname/replay enforcement.
The installed Better Auth context defaults rateLimit storage to memory without
secondary storage. Main selects neither database storage nor secondaryStorage.
A local 429 or successful signup is not cross-instance rate-limit evidence.
Both gaps require a focused follow-up before public launch. They do not arise
from this test-only contribution and do not justify an auth rewrite here.

## 23-case closure

See coverage.md/json for case-by-case attribution. No original historical case
is promoted to live PASS for a different deployment.

- Existing PR27 documented acceptance overlaps B02/B03, C02 Terms/signup,
  C03 verification, C04 login/logout, C06 CRUD, C07 autosave, C09 media,
  C10 guest denial, C11 publication, C17 unpublish and B05 retention/logout.
  It used one verified actor and one retained revision, not the original full
  two-user/two-revision budget. Do not repeat its successful steps unnecessarily.
- Newly integrated offline proofs strengthen A01, C01 Terms rejection, C03
  provider failure/fallback, grading semantics/budgets relevant to C14/C15,
  transport/credential isolation and build/lint configuration. Main's existing
  PG tests already cover C06-C15/C17 owner, conflict, immutable history, attempts,
  solution permissions and media boundaries. No duplicate workflow was copied.
- Still specific validation: B01/B04 identity/privilege correlation for any new
  live target; C01/C02 CAPTCHA after implementation; C04 real cookie/session
  handling; C05 two-user live isolation if required; C07/C08 browser conflict and
  recovery; C09/C10 deployed cross-user private Blob; C16 cross-instance throttle
  after storage fix. Existing offline delete/cleanup tests cover C12/C13 without
  another destructive release cleanup. C14/C15 real legacy-route grading was not
  documented live and remains separate from authored-route success.
- B05 retained fixture counts belong to their own release runs. No remote fixture
  cleanup or repetition of all 23 cases is part of this shipping task.

## Final results

Pending exact candidate Linux CI and Production deployment confirmation.
