# IPhO 2026 final local QA

10 November 2026, [PR #139](https://github.com/Physcratic/physcratic/pull/139).

The owner authorizes local CI replacement because Actions usage is exhausted, followed by a normal exact-head guarded merge only if every gate passes. Missing remote checks are not passing checks and protections must not be bypassed.

## Tested tree and environment

- Starting head `1778fd3d4db6a0d3522bcef0c3563292b65467ea` matched the request. Its original content tree was `a8bd9ce8cdf7fce05a9b9a5edaaadd7b74f75f9d`, with main `5a82bb0e5dfb0f3496c89e1763b71ea3cc744658` already included.
- Main advanced during verification through #134, #136 and #137 to `b1db1777db683d87ea121b9fbd16686f7750a2f5`. Reconciliation is conflict-free. All upstream application, test and contract files are preserved exactly. The PR diff remains the original import scope plus this final QA documentation.
- Completed CI checks below use the reconciled tree `e379042dcdfbbb1db652b7744df340d6ef260cec`. Only four engineering documents change afterward, so application, test, content and configuration bytes remain identical. The final head/tree, final browser results and merge outcome are recorded on the PR before the merge decision.
- Fresh detached worktree `/workspace/physcratic-139-final-qa`, Node 22.23.1, locked pnpm 10.34.9, Linux and two-CPU affinity. No dotenv files, Vercel link or inherited production credentials.
- The production build uses the existing `scripts/csp/support.mjs` child environment and loopback-only network guard, synthetic auth and an unavailable loopback database. `.next` stays in the normal worktree-local location.
- PostgreSQL 18.6 uses the cached `postgres:18.6-alpine` image in a dedicated disposable container with temporary storage and a loopback-only port. The version assertion is enabled. Database credentials are scoped to the database and release jobs, matching workflow isolation.
- Browser tools are Playwright 1.64.1, Chromium 154 and axe 4.14.0 from the existing external QA directory. No repository dependency is added.

## Completed CI checks

Commands follow `.github/workflows/ci.yml`. `corepack pnpm` selects the locked package manager.

| Check | Command | Result |
| --- | --- | --- |
| Frozen install | `pnpm install --frozen-lockfile` | Pass |
| Offline guards | `python3 -B scripts/phase-c-offline/run.py safety` | Pass |
| Type generation and typecheck | `pnpm exec next typegen` then `pnpm exec tsc --noEmit` | Pass |
| ESLint | `pnpm lint --max-warnings=0` | Pass, zero warnings |
| Server | `pnpm run test:server` | 830 pass, 27 database skips, one inherited TODO, zero failures |
| Components | `pnpm test:ui` | 156 pass, no skips or failures |
| Production build | `pnpm build` through the existing guarded child environment | Pass |
| Database | `pnpm exec tsx --conditions=react-server --test $files`, with the workflow's complete `AUTHORING_TEST_DATABASE_URL` file selection | 193 pass, no skips or failures |
| Release integrity | `sha256sum -c PACKAGE_SHA256SUMS` in `scripts/authoring-release` | Pass |
| Release transport | `node --test scripts/authoring-release/release.test.mjs` | 17 pass, no skips or failures |
| Mail and media guards | `pnpm exec tsx --conditions=react-server --test scripts/authoring-release/mail-audit.test.ts lib/author-media-storage.test.ts` | 41 pass, no skips or failures |
| Operator integrity | `sha256sum -c PACKAGE_SHA256SUMS` in `scripts/authoring-release-production` | Pass |
| Operator rejection guards | `node --test scripts/authoring-release-production/core.test.mjs` | 5 pass, no skips or failures |
| Focused native/catalog/difficulty coverage | Seven focused native, catalog, corpus and rating files through Node's test runner | 42 pass, no skips or failures |

The 27 server skips require the database environment and execute in the separate complete PostgreSQL run. The inherited TODO is `protected editorial drafts cover every source segment and preserve equations and non-Russian nodes verbatim`, marked as inherited corpus punctuation drift. It remains a TODO, not a passing assertion. No test or safeguard was weakened.

## Corrected local setup and earlier evidence

The first guest sweep was interrupted when main advanced. It is incomplete and is not counted as passing. Earlier-tree results are retained under `/tmp/qa139-initial` and the worktree's `work/*-initial` directories.

An intermediate runner incorrectly supplied the disposable database URL to the server job, then reused that database for the separate database job. The existing authoring fixture deliberately leaves its public `user` table in place because CI disposes of the service afterward. Its second invocation failed at `lib/problem-authoring-api.test.ts:37` with `relation "user" already exists`. That run had 183 passes and one failure. This was a local job-isolation error, not a PR defect. It is retained under `/tmp/qa139-reconciliation-134-136`. The runner now scopes database credentials correctly and the container was recreated before the final 193-pass database run. No application or assertion change was made.

Final command records and logs are `/tmp/qa139-results.jsonl` and `/tmp/qa139-*.log`. They contain synthetic local configuration only.

## Browser and merge gates

The existing `tests/ipho-2026-native.browser.mjs` and `tests/ipho-2026-t3.browser.mjs` run against the final guarded production build. They check all three imports, both tabs, equations, diagrams, original PDFs, keyboard equation scrolling, overflow and serious/critical axe findings at mobile/desktop widths in both themes. Final counts and outcomes are recorded on the PR.

After this documentation checkpoint, run `SWEEP=1 node tests/solve-contrast.browser.mjs` once for guests and once with a synthetic verified session against the same production build and disposable database. The existing sweep uses narrowly scoped Contests fixtures. Final counts and any failures are recorded on the PR before a merge decision. Earlier browser evidence does not substitute for these final sweeps.

GitHub's main-branch response reports `protected: false`, protection disabled and no required status checks. The direct administration endpoint is inaccessible to the GitHub App. Rulesets are unavailable for this repository's plan. Recheck branch metadata and head/main immediately before any normal merge. Remote CI and browser jobs failed before execution, with empty steps and no runner, under the reported usage blocker. They are not passing checks.

Read-only Vercel metadata shows the existing Git integration already creates production-target deployments from main. This PR does not change that integration, build configuration or deployment automation. The owner authorizes a normal merge and forbids manual deployment. No manual deployment, promotion, retry, settings or billing operation is performed. The existing Git integration consequence is distinct from a manually initiated deployment and is not evidence of application verification.

## Preserved scope and remaining review

The accepted source-fidelity and difficulty reviews are unchanged. Counts remain 103 imports, including 43 IPhO, 35 APhO and 25 EuPhO, and 121 editorial estimates. T1 stays 1950, T2 2050 and T3 1850. All 118 historical estimates and source-review ledger entries are unchanged. Every source flag remains in the existing import documents. No new physics review, source correction, grading, player rating, authentication, schema, dependency or feature-flag change is made.

Merged #133, #134, #136 and #137 retain their contracts and operator prerequisites. Practice persistence remains default-OFF. No installation is needed for the static imports. Physical devices, real providers and production data are outside this local verification.

Stop after merge verification or a blocked report. No APhO, EuPhO or global rating-band batch is authorized here.
