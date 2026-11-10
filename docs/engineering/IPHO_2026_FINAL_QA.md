# IPhO 2026 final local QA

10 November 2026, [PR #139](https://github.com/Physcratic/physcratic/pull/139).

The owner explicitly authorizes local CI replacement because Actions usage is exhausted, followed by a normal exact-head guarded merge only if every gate passes. Missing remote checks are not passing checks and protections must not be bypassed.

## Tested tree and environment

- Starting head `1778fd3d4db6a0d3522bcef0c3563292b65467ea`, content tree `a8bd9ce8cdf7fce05a9b9a5edaaadd7b74f75f9d`.
- Main `5a82bb0e5dfb0f3496c89e1763b71ea3cc744658` is already an ancestor, so the proposed merge preserves all upstream changes. The final head/tree, browser results and merge outcome are recorded on the PR after verification.
- Fresh detached worktree `/workspace/physcratic-139-final-qa`, Node 22.23.1, locked pnpm 10.34.9, Linux, two-CPU affinity to match the CI runner size. No dotenv files, Vercel link or inherited production credentials.
- Guarded production build uses the existing `scripts/csp/support.mjs` child environment and loopback-only network guard, synthetic auth and unavailable loopback database. `.next` remains local to this worktree.
- PostgreSQL 18.6 uses the cached `postgres:18.6-alpine` image in a dedicated disposable container with temporary storage and a dynamically assigned loopback port. Only synthetic data is used. The version assertion is enabled.
- Browser tools are Playwright 1.64.1, Chromium 154 and axe 4.14.0 from the existing external QA tools directory. They add no repository dependency.

## Completed CI checks

The commands follow `.github/workflows/ci.yml`. `corepack pnpm` selects the locked package manager.

| Check | Command | Result |
| --- | --- | --- |
| Frozen install | `pnpm install --frozen-lockfile` | Pass |
| Offline guards | `python3 -B scripts/phase-c-offline/run.py safety` | Pass |
| Type generation and typecheck | `pnpm exec next typegen` then `pnpm exec tsc --noEmit` | Pass |
| ESLint | `pnpm lint --max-warnings=0` | Pass, zero warnings |
| Server | `pnpm run test:server` | 812 pass, 25 database skips, one inherited TODO, zero failures |
| Components | `pnpm test:ui` | 145 pass, no skips or failures |
| Production build | `pnpm build` through the existing guarded child environment | Pass |
| Database | `pnpm exec tsx --conditions=react-server --test $files`, with the workflow's complete `AUTHORING_TEST_DATABASE_URL` file selection | 183 pass, no skips or failures |
| Release integrity | `sha256sum -c PACKAGE_SHA256SUMS` in `scripts/authoring-release` | Pass |
| Release transport | `node --test scripts/authoring-release/release.test.mjs` | 17 pass, no skips or failures |
| Mail and media guards | `pnpm exec tsx --conditions=react-server --test scripts/authoring-release/mail-audit.test.ts lib/author-media-storage.test.ts` | 41 pass, no skips or failures |
| Operator integrity | `sha256sum -c PACKAGE_SHA256SUMS` in `scripts/authoring-release-production` | Pass |
| Operator rejection guards | `node --test scripts/authoring-release-production/core.test.mjs` | 5 pass, no skips or failures |
| Focused native/catalog/difficulty coverage | Seven focused native, catalog, corpus and rating files through Node's test runner | 42 pass, no skips or failures |

The 25 server skips require the database environment and execute in the separate complete PostgreSQL run. The inherited TODO is `protected editorial drafts cover every source segment and preserve equations and non-Russian nodes verbatim`, marked as inherited corpus punctuation drift. It remains a TODO, not a passing assertion. No test or safeguard was weakened.

## Final browser and merge gates

The existing `tests/ipho-2026-native.browser.mjs` and `tests/ipho-2026-t3.browser.mjs` check all three imports, both tabs, equations, diagrams, original PDFs, keyboard equation scrolling, overflow and serious/critical axe findings at mobile/desktop widths in both themes. The first script completed 16 combinations without failure on the starting content tree. The T3 result is recorded on the PR.

After this documentation-only checkpoint, run `SWEEP=1 node tests/solve-contrast.browser.mjs` once for guests and once with a synthetic verified session against the same guarded production build and disposable database. The existing sweep uses narrowly scoped Contests fixtures. Final counts and any failures are recorded on the PR before a merge decision. Browser evidence from earlier batches is not substituted for these final sweeps. No application, test, content or configuration file changes in this checkpoint, so the completed CI/build evidence remains applicable.

GitHub's main-branch response reports `protected: false`, protection disabled and no required status checks. The direct administration endpoint is inaccessible to the GitHub App. Rulesets are unavailable for this repository's plan. Recheck branch metadata and head/main immediately before any normal merge. Remote CI and browser jobs for the starting head failed before execution, with empty steps and no runner. They are not reported as passing.

Read-only Vercel metadata shows the existing Git integration already creates production-target deployments from main. This PR does not change that integration, build configuration or deployment automation. The owner authorizes a normal merge and forbids manual deployment. No manual deployment, promotion, retry, settings or billing operation is performed. A normal Git integration consequence is distinct from a manually initiated deployment and is not evidence of application verification.

## Preserved scope and remaining review

The accepted source-fidelity and difficulty reviews are unchanged. Counts remain 103 imports, including 43 IPhO, 35 APhO and 25 EuPhO, and 121 editorial estimates. T1 stays 1950, T2 2050 and T3 1850. All source flags remain in the existing import ledgers. No new physics review, source correction, grading, player rating, authentication, schema, dependency or feature-flag change is made.

Open #134, #136 and #137 overlap this import only in engineering documents relative to current main. #133 is already included and its default-OFF practice contract and operator prerequisites remain intact. No operator installation is needed for these static imports. Historical source ledgers remain unchanged. Physical devices, real providers and production data are outside this local verification.

Stop after merge verification or a blocked report. No APhO, EuPhO or global rating-band batch is authorized here.
