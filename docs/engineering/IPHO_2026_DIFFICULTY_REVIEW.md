# IPhO 2026 difficulty recalibration

10 November 2026. Focused review of draft PR #139 at `41515fa1fd89aba81431d0d513ace3432c522468`. Fetched main is `5a82bb0e5dfb0f3496c89e1763b71ea3cc744658`, already in this branch. No upstream reconciliation is needed. This review supersedes the three import estimates, without changing source content or earlier QA evidence.

| Problem | Previous | Revised | Main reason |
| --- | ---: | ---: | --- |
| ipho-2026-t1, Three problems | 2250 | 1950 | Short hydrostatic and supplied-conic tasks accompany one unsupplied recoil threshold. Independent sections limit integration |
| ipho-2026-t2, Cooking with sunlight? | 2300 | 2050 | Reflection-count and tangent-ray choices remain, but functional forms and the prescribed neighbouring-ray construction guide most subsequent mathematics |
| ipho-2026-t3, Chasing the absolute zero | 2200 | 1850 | The material laws, work fallback and Carnot relation are supplied. Most subparts reuse these in standard integrals and energy balances |

## Method and source coverage

The target is a strong Olympiad student completing the whole problem. The historical review's guidance is retained: independent insight 35%, mathematical derivation 30%, conceptual integration 25%, routine work/length 10%. These are judgement priorities, not a formula. No average of subpart ratings or conversion from point allocations is used. Competition prestige, numbering, unfamiliar terms and the existing band name do not supply a rating floor. No measured solving statistics or solving times are claimed.

All original statements, diagrams and official worked solutions were reinspected. All supplied alternatives were read, but a solver needs only one valid method for a question. Neither alternative-method count nor repairing official mistakes adds intended solving difficulty.

| Identity | Exact local originals | Full coverage |
| --- | --- | --- |
| ipho-2026-t1 | `public/corpus/2026/ipho-t1/statement.pdf` and `solution.pdf` | Q1 pages 1 to 3, printed 4 to 6. S1 pages 1 to 4. All five scored questions |
| ipho-2026-t2 | `public/corpus/2026/ipho-t2/statement.pdf` and `solution.pdf` | Q2 pages 1 to 4, printed 7 to 10. S2 pages 1 to 5, printed 5 to 9. All eight scored questions |
| ipho-2026-t3 | `public/corpus/2026/ipho-t3/statement.pdf` and `solution.pdf` | Q3 pages 1 to 4, printed 11 to 14. S3 pages 1 to 2, printed 10 to 11. All ten scored questions and the complete table |

The original PDF hashes and source issues remain in [T1](IPHO_2026_NATIVE.md), [T2](IPHO_2026_T2_NATIVE.md) and [T3](IPHO_2026_T3_NATIVE.md). The 22 target PDF pages are fully reviewed. Source correctness is separate from rating calibration. The six T1 flags, three T2 flags, five T3 review entries and eleven historical flags remain intact. No native document, equation, figure, PDF, page map or manifest is changed.

## Comparison set on the existing global scale

The [historical methodology and anchors](PROBLEM_DIFFICULTY_REVIEW.md) and immutable [118-problem ledger](problem-difficulty-review.json) supply the comparison scale. All seven historical anchors remain unchanged. Infinite-V is excluded as an anchor because its source is ill-posed.

This comparator batch has twelve identities. Five Arena comparisons were freshly read in their complete current native statement/solution sources, with relevant figures. Historical Arena PDF/handwritten-source correspondence remains insufficiently inspected, as already recorded in the historical ledger. Three imported comparisons were freshly checked against their exact original PDFs. Four additional imported comparisons use their retained source-reviewed ledger assessments, without claiming a new full-source inspection in this batch.

| Range | Comparison and retained rating | Relevant solving demand | Evidence used here |
| --- | --- | --- | --- |
| 1750 to 1900 | The Three-String Junction, `arena-the-three-way-wave-split`, 1800 | Invent displacement continuity and transverse force balance, then combine zero reflection with a power ratio | Full current statement/solution and figure, `lib/arena/source-04.ts` |
| 1750 to 1900 | Rainbows on Titan, `arena-titans-double-take`, 1850 | Construct droplet deviation and stationary-ray conditions without hints, then reuse them for a second reflection | Full current statement/solution and relevant figure, `lib/arena/source-04.ts` |
| 1750 to 1900 | APhO 2006 T2, 1900 | Dry-friction stopping and amplitude loss require switching between shifted harmonic arcs and energy-level geometry | Existing source-reviewed ledger entry |
| 1950 to 2100 | The Two-Level Atom, `arena-an-atom-with-stage-fright`, 2000 | Use supplied wavefunctions/radiation law, identify oscillating cross terms and build a population-energy ODE and its interpretation | Full current statement/solution, `lib/arena/source-05.ts` |
| 1950 to 2100 | IPhO 2005 T1, An Ill Fated Satellite, 2050 | Supplied conic formulas still leave radial-impulse invariants, orbit orientation, period, escape and asymptote geometry | Exact `public/corpus/documents/english-ipho-2005-t1-statement/document.pdf` and matching `english-ipho-2005-t1-solution/document.pdf` |
| 1950 to 2100 | IPhO 2024 T1, The Greenhouse Effect, 2050 | Supplied radiation laws still require a reflection series, two-body heat-flow balances and coupled temperature sensitivities | Exact `public/corpus/documents/english-ipho-2024-t1-statement/document.pdf` and matching `english-ipho-2024-t1-solution/document.pdf` |
| 2150 to 2300 | EuPhO 2025 T1, Sunny, 2200 | Invent a reflected-ray area map for illuminance and distinguish ray path length from radial shadow position | T1 on page 1 of `public/corpus/documents/eupho-2025-statement/document.pdf`, T1 solution/marking on pages 1 and 2 of `eupho-2025-solution/document.pdf` |
| 2150 to 2300 | IPhO 2025 T1, 2200 | Supplied Bohr/density relations accompany separate Doppler geometry, stability and piecewise MOND choices | Existing source-reviewed ledger entry |
| 2150 to 2300 | APhO 2025 T1, 2300 | Supplied ring averages and equivalent masses still leave near-centre field and torque-to-precession geometry | Existing source-reviewed ledger anchor |
| 2350 to 2500 | APhO 2018 T3, 2400 | Construct thermoelectric heat balances/reversibility and optimise generator and refrigerator operation | Existing source-reviewed ledger entry |
| 2350 to 2500 | Relativistic Collisions, `arena-the-five-fold-collision`, 2400 | Construct CM transformations, maximum lab deflection and independent two-/three-photon kinematic bounds | Full current statement/solution, `lib/arena/source-02.ts` |
| 2350 to 2500 | A GRIN and a Wiggle, `arena-a-grin-and-a-wiggle`, 2500 | Discover an optical invariant and carry consistent cubic ray-phase and exit-refraction expansions | Full current statement/solution and relevant figure, `lib/arena/source-05.ts`. Its documented source/completion limitations remain |

## T1: 1950

The three tasks are assessed separately before judging the complete paper. Their points are A 3.0, B 3.5 and C 3.5, but those allocations do not mechanically determine the rating.

- A, hydrostatic gate. The independent choice is to replace the two submerged pressure fields by their pressure-difference resultant, combine weight with buoyancy, and set the opening threshold by torque about the hinge. Projected area and lever arms must be obtained from the diagram. The constant level difference makes the net pressure simple, the two relevant arms cancel, and the stated density ratio leaves short algebra. There is no free-boundary flow, pressure integration with a moving waterline or coupled gate dynamics.
- B, electron-positron pair. The solver must use total rather than individual angular momentum and distinguish separation from distance to the CM. Both bound/unbound regimes are already identified. The Bohr-radius identity, eccentricity formula in total E/L and conic equation are supplied on Q1 page 2. B1 is a turning-point calculation or a ratio of conic extrema. B2 reuses the same E/L calculation and takes a denominator-zero limit to find the asymptote. No derivation of the Kepler problem, orbit equation or eccentricity is required. Quantum vocabulary adds no intended difficulty.
- C, recoil. This is the main unsupplied construction. Momentum conservation eliminates the oxygen-atom momentum, energy conservation gives a quadratic in the outgoing molecular momentum, and the angle-constrained threshold is an admissibility minimum. Equivalently, a CM velocity circle becomes tangent to the allowed ray. The physical momentum branch matters. For acute angles the discriminant/tangency condition leaves a quadratic in photon energy. C2 is its leading small-recoil expansion, with the binomial series explicitly given on Q1 page 3. The angular-boundary ambiguity and printed algebra issues remain flagged separately, with no rating premium for repairing them.

Required mathematics is projected geometry, a torque balance, conic substitution, a quadratic threshold and a short asymptotic expansion. The whole paper requires entering three physical models, but they do not constrain one another. There is no cumulative multi-stage dynamics across A/B/C. The prior estimate overemphasised breadth and the apparent sophistication of orbit/recoil language relative to the supplied machinery.

Useful comparisons:

- Above the 1800 Three-String Junction: T1 adds the unsupplied kinematic minimum and a separate hydrostatic torque model, rather than only constructing one coupled boundary system and reusing it.
- Near but slightly below the 2000 Two-Level Atom: the latter sustains an amplitude-to-radiation-to-population model and its limiting-state interpretation. T1 has a meaningful threshold, but A/B and the final expansion are compact and the sections are independent.
- Below IPhO 2005 T1 at 2050: both supply conic machinery, but 2005 maintains orbit orientation, finite impulse, period, escape and scattering geometry in one changing model. T1's guided B alone does not carry that burden.
- Below IPhO 2025 T1 at 2200: the historical review identifies more independent Doppler, stability and piecewise-gravity choices. The previous decision to put T1 above it did not adequately discount the conic hints and short independent sections.
- Well below the 2400 Relativistic Collisions: its transformations and multiple independent final-state bounds substantially exceed T1's single nonrelativistic threshold. Relativity terminology alone is not the difference.

### Is 1800 justified?

It is a serious candidate. A is elementary once the resultant is recognised, B is strongly scaffolded, and C uses familiar conservation laws and quadratic admissibility rather than advanced microscopic physics. Independence prevents a difficult coupled synthesis. These are strong reasons to lower 2250 substantially.

I choose 1950 rather than 1800 for the complete paper because the recoil minimum is not supplied and the hydrostatic resultant/hinge threshold is another actual model choice. Treating C as merely evaluating a supplied recoil formula would omit its principal task. Those choices warrant a modest increase over the cited 1800 boundary problem. They do not warrant retaining 2150 to 2250. Conversely, pushing the paper much below 1800 would discount the threshold construction too far. The exact 50-point choice is editorial judgement, not measured precision.

## T2: 2050

Main independent insights are the limiting escaping-ray polygon/chord geometry in A and the tangent/interception and admitted-width model in B. These prevent reducing the whole problem to a sequence of substitutions.

The guidance discount is substantial:

- A's reflection-count sequence is not given. Recognising equal-angle chord geometry and generalising to arbitrary N remains a genuine insight.
- B supplies the radius form `a = alpha sin(theta_max) + beta sin(2 theta_max)` and explicitly allows it as a fallback. It also assumes absorbed rays reflect at most once. The solver does not have to couple the full A reflection hierarchy to the cooker. B1/C1 reuse the same reflected-ray intercept geometry. B2 is intercepted-width power bookkeeping and B3 is substitution, without a thermal-loss or food-heating model.
- C1 gives the cotangent/secant functional forms. C2 tells the solver exactly which parallel ray to perturb and to expand to first order. C3 asks for their intersection and C4 supplies the small-angle regime and target power law. The solver is not asked to discover the general envelope method or an intensity/area-map law.

The remaining mathematics includes trigonometric geometry, differentiation in the ray-separation parameter, two linear equations and a second small-angle expansion. Eliminating a cubic/quadratic parameter produces the cusp exponent. Keeping the two limits consistent matters, but there is no need for an unsupplied optical invariant or cubic aberration theory. The official solution's long equivalent-form chains and alternative alpha/beta answers are not separate required derivations.

Useful comparisons:

- Above Rainbows on Titan at 1850: the rainbow's second bow mostly repeats its first model, while T2 adds an arbitrary-count boundary and a tangent-cylinder interception condition. Titan supplies less guidance about stationary rays, so the increase is limited rather than automatic from paper length.
- Comparable overall to the 2050 satellite and greenhouse problems: supplied machinery leaves a few model choices followed by routine derivation. T2 carries geometric construction rather than their orbital or heat-flow balances.
- Below EuPhO 2025 T1 at 2200: Sunny requires the solver to invent the ray-area/illuminance map and shadow geometry. T2 explicitly prescribes neighbouring rays and their intersection, and asks for no caustic intensity distribution.
- Below APhO 2025 T1 at 2300 and far below GRIN at 2500: those retain an unsupplied torque/precession construction or optical invariant with coupled cubic corrections. T2's first-order perturbation and supplied target exponent do not have that scope.

An 1800 to 1900 estimate would discount A's generalisation and B's limiting tangent construction too much for the complete problem. A 2200 to 2300 estimate would overcount the prescribed C construction and routine trigonometric alternatives. I choose 2050.

## T3: 1850

Main independent choices are relating induced emf and flux to source work, separating vacuum-field and material work, and writing the net-work balance as a finite cold body cools. These are real physical choices even though the material is specified parametrically.

Most of the subsequent construction is supplied. Q3 page 2 gives the circuital-law hint, constitutive relation, state equation, heat capacity, internal-energy law, fixed volume and fallback magnetic-work form. There is no spin counting, partition-function derivation, thermodynamic integrability problem or invented microscopic cooling mechanism. Q3 page 4 explicitly gives the differential Carnot ratio. The complete statement can be read together, so this later relation also guides the earlier cycle-ratio task.

B1 substitutes the state equation into the given work and integrates H dH. B2 differentiates/substitutes the same state law and separates variables. C1 labels the supplied cycle. C2 combines the isothermal result with the Carnot ratio, C3 substitutes numbers, and C5 reuses C4's total work. C4 is the main later modelling step: distinguish net work from rejected heat, use `dQc = -Cc dTc`, then separate the constant-power balance to obtain one logarithmic integral. Total COP rather than instantaneous COP is explicitly requested.

The complete problem therefore has several guided steps, not ten independent models. Longer symbols and a magnetic-material setting do not justify the former 2200. The erroneous/ambiguous first-law notation, C3 material/cycle data and rounding remain documented but do not add intended solving work.

Useful comparisons:

- Slightly above the 1800 Three-String Junction: there is additional work/heat bookkeeping and separated integration, although the constitutive information is much more explicit.
- Comparable to Rainbows on Titan at 1850: Titan requires unsupplied ray/stationary-angle construction and reuses it. T3 has more algebra but gives much more of the model. These different burdens can merit the same global estimate.
- Below the 2000 Two-Level Atom: the atom's supplied radiation law still leaves an amplitude/population energy model and its pure-state interpretation. T3's material law and heat capacity are directly given and its later Carnot relation narrows the construction further.
- Below IPhO 2024 T1 at 2050: the greenhouse task still requires a reflection series and coupled Earth/atmosphere balances with temperature sensitivities. T3 largely solves one supplied material model and then a scalar cooling balance.
- Well below APhO 2018 T3 at 2400: thermoelectric reversible heat and generator/refrigerator optimisation require additional physical modelling absent here.

An estimate around 1600 would treat the emf/work split and finite-body net-work balance as already given, which they are not. Raising it to 2000 to 2200 would overweight routine integration, number of subparts and paramagnetic terminology. I choose 1850 independently of the T3 label.

## Scope and verification

Only the three map values, their dedicated test expectations/comparisons and IPhO 2026 rating documentation change. The historical 118-problem ledger and all earlier estimates stay unchanged. The corpus still has 103 imports and 121 estimates. All three revised values remain in Advanced, with no change to band definitions, filter boundaries, grading, real player ratings, schema or reader behaviour.

Local Node 22.23.1/pnpm 10.34.9 verification passes: 65 focused tests with no skips or failures, TypeScript and zero-warning lint. Exact final head and the review table are recorded in PR #139. The only edits after these checks are review/status documentation, with the tested map and test code unchanged. No full server, database, browser or production-build sweep is needed or performed for this metadata-only review. Final release QA remains a separate phase. GitHub Actions is not claimed as passing. No merge, deployment, settings, billing, SQL or subsequent batch is authorised or performed.


The focused set covers the three native identity/rating assertions, all 121 explicit estimates and their bounds/step size, the unchanged 118-problem ledger, canonical rating bands, legacy and current filters, catalog composition/search, Arena filtering, tags and actual card difficulty badges. Counts remain 103 imports and 121 estimates. All three remain Advanced and retain the same legacy 1600-plus filter membership. Relative checks now use the reviewed neighbouring comparisons rather than the superseded import equalities.

```sh
node --require ./tests/server-only-register.cjs --import tsx --test lib/problem-archive.test.ts lib/rating-bands.test.ts lib/arena.test.ts lib/corpus-catalog.test.ts lib/ipho-2026-native.test.ts lib/ipho-2026-t2.test.ts lib/ipho-2026-t3.test.ts lib/problem-tags.test.ts tests/problem-card.test.ts
corepack pnpm exec tsc --noEmit
corepack pnpm lint --max-warnings=0
```

Checks run in the isolated `codex/ipho-2026-native` worktree with inherited service credentials removed. Logs are `/tmp/recal26-focused.log`, `/tmp/recal26-typecheck.log` and `/tmp/recal26-lint.log`. No new dependency, installation, schema, source or runtime contract is required. Historical review/QA entries retain their original dates and values as evidence of the earlier import, while their current difficulty sections link to this superseding assessment.
