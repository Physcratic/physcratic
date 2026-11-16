# Final seventeen native archive documents

16 November 2026. Continues PR #181 on `codex/archive-next-20`, integrating main `4df6e5e` before the final content batch.

## Scope and student behavior

The last seventeen PDF-only statement/solution records now use the native LaTeX reader, original cropped figures, source-labelled answer fields and worked solutions. The archive has **112 native documents, zero PDF-only records and 109 native answer-field definitions**. The three 2026 records retain their existing reader. This batch contains 217 source subparts, 104 automatic result fields, 113 source self-review fields and seventeen working-review fields. Multi-output derivations, sketches and convention-dependent results require explicit self-review. Automatic checks cover only the labelled result.

| Competition | Problems |
| --- | --- |
| IPhO | 2016 T1, 2017 T2, 2022 T2, 2025 T1–T3 |
| APhO | 2015 T2, 2016 T1, 2017 T1 and T3, 2022 T2, 2023 T1–T3, 2024 T1–T3 |

All 95 previously native records are preserved verbatim as objects. All 112 identities and metadata outside the statement/solution payloads are preserved. The preservation ledger records SHA-256 values for these comparisons. Original statement/solution PDFs remain byte-identical. Sixty-nine original figure crops have page, pixel bounds, source digest and output digest recorded in the figure ledger. The source ledger covers all 34 retained PDFs. No authentication, grading contract, schema, database, provider setting, feature flag or deployment changes.

## Source interpretation and corrections

- IPhO 2016 T1: retain the source angle conventions for the hidden disk, wheel station and Coriolis displacement. Treat the spring support constraint separately from a fixed support.
- IPhO 2017 T2: read the image-only statement and answer pages, including actual layer thicknesses 6, 9 and 15 km. The given speeds and ray parameter yield 184.063 s. The printed 151.647 s follows early rounding of slownesses near a turning point. Explain both calculations and avoid a unique numerical key.
- IPhO 2022 T2: the retained solution is an incomplete eight-page extract. Supplement it with the complete official theory solution and original answer sheet from the documented public mirror. Preserve both originals and crop the helium graph from the answer sheet. Distinguish graphical estimates, angular diffraction convention and sunshield escape fractions. Derive the stated radiation model consistently rather than silently substituting incompatible printed temperatures. Real-gas internal energy during throttling has no universal sign without an equation of state.
- IPhO 2025 T1: retain all rotation curves, hydrogen spectrum and sightline geometry. Explain the source Doppler-shift sign convention, near/far distance ambiguity and Newtonian versus MOND assumptions. Draw the source-position sketch rather than referring to an unavailable blank sheet.
- IPhO 2025 T2: retain lifting branches, pressure waveform and pulley arrangement. Separate instability from restoring motion. Include the complete pressure cycle and the half-work ratio.
- IPhO 2025 T3: retain bubble growth graph, train scale, film geometry, resonator and bottle image. Distinguish capillary pressure, Henry-law equilibrium, dynamical growth and cork expansion estimates.
- APhO 2015 T2: correct the dipole component sign and the electron circle's initial position. Use total dipole field in the magnetization ratio, retaining the source convention for the wind-pressure estimate. Include the square root in the mirror criterion and distinguish 60-degree versus 66-degree field-line data.
- APhO 2016 T1: retain all lattice configurations, indexed coordinates and force geometry. Check the small-oscillation kinetic coefficient and the asymptotic force scaling.
- APhO 2017 T1: retain circulation orientation, vortex-pair translation and rotation, lattice and ring-flow diagrams. State the leading-logarithm approximation and core cutoff.
- APhO 2017 T3: retain angular-momentum geometry, shell-current model and orbit averaging. Explain the source torque-component typo and the difference between perpendicular instantaneous and orbit-averaged braking.
- APhO 2022 T2: distinguish imposed opposing force from static friction and preserve symmetry-breaking conventions. Critical exponent is one half. Equilibrium and stability require the source force law, not an invented Coulomb model.
- APhO 2023 T1: retain the stated ion density of 10^12 per cubic metre rather than substituting the larger answer-sheet value. Day/night averaging halves ion drag and magnetic drag. Retain the gravity-corrected density in the neutral lifetime integral. Supply complete numerical tables with one consistent convention. Near 400 km neutral drag remains larger in this model, so the source ranking is not universal.
- APhO 2023 T2: derive the no-slip constraint, free-table invariant and charged-ball equations consistently. Correct the omitted rotation factor in the magnetic coefficient and the sign of the inferred charge. Explain the implicit zero-beta condition, inconsistent supplied inertia and signed spin needed in the final example. Return-time claims require the initial geometry, not a blanket trajectory period.
- APhO 2023 T3: use the actual stated pressure, density and surface tension. Explain incompatible prescribed gas pressure versus mechanical equilibrium. Correct the standing-wave force sign and the coefficient in quasi-steady dissolution. Graphical/convention-dependent results remain self-review fields.
- APhO 2024 T1: distinguish the ground annulus from the hemispherical hole area and restrict the angular branch for a monotonic range.
- APhO 2024 T2: distinguish side-wall trapping, end reflection and immersion constraints. State the bent-fibre centreline-radius convention. The example gives 9.79 degrees straight and 5.15 degrees bent acceptance.
- APhO 2024 T3: retain occultation, spectral and jet data. Distinguish telescope resolution from lunar occultation inference. Correct the annihilation wavelength's radiation-band label and retain the one-half factor in Newtonian accretion energy.

## Validation and limits

The existing native tests check every automatic reference and wrong result, KaTeX parsing, public-key redaction and source preservation. Batch-specific tests check all seventeen independent result rearrangements, common factor mistakes, 95 unchanged records, 112 preserved metadata objects, all original PDFs and crops, and sensitive earthquake, optical and orbital calculations. SEO expectations now include the formerly image-only earthquake statement. No SEO policy is changed.

All exact crop pixels were reviewed against the source pages. Local typecheck, lint, offline guards, server/component suites and production build run in the isolated checkout. Exact-head browser combinations and CI status are recorded on PR #181 before delivery. Separate expert review of the complete physics transcription remains pending. Native rendering and stateless checks do not imply official marking or rated persistence. This task does not authorize a merge or deployment.

Final recovery validation found two obsolete CSP harness assumptions after the last PDF-reader fixture became native. The calculator check now opens the existing full-working disclosure. A local-only fixture renders the unmodified production PDF viewer with the retained original document and production worker, preserving real PDF/text-layer coverage in all three browsers and both policy modes. The codec, domain-error, deferred-engine and negative-security controls remain. No production UI, CSP or middleware is changed.
