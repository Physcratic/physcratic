# Editorial difficulty review

10 November 2026. Reviewed base `ab8881007fa6fe040b87a1b0fdb6a85e2d12b295`.

## Method and coverage

The target solver is a strong Olympiad student. Ratings reflect independently required physical insights, model construction, mathematical derivation and interacting constraints after accounting for guidance in the statement. Review weights were 35% independent insight, 30% derivation, 25% conceptual integration and 10% length or routine work. They guided judgement, without a numerical scoring formula. Vocabulary, prerequisite sophistication and page count did not set ratings. These are editorial estimates, with no measured solving statistics or connection to player ratings.

Reviewed 118 distinct IDs in 13 batches of at most 12 problems. Coverage is 35 APhO, 40 IPhO, 25 EuPhO and 18 Physcratic originals. The imported reviews used the exact local original statement and official solution PDFs listed in the [assessment ledger](problem-difficulty-review.json), including relevant figures. Scanned IPhO 2017 sources were inspected as page images. Corpus and translation trees were not read recursively.

For the 18 originals, the review covers the complete current statements and worked solutions in `lib/arena/source-01.ts` through `source-06.ts`, plus their linked figures. Historical native PDFs and handwritten solutions were not inspected. No tracked PDF matches the 36 registry filenames, which are recorded individually in the ledger. Historical-source correspondence therefore remains insufficiently inspected. Main changed native titles and punctuation during the review. Those diffs were checked and do not change the physics assessed here.

All 118 current problems in the review set were inspected. Source inspection is distinct from correctness verification. Problems with specific source issues are marked `reviewed-with-source-issue` in the ledger. The infinite-V problem has no finite answer under its stated infinite geometry, so its unchanged 2300 is provisional and is excluded from comparison anchors.

62 estimates change and 56 remain. Every ID is preserved. All estimates remain integers from 800 to 3000 in steps of 50. The existing five bands and legacy filter ranges are unchanged.

## Anchor and neighbouring comparisons

Full-source review supports all seven provisional anchors: APhO 2019 T3 and 2023 T2 at 2950, APhO 2021 T2 and T3 at 2900, APhO 2024 T3 and 2025 T1 at 2300, and IPhO 2025 T1 at 2200. The upper group requires coupled dynamics, unsupplied invariants or second-order optical construction. The lower group supplies much of the model and separates the remaining steps.

Each batch was compared with these anchors and the accumulated neighbouring problems. APhO 2017 T1 and 2019 T2 retain 2750 for independent vortex or relativistic-plasma models. EuPhO 2023 T3 rises to 2600 for an unsupplied two-dimensional current boundary problem. EuPhO 2022 T3 rises to 2550 for its momentum invariant and limiting motion. Both remain below the upper anchors.

The originals provide useful lower comparisons. The GRIN problem retains 2500 for consistent cubic ray expansions. Beam bending falls to 2350 because its static derivation is staged. The supplied atomic-radiation model leads to a separable population equation at 2000. The charged dodecahedron rises to 1800 for the unsupplied face-normal geometry. These comparisons distinguish construction from notation and routine work.

## Changed estimates

| Problem ID | Old | Proposed | Physics assessment |
| --- | ---: | ---: | --- |
| apho-2006-t2 | 2300 | 1900 | Energy-level phase curves and shifted harmonic arcs determine dry-friction stopping and linear amplitude loss, without a non-routine differential equation |
| apho-2012-t1 | 2400 | 2050 | The dipole field and thin-ring decomposition are supplied, so induced emf and drag reuse one flux-force calculation and the final integral need not be evaluated |
| apho-2012-t3 | 2700 | 2100 | Successive polarization projections give the phase directly, and the supplied sphere coordinates reduce the geometric phase to a spherical sector area |
| apho-2013-t3 | 2600 | 2250 | The rotating-frame derivative and resonance targets are supplied, leaving vector precession, averaging counter-rotation and a guided uncertainty-versus-separation argument |
| apho-2014-t2 | 2500 | 2250 | Logarithmic wire potential and transverse impulse must be connected to interference geometry, while the relativistic wavelength and numerical parts are standard |
| apho-2014-t3 | 2550 | 1950 | The supplied deflection law leaves ring symmetry, small-angle lens geometry and a standard escape-energy calculation, without a relativity derivation |
| apho-2015-t1 | 2800 | 2050 | Classical Hall drift, Coulomb length scaling and Poisson charge variance carry the calculation, with fractional charge and flux quantization supplied |
| apho-2015-t3 | 2450 | 2100 | The Airy transmission and Zeeman law are given, leaving fringe-order selection, squared-radius inversion and repeated spectral-width algebra |
| apho-2016-t3 | 2650 | 2100 | Pair-breaking energies and resultant spin fields use supplied models, and the supplied Gaussian trial function and integrals reduce the orbital part to one-variable minimization |
| apho-2017-t2 | 2700 | 2500 | Impulse and encounter-rate estimates build dynamical friction and slingshot loss, but later inspiral stages reuse guided energy differentiation and matching |
| apho-2018-t1 | 2600 | 2400 | Dipole work and damped response lead to a Gaussian trap and uncertainty-based cloud model, with most intermediate constructions explicitly requested |
| apho-2018-t3 | 2550 | 2400 | Thermoelectric heat balances and the reversible Peltier relation are substantive, but the generator and refrigerator optimizations largely reuse one model |
| apho-2019-t3 | 2650 | 2950 | A.4-A.10 combine rotating frames, contact kinematics and dissipation, then require finding and proving the Jellett projection. Earlier vector identities guide the derivation but do not supply the conserved direction. |
| apho-2021-t2 | 2700 | 2900 | Derive anisotropic polarization and energy-flow directions, minimise an anisotropic optical path, then expand phase matching to second order to obtain emission cones. Bell probabilities are guided and do not drive the rating. |
| apho-2021-t3 | 2550 | 2900 | Translate film diffusion into receding images, sum the history of a moving source and differentiate to obtain dipole lift and drag. Skin-depth self-consistency adds a separate constraint despite the supplied integral. |
| apho-2022-t1 | 2500 | 2100 | Stern-Gerlach splitting reduces to two-stage classical trajectories and a supplied wire-field geometry, followed by magnetic moment and uncertainty algebra |
| apho-2022-t2 | 2650 | 2200 | The rotating-bead force diagram, effective potential and series are given, leaving equilibrium, stability and repeated small-oscillation algebra |
| apho-2022-t3 | 2550 | 2200 | The driven electron oscillator, dimensional scattering law and attenuation are guided separately, with Earth-curvature visibility geometry the main additional construction |
| apho-2023-t2 | 2550 | 2950 | Rolling and turntable back reaction must be eliminated together to classify conics. The charged-shell torque and transformed differential equation add independent modelling and asymptotic energy work. |
| apho-2024-t3 | 2600 | 2300 | Most tasks supply the astronomy model and reduce to graph reading, unit conversions, one power-law integral and one minimisation. Physical interpretation is needed, but no coupled dynamics comparable to the upper anchors. |
| apho-2025-t1 | 2500 | 2300 | The ring average and equivalent point masses are supplied. Remaining insights are the near-centre ring field and torque-to-precession geometry, followed by adding lunar torque. Far fewer independent choices than the rigid-body upper anchors. |
| apho-2025-t2 | 2750 | 2450 | Spin-wave linearization, neutron momentum balance and mean-field self-consistency require integration, but the Hamiltonian, torque model and expansion steps are supplied |
| apho-2025-t3 | 2450 | 2300 | Layer radiation balance, adiabatic lapse and condensation require several models, but each is specified and the halo calculation reuses Snell geometry |
| arena-an-atom-with-stage-fright | 2650 | 2000 | Expanding a two-state superposition and inserting its dipole into a supplied radiation law yields a separable population equation by energy balance. Quantum notation does not add independent insights. |
| arena-the-bending-beam-riddle | 2550 | 2350 | Static force and moment balance are broken into guided steps. Rotational inertia in the dynamic element is the main new construction, followed by routine dispersion. Below the cubic GRIN problem. |
| arena-the-dodecahedron-conspiracy | 1550 | 1800 | Flux sharing alone is easy, but the charged-face field requires a solid-angle argument, superposition and the unsupplied adjacent-normal geometry. More construction than a 1550 score reflects. |
| arena-the-gas-with-elbows | 2450 | 2200 | The statement supplies state energies, Gaussian and Stirling hints, the mean-field prescription and the target free energy. Excluded-volume pair counting is the main independent model choice. Most later steps are derivatives. |
| arena-the-phantom-charge | 2050 | 1800 | The supplied integral removes the non-routine quadrature. Annular potential, differentiation on either side and the energy barrier need fewer independent choices than its old score implies. |
| arena-the-quantum-escape-room | 2350 | 2100 | The statement leads the separation into conserved tangential momentum and imaginary normal momentum. Matching four linear conditions is routine algebra, followed by collision-rate escape. Less modelling than the old 2350 implies. |
| eupho-2017-t1 | 2250 | 1900 | The task asks for estimates. A physical-pendulum rope model and node-based length scaling suffice. No solution of the variable-tension wave equation is required, so 2250 overstates the derivation. |
| eupho-2019-t1 | 2000 | 2200 | Area ratios eliminate the unknown heat-transfer coefficient during melting, but the second part requires a thermal-lag differential equation. The two regimes justify parity with the galaxy anchor. |
| eupho-2019-t3 | 2050 | 2250 | A snapshot of a moving stream is not a single projectile trajectory. Infer the common safety envelope, prove a tangent is sampled and extract launch speed from the envelope geometry. More construction than 2050. |
| eupho-2020-t2 | 2150 | 2350 | The inextensible thread fixes one velocity component while its basis rotates. A separate post-detachment motion sets the true maximum speed. This hidden change of regime merits more than 2150. |
| eupho-2020-t3 | 2100 | 2500 | Must identify the bright region as a twice-imaged blur spot, convert intensity ratios to area and then infer lamp-camera separation. The unguided photometric and geometric inverse models exceed the old 2100. |
| eupho-2021-t1 | 2050 | 2300 | The leak keeps a fixed pressure difference while mass transfers between insulated chambers. Must separate an adiabatic gas parcel from the energy balance of the full system. Less routine than the old 2050. |
| eupho-2021-t3 | 2150 | 2450 | Infer a two-ray caustic from a photograph, locate its stationary angle and invert the wavelength-dependent displacement. The dispersion estimate needs second-order or numerical geometry without a supplied model. |
| eupho-2022-t1 | 2150 | 2300 | The narrow gap makes liquid inertia dominant. Construct continuity, effective kinetic energy and restoring energy rather than treating the cylinder as an isolated buoyant oscillator. Comparable modelling to the precession anchor. |
| eupho-2022-t3 | 2300 | 2550 | Translation and rotation exchange kinetic energy while magnetic forces do no work. Reversal needs a generalized-momentum invariant and the limiting asymptote needs another argument. More independent construction than the old 2300. |
| eupho-2023-t3 | 2400 | 2600 | Must construct a two-dimensional potential-current solution with motional emf, continuity and boundary matching. The induced electric field outside the magnetic footprint cannot be omitted. Less guided than its old 2400 suggests. |
| eupho-2025-t1 | 1950 | 2200 | Must construct the reflected-ray area map and distinguish path length from radial distance when finding shadow rings. Little guidance is supplied. This is comparable to the 2200 galaxy anchor despite its short statement. |
| eupho-2025-t3 | 2300 | 2500 | The unsupplied conserved-flux tube is the main insight. Combining its changing radius with the local field-line pitch gives a long helical length and requires checking the asymptotic approximation. More model construction than the old 2300. |
| ipho-2004-t3 | 2350 | 1950 | The driven-oscillator equation and sinusoidal ansatz are supplied. Lock-in averaging, mass sensitivity and Coulomb force-gradient shifts use short standard derivations. |
| ipho-2005-t1 | 2250 | 2050 | The full conic equations and conserved-quantity formulas are given, leaving radial-impulse energy, unchanged angular momentum and asymptote geometry |
| ipho-2007-t2 | 2150 | 2000 | Plate-force and spring balances are broken into small steps. The floating-node capacitor constraint and the factor-of-two transient oscillator displacement are the main additional insights. |
| ipho-2008-t1 | 2200 | 2400 | Changing water shape and mass alter torque across filling and spilling branches, which must also satisfy energy and maximum inflow-rate constraints |
| ipho-2009-t1 | 2350 | 2100 | Conservation laws and final synchronisation are explicitly staged. The nontrivial step is cancellation of the leading tidal torques, followed by a guided expansion and rate differentiation. |
| ipho-2009-t2 | 2500 | 2150 | Photon recoil and Doppler shifts are divided into explicit small steps. The excitation probability is supplied, leaving the two-beam force, its linear expansion and exponential cooling. |
| ipho-2010-t2 | 2200 | 2000 | Bernoulli and density assumptions are supplied. Connecting external hydrostatics to kinetic energy is the main step, followed by continuity and a heat balance that reuse the same relation. |
| ipho-2013-t2 | 2450 | 2250 | Displaced charge spheres require superposition. Subsequent equivalent capacitance, inductance and losses are explicitly staged energy identifications, with the radiation law supplied. |
| ipho-2014-t3 | 2500 | 2300 | Production, drift and recombination give a quadratic balance. Avalanche current has a supplied exponential form, leaving boundary conditions and secondary-emission feedback as the main independent steps. |
| ipho-2015-t1 | 2450 | 2200 | Wien integrals are supplied and solar-cell optimization is routine, while Cherenkov threshold energy and line-of-sight Doppler broadening add separate insights |
| ipho-2015-t2 | 2500 | 2300 | Least-action refraction and graded-index rays are staged with an integral hint, then the same stationary-phase relation is reused for electron interference |
| ipho-2015-t3 | 2550 | 2050 | Heat conduction is reduced to dimensional analysis and the leakage law is supplied, leaving standard center-of-mass collisions and one-variable cylinder optimization |
| ipho-2016-t2 | 2650 | 2400 | Inductive and capacitive stability must be distinguished, but the relaxation cycle and excitation threshold reuse piecewise RC exponentials |
| ipho-2017-t3 | 2400 | 2300 | Friedmann and inflaton equations are supplied, leaving expansion regimes and slow-roll derivative substitutions with a final observational constraint check |
| ipho-2018-t1 | 2500 | 2200 | Quadrupole components, power law and integration rule are supplied, so chirp-mass extraction is guided differentiation and graph inversion rather than relativistic model construction |
| ipho-2018-t2 | 2450 | 2200 | The radiation law and transverse missing momentum are given, leaving a separable loss equation and invariant-mass reconstruction with a quadratic ambiguity |
| ipho-2023-t2 | 2500 | 2300 | Binding models and the light-speed correction are supplied, with the main derivation an asymptotic delay integral and its change across orbital geometry |
| ipho-2024-t1 | 2250 | 2050 | The radiation laws and one-layer model are supplied, so the main choices are the reflection series and two coupled energy balances followed by routine differentiation |
| ipho-2024-t2 | 2550 | 2300 | Dynamic stabilization uses an explicitly supplied fast-slow decomposition, while laser cooling follows a given linear absorption law and a guided recoil balance |
| ipho-2025-t1 | 2350 | 2200 | Bohr and magnetic-energy steps are explicit. Density integration is supplied, leaving Doppler projection geometry, stable oscillations and piecewise MOND roots as the main demands. Breadth adds less than unguided model construction. |
| ipho-2025-t3 | 2500 | 2300 | Growth and drag laws, the acoustic piston mass and phase boundary are supplied, leaving linked balance equations and cork work with variable friction |

## Preserved estimates

These values remain defensible after source review. Exact source paths and file hashes for every assessment are in the ledger.

| Problem ID | Rating | Physics assessment |
| --- | ---: | --- |
| apho-2009-t1 | 2250 | Rolling constraints and coupled inertia are guided, while the final slip impulse and contact condition add a separate physical argument |
| apho-2011-t2 | 2500 | Stick-slip phase matching and a weak-damping extinction threshold require independent reasoning before transferring the model to a torsional hinge |
| apho-2013-t1 | 2500 | Equivalent line-charge placement must reproduce both cylindrical boundaries, then conductive current and a nontrivial Ampere loop determine the magnetic field |
| apho-2015-t2 | 2550 | Diamagnetic current from unequal orbit populations, a magnetic-moment invariant and atmospheric quenching combine several physical mechanisms |
| apho-2016-t1 | 2450 | Lattice geometry sets translational and rotational inertia, a singular large-size scaling and an unsupplied virtual-work choice of the best force point |
| apho-2017-t1 | 2750 | Vortex momentum changes, the energy-momentum velocity relation and image-vortex energy conservation near a corner require distinct insights despite the supplied analogy |
| apho-2017-t3 | 2500 | Free rotation and internal dissipation combine with eddy-current integration and a body-frame field derivative before orbit-averaged relaxation |
| apho-2018-t2 | 2500 | Elevator tension and taper equations, nanotube bond counting and a heliocentric escape orbit require several independent constructions |
| apho-2019-t1 | 2700 | Transmission-line impedance, charging energy including battery work and resonant spin-readout design require several distinct circuit and statistical arguments |
| apho-2019-t2 | 2750 | Relativistic mass loading and pressure conservation, synchrotron beaming and adiabatic particle redistribution combine distinct physical models |
| apho-2021-t1 | 2450 | Shock-frame balances, valve contraction and reflected pressure signs feed a coupled slow-closure recurrence, supporting the existing value |
| apho-2023-t1 | 2350 | Orbit energy loss combines drag and ion collection, with an atmospheric expansion and asymptotic fall-time integral, supporting the existing value |
| arena-a-grin-and-a-wiggle | 2500 | An unsupplied axial optical invariant gives amplitude-dependent ray phase. Two distinct cubic expansions and exit refraction must remain consistent. This warrants more than the guided precession anchor. |
| arena-mind-the-gap | 1350 | Spherical sag and reflected phase give the ring equation. Consecutive squared radii remove the unknown order. A short two-insight problem. |
| arena-the-bubble-treaty | 1750 | Combine Laplace pressure with the 120-degree film junction, cap volume and separate isothermal gas conservation. Unequal bubbles reuse the same junction geometry. |
| arena-the-capacitors-missing-energy | 2500 | Requires stress transformations, relativity of release simultaneity and work during unequal release times to close the field-plus-support energy budget. The intermediate questions guide but do not remove these choices. |
| arena-the-clock-in-the-racing-mirror | 2100 | Separate emission, reflection and arrival events, then combine angular aberration and Doppler shift to back-trace a virtual image. This is comparable to, but shorter than, the 2200 anchor. |
| arena-the-cosmic-kitchen | 2600 | Requires state counting, chemical-equilibrium ratios, photon abundance and expansion-era scaling before a comoving neutron-decay count. Many supplied intermediate tasks prevent comparison with the 2900 anchors. |
| arena-the-five-fold-collision | 2400 | Centre-of-momentum transformations, maximum lab deflection and the positive invariant mass of two remaining photons are separate insights. Substantially less coupled than the turntable anchor. |
| arena-the-infinite-v | 2300 | Integrating a half-plane reveals a logarithmic field divergence. Finite-cutoff stability combines angular and taut-string constraints. Retain the estimate provisionally because the infinite original has no finite requested answer. |
| arena-the-invisible-brake | 2200 | Flux-weighted angular averaging, momentum transport and cylindrical shear balance must be built independently. The heating calculation also needs an energy model, supporting parity with the galaxy anchor. |
| arena-the-string-that-answered-back | 1950 | Construct two wave segments and impose displacement continuity plus the driven slope jump. The second drive position reuses that model, keeping this below the 2200 galaxy anchor. |
| arena-the-three-way-wave-split | 1800 | Construct displacement continuity and transverse junction force balance, then combine zero reflection with a power ratio. A compact coupled-boundary problem below the galaxy anchor. |
| arena-titans-double-take | 1850 | Trace one- and two-reflection droplet rays and identify stationary deviation. The second bow reuses the extremisation, so no extra difficulty is assigned to the unfamiliar setting. |
| eupho-2017-t2 | 2200 | Incoming molecular flux and outgoing momentum have different temperature scales. Maximum speed follows flux suppression and needs a cooling-time consistency check. Comparable to the kinetic-theory original. |
| eupho-2017-t3 | 2450 | Recognise trapped flux as a boundary condition and construct two image dipoles that preserve the initial field while cancelling its change. A short but unguided model supporting the existing score. |
| eupho-2018-t1 | 2200 | Use centre-of-mass energy and angular momentum, recognising that closest approach freezes the shape so the assembly instantaneously rotates as a rigid body. A compact but independent construction near the galaxy anchor. |
| eupho-2018-t2 | 2400 | Must infer pressure reduction from diamagnetism and formulate virtual work or magnetic force balance, then justify neglecting vapour and hydrostatic pressures. Existing value reflects unguided model construction. |
| eupho-2018-t3 | 2300 | Convert a macroscopic profile into step spacing, then vary neighbouring step positions while preserving crystal volume. The constrained minimum supplies a nontrivial interaction exponent with little algebra. |
| eupho-2019-t2 | 2350 | Magnetic torque on a volume-charged rolling sphere must be combined with friction and the turning angular-momentum vector. Existing value reflects the coupled constraints without approaching the free-turntable anchor. |
| eupho-2020-t1 | 2250 | Construct an end-pole or reciprocal-flux approximation for a solenoid, then derive induced-current extrema and time scales. Existing value near the precession anchor is supported. |
| eupho-2022-t2 | 2450 | Current continuity across resistance jumps and fast thermal equilibration create a relaxation cycle. Must construct switching thresholds and two exponential segments before finding the period. Existing value is defensible. |
| eupho-2023-t1 | 2300 | Build radial heat balance in two regions and match temperatures, then use equal optical path to derive focusing. Two linked physical models support the existing value near the precession anchor. |
| eupho-2024-t1 | 2100 | Requires coupled deceleration and spin-up, then a sliding-to-rolling transition before the wall exit. The separable derivation is compact, supporting the existing value below the coupled-turntable anchor. |
| eupho-2024-t2 | 2250 | Velocity addition and simultaneous gift spacing are followed by a separate retarded-observation count. These two timing constructions justify the existing estimate near the galaxy anchor. |
| eupho-2024-t3 | 2350 | Losslessness and coherent cancellation constrain relative mirror phases. Stored cavity energy and decay after switching off require distinguishing amplitudes from powers. Less mathematical integration than the upper anchors. |
| eupho-2025-t2 | 2250 | Chain constraints make vertical displacement and rotation second order. Recognising the purely translational leading kinetic energy is essential to the stability and period. Shorter but less guided than the precession anchor. |
| ipho-2005-t2 | 2400 | Rotating-coil vector averaging, motional emf in two disks and a magnetic balance require separate constructions. Finite-displacement stability needs cancellation of symmetric first-order magnetic terms. |
| ipho-2008-t2 | 2300 | Wavefront envelopes and the mirror ring require distinct geometric constructions. Thresholds, angular resolution and chromatic broadening then combine optics with relativistic particle kinematics. |
| ipho-2010-t1 | 2300 | The image-charge ansatz is supplied, but its parameters, pendulum projection and the difference between interaction energy and total induced-charge energy still require independent reasoning. |
| ipho-2011-t1 | 2550 | The triangular orbit must be proved geometrically. Radial perturbations at equal primary masses require varying angular speed under conserved angular momentum and linearising the two-centre potential. |
| ipho-2012-t2 | 2450 | Capillary breakup must be combined with electrostatic surface pressure. Cross-coupled charging and the final drop energy require distinguishing applied potential from the drop self-field. |
| ipho-2013-t1 | 2250 | Camera triangulation, decay dating and impact angular momentum require separate models. Maximum impact speed combines solar escape, orbital motion and Earth attraction, but each derivation is short. |
| ipho-2013-t3 | 2400 | Hydrostatic ice shape, incompressible flow, depth dating and the geoid require several independent models. Potential equality for sea-level change adds substantial integration beyond routine algebra. |
| ipho-2016-t1 | 2400 | Hidden-disk inversion combines centre of mass and inertia. Rotating-station falls then require an inertial-frame construction for the first nonzero return and a Coriolis-driven trajectory, despite staged earlier parts. |
| ipho-2017-t2 | 2350 | Seismic head-wave geometry and continuous ray integration combine with shallow-water continuity and conserved energy flux, supporting the existing value |
| ipho-2018-t3 | 2300 | A supplied circuit analogy combines with tissue mass conservation, matched spherical heat flow and linearized narrowing of a branching vessel network |
| ipho-2019-t1 | 2300 | The collapse-front model is supplied, but center-of-mass fall, the finite unstretched segment and the final inelastic momentum sharing still need careful separation |
| ipho-2019-t2 | 2500 | Crossed-field drift must explain spoke focusing and synchronism, then dielectric phase lag must be connected to energy absorption and attenuation |
| ipho-2019-t3 | 2600 | Parcel thermodynamics, phase-shifted acoustic work and convected heat must be kept distinct, with weak-coupling orders consistently carried through |
| ipho-2021-t1 | 2400 | Layer pressure balances and leading-order ridge forces combine with ray-density mapping and an independent overlap argument for the last seismic shadow |
| ipho-2021-t2 | 2450 | The thin-ring capacitance needs matched near and far contributions, and the focusing impulse must include both charging and discharge |
| ipho-2023-t1 | 2400 | Random-walk moments, flux balance, persistent swimming regimes and disappearance of a force barrier require distinct statistical and mechanical reasoning |
| ipho-2023-t3 | 2350 | Hydrostatic pressure and surface tension must be combined into a surface invariant, then reused to cancel contact terms in the rod interaction force |
| ipho-2024-t3 | 2450 | Binary angular momentum, local accretion energy and polytropic hydrostatic and perturbation equations require several constructions despite detailed staging |
| ipho-2025-t2 | 2450 | Vapour-pressure branches and coupled mercury-volume constraints produce an unstable friction-driven switch, followed by constrained work optimization and a pressure-volume cycle |

## Sources requiring human physics review

These observations are review flags, not source corrections. The estimates follow the intended tasks except for the unchanged provisional infinite-V value.

| Problem ID | Source issue |
| --- | --- |
| apho-2014-t3 | Official part (c) awards arcs for an off-axis point source and penalizes the two-image result of a point lens. The small-angle justification in (f) also needs review. Rating follows the intended supplied-law geometry |
| apho-2019-t2 | Official C1 gyrofrequency includes an extra pitch-angle factor, and D2 distribution normalization needs checking for the energy-variable Jacobian. Human review needed, rating follows the intended models |
| apho-2019-t3 | Official A.10 prose infers constancy from torque perpendicular to a moving vector too quickly. Its final derivative supplies the needed second term. |
| apho-2021-t2 | Official C.5 switches between alpha+beta and alpha-beta in its trigonometric reduction. Human solution review needed. |
| apho-2021-t3 | Official C.3/C.4 use inconsistent numerical equilibrium heights. Does not change the required model construction. |
| apho-2023-t2 | Statement C gives I=mr^2/10 but C.5 and solution energy use 1/11. Initial conditions alone do not specify the zero effective-frequency branch used in C.4. Human physics review needed. |
| apho-2024-t3 | B.1 attribution of lunar-occultation fringes to telescope diffraction and several solution units/numerics need human review. Rating follows intended tasks, not repairing the paper. |
| arena-a-grin-and-a-wiggle | Native solution explicitly completes missing original part (e) and corrects part (c). Original handwritten solution not locally inspected. |
| arena-the-infinite-v | Human review required. Infinite geometry is divergent. Current worked solution regularises it using a cutoff absent from the statement. Preserved value is provisional. |
| arena-the-invisible-brake | Native solution adds a nearly incompressible-flow qualification needed by the wall-heating answer. |
| ipho-2017-t3 | dN = H dt with N = 0 at the end makes N negative before the end. D2 instead asks for N = 60, and the official solution reports no consistent integer. Human review of the sign convention is needed |

## Verification

Implementation and test code were verified at `73e26b6c7954258cf63b7f3bbd70f61a46d9ac0f` in a fresh worktree with Node 22.23.1 and pnpm 10.34.9. Later documentation adds the historical native filenames and verification record, without changing estimates or test assertions. [PR #135](https://github.com/Physcratic/physcratic/pull/135) records the final head SHA and remote checks.

| Local check | Result |
| --- | --- |
| Focused difficulty, rating bands and Arena tests | 21 pass |
| Frozen install, offline guards, Next typegen and TypeScript | Pass |
| ESLint with zero warnings | Pass |
| Full server suite | 790 pass, 24 DB-dependent skips, one inherited TODO, zero failures |
| Component suite | 136 pass |
| Separate disposable PostgreSQL 18.6 suite | 162 pass, zero skips |
| Release, mail/storage and operator guards | 17, 41 and 5 pass. Both package checksums intact |
| Production build | Pass through the existing clean-environment `scripts/csp/local.mjs --build` wrapper |
| Guest browser sweep | 336 combinations pass, zero failures. Minimum text 4.64:1 and border 3.70:1 |
| Signed-in browser sweep | 72 combinations pass, zero failures. Minimum text 5.25:1 and border 3.67:1 |

The focused command was `pnpm exec tsx --conditions=react-server --test lib/problem-archive.test.ts lib/rating-bands.test.ts lib/arena.test.ts`. Standard commands followed `.github/workflows/ci.yml`. The database command ran every top-level `lib/*.test.ts` referencing `AUTHORING_TEST_DATABASE_URL` inside `scripts/test-problem-authoring.sh`, with `AUTHORING_TEST_EXPECTED_VERSION=18.6`. Release guards ran in a separate disposable container. The PostgreSQL image digest was `sha256:123b17998ccaf47e53b502e8c6a1e79afd8f579c6f3eec83c563da026f957395`.

The first full server run caught the old dodecahedron filter expectation. Its move from 1550 to 1800 now has an explicit advanced-band assertion, and the rerun passes. The first release attempt lacked the disposable URL, then passed within the existing disposable harness. No assertion was relaxed to hide a failure.

Both browser runs used `SWEEP=1 node tests/solve-contrast.browser.mjs`, with system Chromium 154, external Playwright 1.64.1 and axe 4.14.0. Widths were 375, 390, 768 and 1440 in light and dark. The actual local production build used the existing loopback network guard, a separate disposable PostgreSQL container and one synthetic verified Better Auth account. Current migrations and fixture legacy tables were installed only there. The signed-in run supplied its synthetic session cookie. Existing suite mocks were retained. Optional admin and published authored-student stages were not enabled. These results do not establish physical-device, live-provider or deployment acceptance.

Remote checks on the implementation head are not green. [CI #291](https://github.com/Physcratic/physcratic/actions/runs/42727463465) and [community browser #31](https://github.com/Physcratic/physcratic/actions/runs/42727463198) report failure with no executed steps or logs. Fetching a job log returns `BlobNotFound`. Vercel statuses also report failure. No workflow rerun, billing/settings change or deployment operation was attempted. The PR records final-head check observations separately from these local results.

Regression checks cover the 100 imported and 18 original identities, missing ratings, integer bounds and steps, five-band and legacy-filter consistency, all seven anchors and selected relative rankings. No source statement, solution, grader, player rating, schema, filter implementation or UI is changed.
