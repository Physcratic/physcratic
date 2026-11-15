# Native archive batch six

This user-requested batch converts twenty more existing IPhO/APhO PDF records to native statements and worked solutions. Base: merged PR #180, main `8d49ce8b6cee0113f918c500a47e9745da75963c`. Branch: `codex/archive-next-20`.

The archive remains 112 problems, now **55 native and 57 PDF-based**. Of the native problems, 52 use stateless answer fields and three are the pre-existing IPhO 2026 records. Every EuPhO problem was already native before this batch.

## Included problems

| Competition | Problems |
| --- | --- |
| IPhO | 2005 T1-T2, 2009 T1, 2010 T1, 2013 T1-T2, 2014 T3, 2015 T1-T3, 2019 T1 and T3, 2022 T3, 2023 T2-T3 |
| APhO | 2006 T2, 2011 T2, 2013 T1, 2014 T3, 2018 T2 |

The native statements preserve all 235 source subparts. Some requests for multiple quantities are grouped under their source part. There are 182 automatic fields and 53 source-part self-review fields, plus one explicit working-review field per problem. Automatic checks assess only the labelled result. Accompanying calculations, conditions, proofs and sketches remain self-review. This distinction is stated in the controls. Checks remain stateless and unrated, with no account progress, marks or ELO writes.

## Sources and conventions

`native-archive-batch-6-sources.json` binds each original statement and solution PDF by SHA-256. `native-archive-batch-6-figures.json` binds all 36 original crops to source, page, render scale, image dimensions, crop rectangle and PNG hash. The retained PDFs are unchanged. Equations missing from PDF text extraction were checked on rendered pages. Full original marking schemes remain available in the reference PDFs.

- Satellite: retain the outgoing asymptote angle convention and finite radial impulse. Escape begins at beta equal to one. The period and turning radii use the bound-orbit domain.
- Absolute electrical measurements: distinguish the rotating-coil phase convention, two additive disc emfs, and four force contributions to the current-balance torque. The stability limit is a leading small-displacement estimate on the indicated side.
- Earth-Moon system: final spin is neglected only where requested. Near and far bulge forces and torques are separate. Annual energy change is negative, while dissipated heat is positive.
- Image charge: the image represents the field only outside the sphere. The external-induced interaction energy, induced-charge mutual energy and total energy are separate, with the necessary half factors. The pendulum field uses the source geometry and angular frequency.
- Maribo: camera bearings and thermal/radiometric data are native. Retain the original isochron graph. The simple rock thermal-penetration estimate, isotope proof and all three asteroid-impact cases are separate.
- Plasmon generator: use the source's complete-kinetic-energy-loss collision model and its effective circuit definitions. Direct water-heating constants give 2.59 MJ/kg and 1.92 g/s, while the source rounds to 2.62 MJ/kg and 1.90 g/s. Both mass-rate results are accepted and explained.
- Gas discharge: distinguish the recombination/drift model from the no-recombination avalanche model. The critical-gap divergence is not a prediction of saturated current. Correct the source's dimensionally inconsistent printed electrode-spacing comparison to L much smaller than square root of S.
- Solar particles: Wien efficiency is about 0.457, with dimensionless optimal gap about 2.27. Cherenkov energy is transferred kinetic energy, excluding the original electron rest energy. Thermal broadening uses one line-of-sight velocity component.
- Extremum principle: preserve angle conventions at the vertical mechanical and horizontal optical interfaces. The nearest electron minimum is below P, with a positive distance in its numeric field.
- Reactor: preserve the given idealized neutron/molecule collision model, 80 percent heat fraction, optimum aspect ratio and approximate boundary-channel count.
- Slinky: finite unstretched length and touching bottom coils are retained. The collection model has an idealized instantaneous start and a final inelastic collection step before ordinary free fall.
- Thermoacoustic engine: follow the negative heat-input convention in the question. The source has a sign typo in an intermediate substitution. The final volume coefficients and work follow the question consistently. Efficiency is a leading weak-gradient result on the engine branch.
- Scaling: capillary sand strength scales with grain length rather than volume. The relativistic expedition uses four equal proper-time legs and permits the source's year-rounding differences. The floating-ball calculation includes fluid added-mass scaling and specifies a critical-radius bound.
- Neutron stars: use the requested positive-total-binding threshold, rather than treating it as a complete stability calculation. Clock I is above clock II. Shapiro extrema use different signs of the lower integration limit. Preserve the measured delay graph and all four wave-profile choices.
- Water: preserve pressure-force signs, both contact sides and midpoint symmetry. Gravity belongs in the capillary length even though one source parameter list omits it. The rod force is attractive.
- Sliding friction: actual static equilibria form an interval, not just the two centres of the moving half-ellipses. Distinguish a rough cycle estimate from the exact count of moving half-cycles and the final partial cycle.
- Creaking door: distinguish driven-frame elongation from laboratory velocity. The hinge calculation follows the thin-wall approximation. Its limits are explicit because wall thickness is not extremely small in the supplied example.
- Conducting liquid: distinguish exterior equivalent line charges from the constant potential inside each metal cylinder. The source magnetic-field arctangents need branch continuation outside the central strip. The ideal symmetric current-return convention and finite-lead limitation are stated rather than enforcing a globally ambiguous field key.
- Gravitational lens: an ideal point source and point lens give two misaligned images. The source marking notes favour arcs, appropriate for an extended resolved source. The native solution explains both interpretations. Newtonian escape speed reproduces the Schwarzschild-radius expression but does not derive an event horizon.
- Space elevator: preserve surface-height versus centre-radius distinctions, effective solid-cylinder modulus/density convention, and the source's harmonic bond-breaking estimate. Solar turning radii retain the supplied orbital speed even though it is not exactly the circular speed implied by the other rounded constants.

## Preservation and validation

The collection comparison against base confirms exactly twenty changed records. Every other record, all metadata fields outside statement/solution, identities, titles, ratings, source references and original PDF bytes are preserved. The account-persistence catalogue remains 30 problems. The native generator is deterministic and CI checks its output against committed files.

The focused native, batch-six physics and catalogue suite passes 124 tests. It checks canonical forms, independently rearranged answers and common wrong factors for all twenty problems, numeric physics, valid KaTeX, schema, retained source hashes, crop hashes and public metadata without private keys. The existing 2019 PDF-split regression now verifies the actual retained PDF page counts for both PDF and native readers.

The browser harness now includes the same KaTeX stylesheet as the production layout and serves its local fonts. Guest and synthetic verified-session screenshots have separate filenames. No width/theme/session/problem combinations are removed. Its existing CI job budget is increased from 15 to 25 minutes to accommodate 52 converted problems. This is a test workflow change, with no provider plan or deployment change.

Local full-suite, lint, typecheck and production-build evidence is recorded in the PR. Browser and disposable-database results must come from exact-head GitHub Actions. No independent reviewer is claimed. No Production data, schema, flags, provider settings, manual deployment or merge is part of this batch.
