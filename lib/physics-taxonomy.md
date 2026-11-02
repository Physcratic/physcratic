# Physics tag taxonomy (X1.1)

`lib/physics-taxonomy.ts` is the framework-independent vocabulary. It has no imports, corpus loading, database access or UI dependencies. It defines **6 topics, 234 methods/concepts and 16 explicit aliases**. IDs are stable lowercase hyphenated strings. Topic order is Mechanics, Electromagnetism, Waves, Thermodynamics, Optics, Modern physics.

## Consumer contract (C2)

```ts
import {
  physicsTopics, physicsMethods, resolvePhysicsTag,
  canonicalPhysicsTagId, physicsTagLabel, physicsTagAliases,
} from "@/lib/physics-taxonomy";
import type { PhysicsTag, PhysicsTagKind } from "@/lib/physics-taxonomy";

// PhysicsTagKind = "topic" | "method"
// PhysicsTag = { readonly id: string; readonly label: string;
//   readonly kind: PhysicsTagKind; readonly aliases: readonly string[] }

const topicOptions = physicsTopics.map(({ id, label }) => ({ value: id, label }));
const methodOptions = physicsMethods.map(({ id, label }) => ({ value: id, label }));
resolvePhysicsTag("Modern", "topic"); // { id: "modern-physics", label: "Modern physics", ... }
canonicalPhysicsTagId("Newton's laws", "method"); // "newtons-laws"
physicsTagLabel("Custom technique", "method"); // "Custom technique"
physicsTagAliases("Modern", "topic"); // finite exact spellings incl. ID/label/legacy alias
```

In C2, import these arrays directly into Problem Studio's picker. Use `id` for option keys/values and `label` for display. For an existing value, resolve with the field's kind and compare option IDs; retain the original draft string until the author explicitly changes it. For a new choice, a canonical ID can be written into the existing string array; older clients already accept arbitrary tag strings. Keep unknown tags visible, editable and removable. Do not replace the open string schema with an enum, silently rewrite loaded drafts, or treat one kind's unknown string as another kind's canonical tag. Deduplicate new selections by resolved ID within each kind, preserving unrelated unknown tags. Maintain the existing 30-tags-per-field and 80-characters-per-tag limits. No migration is required.

Additional exports: `physicsTags: readonly PhysicsTag[]`, `physicsTopicLabels` (canonical label union array), `legacyPhysicsTopicLabels` (readonly tuple retaining `Modern`), `normalizePhysicsTag(value): string`, and `physicsTagLabels(values, kind?): string[]` (canonical display labels, stable deduplication). `resolvePhysicsTag` returns `PhysicsTag | undefined`; `canonicalPhysicsTagId` returns `string | undefined`; label functions preserve unknown strings verbatim. Resolver/ID/label/alias APIs accept optional `kind: PhysicsTagKind`. An ambiguous cross-kind alias would require a kind. There are no current cross-kind collisions.

Normalization deliberately ignores case, ECMAScript whitespace runs, curly apostrophes and typographic hyphens/dashes. It is deterministic and idempotent, with no fuzzy matching, stemming or automatic singularisation. Explicit scientific spelling aliases include `Modern`, `Blackbody radiation`, `Black body radiation`, `Ideal gases`, `Vapor pressure`, `Quantum tunneling`, straight apostrophes and Biot–Savart/pressure–volume dash variants. `Electricity` retains the pre-existing dashboard navigation alias to Electromagnetism; it does not declare the entire scientific fields identical.

Interference/interferometry, statistical physics/statistical mechanics, heat capacity/specific heat capacity, oscillations/small oscillations, ray tracing/ray trajectories, and energy conservation/storage/harvesting remain distinct. English and Russian are language metadata, outside the physics taxonomy. `Energy`, used by authored test fixtures, is intentionally unknown rather than guessed to mean energy conservation. Arbitrary custom tags remain valid.

## Audit and integration

Audited main at `b0d8fe8`, then incorporated upstream through `bbcfe19`, preserving its copy/accessibility work and `Biot-Savart law` spelling. Inspected consumers in physics, problem-tags, catalog-selection, corpus-schema, corpus-catalog, corpus-pilot, arena-schema, problem-authoring, authored-library-contracts, authored-library-api, dashboard routing, public route metadata and UI readers/collections. No UI or dependency files were changed.

`lib/physics.ts` retains the presentation records, icon assignments, counts, old Topic union and `Modern` dashboard URL; its topic names derive from the vocabulary. Catalog and Arena topic enums derive from canonical labels. Corpus accepts canonical labels and the historical `Modern`. Historical practice, Arena and corpus documents, IDs, attribution and order are unchanged. `problem-tags` no longer imports the practice corpus or Lucide icons. The shared helper supplies canonical labels, and all collection tag filters use the same resolution. Free-text collection haystacks include bounded alias spellings so historical spelling searches remain useful.

Authored document/draft validation remains open to custom strings and does not normalize stored content. Only public content/metadata projections canonicalize recognized values using the field's kind, deduplicating equivalent display labels. Solutions and attachment exclusions retain their existing explicit projections and authorization requirements. Existing callers do not need interface changes.

The repository contains these exact distinct source values. Every available physics value resolves; language metadata is added independently. No staging/Production database was inspected or mutated; historical authored storage is covered by disposable database fixtures, not a claim of live-data inventory.

### Practice (12 problems; 16 distinct source strings)

`Elastic potential energy`, `Electrical power`, `Electromagnetism`, `First law of thermodynamics`, `Mechanics`, `Newton’s laws`, `Ohm’s law`, `Pressure–volume work`, `Projectile motion`, `Series circuits`, `Sound propagation`, `Specific heat capacity`, `Standing waves`, `Thermodynamics`, `Wave speed`, `Waves`.

### Arena (18 problems; 54 distinct source strings)

`Aberration`, `Boundary conditions`, `Charged sheets`, `Collisions`, `Continuous charge`, `Cosmology`, `Curvature`, `Dipole radiation`, `Dispersion`, `Doppler effect`, `Driven oscillations`, `Elasticity`, `Electromagnetic energy`, `Electromagnetism`, `Electrostatics`, `Energy transmission`, `Flexural waves`, `Four-momentum`, `Gauss’s law`, `Graded-index optics`, `Ideal gas`, `Impedance matching`, `Interference`, `Kinetic theory`, `Mechanical stress`, `Mechanics`, `Modern physics`, `Moving mirrors`, `Newton’s rings`, `Nucleosynthesis`, `Optics`, `Partition functions`, `Poiseuille flow`, `Potential`, `Potential barriers`, `Pressure`, `Quantum tunnelling`, `Rainbows`, `Ray trajectories`, `Refraction`, `Solid angle`, `Special relativity`, `Spontaneous emission`, `Stability`, `Stationary deviation`, `Statistical mechanics`, `String waves`, `Surface tension`, `Symmetry`, `Thermodynamics`, `Two-level systems`, `Van der Waals gas`, `Viscosity`, `Waves`.

### Corpus (5 problems; 30 distinct source strings)

`Acoustics`, `Barometric clock`, `Blackbody radiation`, `Bohr model`, `Bubble dynamics`, `Cherenkov radiation`, `Circular motion`, `Dark matter`, `Energy harvesting`, `Friction`, `Gravitation`, `Henry’s law`, `Hydrogen spectrum`, `Hydrostatics`, `Ideal gases`, `Interferometry`, `Lagrange points`, `MOND`, `Mechanics`, `Modern`, `Neutrinos`, `Nuclear fusion`, `Optics`, `Rotation curves`, `Small oscillations`, `Solar cells`, `Surface tension`, `Thermodynamics`, `Vapour pressure`, `Waves`.

### Catalog (100 problems; 185 distinct source strings)

`Accelerometers`, `Acoustics`, `Adiabatic processes`, `Angular momentum`, `Atmospheric drag`, `Atmospheric optics`, `Atmospheric physics`, `Atomic beams`, `Binary systems`, `Biot-Savart law`, `Birefringence`, `Bistability`, `Black holes`, `Black-body radiation`, `Blood circulation`, `Bohr model`, `Brownian motion`, `Bubble dynamics`, `Buoyancy`, `Capacitance`, `Capillarity`, `Charged-particle motion`, `Cherenkov radiation`, `Conductors`, `Constraints`, `Cosmology`, `Critical phenomena`, `Crystal surfaces`, `Damping`, `Dark matter`, `Dielectric heating`, `Diffusion`, `Dispersion`, `Doppler effect`, `Eddy currents`, `Elasticity`, `Electric current`, `Electric dipoles`, `Electrical standards`, `Electromagnetic waves`, `Electromagnetism`, `Electron diffraction`, `Electron optics`, `Electrostatic induction`, `Electrostatics`, `Energy conservation`, `Energy harvesting`, `Energy storage`, `Entangled photons`, `Fermat’s principle`, `Field lines`, `First law of thermodynamics`, `Fluid flow`, `Flux conservation`, `Friction`, `Gas discharge`, `Geometric optics`, `Geometric phase`, `Gravitation`, `Gravitational lensing`, `Gravitational waves`, `Gravitational-wave detection`, `Heat capacity`, `Heat conduction`, `Heat engines`, `Heat transfer`, `Hubble’s law`, `Hydrogen spectrum`, `Hydrostatics`, `Ice sheets`, `Ideal gases`, `Illuminance`, `Image charges`, `Image formation`, `Induced dipoles`, `Induction`, `Interference`, `Ionization`, `Kinematics`, `Kinetic theory`, `Landau levels`, `Landau theory`, `Larmor precession`, `Laser cooling`, `Latent heat`, `Lorentz transformations`, `Lunar occultation`, `Magnetic braking`, `Magnetic dipoles`, `Magnetic fields`, `Magnetic forces`, `Magnetic mirrors`, `Magnetic moments`, `Magnetic resonance`, `Magnetic susceptibility`, `Magnetron`, `Mechanics`, `Meissner effect`, `Modern physics`, `Moment of inertia`, `Momentum conservation`, `Momentum transfer`, `Mutual inductance`, `Neutrinos`, `Neutron diffusion`, `Neutron stars`, `Nonlinear circuits`, `Normal modes`, `Nuclear binding energy`, `Nuclear fission`, `Nuclear stability`, `Optical absorption`, `Optical measurement`, `Optical resonators`, `Optical trapping`, `Optics`, `Orbital dynamics`, `Oscillations`, `Particle detection`, `Particle physics`, `Paul trap`, `Peltier effect`, `Phase space`, `Phase transitions`, `Planetary physics`, `Plasmons`, `Polarization`, `Precession`, `Pressure waves`, `Projectile motion`, `Pulsars`, `Quantized circulation`, `Quantum Hall effect`, `Quasars`, `RC circuits`, `RL circuits`, `Radial thrust`, `Radiation pressure`, `Radiative equilibrium`, `Ray tracing`, `Rayleigh scattering`, `Redshift`, `Reflection`, `Refraction`, `Relativistic jets`, `Relativistic kinematics`, `Retroreflection`, `Rigid-body dynamics`, `Rolling motion`, `Rotating frames`, `Satellite dynamics`, `Scaling laws`, `Seebeck effect`, `Seismic waves`, `Shallow-water waves`, `Single-electron transistors`, `Special relativity`, `Spectral resolution`, `Spin`, `Spin waves`, `Stable equilibrium`, `Standing waves`, `Statistical physics`, `Stick-slip motion`, `Superconductivity`, `Superfluidity`, `Surface energy`, `Surface tension`, `Synchrotron radiation`, `Terminal velocity`, `Thermal lensing`, `Thermodynamics`, `Three-body problem`, `Tidal forces`, `Torque`, `Transmission lines`, `Vapour pressure`, `Variational principles`, `Velocity addition`, `Viscosity`, `Vortices`, `Wave propagation`, `Wave reflection`, `Waves`, `de Broglie waves`.

## Authored SQL discovery and query plans

The existing `tag` parameter searches both `topicTags` and `methodTags`, expanding each independently with its kind. Canonical labels/IDs find declared legacy spellings and legacy inputs find canonical storage. Unknown strings retain exact matching. `q` retains the existing full-text semantics for title/tags/difficulty/source: alias expansion applies to the `tag` filter, not arbitrary full-text phrases.

`lib/authored-library-tags.ts` emits parameterized SQL over fixed field names. Each known tag has a finite alias set: ID, label, explicit aliases, lower/upper case variants, and supplied spelling. Exact JSONB containment predicates preserve the existing `jsonb_path_ops` GIN-compatible form. A normalized `EXISTS` fallback over the appropriate JSONB array handles arbitrary legacy case, Unicode whitespace and typography consistently with the resolver. Its comparison values and normalization inputs are bound parameters; there is no dynamic user SQL, unconstrained regex or fuzzy matching. Existing documents permit at most 30 tags in each field.

The normalized fallback is not indexable without a new expression index or normalized stored representation. An OR containing it can prevent a metadata-index-only BitmapOr strategy. PostgreSQL may use the published-problem/cursor indexes and evaluate bounded tag arrays on candidate rows, or choose a scan. Unknown-tag queries keep only the two original exact containment alternatives. This trades some known-tag query efficiency for complete read-time compatibility without data rewrites or migrations. No production-scale latency claim is made. Existing timeout (5 seconds), cursor order, 25-row fetch / 24-row response and filters are unchanged. All matching occurs in PostgreSQL before LIMIT; there is no result-set download/filter after pagination.

Revision selection still requires published state, the current pointer and same-problem ownership. The query projects only metadata; it never joins private-part, permission, reveal or attempt tables. Current revision IDs, private metadata protections and generic errors remain unchanged. Database fixtures verify canonical/legacy topic and method searches in both directions, mixed typography/Unicode whitespace, stable 24+4 pagination, custom tags, draft edits, unpublished exclusions, private sentinels and byte-for-JSON equality of stored revision documents. Existing index availability and rollback/security assertions remain in place.

## Validation

Use Node 22 and the committed pnpm version/lockfile. Run every current step from `.github/workflows/ci.yml`, including the disposable PostgreSQL 18.6 suite and both release-package checksum/guard suites. The complete workflow is the release gate; a unit-only run is not sufficient. Do not use staging or Production credentials. Build-only Better Auth values must match CI's synthetic configuration.
