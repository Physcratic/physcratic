# Full archive physics review

16 November 2026. Reviewed baseline `d6b7c91b88c3cd655033ce3d1c4305ba9b80299e`, including all **112** native archive problems. This is a Codex mathematical/model review. It is not external human examiner approval or an official marking scheme.

## Result

Fourteen problem records required corrections or clarifications. Three automatically checked responses now require self-review because the original question does not determine a unique applicable numerical/formula answer. These three definitions have key version 2. The other identities, original PDFs, figures and non-document metadata are preserved. The 109 stateless definitions now contain 1,189 fields: 679 automatic and 510 self-review. The three 2026 records retain their existing reader without automatic fields.

The review read every native statement, worked solution and automatic key. It checked conservation laws, signs, dimensions, limiting cases, numerical precision and whether the key checks the actual requested quantity. Existing independent physics tests were examined alongside new calculations. Disputed source formulas were compared with their retained original PDF pages. This was not a fresh character-by-character transcription audit of every original PDF page. The ledger binds all 112 reviewed records and all 188 distinct retained statement/solution PDF files. Supplemental source files remain separately bound by the batch-nine ledger.

## Corrections

| Problem | Finding and correction | Grading effect |
| --- | --- | --- |
| EuPhO 2017 T2 | Direct integration of the relative incident Maxwellian flux gives ratios 0.021283 at two thermal speeds and 0.0009579 at three. The source quotes 0.001 and 0.000001. The worked explanation now gives the flux integral and correct ratios. | Scaling keys unchanged. |
| EuPhO 2018 T1 | The unrestricted pair sum for centre-of-mass inertia lacks a half factor. Use the unordered sum instead of displaying a false equality followed by a note. | Final minimum separation unchanged. |
| EuPhO 2018 T3 | Correct profile inversion and the sign of the finite-difference power expansion. | Nontrivial exponent remains minus two. |
| EuPhO 2019 T1 | Supplied area and latent heat give a gravitational dissipation scale 0.147 K, about 0.15 K, rather than 0.17 K. | Existing temperature estimate tolerance remains appropriate. |
| APhO 2012 T1 | Joule heat for a changing current is a time integral. Clarify microscopic zero magnetic work versus mechanical braking and transfer through induced electric fields. | Existing scalar keys unchanged. |
| APhO 2012 T3 | Repair the instantaneous sine and cross-term signs in both alternate polarization expansions. | Time-averaged intensities unchanged. |
| APhO 2014 T2 | Remove the stale claim that the mixed plane/spherical-wave source estimate has an automatic numerical field. | Already self-review, retained. |
| APhO 2017 T1 | Each equal-circulation vortex traces a full circle while remaining opposite its partner. | Existing keys unchanged. |
| IPhO 2023 T1 | At the deterministic coagulation threshold the force has a double zero. A separated pair approaches it asymptotically. Finite-time passage requires concentration strictly above the critical value. | Critical-concentration formula unchanged. |
| IPhO 2024 T1 | A function defining the Wien equation is not unique: multiplying by a nonzero constant leaves the same equation. | Equation response becomes self-review. Numerical Wien-constant check remains. |
| IPhO 2022 T2 | The diffraction task asks for an estimate. Equal-area circular Airy diameter is 45.0 micrometres, while a simpler diameter convention gives 36.9. The old narrow field contradicted the explanation's allowed approximations. | Diffraction estimate becomes self-review with explicit conventions. |
| APhO 2023 T3 | The adiabatic Rayleigh-Plesset initial-value problem cannot reach the quoted vacuum-growth asymptote. Direct integration gives a first maximum radius 52.6846 micrometres after about 70.612 microseconds, then rebound. The formal 1.25 m/s large-radius branch is dynamically disconnected. An isothermal-air model does allow unbounded growth. The initial acceleration ratio is not a settling time. | Vacuum response becomes self-review, with both thermal models explained. |
| IPhO 2026 T1 | Repair the squared angular-momentum typo in the positron eccentricity, distinguish the signed deflection from the positive angle, and restore two missing factors of two in the alternate ozone derivation. Impose nonnegative product momentum. At backward/right-angle emission the frequency is an infimum with zero product momentum, whose direction is undefined. | This reader has no automatic fields. Correct native solution and annotate the source discrepancies. |
| IPhO 2026 T2 | Correct the intermediate Taylor coefficient of cotangent to minus twice cosecant squared. | Final caustic and cusp answers unchanged. |

## Important model qualifications retained

- IPhO 2011 T1's equal-mass radial frequency assumes a restricted radial/angular-momentum model. It does not establish stability of the unrestricted triangular three-body system.
- APhO 2017 T2 explicitly uses its supplied radiation coefficient. It is not the standard circular-binary quadrupole coefficient. The computed merger time is conditional on that exercise law.
- APhO 2025 T2's one-neighbour energy replacement has its stated approximate critical temperature. It is neither standard two-neighbour mean field nor an exact nonzero-temperature transition of the short-range one-dimensional Ising chain.
- IPhO 2022 T2's difference-flux shield recurrence is an exercise approximation, distinct from a physical sum-emission view-factor model. Its displayed recurrence and numerical temperatures are kept internally consistent.
- APhO 2021 T2's cone formulas retain the supplied linear angular-index expansion. General second-order angular dispersion requires additional derivatives.
- Uniform-density discharge, ideal atmosphere, local accretion-energy, frozen-field, friction and instantaneous-switching models are assessed within their explicit assumptions. They are not precise predictions for real discharge tubes, the ISS, accretion discs or hardware.
- Source contradictions already documented in batches one through nine remain visible. Ambiguous signs, drawings, convention-dependent quantities and multi-result derivations retain self-review rather than fabricated unique keys.

## Verification

New regressions independently integrate the Maxwellian incident flux and the Rayleigh-Plesset initial-value problem, minimize the ozone final-state kinetic energy with a nonnegative momentum constraint, finite-difference the reflected-ray slope and verify the changed self-review/version boundaries. Exact record digests bind the fourteen corrections and preserve the other 98 records. The previous batch-nine preservation ledger remains immutable: regression tests chain each approved correction from its original digest to its reviewed digest. All original PDF and figure provenance checks remain enforced.

Final local suites, production browser results, exact commit and PR are recorded on the delivery PR. No merge, production/shared database, provider, flag or deployment action is authorized or performed by this review. External human physics sign-off remains pending.

## Per-problem coverage

Every row received a statement/solution/key model review. A row without a new correction means no additional error was found under the documented assumptions. It is not a guarantee that every source assertion is exact or that every physically equivalent student derivation can be machine-graded.

| Problem | Physics checked | Result |
| --- | --- | --- |
| apho-2006-t2 | Shifted phase ellipses, static sticking interval and half-cycle count | No additional error found |
| apho-2009-t1 | Rolling signs, outer-shell torque and initial skid energy loss | No additional error found |
| apho-2011-t2 | Stick-slip symmetry, dissipative threshold and thin-wall torsion | No additional error found |
| apho-2012-t1 | Flux derivative, drag-power integral and microscopic versus macroscopic work | Corrected above |
| apho-2012-t3 | Instantaneous polarization fields, projections and oriented phase branch | Corrected above |
| apho-2013-t1 | Bipolar equipotentials, leakage RC identity and Ampere-field branches | No additional error found |
| apho-2013-t3 | Rotating-frame derivative, Rabi populations and beam-resolution uncertainty | No additional error found |
| apho-2014-t2 | Electron impulse, relativistic wavelength and distinct plane/spherical models | Corrected above |
| apho-2014-t3 | Point-source lens equation, angular geometry and Newtonian-radius limitation | No additional error found |
| apho-2015-t1 | Hall drift, flux increment, Coulomb scale and Poisson charge variance | No additional error found |
| apho-2015-t2 | Dipole signs, magnetic-moment invariant, loss cone and pressure convention | No additional error found |
| apho-2015-t3 | Etalon phase width, full Zeeman gaps and transmitted-comb estimates | No additional error found |
| apho-2016-t1 | Plate-centre kinetic metric, potential curvature and optimal virtual work | No additional error found |
| apho-2016-t3 | Spin signs, Gaussian variational energy and Ising pair criterion | No additional error found |
| apho-2017-t1 | Circulation, vortex impulses, leading logarithms and wall-image invariant | Corrected above |
| apho-2017-t2 | Scattering impulse, slingshot rate and supplied nonstandard radiation coefficient | No additional error found |
| apho-2017-t3 | Rigid-body energy, shell-current torque and orbit-averaged spin evolution | No additional error found |
| apho-2018-t1 | Passive polarizability phase, radiative loss and oscillator-width conventions | No additional error found |
| apho-2018-t2 | Rotating-cable force balance, taper equation and explicit nanotube-area model | No additional error found |
| apho-2018-t3 | Split Joule heat, Kelvin relation and generator/refrigerator extrema | No additional error found |
| apho-2019-t1 | TEM energy, complex reflections and exact matching-network topology | No additional error found |
| apho-2019-t2 | Proper-density flux, pressure integral and adiabatic spectral-bin Jacobian | No additional error found |
| apho-2019-t3 | Moving contact point, contact power and differentiated Jellett invariant | No additional error found |
| apho-2021-t1 | Moving-front continuity, stated bulk modulus and valve-reflection recursion | No additional error found |
| apho-2021-t2 | Maxwell eigenmodes, walk-off geometry and normalized entangled probabilities | No additional error found |
| apho-2021-t3 | Receding-image boundary condition, lift/drag limits and levitation stiffness | No additional error found |
| apho-2022-t1 | Two-wire field signs, pole geometry and beam-deflection uncertainty | No additional error found |
| apho-2022-t2 | Specified bead force law, potential curvature and directional limiting friction | No additional error found |
| apho-2022-t3 | Signed molecular response, Rayleigh attenuation and fixed visibility reference | No additional error found |
| apho-2023-t1 | Orbital drag power, gravity-corrected density and consistent day/night averaging | No additional error found |
| apho-2023-t2 | Rolling constraint, conserved conic branch and signed electromagnetic coefficients | No additional error found |
| apho-2023-t3 | Rayleigh-Plesset first integral, inaccessible growth branch and diffusion balance | Corrected above |
| apho-2024-t1 | Projectile envelope and source-band to ground-annulus Jacobian | No additional error found |
| apho-2024-t2 | Separate side/end reflection conditions and bent-fibre impact parameter | No additional error found |
| apho-2024-t3 | Occultation projection, spectral luminosity units and accretion half-factor | No additional error found |
| apho-2025-t1 | Ring tidal tensor, removed-cap torque and averaged lunar contribution | No additional error found |
| apho-2025-t2 | Signed spin torque, dispersion and prescribed versus exact 1D statistical models | No additional error found |
| apho-2025-t3 | Radiative balances, Gaussian line width, buoyancy sign and halo deviation | No additional error found |
| eupho-2017-t1 | Hanging-rope tension, pendulum estimate and Bessel-mode ratios | No additional error found |
| eupho-2017-t2 | Half-Maxwellian incident flux, momentum transfer and cooling scales | Corrected above |
| eupho-2017-t3 | Trapped normal flux, image dipoles and restoring-force derivative | No additional error found |
| eupho-2018-t1 | Centre-of-mass energy, pair inertia and turning configuration | Corrected above |
| eupho-2018-t2 | Diamagnetic pressure, solenoid field and boiling approximation | No additional error found |
| eupho-2018-t3 | Profile inversion, volume-preserving step variation and exponent | Corrected above |
| eupho-2019-t1 | Heat-area ratios, thermal lag and gravitational dissipation estimate | Corrected above |
| eupho-2019-t2 | Charge-volume force and torque, rolling constraint and circular orbit | No additional error found |
| eupho-2019-t3 | Ballistic envelope, continuous-stream maximum and graph uncertainty | No additional error found |
| eupho-2020-t1 | Mutual inductance, source work, Lenz signs and end-force limits | No additional error found |
| eupho-2020-t2 | Rotating velocity basis, detachment and translating-frame maximum | No additional error found |
| eupho-2020-t3 | Radiance conservation, paraxial lens conjugates and crescent geometry | No additional error found |
| eupho-2021-t1 | Open-chamber energy balance and entropy of the remaining gas | No additional error found |
| eupho-2021-t2 | Unfolded capstan geometry, normal reaction and arc-length integral | No additional error found |
| eupho-2021-t3 | Snell-law fold, paired images and second-order dispersion width | No additional error found |
| eupho-2022-t1 | Annular liquid inertia, continuity and gravitational curvature | No additional error found |
| eupho-2022-t2 | Current relaxation, resistance switching and squared-temperature ratio | No additional error found |
| eupho-2022-t3 | Generalized momentum, Lorentz torque, separatrix and asymptote | No additional error found |
| eupho-2023-t1 | Radial heat flow, matched temperature slope and optical-path curvature | No additional error found |
| eupho-2023-t2 | Equal Coulomb-friction forces and conserved difference of relative speeds | No additional error found |
| eupho-2023-t3 | Normal-current continuity, dipolar potential and total Joule loss | No additional error found |
| eupho-2024-t1 | Translation-spin impulse, sliding-to-rolling threshold and piecewise exit speed | No additional error found |
| eupho-2024-t2 | Emission-event boosts, arrival intervals and past-light-cone counting | No additional error found |
| eupho-2024-t3 | Unitary mirror coefficients, stored energy and energy-decay convention | No additional error found |
| eupho-2025-t1 | Reflected-strip power and both first-order ring-position contributions | No additional error found |
| eupho-2025-t2 | Tension moments, second-order constraints and small-oscillation inertia | No additional error found |
| eupho-2025-t3 | Thin flux-tube conservation and tightly wound field-line length | No additional error found |
| ipho-2004-t3 | Damped oscillator phase, lock-in averaging and electrostatic gradient | No additional error found |
| ipho-2005-t1 | Conic energy, unchanged angular momentum and escape asymptote | No additional error found |
| ipho-2005-t2 | Faraday emf, motional disc voltage and balance restoring torque | No additional error found |
| ipho-2007-t2 | Fixed-charge energy, differential force and step-response overshoot | No additional error found |
| ipho-2008-t1 | Water centroid, spilling geometry and approximate torque-cycle areas | No additional error found |
| ipho-2008-t2 | Cherenkov threshold, relativistic momentum and angular half-widths | No additional error found |
| ipho-2009-t1 | Tidal-torque expansion, angular momentum and mechanical energy loss | No additional error found |
| ipho-2009-t2 | Photon energy-momentum balance, detuning signs and friction per atom | No additional error found |
| ipho-2010-t1 | Sphere image charge, energy half-factor and pendulum stiffness | No additional error found |
| ipho-2010-t2 | Chimney hydrostatics, Bernoulli draft and heat-flow efficiency | No additional error found |
| ipho-2011-t1 | Triangular force balance and explicitly restricted radial approximation | No additional error found |
| ipho-2012-t2 | Capillary detachment, electric pressure and dropper energy limit | No additional error found |
| ipho-2013-t1 | Meteor triangulation, thermal diffusion, isotope decay and impact momentum | No additional error found |
| ipho-2013-t2 | Charge-cloud restoring energy and equivalent circuit power accounting | No additional error found |
| ipho-2013-t3 | Ice pressure tractions, mass conservation, age integral and sea potential | No additional error found |
| ipho-2014-t3 | Pair production-recombination balance and Townsend feedback threshold | No additional error found |
| ipho-2015-t1 | Wien integrals, optimum band gap, neutrino Doppler width and energy transfer | No additional error found |
| ipho-2015-t2 | Fixed-energy action, optical invariant and two-slit phase difference | No additional error found |
| ipho-2015-t3 | Mass defect, cylindrical heat flow, elastic collisions and leakage optimization | No additional error found |
| ipho-2016-t1 | Excess-mass inertia, gravity gradients and correct station-return branch | No additional error found |
| ipho-2016-t2 | Load-line intersections, inductive stability and capacitive dwell times | No additional error found |
| ipho-2017-t2 | Seismic ray parameter, head-wave geometry and turning-point rounding | No additional error found |
| ipho-2017-t3 | Continuity equation, curvature scaling and signed e-fold convention | No additional error found |
| ipho-2018-t1 | Quadrupole derivatives, orbital chirp integration and compactness estimate | No additional error found |
| ipho-2018-t2 | Synchrotron dimensions and unsquared neutrino four-momentum constraint | No additional error found |
| ipho-2018-t3 | Vessel-network scaling, complex transfer and tumour heat-flow boundaries | No additional error found |
| ipho-2019-t1 | Variable-mass collapse, centre-of-mass fall and dissipated spring energy | No additional error found |
| ipho-2019-t2 | Crossed-field drift, cavity estimate and dielectric loss balance | No additional error found |
| ipho-2019-t3 | Acoustic parcel phases, cycle work and transported heat | No additional error found |
| ipho-2021-t1 | Hydrostatic crust loads, seismic circular rays and surface-energy normalization | No additional error found |
| ipho-2021-t2 | Ring-potential curvature, lens impulse and complete RC discharge tail | No additional error found |
| ipho-2021-t3 | Level filling, dipole decay, lattice saddles and Rydberg length | No additional error found |
| ipho-2022-t1 | Dipole forces, chain support, permeable images and removal-energy counting | No additional error found |
| ipho-2022-t2 | Diffraction conventions, Poisson counts, conditional shield model and enthalpy | Corrected above |
| ipho-2022-t3 | Bending and capillary scales, proper-time legs and critical damping | No additional error found |
| ipho-2023-t1 | Impulse response, diffusion moments and deterministic force-barrier threshold | Corrected above |
| ipho-2023-t2 | Binding extrema, fission energy, clock sign and Shapiro logarithms | No additional error found |
| ipho-2023-t3 | Capillary first integral, contact-force signs and midpoint symmetry | No additional error found |
| ipho-2024-t1 | Spectral maximum, multiple-reflection albedo and coupled heat sensitivities | Corrected above |
| ipho-2024-t2 | Ring-field instability, micromotion averaging and recoil-heating balance | No additional error found |
| ipho-2024-t3 | Conservative mass transfer, supplied disc model and polytrope stability | No additional error found |
| ipho-2025-t1 | Bohr scales, hyperfine convention, sightline geometry and MOND interpolation | No additional error found |
| ipho-2025-t2 | Hydrostatic load, pressure switching and limiting cycle-work optimization | No additional error found |
| ipho-2025-t3 | Gas transport, film retraction, Helmholtz mode and cork work | No additional error found |
| ipho-2026-t1 | Gate torque, two-body conics and constrained nonnegative-momentum ozone threshold | Corrected above |
| ipho-2026-t2 | Specular ray geometry, tangent envelope and cusp Taylor expansion | Corrected above |
| ipho-2026-t3 | Magnetic source work, exact entropy differential and finite-cooling Carnot integral | No additional error found |
