# Native archive batch eight

15 November 2026. Continues `codex/archive-next-20`, PR #181, from published `88fbf5ca18dc7934345c00b8a6c07906d2006a6c`. Current main `b707773d6adf0278a70a2e21ce511a8ccad7409d` was merged cleanly before this batch. This is the third twenty-problem addition on this branch. No merge to main or deployment is performed.

## Scope

Exactly 20 existing PDF archive records become native LaTeX statements and worked solutions. The archive retains 112 identities, with **95 native documents, 92 stateless answer-field definitions and 17 PDF problems**. This addition contains **278 source subparts, 142 automatic fields, 136 source self-review fields, 20 additional working-review fields and 50 original figure crops**. Its 40 retained PDFs contain 251 source pages.

| Competition | Problems |
| --- | --- |
| IPhO | 2008 T1, 2017 T3, 2021 T2, 2022 T1, 2023 T1, 2024 T1-T3 |
| APhO | 2015 T1 and T3, 2016 T3, 2017 T2, 2018 T3, 2021 T1-T3, 2022 T1 and T3, 2025 T2-T3 |

The source ledger binds every statement and solution PDF by SHA-256. The figure ledger records source SHA, page, render scale, source-page size, crop rectangle and PNG hash. All statement pages were rendered and reviewed, and IPhO 2017 T3 required OCR because its prose is outlined. Crops were reviewed again after generation and corrected to retain labels, graph axes, complete histogram data, circuit connections and prism geometry. Source raster-figure bounds were used where available, with manual bounds for vector figures.

Exactly the selected twenty collection records change relative to `88fbf5c`. Their other metadata and the remaining 92 individual records are preserved byte for byte. Original PDFs are retained. Keys stay server-only, and public metadata has no canonical answers or grading policy. These are stateless checks, with no change to the existing 30-problem account-persistence catalogue. Each source subpart has a field. Derivations, sketches, model-dependent estimates and accompanying results explicitly require self-review even where one labelled result is checked automatically.

## Source conventions and corrections

- IPhO 2008 T1: dry lever centre is about 0.0157 m from the pivot, not the decimal-shift typo in one source substitution. The balanced remaining water mass is about 0.605 kg. The rest-mode restoring coefficient uses the source's explicitly fixed-centroid-arm approximation. Graph work uses radians, even when a common degree factor cancels in an area equality.
- IPhO 2017 T3: define critical mass density consistently as H²/A1. Explain the source's inconsistent extra c² and its positive-60 e-fold convention despite N=0 at the end and dN=Hdt. Compare both signed and remaining-e-fold conventions, without presenting an unphysical branch as a viable model.
- IPhO 2021 T2: signed negative ring charge focuses electrons in the pulsed transverse lens. Static radial and axial stability differ. Include the complete RC discharge tail when integrating the electron impulse. Effective charge is CV0, not the largest attained charge.
- IPhO 2022 T1: preserve finite closed magnetic flux paths at a permeable plate. The retained statement refers to a separate answer sheet for three field-line points. The native task explicitly describes the three path families and supplies the original worked sketch in the solution. Maxwell pressure includes both inner and return-annulus regions. Single-sphere removal energy is not divided by two, and accepted alternative square-lattice patterns remain self-reviewed.
- IPhO 2023 T1: retain the full displacement frequency table and microbe MSD plot. Separate deterministic force-barrier disappearance from simply setting the energy-barrier height to zero. State the scale hierarchy needed for the three microbe regimes.
- IPhO 2024 T1: distinguish a one-percent relative increase in infrared absorptivity from one percentage point. Include multiple visible reflections and the differentiated coupled surface/atmosphere balances with non-radiative transfer. Numerical checks independently solve those balances.
- IPhO 2024 T2: distinguish angular RF frequency from cycles per second. State the one-dimensional recoil model, lifetime-width convention, counterpropagating beam signs and zero-mean re-emission.
- IPhO 2024 T3: state conservative transfer and orbital angular-momentum conservation, the local annulus energy model, negative signed central gravity and marginal rather than restoring stability at gamma=4/3. Retain the full density-gradient graph used to infer gamma.
- APhO 2015 T1: distinguish electron drift from conventional current. One extra quasihole uses one h/e flux quantum. The noise convention is charge variance per time, without importing an extra spectral-density factor of two. Vortex kinetic energy remains an order-of-magnitude self-review result.
- APhO 2015 T3: inspect rendered decimals rather than extraction order. Keep ring order, FWHM, free spectral range and individual linewidth distinct. Report the source's rounded 946 versus approximately 947 LED lines as an estimate with finite-band endpoint ambiguity.
- APhO 2016 T3: distinguish classical ring gyromagnetic factor from the doubled electron spin factor. The two-electron paramagnetic criterion is the exercise model, not the full condensation-energy Pauli limit. Use absolute field magnitude for the orbital Gaussian width.
- APhO 2017 T2: retain the exercise's supplied gravitational-radiation coefficient. State both accepted binary-formation estimates and carry one convention consistently through the late-stage times. Slingshot estimates assume a replenished stellar population.
- APhO 2018 T3: retain half the Joule heating at each end, the opposite generator/refrigerator roles and the distinction between maximum power, maximum efficiency, maximum cooling and maximum COP. Correct the source's T1-minus-T1 numerator typo.
- APhO 2021 T1: distinguish upstream laboratory front speed from acoustic speed relative to water. The slow-closure recursion explicitly uses the source approximation Ph≈P0. State interior one-sided front limits separately from exact valve boundary conditions. Use the corrected appendix pressure-velocity coordinates.
- APhO 2021 T2: use normalized vector polarization formulas rather than an inconsistent expanded component. Preserve the source's stated paraxial angular-index approximation and explain the additional derivatives needed for a more general expansion. Correct the CHSH correlation to the sum-of-angles convention implied by the given symmetric entangled state. The specified settings still give 2sqrt(2).
- APhO 2021 T3: distinguish zero total initial normal field from the nonzero image field. Differentiate fields while holding image sources fixed before evaluating dipole force. Report angular oscillation frequency in rad/s, not the source's loose kHz label.
- APhO 2022 T1: preserve the two wire current directions, negative signed field gradient and positive force magnitude. Distinguish half-spot displacement from full beam separation and state both accepted interpretations of a 20-percent speed spread. Restore the omitted 10^-23 factor in the final moment uncertainty.
- APhO 2022 T3: distinguish signed cloud displacement, dipole vector and positive amplitude. Retain the source's equal-effective-luminosity inverse-square visibility model and keep the unpolluted Kanchenjunga reference fixed after pollution.
- APhO 2025 T2: the source neutron angles are measured from the chain normal in its figure, despite its prose. The prescribed one-neighbour average-energy ansatz is explicitly distinguished from a conventional two-neighbour local mean field and from the exact one-dimensional chain, which has no finite-temperature ordered phase.
- APhO 2025 T3: distinguish an observer-frame Doppler shift from the opposite shift of laboratory resonance frequency for an approaching absorber. Preserve lapse-rate signs, mass-versus-mole water fraction conversion, the dilute-water approximation and the prism's transmitted-ray domain. The condensation root and 22-degree halo remain native tasks.

IPhO 2022 T2 was deferred after source inspection because its retained solution omits the final part and its statement refers to missing answer-sheet graph inputs. This batch uses complete IPhO 2024 T2 instead. IPhO 2016 T1 and 2025 T1 remain PDF regression fixtures.

## Validation and boundaries

Focused native and batch-eight tests: **192 pass**. Full local server suite: **1,122 pass, 31 skip and one inherited TODO**. Components: **204 pass**. TypeScript, zero-warning lint and offline safety guards pass. The frozen installation and synthetic production build are checked before publication. Conversion updates two SEO regression expectations because IPhO 2017 T3 now contains enough native text to be indexable. No SEO policy changes.

Independent regressions cover all twenty problems, reject wrong factors or signs, recompute selected source numerical results and coupled climate sensitivities, and verify source/crop hashes and public key privacy. General native checks render every LaTeX fragment and exercise every reference answer. The full guest and verified native browser matrix retains all problems in both viewport sizes and themes. At 92 definitions it covers 368 combinations per session, 736 total. Exact-head Actions and preview evidence belongs to PR #181 after push.

Source ledgers retain `independentReview: pending` for a separate full expert content review. No independent full review is claimed. There are no account writes, live database operations, migrations, credentials, provider settings, manual deployment or changes to main in this batch.
