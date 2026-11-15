# Native archive batch seven

15 November 2026. Continued on `codex/archive-next-20`, PR #181, from pushed head `c6e4ec668f4dfce6df336f5d25695aef72b348fd`. This is the second twenty-problem addition on that branch. Main is unchanged.

## Scope

Exactly 20 existing PDF problems become native statements and worked solutions. The archive retains 112 identities: 75 native documents, including 72 with stateless answer fields, and 37 PDF problems. This addition has 251 source subparts, 152 automatic result fields, 99 source self-review fields, 20 additional working-review fields and 48 source diagram crops.

| Competition | Problems |
| --- | --- |
| IPhO | 2004 T3, 2007 T2, 2008 T2, 2009 T2, 2011 T1, 2013 T3, 2016 T2, 2018 T1-T3, 2019 T2, 2021 T1 and T3 |
| APhO | 2009 T1, 2013 T3, 2018 T1, 2019 T1-T3, 2025 T1 |

The source ledger binds all 40 retained PDFs by SHA-256. The figure ledger binds each crop to its original PDF, page, render scale, crop rectangle and resulting PNG hash. Statements were checked against rendered pages, including graph axes and constants missed by extraction. Original PDFs remain accessible. Exactly these 20 collection records change. Their other metadata and the other 92 records remain unchanged relative to the starting head. Grading keys stay in server-only modules. Public metadata contains no keys. Proofs, diagrams, multiple accompanying results and model-dependent estimates explicitly require self-review.

## Source conventions and corrections

- IPhO 2004 T3: use the rendered k=1.0 N/m, Coulomb constant 9.0×10^9 and electron-charge magnitude 1.6×10^-19. The text extractor reverses some decimal digits. The mass resolution is about 1.7×10^-18 kg. Weak-damping resonance and signed versus magnitude lock-in signals are distinguished.
- IPhO 2007 T2: state the acceleration coordinate convention. The trigger capacitor is about 8.0×10^-11 F. The transient is not an equilibrium displacement.
- IPhO 2008 T2: distinguish the wavefront-envelope angle from the radiation angle. Momentum and visible-band half-widths use their specified conventions.
- IPhO 2009 T2: the source momentum after forward emission implies twice the printed first-order kinetic-energy loss. Correct the subsequent average cycle energy consistently. Use per-atom drag and total mass Nm consistently, cancelling N in velocity decay. Focused tests independently expand momentum and energy and reject the erroneous half-factor.
- IPhO 2011 T1: the stipulated radial angular-momentum-conserving perturbation is not a proof of unrestricted equal-mass triangular-point stability. LISA parameters describe the historical problem.
- IPhO 2013 T3: retain the sign in Sb=k H Hprime, distinguish positive downward depth from height above the bed, and evolve snowfall rates over the two separate age intervals. Isotope calibration and core graphs are retained.
- IPhO 2016 T2: distinguish stability with inductance from instability with shunt capacitance. Power is an order-of-magnitude self-review estimate. Dwell times and critical pulse duration are independently evaluated.
- IPhO 2018 T1-T3: preserve the quadrupole approximation, half-period readings, diameter-versus-radius escape condition, top-mass histogram interpretation, physical tumour-volume root and surface temperature heating requirement. The histogram weight is not a posterior probability between two candidates.
- IPhO 2019 T2: retain all field-line figures, cavity dimensions and temperature-dependent dielectric curves. Specify torque magnitude separately from signed work.
- IPhO 2021 T1 and T3: specify the leading-order fluid traction calculation and narrow-beam shadow approximation. Distinguish quantum-state occupancy, isotope gas density estimates, lattice saddles and true minima. The decay rate is positive and dN/dt is negative.
- APhO 2009 T1: dissipative skidding precedes conservative rolling, and maintaining contact at the top imposes an additional speed requirement.
- APhO 2013 T3: distinguish signed detuning from nonnegative precession speed. Rabi populations use the resonant rotating-wave approximation.
- APhO 2018 T1: use positive polarizability amplitude and a lagging phase, equivalent to the source's signed-amplitude convention. Fix Udepth=kBT0 for its numeric field. Keep uncertainty estimates and exact rms widths distinct. Equal Cartesian thermal widths represent a spherical cloud, even though combined radial rms width is sqrt(2) times one axial width.
- APhO 2019 T1: distinguish voltage reflection from power, junction lifetime capacitance from gate capacitance, and complex phase conventions. A matching capacitor is in series with the entire parallel SLQD network.
- APhO 2019 T2: the printed 40% momentum discrepancy does not follow from the displayed values and denominator. True gyration frequency is independent of pitch, while the velocity-direction sweep rate contains sin(phi). Retain pitch dependence in pulse duration. Adiabatic energy-bin conservation gives normalization (V/V0)^[-(p+2)/3], not the source's simple density dilution. Explain the finite-energy bounds and the assumptions needed for cooling-induced spectral steepening.
- APhO 2019 T3: differentiate the moving vector in Jellett's integral. Distinguish zero total normal-force power from nonzero centre-of-mass work. Stem-supported energy sketches do not extend the spherical-contact formula past stem contact.
- APhO 2025 T1: the removed-cap torque reverses sign for the remaining spheroid. Include both solar-field components and add the lunar torque before inverting for period.

## Validation and boundaries

Focused regressions cover every new problem, independent physical rearrangements, incorrect-factor rejection, selected numerical values, energy-momentum consistency, source/crop hashes and key privacy. General native tests validate every expression reference and LaTeX fragment. Local results: server 1,077 pass, 31 skip and one existing TODO, components 204 pass, focused native and batch-seven tests 153 pass, TypeScript and zero-warning lint pass, and offline safety guards pass. The synthetic production build is checked before publishing. Generated output is reproducible from the checked-in native modules.

The full public-library browser workflow retains its production library, real-session, no-JavaScript and PDF cases. Native guest and verified cases now run in separate matrix jobs, each retaining every native problem at both viewport widths and in both themes. This avoids serial growth beyond the job budget. IPhO 2016 T1 and 2025 T1 remain PDF fixtures. Exact-head remote browser, PostgreSQL and preview evidence is recorded in PR #181 after the push.

This is source transcription with independent calculations on selected results. The source ledgers deliberately retain `independentReview: pending` for a separate full expert review. No account attempts, ratings, persistence catalogue, database schema, migration, provider setting, deployment or merge is changed.
