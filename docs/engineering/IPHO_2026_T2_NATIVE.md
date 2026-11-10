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

Estimate: 2300, Advanced (IPhO level), in increments of 50. Target solver: a strong Olympiad student. No measured solving statistics are claimed.

A requires identifying the limiting escaping trajectory, relating equal reflection angles through a polygon, and generalising to an arbitrary reflection count. B requires a tangent-ray model tied to the offset absorbing cylinder, then converting the admitted ray width into power. C combines reflection geometry, first-order neighbouring-ray expansions, a limiting intersection and elimination of a cubic/quadratic parameter to obtain the cusp exponent. Those are the main independent insights and integration demands. The trigonometry and derivation matter more than the word caustic or the length of the paper.

The statement supplies the radius functional form, a fallback for B, the slope/intercept hint, the neighbouring-ray construction, the small-angle regime and the target cusp power law. B2/B3 and much of C after the model are routine algebra. That guidance keeps this well below the 2900 APhO 2021 T2 optical path/phase matching anchor. The sustained geometry-to-envelope derivation places it slightly above T1 at 2250 and IPhO 2025 T1 at 2200. It is comparable in total work to the retained 2300 APhO 2024 T3 and APhO 2025 T1 anchors, which have more supplied models but other physical interpretations or torque geometry. The comparison uses their existing review assessments. No historical estimate is changed.

## Integration and reconciliation

Counts become 102 imports, 42 IPhO, 35 APhO and 25 EuPhO, and 120 editorial estimates. There are 45 verified host editions, unchanged because T1 already introduced IPhO 2026. The legacy collection identifier remains unchanged. Only T2 is added to the existing selection, English title/source metadata, index, manifest, collection and estimate map. All 101 existing collection objects, import records, source objects and previous non-collection asset hashes are retained. The collection hash changes because its new T2 object is included.

No renderer or other application component is edited in Batch 2. Existing structured HTML, KaTeX, local image and reference PDF contracts are reused. No grading, real student ratings, schema, authentication, dependency, feature-gate, original-source or historical-difficulty change is introduced. The only application-source differences pulled from main are #132's authored-expression changes, preserved exactly. Main's relevant tests are also retained exactly. Shared handoff and readiness conflicts preserve both branches' entries, with this current batch status above the historical entries.

## Verification

Local commands, results and exact tested tree are recorded below after completion. GitHub Actions usage remains unavailable. Remote checks are not represented as passing. No merge, deployment, live service or production database operation is authorised or performed. T3 import and final combined IPhO integration QA remain the next batch.
