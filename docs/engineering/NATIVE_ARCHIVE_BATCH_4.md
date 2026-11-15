# Native olympiad archive conversion, batch 4

## Scope

Base main `81d9cc525b2579dc467d26a327d5f964ead74242`, following merged #179. Exactly ten additional PDF records gain native statements, LaTeX, worked solutions, source diagrams and existing Arena answer controls:

| Problem | Title | Automatic fields | Self-review fields |
| --- | --- | ---: | ---: |
| EuPhO 2017 T1 | Oscillating rope | 3 | 1 |
| EuPhO 2017 T2 | Disk in gas | 2 | 1 |
| EuPhO 2017 T3 | Superconducting mesh | 1 | 0 |
| EuPhO 2021 T1 | A leak | 3 | 0 |
| EuPhO 2021 T2 | Thread around a cylinder | 1 | 0 |
| EuPhO 2021 T3 | Glass ball | 2 | 1 |
| EuPhO 2022 T1 | Floating cylinder | 1 | 0 |
| EuPhO 2022 T2 | Thermal oscillations | 4 | 1 |
| EuPhO 2022 T3 | Dipole in a magnetic field | 8 | 1 |
| EuPhO 2023 T1 | Thermal lens | 3 | 2 |

There are 28 automatic fields and seven self-review fields. The archive remains 112 records: **25 native, 87 PDF-based**. Twenty-two archive conversions now have answer fields, alongside the three previously native IPhO 2026 records. All other 102 collection records remain structurally unchanged. Existing identities, titles, ratings and original source documents are preserved. This is the requested ten-problem session, not completion of all remaining PDFs.

## Source review and corrections

Transcriptions were compared with rendered original statement and solution pages. The 2017 set occupies three shared solution pages, the 2021 set five, and the 2022 set seven. The selected 2023 T1 solution occupies the first four pages of its shared document. Native documents contain only their own problems. Twenty-five original figure crops preserve labels, axes, ray constructions and photographs, including the enlarged measurement image for Glass ball. The figure ledger binds original PDF hashes, render sizes, page numbers, crop coordinates and output hashes. The source ledger binds both PDFs per problem. Original examiner marking tables remain in the reference PDFs. Independent human source/physics review remains pending.

- Rope: retain the physical-pendulum model and node-similarity approach. Correct the source's inconsistent subscripts and below-node length label. The frequency box explicitly uses the supplied rod estimate. Graph tolerances admit measured ratios and the flexible-string eigenmode results.
- Disk: fields compare scaling estimates with order-one coefficients set to one, explicitly labelled in the help. Reasoning remains self-review. The source calls the initial-maximum-power cooling estimate an upper bound, although it is a lower estimate for cooling time. Correct the inequality direction and retain the slow-cooling conclusion. Do not claim a unique exact kinetic-theory prefactor.
- Mesh: positive force points away from the plane. Include both trapped-flux image dipoles and the small-displacement restoring-force check.
- Leak: preserve adiabatic parcel invariants, total compression work and the two distinct final temperatures. State the useful dimensionless variable x in every field.
- Thread: preserve the non-planar cusp geometry, unfolded force balance, arc-length integral and zero-friction limit. Use the logarithmic inverse-hyperbolic-sine form supported by the existing parser.
- Glass ball: retain both official ray constructions and measured-index alternatives. Use absolute index tolerances 0.03 and 0.003. Neither the ray diagram nor the choice of measured width is automatically assessed.
- Floating cylinder: retain the fast annular-flow inertia and both energy and dynamical derivations. The supplied narrow-gap dimensions justify neglecting the slower liquid underneath.
- Thermal oscillations: thresholds assume T_c>T_0, with ordered temperature sample ranges. Preserve the continuous current, ideal instantaneous temperature jumps and logarithmic period. Explain that temperature between switches is proportional to the square of the current relaxation.
- Magnetic dipole: preserve all requested initial-velocity components and circle-centre coordinates. The circle radius uses positive w=|omega_0|, while its x coordinate uses signed nonzero omega_0. State the equality case for reversal as an asymptotic separatrix. Preserve both energy and pendulum derivations, and the generalized-angular-momentum argument for D=d.
- Thermal lens: retain radial power balance, both integration approaches, Fermat, ray, wavefront and explicit path arguments. Correct the source's omitted absorbed-power factor A, a matching-point typo and an omitted thickness b in an intermediate angle equation. Numeric units are Celsius, K/m^2 and metres. The common-focus proof remains self-review.

## Engineering and verification

Reuse the existing native reader, MathLive fields, stateless server checker and private-key boundary. No UI, auth, progress, account-persistence catalogue, grading engine, marks/ELO, migration, dependency or provider-setting change. Earlier source ledgers and conversions remain unchanged. The generator now explicitly limits the batch-one ledger to its five original records, preventing later batches from being appended to that historical ledger.

Local Node 24.22.1 verification:

- Native schema, LaTeX and answer checks plus twelve new source/physics/integrity tests: 59 pass.
- Full server suite: 954 pass, 31 database-dependent skips, one inherited TODO, zero failures.
- Component suite, invoked with `node --import tsx --test tests/*.test.ts` because the tsx CLI IPC socket is prohibited here: 204 pass.
- Next type generation, TypeScript, zero-warning ESLint, offline safety guards and the production build with synthetic auth configuration pass.
- All ten new public metadata files equal their server-generated metadata and exclude private keys. All original PDF and crop hashes pass.
- Independently evaluated physics covers hanging-string Bessel roots, molecular momentum flux, finite-difference dipole-image fields, integrated gas compression work, thread arc-length quadrature, numerical optical folds, fluid energy curvature, circuit ODE stepping, Lorentz forces and separatrix integration, and radial heat/optical-path calculations. Equivalent rearrangements pass and representative sign/factor errors fail.
- Collection comparison against base proves exactly ten changed records and unchanged other 102 records.

Environment limits: the initial frozen offline install refuses to purge an existing reused dependency directory without a TTY. No purge was attempted. Local checks use the available dependency tree. Chromium aborts before opening a page because its process-singleton Unix socket is prohibited (`socket() failed: Operation not permitted`). Local guest/verified native-browser tests and full global sweep therefore have no result. Fresh locked installation, browser, disposable-database and full exact-head verification belong to GitHub CI. No claim of live provider, physical-device or independent human verification is made. Production-build outcome and exact-head Actions results are recorded in the PR.

Regenerate using `node --conditions=react-server --import tsx scripts/build-native-olympiads.ts`. The existing public-library workflow verifies clean regeneration and runs every native record at 375px and 1440px, light/dark, guest and synthetic verified sessions. Review its screenshots and actual run results before merging. No merge or manual deployment is authorized by this session.

## Delivery status

Implementation commit `3918b5e10d089fc8f5a636112149c34ecdf5f642` is local on `codex/archive-next-10`. Automatic approval review rejected the push to the public repository because the session did not explicitly authorize external publication of the code and source-derived figures. No workaround was attempted. No PR or exact-head GitHub CI run exists for this branch yet. Publishing the branch and opening a PR requires the user's explicit approval. The production build exits successfully but prints expected Better Auth schema-validation diagnostics with no database configured. No database qualification is inferred from that build.
