/** Canonical physics vocabulary. No content, framework or database imports. */
export type PhysicsTagKind = "topic" | "method";
export interface PhysicsTag {
  readonly id: string;
  readonly label: string;
  readonly kind: PhysicsTagKind;
  readonly aliases: readonly string[];
}

export const physicsTopics = [
  { id: "mechanics", label: "Mechanics", kind: "topic", aliases: [] },
  { id: "electromagnetism", label: "Electromagnetism", kind: "topic", aliases: ["Electricity"] },
  { id: "waves", label: "Waves", kind: "topic", aliases: [] },
  { id: "thermodynamics", label: "Thermodynamics", kind: "topic", aliases: [] },
  { id: "optics", label: "Optics", kind: "topic", aliases: [] },
  { id: "modern-physics", label: "Modern physics", kind: "topic", aliases: ["Modern"] },
] as const satisfies readonly PhysicsTag[];

// "method" includes techniques and physical concepts, not only solution methods.
// Related concepts (e.g. statistical physics/mechanics, interference/interferometry)
// deliberately have separate IDs. Electricity is a historical dashboard topic alias.
export const physicsMethods = [
  { id: "aberration", label: "Aberration", kind: "method", aliases: [] },
  { id: "accelerometers", label: "Accelerometers", kind: "method", aliases: [] },
  { id: "acoustics", label: "Acoustics", kind: "method", aliases: [] },
  { id: "adiabatic-processes", label: "Adiabatic processes", kind: "method", aliases: [] },
  { id: "angular-momentum", label: "Angular momentum", kind: "method", aliases: [] },
  { id: "atmospheric-drag", label: "Atmospheric drag", kind: "method", aliases: [] },
  { id: "atmospheric-optics", label: "Atmospheric optics", kind: "method", aliases: [] },
  { id: "atmospheric-physics", label: "Atmospheric physics", kind: "method", aliases: [] },
  { id: "atomic-beams", label: "Atomic beams", kind: "method", aliases: [] },
  { id: "barometric-clock", label: "Barometric clock", kind: "method", aliases: [] },
  { id: "binary-systems", label: "Binary systems", kind: "method", aliases: [] },
  { id: "biot-savart-law", label: "Biot-Savart law", kind: "method", aliases: ["Biot–Savart law"] },
  { id: "birefringence", label: "Birefringence", kind: "method", aliases: [] },
  { id: "bistability", label: "Bistability", kind: "method", aliases: [] },
  { id: "black-holes", label: "Black holes", kind: "method", aliases: [] },
  { id: "black-body-radiation", label: "Black-body radiation", kind: "method", aliases: ["Blackbody radiation", "Black body radiation"] },
  { id: "blood-circulation", label: "Blood circulation", kind: "method", aliases: [] },
  { id: "bohr-model", label: "Bohr model", kind: "method", aliases: [] },
  { id: "boundary-conditions", label: "Boundary conditions", kind: "method", aliases: [] },
  { id: "brownian-motion", label: "Brownian motion", kind: "method", aliases: [] },
  { id: "bubble-dynamics", label: "Bubble dynamics", kind: "method", aliases: [] },
  { id: "buoyancy", label: "Buoyancy", kind: "method", aliases: [] },
  { id: "capacitance", label: "Capacitance", kind: "method", aliases: [] },
  { id: "capillarity", label: "Capillarity", kind: "method", aliases: [] },
  { id: "charged-sheets", label: "Charged sheets", kind: "method", aliases: [] },
  { id: "charged-particle-motion", label: "Charged-particle motion", kind: "method", aliases: [] },
  { id: "cherenkov-radiation", label: "Cherenkov radiation", kind: "method", aliases: [] },
  { id: "circular-motion", label: "Circular motion", kind: "method", aliases: [] },
  { id: "collisions", label: "Collisions", kind: "method", aliases: [] },
  { id: "conductors", label: "Conductors", kind: "method", aliases: [] },
  { id: "constraints", label: "Constraints", kind: "method", aliases: [] },
  { id: "continuous-charge", label: "Continuous charge", kind: "method", aliases: [] },
  { id: "cosmology", label: "Cosmology", kind: "method", aliases: [] },
  { id: "critical-phenomena", label: "Critical phenomena", kind: "method", aliases: [] },
  { id: "crystal-surfaces", label: "Crystal surfaces", kind: "method", aliases: [] },
  { id: "curvature", label: "Curvature", kind: "method", aliases: [] },
  { id: "damping", label: "Damping", kind: "method", aliases: [] },
  { id: "dark-matter", label: "Dark matter", kind: "method", aliases: [] },
  { id: "de-broglie-waves", label: "de Broglie waves", kind: "method", aliases: [] },
  { id: "dielectric-heating", label: "Dielectric heating", kind: "method", aliases: [] },
  { id: "diffusion", label: "Diffusion", kind: "method", aliases: [] },
  { id: "dipole-radiation", label: "Dipole radiation", kind: "method", aliases: [] },
  { id: "dispersion", label: "Dispersion", kind: "method", aliases: [] },
  { id: "doppler-effect", label: "Doppler effect", kind: "method", aliases: [] },
  { id: "driven-oscillations", label: "Driven oscillations", kind: "method", aliases: [] },
  { id: "eddy-currents", label: "Eddy currents", kind: "method", aliases: [] },
  { id: "elastic-potential-energy", label: "Elastic potential energy", kind: "method", aliases: [] },
  { id: "elasticity", label: "Elasticity", kind: "method", aliases: [] },
  { id: "electric-current", label: "Electric current", kind: "method", aliases: [] },
  { id: "electric-dipoles", label: "Electric dipoles", kind: "method", aliases: [] },
  { id: "electrical-power", label: "Electrical power", kind: "method", aliases: [] },
  { id: "electrical-standards", label: "Electrical standards", kind: "method", aliases: [] },
  { id: "electromagnetic-energy", label: "Electromagnetic energy", kind: "method", aliases: [] },
  { id: "electromagnetic-waves", label: "Electromagnetic waves", kind: "method", aliases: [] },
  { id: "electron-diffraction", label: "Electron diffraction", kind: "method", aliases: [] },
  { id: "electron-optics", label: "Electron optics", kind: "method", aliases: [] },
  { id: "electrostatic-induction", label: "Electrostatic induction", kind: "method", aliases: [] },
  { id: "electrostatics", label: "Electrostatics", kind: "method", aliases: [] },
  { id: "energy-conservation", label: "Energy conservation", kind: "method", aliases: [] },
  { id: "energy-harvesting", label: "Energy harvesting", kind: "method", aliases: [] },
  { id: "energy-storage", label: "Energy storage", kind: "method", aliases: [] },
  { id: "energy-transmission", label: "Energy transmission", kind: "method", aliases: [] },
  { id: "entangled-photons", label: "Entangled photons", kind: "method", aliases: [] },
  { id: "fermats-principle", label: "Fermat’s principle", kind: "method", aliases: ["Fermat's principle"] },
  { id: "field-lines", label: "Field lines", kind: "method", aliases: [] },
  { id: "first-law-of-thermodynamics", label: "First law of thermodynamics", kind: "method", aliases: [] },
  { id: "flexural-waves", label: "Flexural waves", kind: "method", aliases: [] },
  { id: "fluid-flow", label: "Fluid flow", kind: "method", aliases: [] },
  { id: "flux-conservation", label: "Flux conservation", kind: "method", aliases: [] },
  { id: "four-momentum", label: "Four-momentum", kind: "method", aliases: [] },
  { id: "friction", label: "Friction", kind: "method", aliases: [] },
  { id: "gas-discharge", label: "Gas discharge", kind: "method", aliases: [] },
  { id: "gausss-law", label: "Gauss’s law", kind: "method", aliases: ["Gauss's law"] },
  { id: "geometric-optics", label: "Geometric optics", kind: "method", aliases: [] },
  { id: "geometric-phase", label: "Geometric phase", kind: "method", aliases: [] },
  { id: "graded-index-optics", label: "Graded-index optics", kind: "method", aliases: [] },
  { id: "gravitation", label: "Gravitation", kind: "method", aliases: [] },
  { id: "gravitational-lensing", label: "Gravitational lensing", kind: "method", aliases: [] },
  { id: "gravitational-waves", label: "Gravitational waves", kind: "method", aliases: [] },
  { id: "gravitational-wave-detection", label: "Gravitational-wave detection", kind: "method", aliases: [] },
  { id: "heat-capacity", label: "Heat capacity", kind: "method", aliases: [] },
  { id: "heat-conduction", label: "Heat conduction", kind: "method", aliases: [] },
  { id: "heat-engines", label: "Heat engines", kind: "method", aliases: [] },
  { id: "heat-transfer", label: "Heat transfer", kind: "method", aliases: [] },
  { id: "henrys-law", label: "Henry’s law", kind: "method", aliases: ["Henry's law"] },
  { id: "hubbles-law", label: "Hubble’s law", kind: "method", aliases: ["Hubble's law"] },
  { id: "hydrogen-spectrum", label: "Hydrogen spectrum", kind: "method", aliases: [] },
  { id: "hydrostatics", label: "Hydrostatics", kind: "method", aliases: [] },
  { id: "ice-sheets", label: "Ice sheets", kind: "method", aliases: [] },
  { id: "ideal-gas", label: "Ideal gas", kind: "method", aliases: ["Ideal gases"] },
  { id: "illuminance", label: "Illuminance", kind: "method", aliases: [] },
  { id: "image-charges", label: "Image charges", kind: "method", aliases: [] },
  { id: "image-formation", label: "Image formation", kind: "method", aliases: [] },
  { id: "impedance-matching", label: "Impedance matching", kind: "method", aliases: [] },
  { id: "induced-dipoles", label: "Induced dipoles", kind: "method", aliases: [] },
  { id: "induction", label: "Induction", kind: "method", aliases: [] },
  { id: "interference", label: "Interference", kind: "method", aliases: [] },
  { id: "interferometry", label: "Interferometry", kind: "method", aliases: [] },
  { id: "ionization", label: "Ionization", kind: "method", aliases: [] },
  { id: "kinematics", label: "Kinematics", kind: "method", aliases: [] },
  { id: "kinetic-theory", label: "Kinetic theory", kind: "method", aliases: [] },
  { id: "lagrange-points", label: "Lagrange points", kind: "method", aliases: [] },
  { id: "landau-levels", label: "Landau levels", kind: "method", aliases: [] },
  { id: "landau-theory", label: "Landau theory", kind: "method", aliases: [] },
  { id: "larmor-precession", label: "Larmor precession", kind: "method", aliases: [] },
  { id: "laser-cooling", label: "Laser cooling", kind: "method", aliases: [] },
  { id: "latent-heat", label: "Latent heat", kind: "method", aliases: [] },
  { id: "lorentz-transformations", label: "Lorentz transformations", kind: "method", aliases: [] },
  { id: "lunar-occultation", label: "Lunar occultation", kind: "method", aliases: [] },
  { id: "magnetic-braking", label: "Magnetic braking", kind: "method", aliases: [] },
  { id: "magnetic-dipoles", label: "Magnetic dipoles", kind: "method", aliases: [] },
  { id: "magnetic-fields", label: "Magnetic fields", kind: "method", aliases: [] },
  { id: "magnetic-forces", label: "Magnetic forces", kind: "method", aliases: [] },
  { id: "magnetic-mirrors", label: "Magnetic mirrors", kind: "method", aliases: [] },
  { id: "magnetic-moments", label: "Magnetic moments", kind: "method", aliases: [] },
  { id: "magnetic-resonance", label: "Magnetic resonance", kind: "method", aliases: [] },
  { id: "magnetic-susceptibility", label: "Magnetic susceptibility", kind: "method", aliases: [] },
  { id: "magnetron", label: "Magnetron", kind: "method", aliases: [] },
  { id: "mechanical-stress", label: "Mechanical stress", kind: "method", aliases: [] },
  { id: "meissner-effect", label: "Meissner effect", kind: "method", aliases: [] },
  { id: "moment-of-inertia", label: "Moment of inertia", kind: "method", aliases: [] },
  { id: "momentum-conservation", label: "Momentum conservation", kind: "method", aliases: [] },
  { id: "momentum-transfer", label: "Momentum transfer", kind: "method", aliases: [] },
  { id: "mond", label: "MOND", kind: "method", aliases: [] },
  { id: "moving-mirrors", label: "Moving mirrors", kind: "method", aliases: [] },
  { id: "mutual-inductance", label: "Mutual inductance", kind: "method", aliases: [] },
  { id: "neutrinos", label: "Neutrinos", kind: "method", aliases: [] },
  { id: "neutron-diffusion", label: "Neutron diffusion", kind: "method", aliases: [] },
  { id: "neutron-stars", label: "Neutron stars", kind: "method", aliases: [] },
  { id: "newtons-laws", label: "Newton’s laws", kind: "method", aliases: ["Newton's laws"] },
  { id: "newtons-rings", label: "Newton’s rings", kind: "method", aliases: ["Newton's rings"] },
  { id: "nonlinear-circuits", label: "Nonlinear circuits", kind: "method", aliases: [] },
  { id: "normal-modes", label: "Normal modes", kind: "method", aliases: [] },
  { id: "nuclear-binding-energy", label: "Nuclear binding energy", kind: "method", aliases: [] },
  { id: "nuclear-fission", label: "Nuclear fission", kind: "method", aliases: [] },
  { id: "nuclear-fusion", label: "Nuclear fusion", kind: "method", aliases: [] },
  { id: "nuclear-stability", label: "Nuclear stability", kind: "method", aliases: [] },
  { id: "nucleosynthesis", label: "Nucleosynthesis", kind: "method", aliases: [] },
  { id: "ohms-law", label: "Ohm’s law", kind: "method", aliases: ["Ohm's law"] },
  { id: "optical-absorption", label: "Optical absorption", kind: "method", aliases: [] },
  { id: "optical-measurement", label: "Optical measurement", kind: "method", aliases: [] },
  { id: "optical-resonators", label: "Optical resonators", kind: "method", aliases: [] },
  { id: "optical-trapping", label: "Optical trapping", kind: "method", aliases: [] },
  { id: "orbital-dynamics", label: "Orbital dynamics", kind: "method", aliases: [] },
  { id: "oscillations", label: "Oscillations", kind: "method", aliases: [] },
  { id: "particle-detection", label: "Particle detection", kind: "method", aliases: [] },
  { id: "particle-physics", label: "Particle physics", kind: "method", aliases: [] },
  { id: "partition-functions", label: "Partition functions", kind: "method", aliases: [] },
  { id: "paul-trap", label: "Paul trap", kind: "method", aliases: [] },
  { id: "peltier-effect", label: "Peltier effect", kind: "method", aliases: [] },
  { id: "phase-space", label: "Phase space", kind: "method", aliases: [] },
  { id: "phase-transitions", label: "Phase transitions", kind: "method", aliases: [] },
  { id: "planetary-physics", label: "Planetary physics", kind: "method", aliases: [] },
  { id: "plasmons", label: "Plasmons", kind: "method", aliases: [] },
  { id: "poiseuille-flow", label: "Poiseuille flow", kind: "method", aliases: [] },
  { id: "polarization", label: "Polarization", kind: "method", aliases: [] },
  { id: "potential", label: "Potential", kind: "method", aliases: [] },
  { id: "potential-barriers", label: "Potential barriers", kind: "method", aliases: [] },
  { id: "precession", label: "Precession", kind: "method", aliases: [] },
  { id: "pressure", label: "Pressure", kind: "method", aliases: [] },
  { id: "pressure-waves", label: "Pressure waves", kind: "method", aliases: [] },
  { id: "pressure-volume-work", label: "Pressure–volume work", kind: "method", aliases: ["Pressure-volume work"] },
  { id: "projectile-motion", label: "Projectile motion", kind: "method", aliases: [] },
  { id: "pulsars", label: "Pulsars", kind: "method", aliases: [] },
  { id: "quantized-circulation", label: "Quantized circulation", kind: "method", aliases: [] },
  { id: "quantum-hall-effect", label: "Quantum Hall effect", kind: "method", aliases: [] },
  { id: "quantum-tunnelling", label: "Quantum tunnelling", kind: "method", aliases: ["Quantum tunneling"] },
  { id: "quasars", label: "Quasars", kind: "method", aliases: [] },
  { id: "radial-thrust", label: "Radial thrust", kind: "method", aliases: [] },
  { id: "radiation-pressure", label: "Radiation pressure", kind: "method", aliases: [] },
  { id: "radioactive-decay", label: "Radioactive decay", kind: "method", aliases: ["Half-life"] },
  { id: "radiative-equilibrium", label: "Radiative equilibrium", kind: "method", aliases: [] },
  { id: "rainbows", label: "Rainbows", kind: "method", aliases: [] },
  { id: "ray-tracing", label: "Ray tracing", kind: "method", aliases: [] },
  { id: "ray-trajectories", label: "Ray trajectories", kind: "method", aliases: [] },
  { id: "rayleigh-scattering", label: "Rayleigh scattering", kind: "method", aliases: [] },
  { id: "rc-circuits", label: "RC circuits", kind: "method", aliases: [] },
  { id: "redshift", label: "Redshift", kind: "method", aliases: [] },
  { id: "reflection", label: "Reflection", kind: "method", aliases: [] },
  { id: "refraction", label: "Refraction", kind: "method", aliases: [] },
  { id: "relativistic-jets", label: "Relativistic jets", kind: "method", aliases: [] },
  { id: "relativistic-kinematics", label: "Relativistic kinematics", kind: "method", aliases: [] },
  { id: "retroreflection", label: "Retroreflection", kind: "method", aliases: [] },
  { id: "rigid-body-dynamics", label: "Rigid-body dynamics", kind: "method", aliases: [] },
  { id: "rl-circuits", label: "RL circuits", kind: "method", aliases: [] },
  { id: "rolling-motion", label: "Rolling motion", kind: "method", aliases: [] },
  { id: "rotating-frames", label: "Rotating frames", kind: "method", aliases: [] },
  { id: "rotation-curves", label: "Rotation curves", kind: "method", aliases: [] },
  { id: "satellite-dynamics", label: "Satellite dynamics", kind: "method", aliases: [] },
  { id: "scaling-laws", label: "Scaling laws", kind: "method", aliases: [] },
  { id: "seebeck-effect", label: "Seebeck effect", kind: "method", aliases: [] },
  { id: "seismic-waves", label: "Seismic waves", kind: "method", aliases: [] },
  { id: "series-circuits", label: "Series circuits", kind: "method", aliases: [] },
  { id: "shallow-water-waves", label: "Shallow-water waves", kind: "method", aliases: [] },
  { id: "single-electron-transistors", label: "Single-electron transistors", kind: "method", aliases: [] },
  { id: "small-oscillations", label: "Small oscillations", kind: "method", aliases: [] },
  { id: "solar-cells", label: "Solar cells", kind: "method", aliases: [] },
  { id: "solid-angle", label: "Solid angle", kind: "method", aliases: [] },
  { id: "sound-propagation", label: "Sound propagation", kind: "method", aliases: [] },
  { id: "special-relativity", label: "Special relativity", kind: "method", aliases: [] },
  { id: "specific-heat-capacity", label: "Specific heat capacity", kind: "method", aliases: [] },
  { id: "spectral-resolution", label: "Spectral resolution", kind: "method", aliases: [] },
  { id: "spin", label: "Spin", kind: "method", aliases: [] },
  { id: "spin-waves", label: "Spin waves", kind: "method", aliases: [] },
  { id: "spontaneous-emission", label: "Spontaneous emission", kind: "method", aliases: [] },
  { id: "stability", label: "Stability", kind: "method", aliases: [] },
  { id: "stable-equilibrium", label: "Stable equilibrium", kind: "method", aliases: [] },
  { id: "standing-waves", label: "Standing waves", kind: "method", aliases: [] },
  { id: "stationary-deviation", label: "Stationary deviation", kind: "method", aliases: [] },
  { id: "statistical-mechanics", label: "Statistical mechanics", kind: "method", aliases: [] },
  { id: "statistical-physics", label: "Statistical physics", kind: "method", aliases: [] },
  { id: "stick-slip-motion", label: "Stick-slip motion", kind: "method", aliases: [] },
  { id: "string-waves", label: "String waves", kind: "method", aliases: [] },
  { id: "superconductivity", label: "Superconductivity", kind: "method", aliases: [] },
  { id: "superfluidity", label: "Superfluidity", kind: "method", aliases: [] },
  { id: "surface-energy", label: "Surface energy", kind: "method", aliases: [] },
  { id: "surface-tension", label: "Surface tension", kind: "method", aliases: [] },
  { id: "symmetry", label: "Symmetry", kind: "method", aliases: [] },
  { id: "synchrotron-radiation", label: "Synchrotron radiation", kind: "method", aliases: [] },
  { id: "terminal-velocity", label: "Terminal velocity", kind: "method", aliases: [] },
  { id: "thermal-lensing", label: "Thermal lensing", kind: "method", aliases: [] },
  { id: "three-body-problem", label: "Three-body problem", kind: "method", aliases: [] },
  { id: "tidal-forces", label: "Tidal forces", kind: "method", aliases: [] },
  { id: "torque", label: "Torque", kind: "method", aliases: [] },
  { id: "transmission-lines", label: "Transmission lines", kind: "method", aliases: [] },
  { id: "two-level-systems", label: "Two-level systems", kind: "method", aliases: [] },
  { id: "van-der-waals-gas", label: "Van der Waals gas", kind: "method", aliases: [] },
  { id: "vapour-pressure", label: "Vapour pressure", kind: "method", aliases: ["Vapor pressure"] },
  { id: "variational-principles", label: "Variational principles", kind: "method", aliases: [] },
  { id: "velocity-addition", label: "Velocity addition", kind: "method", aliases: [] },
  { id: "viscosity", label: "Viscosity", kind: "method", aliases: [] },
  { id: "vortices", label: "Vortices", kind: "method", aliases: [] },
  { id: "wave-propagation", label: "Wave propagation", kind: "method", aliases: [] },
  { id: "wave-reflection", label: "Wave reflection", kind: "method", aliases: [] },
  { id: "wave-speed", label: "Wave speed", kind: "method", aliases: [] },
] as const satisfies readonly PhysicsTag[];

export const physicsTags: readonly PhysicsTag[] = [...physicsTopics, ...physicsMethods];
export const physicsTopicLabels = physicsTopics.map((tag) => tag.label);
// Preserve the old practice/corpus Topic union and existing dashboard URLs.
export const legacyPhysicsTopicLabels = [
  physicsTopics[0].label, physicsTopics[1].label, physicsTopics[2].label,
  physicsTopics[3].label, physicsTopics[4].label, physicsTopics[5].aliases[0],
] as const;

/** Case, surrounding/repeated whitespace and typographic punctuation are immaterial.
 * No stemming, singularisation or fuzzy scientific synonym matching is performed.
 */
// ECMAScript whitespace, shared with the SQL adapter so both resolvers agree.
export const physicsTagWhitespace = "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";
const whitespace = new RegExp(`[${physicsTagWhitespace}]+`, "g");
export function normalizePhysicsTag(value: string): string {
  return value.replace(whitespace, " ").trim().replace(/[‘’]/g, "'")
    .replace(/[‐‑–—]/g, "-").toLowerCase();
}

const byKind = { topic: new Map<string, PhysicsTag>(), method: new Map<string, PhysicsTag>() };
const byValue = new Map<string, PhysicsTag | null>();
for (const tag of physicsTags) {
  for (const value of [tag.id, tag.label, ...tag.aliases]) {
    const key = normalizePhysicsTag(value);
    const previous = byKind[tag.kind].get(key);
    if (previous && previous.id !== tag.id) throw Error(`Ambiguous physics alias: ${value}`);
    byKind[tag.kind].set(key, tag);
    if (!byValue.has(key)) byValue.set(key, tag);
    else if (byValue.get(key)?.id !== tag.id) byValue.set(key, null);
  }
}

/** Ambiguous cross-kind values require a kind; unknown values return undefined. */
export function resolvePhysicsTag(value: string, kind?: PhysicsTagKind): PhysicsTag | undefined {
  const key = normalizePhysicsTag(value);
  return (kind ? byKind[kind].get(key) : byValue.get(key)) ?? undefined;
}

export function canonicalPhysicsTagId(value: string, kind?: PhysicsTagKind): string | undefined {
  return resolvePhysicsTag(value, kind)?.id;
}

/** Preserve unknown user tags verbatim, including case and whitespace. */
export function physicsTagLabel(value: string, kind?: PhysicsTagKind): string {
  return resolvePhysicsTag(value, kind)?.label ?? value;
}

/** Finite exact stored spellings for index-compatible JSONB containment.
 * Includes IDs, labels, declared aliases and lower/upper case forms. Arbitrary
 * mixed case/whitespace cannot be enumerated; database adapters can compare
 * normalized stored strings with these same bounded values as a fallback.
 */
export function physicsTagAliases(value: string, kind?: PhysicsTagKind): readonly string[] {
  const tag = resolvePhysicsTag(value, kind);
  if (!tag) return [value];
  return [...new Set([tag.id, tag.label, ...tag.aliases].flatMap((v) => [v, v.toLowerCase(), v.toUpperCase()]).concat(value))];
}

/** Read-time display only; never use this to rewrite drafts or revisions. */
export function physicsTagLabels(values: readonly string[], kind?: PhysicsTagKind): string[] {
  return [...new Set(values.map((value) => physicsTagLabel(value, kind)))];
}
