export interface IphoTask {
  id: string;
  letter: string;
  title: string;
  topic: string;
  source: string;
  year: number;
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
    id: "ipho-2011-orbits",
    letter: "A",
    title: "Two bodies, one orbit",
    topic: "Mechanics",
    source: "https://www.ipho-new.org/download/567/",
    year: 2011,
    originalPart: "Theory 1 · §1.1 · A Three-body Problem and LISA",
    adaptation: "Paraphrased from subpart 1.1. Express the answer using the combined mass and orbital separation; this prototype does not apply the centre-of-mass constraint to alternative forms.",
    prompt: "Two gravitating masses M and m move in circular orbits of radii R and r about their common centre of mass. Find the positive angular velocity of the line joining the masses. Write your expression using the combined mass (M + m), the separation (R + r), and G.",
    variables: [
      { name: "G", meaning: "gravitational constant" },
      { name: "M", meaning: "first mass" },
      { name: "m", meaning: "second mass" },
      { name: "R", meaning: "orbital radius of M" },
      { name: "r", meaning: "orbital radius of m" },
    ],
    expected: "sqrt(G*(M+m)/(R+r)^3)",
    answerTex: "$$\\omega_0=\\sqrt{\\frac{G(M+m)}{(R+r)^3}}$$",
    unit: "rad/s",
    solution: [
      { title: "Use the common centre of mass", text: "Both bodies have the same angular velocity. The centre-of-mass condition relates their orbital radii.", formula: "$$MR=mr$$" },
      { title: "Let gravity provide the centripetal force", text: "The separation is the sum of the two radii. Apply Newton’s second law to the smaller mass.", formula: "$$\\frac{GMm}{(R+r)^2}=m\\omega_0^2 r$$" },
      { title: "Eliminate the mass–radius ratio", text: "Use the centre-of-mass condition and take the positive square root to obtain the angular speed.", formula: "$$\\omega_0^2=\\frac{G(M+m)}{(R+r)^3}$$" },
    ],
  },
  {
    id: "ipho-2015-energy",
    letter: "B",
    title: "The Sun’s gravitational energy",
    topic: "Gravitation",
    source: "https://www.ipho-new.org/download/668/",
    year: 2015,
    originalPart: "Theory 1 · A9 · Particles from the Sun",
    adaptation: "Paraphrased from A9. M and R replace the original solar mass and radius notation.",
    prompt: "Model the Sun as a sphere of total mass M and radius R with uniform density. Find its total gravitational potential energy in terms of G, M, and R. Set gravitational potential energy to zero when the constituent matter is dispersed at infinity.",
    variables: [
      { name: "G", meaning: "gravitational constant" },
      { name: "M", meaning: "total solar mass" },
      { name: "R", meaning: "solar radius" },
    ],
    expected: "-3*G*M^2/(5*R)",
    answerTex: "$$\\Omega=-\\frac{3GM^2}{5R}$$",
    unit: "J",
    solution: [
      { title: "Build the sphere in thin shells", text: "At intermediate radius x, the enclosed mass is proportional to x cubed because the density is uniform.", formula: "$$m(x)=M\\frac{x^3}{R^3},\\qquad dm=\\frac{3Mx^2}{R^3}dx$$" },
      { title: "Add the shell assembly energies", text: "Bring each shell in from infinity, then integrate from the centre to the surface. The negative sign indicates a gravitationally bound system.", formula: "$$\\Omega=-\\int_0^R\\frac{Gm(x)}{x}dm=-\\frac{3GM^2}{R^6}\\int_0^R x^4dx=-\\frac{3GM^2}{5R}$$" },
    ],
  },
  {
    id: "ipho-2015-lifetime",
    letter: "C",
    title: "How long could gravity power the Sun?",
    topic: "Energy",
    source: "https://www.ipho-new.org/download/668/",
    year: 2015,
    originalPart: "Theory 1 · A10 · Particles from the Sun",
    adaptation: "Adapted from A10: submit a symbolic duration in seconds instead of the original numerical estimate in years. Uses the same uniform-density contraction model as A9.",
    prompt: "The Kelvin–Helmholtz hypothesis imagines the Sun contracting from a very diffuse cloud with negligible initial gravitational potential energy. Assume uniform solar density and constant luminosity L. Using all of the released gravitational energy as radiation, find the maximum shining time in terms of G, M, R, and L. Give a symbolic duration in seconds, not a numerical age in years.",
    variables: [
      { name: "G", meaning: "gravitational constant" },
      { name: "M", meaning: "solar mass" },
      { name: "R", meaning: "present solar radius" },
      { name: "L", meaning: "constant luminosity (power)" },
    ],
    expected: "3*G*M^2/(5*R*L)",
    answerTex: "$$\\tau_{\\mathrm{KH}}=\\frac{3GM^2}{5RL}$$",
    unit: "s",
    solution: [
      { title: "Find the available energy", text: "The initial cloud has negligible binding energy. The magnitude of the present gravitational potential energy is the model’s total available radiated energy.", formula: "$$E_{\\mathrm{available}}=-\\Omega=\\frac{3GM^2}{5R}$$" },
      { title: "Divide energy by constant power", text: "With SI inputs this gives seconds. The original paper’s numerical estimate is 18.8 million years, much less than the age of the solar system; contraction alone cannot explain the Sun’s lifetime.", formula: "$$\\tau_{\\mathrm{KH}}=\\frac{E_{\\mathrm{available}}}{L}=\\frac{3GM^2}{5RL}$$" },
    ],
  },
];
