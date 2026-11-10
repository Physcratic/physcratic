# IPhO 2026 T3 native import

Batch 3, 10 November 2026. Extends [draft PR #139](https://github.com/Physcratic/physcratic/pull/139) from expected head `78a5859a4afd8a4b878b16985d68364cb2a14249` on `codex/ipho-2026-native`. Main advanced during final verification from `942be99148870b834767fbc212e649127abb3b93` to `5a82bb0e5dfb0f3496c89e1763b71ea3cc744658`, merging #133. The branch incorporates the new default-off practice-progress backend unchanged. Shared engineering documents merge without conflicts. No T3-specific application component or grading change is needed. Implementation only. Final combined QA and any merge belong to the next authorised batch. Do not merge, deploy or begin APhO.

## Sources and completeness

Official statement title: Chasing the absolute zero. Identity: `ipho-2026-t3`. The owner-supplied original English PDFs are retained byte for byte. The matching [archive statement](https://olimpicos.net/files/ipho/IPhO_2026_Q3.pdf) and [solution](https://olimpicos.net/files/ipho/IPhO_2026_S3.pdf) were checked for page counts, T3 identifiers, year and printed content. The solution header identifies Bucaramanga, Colombia. The solution title and first question label contain typographical errors, preserved below. The shared work/heat formulas, cycle labels, data and numerical result establish the statement/solution correspondence. No byte identity with a separately downloaded remote copy is claimed.

| Original file | Coverage | Bytes | SHA-256 |
| --- | --- | --- | --- |
| IPhO_2026_Q3.pdf | All four pages, printed 11 to 14 | 464094 | `1fc6e246a0f1a369719f5bd39bfc12f7b665353be84a91485c8643370330b224` |
| IPhO_2026_S3.pdf | Both pages, printed 10 and 11 | 273124 | `3ef1952f8a7466beb809764b2b0dcdd8191f71fd42ad4f71a96c0b53ab5bcb01` |

Ten scored questions remain under one identity. A1/A2/A3 have 0.2/0.6/0.2 points. B1/B2 have 1.5/1.5 points. C1/C2/C3/C4/C5 have 0.2/1.5/0.8/2.0/1.5 points. Section totals 1.0, 3.0 and 6.0 sum to 10. All assumptions, vectors, constants, table rows, source diagrams, intermediate equations, numerical steps and final results are included. These PDFs contain one worked method per subquestion, no separate alternative solution or additional marking scheme. The B fallback instruction and B1 note about the number of moles are retained.

## Page map

All six source pages were visually compared with the native text, mathematics, table and cropped figures. Running headers, footers, logos and page numbers remain in the reference PDFs. Two-column solution content is linearised in reading order. Whitespace, line-wrap hyphenation and quotation glyphs are normalised. Source spellings, labels and erroneous expressions are preserved. Source equations are typeset through the existing KaTeX renderer, with vectors, differentials, subscripts, powers, units and logarithms retained.

The [machine-readable source map](ipho-2026-t3-source-map.json) gives inclusive one-based node and maths-expression ranges for every PDF page. Table cells count in document order. A multiline aligned derivation is one displayed expression, with all printed lines retained. A display range whose end precedes its start contains no displayed expression. Tests verify contiguous complete coverage, strict KaTeX parsing and reference hashes.

| Source page | Native coverage | Maths range | Display range |
| --- | --- | --- | --- |
| Q3 page 1, printed 11 | Full history/introduction, temperatures, torus geometry, negligible resistance, dense winding, small cross-section approximation, constant field magnitudes, Pm-T definition, vector constitutive relation and energy-transfer sign convention. Fig. 3a | 1 to 16 | 1 to 1 |
| Q3 page 2, printed 12 | A heading, circuital-law hint, A1/A2/A3, vacuum/material work split. B heading/setup/fallback. Full two-column comparison table, its five body rows, both heat capacities and both internal-energy laws. Material constants/provided-equation permission | 17 to 70 | None |
| Q3 page 3, printed 13 | B1/B2 in full. C cycle, direction, both reservoir temperatures and absolute heat definitions, C1/C2. Fig. 3b | 71 to 120 | None |
| Q3 page 4, printed 14 | C3 all helium/material properties, four field values and operating-cycle question. C4 constant heat capacity/power/hot temperature, differential Carnot relation, initial/final conditions. C5 overall COP definition and requested variables | 121 to 151 | None |
| S3 page 1, printed 10 | Full A1 field/circuital law, A2 emf/Faraday/flux work, A3 vacuum/material split. B1 first law, isothermal heat integral and volume note. B2 separation, integrated relation, state substitution, temperature ratio and final temperature change | 1 to 43 | 1 to 15 |
| S3 page 2, printed 11 | C1 labelled cycle. C2 heat signs, both isothermal heat formulas, Carnot substitution and magnetisation relation. C3 heat, full unit-bearing temperature-drop calculation and final temperature. C4 differential work balance, separated equation and integrated time. C5 total work and final overall COP | 44 to 73 | 16 to 28 |

Native statement: 30 top-level nodes, one displayed and 150 inline mathematical expressions, one semantic comparison table and two figures. Native solution: 62 top-level nodes, 28 displayed and 45 inline expressions, one figure. Every source equation is mapped to its PDF page.

Three precise 288 dpi crops reproduce the wound torus and emf, the unlabelled H/T cycle and the labelled solution cycle. They preserve radius R, diameter 2r, vertex numbers, axes, branch shapes, dashed guides and heat-arrow directions. Captions Fig. 3a and Fig. 3b remain semantic text. The originally uncaptioned solution figure remains uncaptioned. Alt text describes the actual source labels, including its TL/QL notation. No whole-page screenshot is native content. Both original reference PDFs remain linked.

## Source issues for human review

These issues are preserved, not repaired in the imported content. C3's physical interpretation needs editorial signoff. Its intended numerical substitution can still be reproduced. Automatic grading remains disabled and independent review remains pending.

| Location | Issue and consequence |
| --- | --- |
| S3 page 1, printed 10, title and A1. S3 page 2, printed 11, C1 figure | The solution title is Chashing abolute zero and A1 is labelled T1-A1. The diagram labels the cold/hot quantities TL/QL and TH/QH while the surrounding text uses Tc/Qc and Th/Qh. All printed labels remain. The catalog uses the statement's exact title and T3 identity. Tests explicitly recognise the mislabelled solution A1 rather than silently changing it |
| S3 page 1, printed 10, B1 first line | `dU = dW + dQ = mu0 V H dM + C dT` substitutes `C dT` for general heat, although an isothermal magnetic process transfers heat. The supplied internal-energy law is `dU = C_M dT`, and the following isothermal step correctly obtains `dQ = -mu0 V H dM`. Treating the first line as a general heat-capacity identity would contradict that step. Both printed expressions are retained |
| Q3 page 4, printed 14, C3 material name, with Q3 page 2, printed 12, state equation | Potassium chromate is named as the paramagnetic material. A magnetic-susceptibility handbook table lists K2CrO4 with negative room-temperature molar susceptibility. This conflicts with the positive Curie-type model supplied here and requires material-identification review. The table does not establish subkelvin behaviour or an intended replacement material. No material name or constant is substituted |
| Q3 page 4, printed 14, C3 field values, compared with S3 page 1 B2 and page 2 C2 | C2 implies `(Th/Tc)^2 = (H1^2-H4^2)/(H2^2-H3^2)`, giving Th/Tc about 1.424034. For positive lambda, B2's 1-to-2 adiabat requires Th/Tc below H1/H2, about 1.322249. Combining the printed values instead gives lambda about negative 0.061932 J K/mol, so the stated `C_M = n lambda/T^2` would be negative. The four values do not describe the claimed cycle for an ordinary positive-heat-capacity salt. All values remain unchanged |
| S3 page 2, printed 11, C3 numerical result | The source rounds Qc to 0.129 J before deriving a 0.00992 K drop and printing Tf = 0.99008 K. Using the unrounded supplied field values and conventional mu0 gives Qc about 0.12934593 J and Tf about 0.99005031 K. This is an intermediate-rounding and reported-precision issue, separate from the cycle inconsistency. The printed numerical chain remains unchanged |

Material cross-check: [Magnetic susceptibility of the elements and inorganic compounds](https://www.fizika.si/magnetism/MagSusceptibilities.pdf), PDF page 5, printed 4-134, potassium chromate row, lists negative 3.9 in units of 10^-6 cm3/mol at nominal room temperature. Its introduction distinguishes diamagnetic from paramagnetic susceptibility. This is a source-identification flag, not a replacement low-temperature measurement.

The [six T1 flags](IPHO_2026_NATIVE.md), [three T2 flags](IPHO_2026_T2_NATIVE.md), historical eleven flags and historical 118-problem ledger remain unchanged.

## Difficulty

Editorial estimate: 2200, Advanced (IPhO level). The target is a strong Olympiad student. No measured solving statistics are claimed.

The main physical insights are obtaining work from induced emf and flux, separating the vacuum-field energy from work on the material, and constructing the finite-body cooling balance at constant refrigerator power. B2 requires a non-routine change from H/T to magnetisation variables and a separated integration. C2 combines state relations with the Carnot heat ratio. C4/C5 require a signed differential heat balance, integration over the changing cold temperature and total rather than instantaneous COP.

The circuital-law hint, constitutive/state/internal-energy laws, heat capacity, fallback work form and differential Carnot ratio are all supplied. Most subsequent mathematics is substitution, a quadratic-field integral, separation of variables and a logarithm. The sections use one guided material model rather than introducing several coupled models. Unfamiliar paramagnetic vocabulary and the need to identify source errors do not inflate the estimate.

This is slightly below T1 at 2250 and T2 at 2300 because their constrained recoil or limiting-ray constructions require more independent choices. It matches the retained IPhO 2025 T1 estimate of 2200 for a guided but substantial derivation. It is above IPhO 2024 T1 at 2050, whose principal demands are supplied-model energy balances and differentiation, and below APhO 2018 T3 at 2400, which adds thermoelectric reversible-heat modelling and optimisation. Historical comparison uses the existing reviewed assessments. No previous estimate changes. The 2200 estimate assesses the intended symbolic tasks, while the C3 physical example remains flagged.

## Integration and QA scope

Adds only T3 to the selection, title/source metadata, import index, manifest, downloadable collection and estimate map. Totals become 103 imports, 43 IPhO, 35 APhO, 25 EuPhO and 121 estimates. Verified host editions remain 45, reusing Colombia. The legacy collection identifier is preserved. All 102 previous collection objects, source/import records and previous non-collection asset hashes remain unchanged. Only the collection hash changes to include the new object.

T1/T2 native JSON, original PDFs, figures, dedicated tests and source-review ledgers are unchanged. Shared affected-count tests are extended by one record. No application component, renderer, schema, dependency, authentication, grading, real player rating or feature-gate contract is edited. The later #133 reconciliation preserves all of main's non-shared-document files byte for byte, including its gate, route tests, schema and additive migration. No SQL or flag is operated. Its practice/Arena-only catalog excludes imported problems. The new disabled-route tests verify that the reconciliation does not load database/session bindings while off.

The initial T3 tree passed 87 focused checks, typecheck, lint, build and eight browser combinations. Main advanced after those checks. Fresh reconciled-tree results and the exact tested tree are recorded after verification. The earlier results alone are not final reconciled-head evidence. Full server, database, component and site-wide sweeps are deferred to final combined QA, as requested. Previous T1/T2 evidence retains its original scope and head. GitHub Actions usage remains unavailable and no remote pass is claimed. No merge, deployment, Production/shared database, settings, billing, workflow rerun or README trigger is performed.
