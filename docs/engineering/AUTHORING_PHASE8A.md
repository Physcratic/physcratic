# Phase 8A build and integration hardening

Checkpoint: 2026-10-31 (Asia/Makassar), on
`codex/physcratic-authoring-completion`. Ready to enter Phase 8B review, **not a
deployment authorization**. Stop after this phase's commit/push.

## Integration

Fetched main and the integration branch. Verified `c259602`, `0418b9a` and
`8293f26` remain ancestors. Main `c2139de0953714b9ea5c0b8578734bb3ab852da1`
(deployment-purpose empty commit) was merged non-destructively by
`5d1e20b4cfd2dafbc8666325ba9aa890bf84383c`. No conflicts or incoming file
changes; previous CI, Analytics, error/feedback work, readiness entries and Phase7
implementation are preserved. No rebase, reset, force-push or merge into main.

## Inherited blockers resolved

**Lint.** `lint` invoked an absent executable and there was no configuration.
Pinned ESLint9.39.5, eslint-config-next15.5.28 and FlatCompat3.3.5 restore the
existing Next/React/TypeScript recommended rules. `packageManager` pins
pnpm10.34.9. Initial lint found12 errors/19 warnings. Fixed test helper types,
unused runtime bindings, stale hook dependency captures and cleanup structure.
Serial counters still invalidate the latest requests; account/revision keys,
idempotency and private-view lifetimes remain intact. No unrelated formatting
sweep. Final lint reports **zero errors and warnings**.

Four individual raw-image exceptions explain direct authenticated no-store media
proxies or archival dimensions; the CommonJS Tailwind require has one documented
rule exception. No blanket rule disabling or unreported legacy lint debt. ESLint
ignores generated output/dependencies and local scratch tooling, not product
source. Browser tools remain external test-only infrastructure.

**Build/font.** Live `next/font/google` fetching caused the inherited Inter
failure. A pinned OFL-1.1 `@fontsource-variable/inter`5.3.0 Latin variable WOFF2 is
loaded through `next/font/local`, retaining Inter, weight100–900, swap and the
existing `--font-inter` variable. License is distributed at
`public/fonts/Inter-LICENSE.txt`. Arial fallback works even where the variable is
absent (including root error rendering). No remote-font fetch, network bypass,
build suppression or auth/database secret is needed to build.

**Corpus.** Diagnosis found17 exact seed/output mismatches:1 inapho-2006-t2,
2 inapho-2011-t2,11 inapho-2012-t3 and3 inapho-2014-t2. Commit8e5914a had changed
prose punctuation in editorial seeds without regenerating their outputs.
Whitespace normalization intentionally does not erase punctuation; weakening it
would break the exact editorial reproduction invariant. Formula protection,
source hashes and comparison logic were correct.

Restored only those four original seed blobs from8e5914a's parent. Each is
byte-identical to the corresponding pending PR#2 blob at
`837673dce7861a532d0f8ca4c7d78390a7eddefc`, so the repair preserves the parallel
translation change rather than overwriting it. Their blob IDs are respectively
`212ab382`, `80c5e55b`, `c95fe20e`, `759e2bf6`. No generated translation, original
problem, translation index/hash or formula was changed. All6 corpus tests pass,
including exact segment/structure/formula/source-hash checks. Removed the TODO
only after proving that invariant; retained the comparison and improved its
failure context. The defect is resolved, not merely marked TODO.

## Confirmed integration fixes and independent review

The genuinely independent read-only reviewer inspected Phase6C-B/7 permission,
revoke/reveal/media boundaries, assisted-attempt SQL/idempotency, public query
joins/serialization/parameterization/keysets and browser account/revision races.
It independently ran the solution/attempt/library PG and both browser suites.

One confirmed low-severity finding: legal whitespace-bearing difficulty labels
could not match the exact filter because input was trimmed while stored labels
were not. Preserve raw exact input in the API contract, browser request and
request identity. Existing indexed SQL remains unchanged. New PG and real-browser
regressions cover `" Intermediate "` separately from `"Intermediate"`.

The reviewer completed a follow-up:33/33 PG checks, no failures/skips/TODO, both
student/solution and library browser suites pass; no remaining confirmed findings
in its scope. It separately checked the hook fixes and the later title CSS
correction. No reviewer edited source. This closes the outstanding Phase7
independent review and Phase6C-B reviewer follow-up; it is not a claim of live
authentication/storage or a site-wide security audit.

An additional compiled-app smoke check exposed a long-title mobile reader
overflow missed by the isolated layout. Constrained the main/title flex minimum
width and enabled arbitrary word wrapping without clipping or changing heading
semantics. New browser regression opens the legal long physics title at375px;
root reran affected suites and the compiled production smoke. The reviewer
inspected this final CSS delta; its latest execution evidence is root's.

## Complete workflow evidence

The extended existing authoring browser harness now carries **one problem**
through editor creation, multipart numeric/expression/manual configuration,
private statement/solution media, autosave/recovery/preview/publication, library
discovery and reader navigation, verified-student submissions/feedback, immutable
history, explicit author approval/student reveal/private image, later assisted
attempts, revoke and unpublish. SQL confirms the original correct attempt remains
unassisted and later symbolic/manual attempts are assisted. Sessions are injected
into production factories; this does not test an actual sign-in or email flow.

Existing student/solution cases still verify uncertain committed requests and
original retries, >50-row history, account switching/IDOR, stale revisions,
publication/reveal/submission ordering, private key/hint/media isolation,
expiry/regrant/revocation, all outcomes and large math. Existing archive/practice
unit and real library-tab/browser checks remain intact.

Final checks:

| Check | Result |
| --- | --- |
| Fresh manifest/lock installation in empty work directory, Node22.22.2/pnpm10.34.9 | Frozen install passes |
| Next typegen + TypeScript | Pass |
| ESLint, `--max-warnings=0` | Pass,0 errors/0 warnings |
| Full suite with disposable PostgreSQL17 on Node22 | **225 pass,0 fail,0 skip,0 TODO** |
| Focused solution/attempt/library PG |33/33 pass, also independently repeated |
| Corpus assertions |6/6 pass,0 TODO |
| Unified authoring/workflow browser | Pass, includes editor desktop/mobile axe |
| Student/solution browser | Pass, root and independent reviewer |
| Library browser | Pass, root and independent reviewer; final long-title regression root pass |
| Desktop/mobile accessibility and math overflow | Pass in harnesses; library light/dark at1440/375px |
| Real Next production build on Node22 | Pass, local font |
| Compiled production server + disposable PG | Guest library/reader, local WOFF2, no Google font requests,1440/375px light/dark layout pass |
| Diff/whitespace | Pass |

The compiled smoke uses a disposable local auth schema, local-only base URL and
throwaway secret. Initial missing runtime auth configuration/schema was an
environment setup issue, corrected only in the disposable harness. No production
auth configuration was changed. Production browser smoke verifies guest routes,
not real registration/verification/sign-in or private Blob operations.

## CI and reproducibility

CI now runs on this integration branch as well as main/PRs, with read-only
repository permissions. Uses packageManager's exact pnpm version, Node22,
frozen install, typegen/TypeScript, zero-warning ESLint, the **full** test suite
against a disposable PostgreSQL17 service, then the real build. No DB suite is
excluded or silently counted as passed. Service URL is a fixed localhost test
credential, never a production secret. No deploy or migration action is added;
tests themselves explicitly create isolated disposable schemas.

CI does not install Playwright/axe/Chromium or run browser harnesses. Those remain
explicit infrastructure-dependent local gates; their successful local runs are
not a claim that browsers run in GitHub CI. Remote execution of the updated
workflow is separate from the locally verified equivalent commands.

With Node22 and pnpm10.34.9:

```sh
pnpm install --frozen-lockfile
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm lint --max-warnings=0
scripts/test-problem-authoring.sh pnpm test
AUTHORING_BROWSER_TOOLS=/path/to/tooling scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/problem-authoring.browser.mjs
AUTHORING_BROWSER_TOOLS=/path/to/tooling scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/authored-student.browser.mjs
AUTHORING_BROWSER_TOOLS=/path/to/tooling scripts/test-problem-authoring.sh node_modules/.bin/tsx --conditions=react-server tests/authored-library.browser.mjs
pnpm build
git diff --check
```

Tooling directory must provide Playwright and @axe-core/playwright; Chromium is
selected with CHROMIUM_PATH (default `/usr/bin/chromium`). Evidence logs are
local `work/8a/` and independent `work/8a-review/`, not tracked release artifacts.
See [remaining release gates](AUTHORING_RELEASE_BLOCKERS.md). No Phase8B audit,
PR, deployment or shared/production migration was performed.
