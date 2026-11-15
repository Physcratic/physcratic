# Native olympiad archive conversion, batch 5

## Scope and delivery boundary

This is the user's additional ten-problem request, stacked locally on batch four at `234ed8aa3d92ecf9bd678d36ce587f372144811d` on `codex/archive-next-10`. Fetched main is still `81d9cc525b2579dc467d26a327d5f964ead74242`. Open #175, #176 and #177 concern other work and are not incorporated. The previous public push was rejected by automatic approval review pending explicit publication approval. The new request authorizes ten more conversions, not a retry of that publication. No push, PR, merge, manual deployment, SQL or provider action is performed for this batch.

| Problem | Source title | Automatic fields | Self-review fields |
| --- | --- | ---: | ---: |
| EuPhO 2023 T2 | Brick between two planes | 2 | 0 |
| EuPhO 2023 T3 | Plate between magnets | 3 | 2 |
| EuPhO 2024 T1 | Sliding puck | 3 | 1 |
| EuPhO 2024 T2 | Spaceships | 3 | 0 |
| EuPhO 2024 T3 | Fabry–Pérot interferometer | 3 | 2 |
| EuPhO 2025 T1 | Sunny | 2 | 0 |
| EuPhO 2025 T2 | Floating table | 1 | 1 |
| EuPhO 2025 T3 | Crossed wires | 2 | 1 |
| IPhO 2010 T2 | Chimney physics | 10 | 2 |
| APhO 2014 T2 | Question 2 | 7 | 2 |

Adds **36 automatic fields, 11 self-review fields and 41 original figure crops**. The archive remains 112 records, with **35 native and 77 PDF records remaining**. All 27 EuPhO records (2017 through 2025) now have native statements, worked solutions and answer controls. There are 32 converted archive records with answer fields, in addition to the three previously native IPhO 2026 records. The combined two local ten-problem requests add 20 conversions on top of main.

Comparison against the local parent confirms exactly ten changed collection records. All their fields other than statement/solution remain equal, including identities, titles, source metadata and ratings. The other 102 collection records, all earlier source ledgers and the 30-entry account-persistence catalogue remain unchanged. Original PDFs remain linked as references. No UI, grading-engine, auth, database, progress, marks/ELO, feature-flag or dependency contract changes.

## Source review

The original PDF statement and relevant solution pages were rendered on white and compared with the native text. Shared papers are split by actual problem. Examiner marking tables and deliberately incorrect sample approaches remain in the reference PDFs instead of being presented as valid worked solutions. The new source ledger records original PDF hashes for both document kinds. The figure ledger records source hashes, page numbers, 1.4x render sizes, pixel crop coordinates and crop hashes. Native figures retain the requested axes, photographs, chain grid and ray geometry. Crops were visually inspected and adjusted where labels or neighbouring text reached their edges. Independent human review remains pending.

### Physics and answer conventions

- **Brick:** equal normal forces give equal friction magnitudes. Relative-speed difference, not relative-velocity difference, is conserved. Preserve the graphical invariant and Cartesian derivation. The unequal-speed key uses components to avoid cancellation in a simplified radical. All shorthand is expanded in checker input.
- **Plate:** current includes both motional and electrostatic terms. The consistent polarization is **P = +epsilon_0 v cross B**. Correct the source's intermediate polarization sign and its malformed current-conservation loop formula. Current is uniform inside, reverses on the requested axis outside, and has tangential jumps at the ideal sharp rims. Include both force integration and equal inside/outside Joule dissipation. Explain why the source's stepping-magnet alternative is not a valid three-dimensional field derivation. Retain circular outer-streamline and skin-depth notes.
- **Puck:** preserve the transition from sliding to rolling, both time and turning-angle integrations, and the kinked exit-speed graph. Three scalar fields cover sliding speed, rolling plateau and critical friction. Branch conditions and the graph remain self-review. Do not extrapolate the sliding exponential beyond the rolling transition.
- **Spaceships:** distinguish simultaneous spacing, reception events and gifts actually seen on a past light cone. Define the count ratio as outgoing/incoming. Retain emission-event, proper-spacing, Lorentz-diagram, light-cone and imaginary-time constructions. Correct one source time-label typo and a velocity-symbol typo in an intermediate count ratio.
- **Fabry–Pérot:** the source solution defines phi as the relative reflected/transmitted phase. Explicitly qualify the statement's ambiguous transmission-phase wording. The principal magnitude is pi/2. Keep both boundary-amplitude and path-sum proofs, the additional thin-sheet continuity argument and coherent two-sided energy argument. Correct conjugation signs, the skipped geometric-series power and a cosine-equation typo. Accept both the leading high-reflectivity pulse energy/time and the more accurate ideal round-trip expressions. The duration box explicitly means energy-envelope e-folding time. Other justified pulse-width conventions remain self-review.
- **Sunny:** preserve the photograph's polar angle and the leading r much greater than a approximation. Derive illumination from the ray Jacobian and power conservation. Include both geometric contributions to the ring displacement, retaining its factor of two.
- **Table:** retain the original grid as essential problem data. Show positive tensions and stability, rather than only force balance. The plate has no first-order tilt. Preserve force, energy and trajectory-curvature solutions and the exact constraint expansion supporting that fact. Check seconds against the original 777 ms result.
- **Crossed wires:** the field-line sketch is qualitative self-review. Preserve flux-tube conservation and its small-radius validity check. Include both exact quadrature and the adequate one-trapezoid length estimate. The length box accepts the requested 20 percent tolerance around 179 m.
- **Chimney:** retain every task, both original apparatus diagrams, Bernoulli's law, the entry jumps, and the solar/prototype data. Kelvin is required in temperature ratios. The statement does not specify sunny-day duration, so state the official eight-hour assumption in the energy field and worked solution. Efficiency is the problem's ideal available kinetic-power ratio, not an invented measured electrical efficiency.
- **Biprism:** preserve all subparts and supplied numerical constants. Use positive charge magnitude e and explicitly check the transverse wave-vector magnitude, since signs differ on opposite sides. Correct the source's inconsistent intermediate sign. The supplied deflection speed c/2 and 50 kV wavelength input remain separate approximate data. The final source substitution mixes the plane-wave fringe spacing with spherical virtual-source geometry. Therefore **d.v is self-review**, with the official 1.03e-4 m substitution and consistent spherical-source result about 1.47e-5 m both explained. No unique automatic key enforces this inconsistent source estimate.

## Verification

Local Node 24.22.1 with the existing dependency tree:

- All native schema, LaTeX, reference-answer, original-title and new source/physics tests pass: **91 focused tests**.
- Full server suite: **986 pass, 31 database-dependent skips, one inherited TODO, zero failures**.
- Component suite: **204 pass**, zero failures.
- Next type generation, TypeScript, zero-warning ESLint, offline safety guards and the final production build pass.
- Every new public answer-metadata file equals its server-generated metadata. Private-key fields are absent. Both source PDFs per problem and all 41 source-bound crop hashes pass.
- Exactly ten collection records change, and their non-document fields are preserved. All 27 EuPhO records are native.
- Generator reproducibility is checked against the staged result. Earlier source ledgers remain byte-identical.

New independent numerical checks integrate the brick's Cartesian friction equations, the plate's continuous electrostatic potential and Joule losses, puck force and torque, gift emission/light-cone intersections, mirror round-trip powers, reflected-ray direction Jacobians, full chain-length constraints, actual Biot–Savart field lines, thermal mass-flow balance and electron impulse/relativistic energy. Rearranged algebra passes while representative sign, factor and model errors fail. These are automated independent calculations, not an independent human review.

The original-title regression caught loss of the source accent and dash in Fabry–Pérot. The heading now preserves the exact original name, and the unchanged title-integrity assertion passes. The first production build passed. A subsequent cached build failed inside webpack's WasmHash, before application compilation. Its generated `.next` output was moved aside and a clean build was run. The initial clean rebuild picked up generated type files from the moved cache backup while it was still inside the TypeScript include tree. Moving that generated backup outside the project resolved the path errors. The final production build on the delivery content passes with synthetic auth configuration. As in the prior batch, absent-database Better Auth schema diagnostics are printed without causing a build failure.

The prior environment restriction still prevents local Chromium from creating its Unix process-singleton socket. No new browser success or global signed-in/guest sweep is claimed, and no repeated attempt bypasses that restriction. Fresh frozen installation, browser screenshots, disposable-database qualification and exact-head Actions remain pending a permitted public push and PR. No live provider or physical-device testing was performed.

Regenerate with `node --conditions=react-server --import tsx scripts/build-native-olympiads.ts`. Existing GitHub public-library CI checks clean regeneration and all native readers at mobile/desktop widths in light/dark for guest and synthetic verified sessions. Preserve the publication blocker and review those results before any merge. Next content work is the remaining 77 IPhO/APhO PDFs, selected from the inventory without repeating completed EuPhO work.

## Local delivery

Implementation commit: `9c717a6941ff903f13a98b1e90afc3e8107e03e1`, branch `codex/archive-next-10`. Final clean production build passed. Main was re-fetched at `81d9cc525b2579dc467d26a327d5f964ead74242`; concurrent open PRs are unrelated. Only temporary, untracked source-review renders remain outside the commit. The branch contains both requested ten-problem batches. Publishing remains blocked by the prior automatic approval decision pending explicit user approval. No PR or remote CI evidence exists for these local commits.
