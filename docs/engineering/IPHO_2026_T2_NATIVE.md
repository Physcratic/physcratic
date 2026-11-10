# IPhO 2026 T2 native import

Batch 2, 10 November 2026. Extends [draft PR #139](https://github.com/Physcratic/physcratic/pull/139) from `3df48fb78b7b635c5cb70d0ba3fd093ec4ea5c56`. Reconciles main `942be99148870b834767fbc212e649127abb3b93`, including merged #132. Only T2 is added in this batch. T1 and its [six source flags and QA record](IPHO_2026_NATIVE.md) are retained. T3 remains pending. Do not merge or deploy.

## Sources

The owner-supplied English PDFs are retained byte for byte. The [Olimpicos archive](https://olimpicos.net/ipho/) links the matching [Q2 statement](https://olimpicos.net/files/ipho/IPhO_2026_Q2.pdf) and [S2 solution](https://olimpicos.net/files/ipho/IPhO_2026_S2.pdf). The archive and linked PDF previews were checked for the title, T2 identifier, year, page counts and printed content. The solution header identifies Bucaramanga, Colombia. The existing verified Colombia host is reused. No byte identity with a separately downloaded remote copy is claimed.

| File | Coverage | Bytes | SHA-256 |
| --- | --- | --- | --- |
| IPhO_2026_Q2.pdf | All four pages, printed 7 to 10 | 1959589 | `d105a67ea95650c035c3c1c2f7649b27fc594843e8037485927af1711225ce55` |
| IPhO_2026_S2.pdf | All five pages, printed 5 to 9 | 283252 | `2256104b843dcaa7031ab3d14a9f32eea6f6be6714a3f284ee028c752b73493f` |

Title: Cooking with sunlight? One full problem identity, `ipho-2026-t2`. Eight scored subquestions, A1, B1, B2, B3, C1, C2, C3 and C4, total 10 points. All three section totals and individual allocations are retained. No constants table or separate marking explanation appears in these two PDFs. The fallback instruction after B1 and both parametrized alternatives are included.

## Source comparison and equation traceability

All nine pages were visually inspected against the native text, equations and crops. Repeated branding, running headers, page numbers and footers remain in the original PDFs. The two-column solution is linearised in reading order. Line-wrap hyphens, whitespace and quotation glyphs are normalised. The introductory semicolon is represented by a comma to follow repository copy rules. Official spelling, undefined notation and erroneous algebra remain visible.

The [machine-readable source map](ipho-2026-t2-source-map.json) maps every top-level node and every inline or displayed mathematical expression to its original PDF page. Ranges are inclusive and one based. A multiline aligned derivation counts as one displayed expression, with every original line retained. A display range whose end precedes its start contains no displayed expression. The statement uses inline maths throughout, as in the source. Tests verify contiguous full coverage and strict KaTeX parsing. Diagram labels remain in the mapped image nodes.

| Source page | Native coverage | Maths expression range | Display range |
| --- | --- | --- | --- |
| Q2 page 1, printed 7 | Title, caustic/cusp introduction, applications, mirror radius, distant parallel rays and plane symmetry. Figures 2a and 2b | 1 to 1 | None |
| Q2 page 2, printed 8 | Figures 2c, 2d and 2e. Full multiple-reflection setup, coordinate interval and definition of xN. A1, 1.5 points | 2 to 14 | None |
| Q2 page 3, printed 9 | Figure 2f. Absorbing cylinder, parallel axes, R/2 location, uniform sunlight, one-reflection assumption and maximum incidence angle. B1, 2.0, fallback instruction, B2, 1.5, and B3, 0.5 | 15 to 33 | None |
| Q2 page 4, printed 10 | Figure 2g. C1, 0.5, and hint, C2, 2.0, first-order instruction, C3, 1.0, and C4, 1.0, cusp power law | 34 to 67 | None |
| S2 page 1, printed 5 | A1 one- and two-reflection constructions, all triangle angles, x1 and x2, and introduction to n=3. Two diagrams | 1 to 26 | 1 to 9 |
| S2 page 2, printed 6 | Three-reflection diagram, heptagon construction, x3, full n-reflection polygon generalisation and final sequence. B1 tangent-ray diagram, all five point definitions and OD geometry | 27 to 53 | 10 to 19 |
| S2 page 3, printed 7 | Complete B1 radius derivation, alpha and beta. B2 powers, ratio and full alpha/beta alternative. B3 trigonometric values, 12 cm answer and alternative radical. C/C1 headings and ray diagram | 54 to 79 | 20 to 36 |
| S2 page 4, printed 8 | C1 slope/intercept and equivalent forms. C2 envelope diagram, complete cotangent/intercept expansions and equivalent forms. C3 both line equations, intersection formula and coordinates | 80 to 101 | 37 to 49 |
| S2 page 5, printed 9 | Repeated caustic coordinates, all three equivalent Y expressions, both small-angle approximations, two ordered-pair expansions, elimination of theta, power-law comparison, v/u/p/q and cusp-tip interpretation | 102 to 119 | 50 to 63 |

Native totals: statement 26 top-level nodes, 67 inline expressions and seven figures. Solution 138 top-level nodes, 63 displayed and 56 inline expressions, six figures. No solution method or numerical result is omitted.

Thirteen precise 288 dpi source crops retain geometry, axes, angle marks, labels, arrow directions and dimensions. The seven statement figures include the original coffee-cup photograph. The six solution diagrams include all one-, two- and three-reflection cases, the tangent cooker ray, slope geometry and caustic envelope. Native statement captions retain Fig. 2a to Fig. 2g. Uncaptioned solution diagrams remain uncaptioned. Descriptive alt text is added. No whole-page screenshot substitutes for native content. Both original local PDF links remain accessible.

## Official-source issues retained for review

These are source issues, not corrections to the imported text.

| Location | Printed expression or notation | Issue and consequence |
| --- | --- | --- |
| Q2 page 4, printed 10, C1 hint | `bA = R K3 / cos(K4 theta_i)` | theta_i is not defined. The question otherwise uses theta, and the solution uses R/(2 cos theta). This is a notation ambiguity in the hint. The subscript remains |
| S2 page 2, printed 6, A1 generalisation | theta_N in formulas using n, then x_n in a result using N | Lowercase n and uppercase N both denote the reflection count without an explicit identification. The intended sequence is clear from x1, x2 and x3. Mixed notation remains |
| S2 page 4, printed 8, C2 last line of the long mB expansion | `cot(2 theta) - 2 Delta theta (1 - tan²(2 Delta theta)) + ...` | This does not follow from the preceding product. Its first-order coefficient would be -2 instead of -2 csc²(2 theta). The next boxed formula gives the correct expansion. The erroneous line and the correct following result are both retained. Using the erroneous line alone would corrupt the caustic coordinates |

The C3 coordinates are a limiting intersection as Delta theta tends to zero, consistent with the first-order construction. The small-angle C4 relation is asymptotic. Neither is presented as an exact result for finite ray separation or arbitrary angle. The independent-review-pending status and self-review-only grading contract remain.

The six T1 flags remain in the unchanged Batch 1 document. The eleven historical physics flags and 118-problem review ledger remain unchanged. These three T2 flags do not require inflating a solving estimate to include repairing the official text.

## Editorial difficulty

Current estimate: 2050, Advanced (IPhO level). The import estimate of 2300 is superseded by the [independent 2026 calibration review](IPHO_2026_DIFFICULTY_REVIEW.md). Earlier QA and import records retain their original scope.

A's limiting escaping trajectory and arbitrary reflection count require an independent geometric construction. B requires a tangent ray and an admitted-width power model, but its radius functional form and fallback are supplied. C supplies the slope/intercept functional forms, the neighbouring-ray prescription, the first-order instruction, the small-angle limit and the target cusp power law. Much of C is then differentiation, line intersection and elimination of a parameter. The official solution's lengthy trigonometric alternatives are not independently required methods.

The full problem exceeds the 1850 rainbow comparison through the additional limiting-count and cooker constructions. It remains below EuPhO 2025 T1 at 2200, whose ray-area and shadow mapping must be invented, and well below the 2500 GRIN problem's unsupplied invariant and consistent cubic expansions. Its overall burden is comparable to the supplied-model 2050 neighbours. The linked review records the detailed guidance discount and comparisons. All source flags remain unchanged and do not inflate the estimate. No measured solving statistics are claimed.

## Integration and reconciliation

Counts become 102 imports, 42 IPhO, 35 APhO and 25 EuPhO, and 120 editorial estimates. There are 45 verified host editions, unchanged because T1 already introduced IPhO 2026. The legacy collection identifier remains unchanged. Only T2 is added to the existing selection, English title/source metadata, index, manifest, collection and estimate map. All 101 existing collection objects, import records, source objects and previous non-collection asset hashes are retained. The collection hash changes because its new T2 object is included.

No renderer or other application component is edited in Batch 2. Existing structured HTML, KaTeX, local image and reference PDF contracts are reused. No grading, real student ratings, schema, authentication, dependency, feature-gate, original-source or historical-difficulty change is introduced. The only application-source differences pulled from main are #132's authored-expression changes, preserved exactly. Main's relevant tests are also retained exactly. Shared handoff and readiness conflicts preserve both branches' entries, with this current batch status above the historical entries.

## Verification

Implementation commit `df31d1f02f5b940ba15f99e6d55b0e2afcfe782b`, exact tested tree `5ea4dfa6cafd4e51cc8ed7c926e2570e89a12cda`. Its parents are the expected T1 head and current main. The final follow-up changes only this review, roadmap, handoff and readiness documentation. The PR records that final head separately. GitHub Actions usage remains unavailable. Remote checks are not represented as passing. No merge, deployment, live service or production database operation is authorised or performed. T3 import and final combined IPhO integration QA remain the next batch.


Environment: isolated credential-free worktree `/workspace/physcratic-ipho-2026-t2`, Node 22.23.1, pnpm 10.34.9, Chromium 154, external Playwright 1.64.1 and axe 4.14.0. Inherited service credentials are removed. The existing guarded build supplies synthetic local configuration and an unreachable loopback database. `.next` is a normal directory inside this worktree, not relocated or symlinked.

| Check | Result |
| --- | --- |
| Frozen lockfile install | Pass |
| Offline safety | Pass, two inherited platform skips |
| Next type generation, TypeScript | Pass |
| ESLint with zero warnings | Pass |
| Focused source/schema/catalog/rating/host/SEO/card/native rendering | 82 pass |
| Full server file set, concurrency limited to two | 804 pass, 24 database-dependent skips, one inherited TODO, zero failures |
| Full component suite | 143 pass, zero failures |
| Guarded production build | Pass |
| T1 and T2 native production browser | 16 document/width/theme combinations pass, 375/1440, light/dark |
| Main #132 expression browser | 50 pass, desktop/touch and light/dark |
| Prior-content and reconciliation integrity | Pass |

The native browser checks initial server-rendered questions and maths, all scored questions in both tabs, retained solution alternatives, all loaded/labelled figures, original PDF HTTP 200/signatures and keyboard focus, zero KaTeX errors, actual arrow-key scrolling of overflowing equations, no page overflow and zero serious/critical axe findings. T2's statement has no displayed equations, so scrolling is exercised on its solution. Source crops and mobile/desktop screenshots in both themes were visually inspected. Logs are `/tmp/t2-*.log` and `build/csp/production-build.log`. Screenshots and server logs are in `work/ipho-2026-browser` and are not committed.

The first focused run found stale IPhO/sitemap counts and an existing card fixture's assumption that the first catalog item was T1. Counts now include T2, and catalog order retains T1 before T2. No assertion is removed or relaxed. The final complete focused run passes. No application defect or source correction was needed.

Main and open PRs were rechecked. #133 `6c4da5862a205719a7749a4f0a2337568c020ca3`, #134 `685b4b383ee499cc12fe0824ad752e47ab44933d`, #136 `7d508f27c4b9a6df2fdfe71c7a83d98141aa8cb3` and #137 `8a4d5ecfeb6959213cf5135dfc4d744bf564c516` intersect the combined import diff only in roadmap, handoff and readiness documentation. No competing runtime code is copied. This branch contains main's #132 implementation and tests exactly, rather than an alternative reconciliation of those contracts.

The previous T1 whole-site guest/signed-in sweeps, library browser and unchanged database/release package evidence retain their original scope and head in the Batch 1 record. They are not claimed as fresh final-head runs. Batch 2 changes data and tests without changing the shared native renderer. Main's expression behavior is covered again by its actual 50-check browser and the full server/component suites. These targeted integration checks support reusing the broader prior evidence. No new full database/release package, whole-site sweep or deployed Preview run is claimed. Physical devices, OS keyboards, Firefox/WebKit and live providers remain unverified. Final combined IPhO QA follows T3.

Reproduce with Node 22 on PATH and inherited service credentials removed:

```sh
corepack pnpm install --frozen-lockfile
python3 -B scripts/phase-c-offline/run.py safety
node --require ./tests/server-only-register.cjs --import tsx --test lib/ipho-2026-native.test.ts lib/ipho-2026-t2.test.ts lib/imported-corpus.test.ts lib/corpus-catalog.test.ts lib/problem-archive.test.ts lib/olympiad-hosts.test.ts lib/seo-problem-pages.test.ts lib/seo-public-routes.test.ts lib/public-problem-metadata.test.ts tests/problem-card.test.ts tests/imported-native.test.ts
corepack pnpm exec next typegen
corepack pnpm exec tsc --noEmit
corepack pnpm lint --max-warnings=0
node --require ./tests/server-only-register.cjs --import tsx --test --test-concurrency=2 lib/*.test.ts
corepack pnpm test:ui
node --import tsx scripts/csp/local.mjs --build
AUTHORING_BROWSER_TOOLS=/external/browser-tools CHROMIUM_PATH=/usr/bin/chromium node tests/ipho-2026-native.browser.mjs
AUTHORING_BROWSER_TOOLS=/external/browser-tools CHROMIUM_PATH=/usr/bin/chromium node --conditions=react-server --import tsx tests/authored-expression.browser.mjs
```
