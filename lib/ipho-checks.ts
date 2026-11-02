export interface IphoTask {
  id: string;
  letter: string;
  title: string;
  topic: string;
  source: string;
  year: number;
  paper: 1 | 2 | 3;
  originalPart: string;
  adaptation: string;
  prompt: string;
  variables: { name: string; meaning: string }[];
  expected: string;
  answerTex: string;
  unit: string;
  solution: { title: string; text: string; formula: string }[];
}

export const iphoTasks: IphoTask[] = [
  {
    id: "ipho-2025-hydrogen",
    letter: "A",
    title: "Hydrogen and galaxies",
    topic: "Atomic physics",
    source: "https://www.ipho2025.fr/sujets-officiels-ipho-france-2025",
    year: 2025,
    paper: 1,
    originalPart: "Theory 1 · A.1 · Bohr model",
    adaptation: "Paraphrased from T1, A.1. Type epsilon for the vacuum permittivity ε₀. Here, e denotes the positive elementary charge, not Euler’s number. The proton is fixed, as in the original model.",
    prompt: "In a classical model of hydrogen, a non-relativistic electron of mass m travels in a circular orbit of radius r around a fixed proton. The electron and proton carry charges −e and +e. Ignoring radiation, find the electron’s positive orbital speed in terms of e, epsilon, m, and r.",
    variables: [
      { name: "e", meaning: "positive elementary charge" },
      { name: "epsilon", meaning: "vacuum permittivity (ε₀)" },
      { name: "m", meaning: "electron mass" },
      { name: "r", meaning: "orbit radius" },
    ],
    expected: "sqrt(e^2/(4*pi*epsilon*m*r))",
    answerTex: "$$v=\\sqrt{\\frac{e^2}{4\\pi\\varepsilon_0mr}}$$",
    unit: "m/s",
    solution: [
      { title: "Identify the attractive force", text: "Coulomb’s force between the proton and electron points toward the centre of the circular orbit.", formula: "$$F=\\frac{e^2}{4\\pi\\varepsilon_0r^2}$$" },
      { title: "Supply the centripetal acceleration", text: "Equate the electric force with the required centripetal force, then choose the positive square root because the question asks for speed.", formula: "$$\\frac{mv^2}{r}=\\frac{e^2}{4\\pi\\varepsilon_0r^2}\\quad\\Longrightarrow\\quad v=\\sqrt{\\frac{e^2}{4\\pi\\varepsilon_0mr}}$$" },
    ],
  },
  {
    id: "ipho-2025-timepiece",
    letter: "B",
    title: "Cox’s Timepiece",
    topic: "Hydrostatics",
    source: "https://www.ipho2025.fr/sujets-officiels-ipho-france-2025",
    year: 2025,
    paper: 2,
    originalPart: "Theory 2 · A.1 · Pulling on a submerged tube",
    adaptation: "Adapted from the force component of T2, A.1, case b. Submit the upward force magnitude, not its vector. rho replaces ρ. The pressure expression requested in the original is included in the worked solution.",
    prompt: "An upright, thin-walled tube of mass m and internal cross-sectional area S is closed at the top and open at the bottom. Its bottom remains submerged in a large liquid bath of density rho. The tube contains no gas and is completely filled with liquid up to its closed top, which is at height h above the bath’s free surface. Before cavitation occurs, what upward force F holds the tube in static equilibrium? Neglect surface tension and wall thickness. Here, g is the gravitational acceleration.",
    variables: [
      { name: "m", meaning: "empty tube mass" },
      { name: "S", meaning: "tube cross-sectional area" },
      { name: "rho", meaning: "liquid density (ρ)" },
      { name: "h", meaning: "top height above the bath" },
      { name: "g", meaning: "gravitational acceleration" },
    ],
    expected: "(m+rho*S*h)*g",
    answerTex: "$$F=(m+\\rho Sh)g$$",
    unit: "N",
    solution: [
      { title: "Find the pressure at the closed top", text: "Hydrostatic pressure decreases with height. If the atmospheric pressure at the bath is p₀, the pressure just inside the top is lower by ρgh.", formula: "$$p_{\\mathrm{w}}=p_0-\\rho gh$$" },
      { title: "Balance the vertical forces", text: "The pressure difference across the top produces a net downward force in addition to the tube’s weight. The upward holding force must balance both.", formula: "$$F=mg+(p_0-p_{\\mathrm{w}})S=(m+\\rho Sh)g$$" },
    ],
  },
  {
    id: "ipho-2025-champagne",
    letter: "C",
    title: "Champagne!",
    topic: "Surface tension",
    source: "https://www.ipho2025.fr/sujets-officiels-ipho-france-2025",
    year: 2025,
    paper: 3,
    originalPart: "Theory 3 · A.2 · Critical bubble radius",
    adaptation: "Adapted from the symbolic part of T3, A.2. The numerical evaluation is omitted. Type sigma for surface tension, P for p₀, c for cℓ, and c0 for the equilibrium concentration c₀. The liquid is supersaturated: c > c0.",
    prompt: "A spherical CO₂ bubble forms in a supersaturated liquid at constant temperature and external pressure P. The liquid’s surface tension is sigma. Far from the bubble the dissolved CO₂ concentration is c, and c0 is its equilibrium concentration at pressure P, with c > c0. Henry’s law makes the equilibrium concentration at the bubble surface proportional to the internal bubble pressure. Using the Laplace pressure jump 2*sigma/r, find the critical radius above which the bubble grows.",
    variables: [
      { name: "sigma", meaning: "liquid surface tension (σ)" },
      { name: "P", meaning: "external liquid pressure" },
      { name: "c", meaning: "far-field CO₂ concentration" },
      { name: "c0", meaning: "equilibrium CO₂ concentration at P" },
    ],
    expected: "2*sigma/(P*(c/c0-1))",
    answerTex: "$$r_c=\\frac{2\\sigma}{P(c/c_0-1)}$$",
    unit: "m",
    solution: [
      { title: "Account for the curved interface", text: "Laplace’s law makes the pressure inside a gas bubble higher than the pressure in the surrounding liquid. There is a single liquid-gas interface, unlike a soap bubble.", formula: "$$p_{\\mathrm{b}}=P+\\frac{2\\sigma}{r}$$" },
      { title: "Apply Henry’s law at the threshold", text: "Let kH be Henry’s constant. At the critical radius, the concentration at the bubble surface equals the far-field concentration. Use c₀ = kH P to eliminate the constant.", formula: "$$c=k_H\\left(P+\\frac{2\\sigma}{r_c}\\right),\\qquad c_0=k_HP\\quad\\Longrightarrow\\quad r_c=\\frac{2\\sigma}{P(c/c_0-1)}$$" },
      { title: "Identify the growing side", text: "Above the critical radius the surface equilibrium concentration is below the far-field concentration. CO₂ diffuses toward the bubble, so it grows.", formula: "$$r>r_c\\quad\\Longrightarrow\\quad c_{\\mathrm{surface}}<c$$" },
    ],
  },
];
