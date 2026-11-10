# IPhO 2026 native import

Batch 1, 10 November 2026. Branch `codex/ipho-2026-native`. Only `ipho-2026-t1`, Three problems, is imported. T2 and T3 are deferred to later batches on this draft PR. No merge or deployment is authorised.

## Sources and provenance

The owner attached the original English statement and solution PDFs. Both were visually inspected page by page. The [Olimpicos archive](https://olimpicos.net/ipho/) links the matching [statement](https://olimpicos.net/files/ipho/IPhO_2026_Q1.pdf) and [solution](https://olimpicos.net/files/ipho/IPhO_2026_S1.pdf), with matching title, page counts and printed content. Direct shell downloads are blocked by the environment proxy. The uploaded bytes are the retained references, no byte identity with an independently downloaded remote copy is claimed.

| File | Pages | SHA-256 |
| --- | --- | --- |
| IPhO_2026_Q1.pdf | 3, printed 4 to 6 | `0fc29bcca76d88b36c6cc6630cddb9bd22fceb96da857a527b675b72cb97f833` |
| IPhO_2026_S1.pdf | 4 | `9e6855ade0068a9451f3476d6781fece4a222d3b5a412f894f5bf28778f7ef6f` |

The [official organiser](https://ipho2026.com/) identifies Bucaramanga, Colombia, 4 to 12 July 2026. The solution header independently identifies Bucaramanga, Colombia. The host lookup now includes Colombia for IPhO 2026 only.

## Page comparison ledger

Repeated logos, running headers and footers remain in the original references. Reading order is linearised from the two-column solution. Mathematical symbols and expressions, including apparent source errors, are retained. Hyphenated line wraps, whitespace and quotation glyphs are normalised. Printed zero superscripts used as degree marks are represented by LaTeX degree symbols.

| Source page | Native coverage |
| --- | --- |
| Q1 page 1, printed 4 | Paper heading and independent-problems setup. A, hydrostatic gate, all reservoir, slot, density and hinge assumptions. A1, 3.0 points. Fig. 1a |
| Q1 page 2, printed 5 | B, electron-positron pair. Both particles, initial velocities, individual angular momenta, isolation, electrostatic and classical assumptions, Bohr radius. B1, 1.0 point. B2, 2.5 points. Both conic hints. Fig. 1b |
| Q1 page 3, printed 6 | C, ozone photodissociation. All masses, ground-state energies, isolation and non-relativistic assumptions, photon momentum. C1, 2.5 points. C2, 1.0 point, numerical data and units. Full binomial hint. Fig. 1c |
| S1 page 1 | A1 effective area, pressure difference, buoyancy, hinge torque and numerical answer. Gate cross-section. B initial angular momentum and energy. B1 method 1, both quadratic roots and maximum separation |
| S1 page 2 | B1 methods 2 and 3, ellipse geometry and conic approach. B2 positive energy, asymptotic orbit and directed angle. C and C1 headings |
| S1 page 3 | C1 algebra method, conservation, quadratic, discriminant, both roots and minimum. Centre-of-mass method, conservation and tangent-circle geometry with angular restriction |
| S1 page 4 | Completion of centre-of-mass method, equivalent trigonometric forms and angular-frequency expression. Full special-case note for angles at or above 90 degrees. C2 expansion, recoil correction and numerical result |

Native statement: 29 top-level nodes, three displayed equations, 46 inline expressions and three figures. Native solution: 121 top-level nodes, 53 displayed equations, 69 inline expressions and one figure. All five scored subquestions remain under one ID and sum to 10 points. All three B1 methods and both C1 methods are included.

Four precise, four-times-resolution crops retain the source diagrams. No whole-page screenshot is used as native content. Figure captions are semantic text, excluded from crops to avoid duplication. Geometry, labels, signs, arrows, angle and distances remain faithful to the supplied PDF. Original local PDFs remain directly accessible from each native document.

## Source issues requiring human physics review

These are preserved source issues, not transcription corrections. The imported record remains independent-review-pending, self-review only, unrated in the grading contract, and cannot grade answers.

- S1 page 1 labels B as 2.5 points. The statement and its B1/B2 allocations total 3.5 points. Both printed headings are retained in their respective documents.
- S1 page 2 substitutes `15 hbar²` in the B2 eccentricity numerator, while total angular momentum is `15 hbar` and its square is required. The following numerical eccentricity is 7/2. The inconsistent printed substitution remains.
- S1 page 2 gives a directed deflection of negative 16.60 degrees. The statement asks for the angle between the final relative velocity and the initial line of motion, which can be read as an unsigned angle. The signed official answer is retained.
- S1 page 3 prints a factor 1/2 in front of the centre-of-mass angular kinetic term that does not follow from the preceding conservation equations. The subsequent momentum root corresponds to the conservation-law result. Both are retained.
- S1 page 4 omits a factor 2 multiplying ΔU inside the square root of the rewritten angular-frequency expression. As printed, its leading term is ΔU/(2 hbar), inconsistent with both the previous root and the C2 expansion. The source expression remains unchanged.
- The C1 algebraic discriminant alone does not enforce a nonnegative outgoing momentum for every angle. The official alternative method explicitly supplies the at-or-above-90-degree case. That full caveat is retained, including its internal marking comment. At the boundary the zero-momentum direction requires a limiting interpretation.

The existing eleven historical physics flags and historical 118-problem difficulty ledger remain untouched. These new issues are recorded here separately.

## Editorial difficulty

Estimate: 2250, Advanced (IPhO level). This measures work for a strong Olympiad student, without measured solving statistics. A needs a correct pressure-resultant and buoyancy torque model. B requires translating individual to total angular momentum, finding turning distances and interpreting the asymptote, with conic formulas already supplied. C requires a constrained momentum/energy threshold and a small recoil expansion, with the binomial hint supplied. The independent sections limit cumulative conceptual integration. The threshold construction makes it slightly harder than the retained IPhO 2025 T1 anchor at 2200, while guidance and independence keep it below the 2300 comparison anchors. Source inconsistencies create review work and do not inflate the estimate.

## Compatibility and verification

The existing HTML structured-node and KaTeX renderer is reused. Displayed equations gain keyboard focus and a visible focus ring so long formulae can be scrolled on phones. Native records are validated and passed into the same reader during server rendering, avoiding a second visible statement containing raw LaTeX. Existing PDF imports keep their current text fallback. The only document contract addition is an optional validated local reference PDF for native documents. Existing PDF and HTML imports remain valid. Catalog, import index, manifest, source references and downloadable collection add exactly this identity. Counts become 101 imports and 119 editorial estimates. The legacy downloadable catalog identifier is retained for compatibility. Historical 100 collection objects, import records and old non-collection asset hashes are unchanged. The collection asset hash changes because it now includes the new object.

The historical difficulty test still checks the original ledger against its exact 100 imported and 18 original identities. A separate native test covers the new estimate. Existing grading, player ratings, database schema, authentication and dependencies are unchanged.

Local QA results and exact head are recorded in the draft PR. GitHub Actions usage is unavailable, remote failures are not passing code verification. Sources are supplied official content, not independently certified physics corrections. Real providers, physical devices and unavailable browser engines are not qualified by synthetic local checks.
