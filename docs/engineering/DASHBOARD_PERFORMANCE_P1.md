# Dashboard JavaScript, P1

Date: 3 November 2026. Integrated baseline: main `0f77f22b21cbe43f09b7f128b7d8b59b5a072025`.

The initial `5689bb1` baseline reproduced X1 at 18 manifest chunks, 2,388,217
raw bytes and 662,626 gzip bytes. Main then advanced through Community Batch 2A.
The final comparison was rebuilt against that new main without changing its
community implementation, configuration or migrations.

## Change and dependency evidence

`PlainMathCheck` previously imported `runPlainMath` statically. Closed native
`details` elements still render their children, so hiding the calculator did not
defer its dependencies. The dashboard eagerly imports the problem library, which
imports both the imported reader and the mounted guided collection. Both paths
reach the calculator and then MathJS:

```text
Content -> ProblemLibrary -> OlympiadCatalog -> ImportedProblemReader
  -> SolutionSubmissionForm -> PlainMathCheck -> plain-math -> mathjs
Content -> ProblemLibrary -> CorpusCollection -> CorpusProblemReader
  -> MathWorkingEditor -> PlainMathCheck -> plain-math -> mathjs
Content -> Overview -> RatingCard -> recharts
Content -> Overview -> DashboardHighlights -> MathFormula -> katex
```

Local client Webpack stats on `5689bb1` confirmed these dependencies. In that attribution snapshot,
`7753-a8d25c4d00000ab7.js` combined MathJS and UI dependencies in 716,864 raw
bytes, 203,724 gzip bytes. Recharts' chunk was 390,606 / 106,605 bytes. KaTeX's
chunk was 264,282 / 76,155 bytes. These are whole emitted chunks, not exclusive
compressed attribution to each package.

The retained change defers the existing `plain-math` module. Opening the
calculator starts loading it while the user enters an equation. The form is
already rendered, including SSR. Calculate waits if necessary, prevents duplicate
clicks, ignores results for edited input and allows retry after a failed download.
Calculator state remains local to each instance. Instances share the loaded code.
No maths implementation, grading code, public API or dependency version changed.

## Measurement method

- Two worktrees from the same main, Node 22.23.4, pnpm 10.34.9, Next 15.5.28.
- Production builds with the workflow's synthetic build-only auth values, without
  live database or service credentials. The final build uses unchanged Next config.
  A temporary, observation-only client compiler hook supplied the attribution stats.
- Python 3.12.14, zlib 1.3.2. Compress each emitted file at gzip level 9, `mtime=0`,
  then sum unique files. This reproduces X1's method, not HTTP transfer latency.
- Manifest union: `/layout`, `/dashboard/layout`, `/dashboard/page`. Public reader
  totals use that reader's layout/page entries instead.
- Chromium 154.0.8037.57, a new context for each route, local production servers,
  1440 x 1000 viewport, reduced motion and identical anonymous API fixtures.
  Collect successful unique JavaScript responses through network idle. Browser
  totals include automatic Learn prefetch and error-boundary assets. Imported
  reader totals also include the existing PDF worker `.mjs` resource.
- Each interaction reports only files absent from that context's previous set.
  Cumulative totals are deduplicated. Do not sum cumulative rows together.

Reproduce the emitted-file and browser totals with external Playwright tooling:

```sh
# Start each production build with its matching local BETTER_AUTH_URL.
CHROMIUM_PATH=/usr/bin/chromium node scripts/measure-dashboard-browser.cjs \
  http://127.0.0.1:3000 resources.json
python3 scripts/measure-dashboard-js.py .next resources.json > measurements.json
```

Set `AUTHORING_BROWSER_TOOLS` to an external tooling directory if Playwright is
not otherwise resolvable. No browser dependency is added to the app. The script
requires a loopback origin and mocks authenticated APIs without accessing data.

## Rejected view-splitting experiment on 5689bb1

An SSR-enabled `next/dynamic` experiment split all five query-selected dashboard
views. Browser gzip totals fell to 450,293 bytes for overview and 382,656 bytes
for Problems. The displayed view's dynamic chunks were still loaded initially,
so the 230 kB Next first-load figure understated actual initial work.

In five local cold-context samples, median first navigation into Problems rose
from 273 ms to 890 ms. It also introduced a new view fallback. This layer was
discarded. `Content`, routing, view imports and collection mounting remain
unchanged. In particular, guided exercises retain unsaved edits across tab changes.

Throttled browser samples were unstable in this environment and are excluded.
Loopback timings are diagnostic evidence about this trade-off, not Production
latency estimates or a claim about real-user Core Web Vitals.


## Final build and browser results on current main

All byte values below are bytes, not kB. Arrow notation is baseline to P1.

| Manifest | Raw | Gzip-9 | Initial chunks | Next first-load JS |
| --- | ---: | ---: | ---: | ---: |
| Dashboard and Problems | 2,386,548 to 1,732,868 | 662,875 to 481,240 | 19 to 19 | 662 to 479 kB |
| Public problem page | 1,938,587 to 1,284,907 | 541,735 to 360,101 | 19 to 19 | 540 to 357 kB |

| Cold browser context | Raw | Gzip-9 | Unique JS files |
| --- | ---: | ---: | ---: |
| overview | 2,425,312 to 1,771,632 | 677,498 to 495,864 | 24 to 24 |
| problems | 2,425,312 to 1,771,632 | 677,498 to 495,864 | 24 to 24 |
| practice | 1,976,967 to 1,323,287 | 556,099 to 374,466 | 23 to 23 |
| arena | 1,976,967 to 1,323,287 | 556,099 to 374,466 | 23 to 23 |
| imported | 3,819,598 to 3,165,909 | 1,115,969 to 934,331 | 28 to 28 |

### Incremental code after interaction

| Action | Additional raw | Additional gzip-9 | Additional files |
| --- | ---: | ---: | ---: |
| overview: enter Problems | 0 | 0 | 0 |
| problems: open Arena reader | 18,416 | 6,000 | 1 |
| imported: open Your solution | 0 | 0 | 0 |
| imported: open calculator | 653,776 | 181,931 | 2 |
| imported: calculate | 0 | 0 | 0 |

After the calculator is loaded, the imported-reader context totals 1,116,262 gzip bytes versus 1,115,969 before. The engine is deferred, not removed or copied. Reopening and subsequent calculations reuse it.

The dashboard manifest saves 181,635 gzip bytes (27.4%). This is meaningful initial transfer and parse work avoided on routes that do not need a calculator. First use still needs the deferred download and module initialisation. Opening starts that work while the existing form stays usable. Immediate pasted input may show Calculating until it finishes. No view splitting or view-loading fallback ships. No real-user latency improvement is claimed.

## Remaining opportunities

Recharts still loads on Problems through the eager overview dependency. A later route-boundary design should be tested against first-navigation latency, including intent preloading, rather than judged from the Next size label alone. KaTeX remains necessary for displayed maths. Imported PDF views still load the existing 1,183,640-byte PDF worker (362,250 gzip bytes). Those costs are separate from this calculator change.


## Verification

Frozen-lockfile installs and both production builds passed on the integrated
base. Next route generation, TypeScript, zero-warning ESLint and offline
isolation guards passed. The server suite passed 571 tests, with 13 existing
database skips and one inherited TODO. All 29 component tests and 114
disposable PostgreSQL tests passed. Release package, mail/storage and production
operator guards passed with 17, 41 and 5 tests respectively.

The new browser suite passed 85 checks at desktop/mobile widths in both themes.
Coverage includes selected-view SSR, skip-link keyboard access, all dashboard
views, topic/method search, archive ordering and competition search, retained
unsaved guided edits, a signed-in rating chart and range controls, Arena solution
tabs, a real local non-persistent numeric answer check and anonymous submission
controls. It also holds calculator chunks in flight while editing, checks
numerical results and invalid domains, tests failed-download retry and checks
that reopening needs no new code.

Run the browser regressions with a local production server and external tooling:

```sh
BROWSER_TEST_ORIGIN=http://127.0.0.1:3000 CHROMIUM_PATH=/usr/bin/chromium \
  node tests/dashboard-loading.browser.mjs
BROWSER_TEST_ORIGIN=http://127.0.0.1:3000 CHROMIUM_PATH=/usr/bin/chromium \
  node tests/problem-library.browser.mjs
```

The calculator is the only runtime file changed. Dashboard view imports, visual
styles, server/client boundaries, server grading, canonical taxonomy, community
features and all migration files match current main. No live database operations,
feature-flag changes or Production configuration changes were performed.

The existing problem-library browser suite passed all 36 keyboard, URL/history
and navigation checks. Desktop/mobile and light/dark screenshots were compared
with matching viewport, theme, API fixtures and focus state.
