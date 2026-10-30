export type IphoPaperId = "t1" | "t2" | "t3" | "e1" | "e2";

export interface IphoSubproblem {
  id: string;
  paperId: IphoPaperId;
  part: string;
  title: string;
  points: number;
  page: number;
  solutionPage: number;
  prompt: string;
  model?: string;
  symbolicTaskId?: string;
}

export interface IphoPaper {
  id: IphoPaperId;
  code: string;
  kind: "Theory" | "Experiment";
  title: string;
  topic: string;
  pages: number;
  solutionPages: number;
  introduction: string;
  sections: { letter: string; title: string }[];
}

export const iphoPapers: IphoPaper[] = [
  {
    id: "t1",
    code: "T1",
    kind: "Theory",
    title: "Hydrogen and galaxies",
    topic: "Atomic physics · Astrophysics",
    pages: 6,
    solutionPages: 15,
    introduction:
      "Follow hydrogen from the Bohr model and the 21 cm line to galactic rotation curves, mass distributions, and modified Newtonian dynamics. The original figures and physical constants are available in the paper reader below.",
    sections: [
      { letter: "A", title: "Introduction: hydrogen" },
      { letter: "B", title: "Rotation curves of galaxies" },
      { letter: "C", title: "Mass distribution in our galaxy" },
      { letter: "D", title: "Tully–Fisher relation and MOND" },
    ],
  },
  {
    id: "t2",
    code: "T2",
    kind: "Theory",
    title: "Cox’s Timepiece",
    topic: "Hydrostatics · Mechanics",
    pages: 6,
    solutionPages: 20,
    introduction:
      "Study a clock powered by atmospheric-pressure fluctuations. Liquids are incompressible, surface tension is neglected, temperature is constant, and atmospheric pressure does not vary with altitude. Use the original diagrams and tables for the tube, bulb, cistern, and pulley geometry.",
    sections: [
      { letter: "A", title: "Pulling on a submerged tube" },
      { letter: "B", title: "Two-part barometric tube" },
      { letter: "C", title: "Cox’s timepiece" },
    ],
  },
  {
    id: "t3",
    code: "T3",
    kind: "Theory",
    title: "Champagne!",
    topic: "Fluids · Thermodynamics · Acoustics",
    pages: 5,
    solutionPages: 12,
    introduction:
      "Study bubble nucleation and growth, the sound of bursting bubbles, and the thermodynamics of opening a bottle. Bubbles contain only carbon dioxide, and gases are ideal. Henry’s constants, material properties, photographs, and graphs are in the original paper.",
    sections: [
      { letter: "A", title: "Nucleation, growth and rise of bubbles" },
      { letter: "B", title: "Acoustic emission of a bursting bubble" },
      { letter: "C", title: "Popping champagne" },
    ],
  },
  {
    id: "e1",
    code: "E1",
    kind: "Experiment",
    title: "Earth’s magnetic field measurement",
    topic: "Magnetism · Experimental methods",
    pages: 6,
    solutionPages: 16,
    introduction:
      "Characterize a magnet with a Gouy balance, then measure the horizontal component of Earth’s magnetic field. Uncertainties are determined from fits, not individual data points. Measurement tasks require the original apparatus or your own measured data. This archive does not simulate measurements.",
    sections: [
      { letter: "A", title: "Gouy balance and magnetic moment" },
      { letter: "B", title: "Determining Earth’s magnetic field" },
    ],
  },
  {
    id: "e2",
    code: "E2",
    kind: "Experiment",
    title: "Sand craters and dunes",
    topic: "Mechanics · Granular materials",
    pages: 7,
    solutionPages: 13,
    introduction:
      "Compare impact-crater scaling laws and investigate a ball rolling into sand. The two parts are independent. Equipment, ball diameters and masses, preparation instructions, and rail geometry are provided in the original paper. Experimental results must come from measurements, not invented sample data.",
    sections: [
      { letter: "A", title: "Impact craters" },
      { letter: "B", title: "Rolling and bogging in sand" },
    ],
  },
];

const problemsByPaper: Record<
  IphoPaperId,
  Omit<IphoSubproblem, "id" | "paperId">[]
> = {
  t1: [
    {
      part: "A.1",
      title: "Electron orbital speed",
      points: 0.2,
      page: 1,
      solutionPage: 1,
      symbolicTaskId: "ipho-2025-hydrogen",
      prompt:
        "A non-relativistic electron moves on a circular orbit around a fixed proton. Determine its speed as a function of the orbit radius.",
    },
    {
      part: "A.2",
      title: "Bohr radius and ground-state speed",
      points: 0.5,
      page: 1,
      solutionPage: 1,
      prompt:
        "Use quantization of the electron’s angular momentum to show that each allowed radius is the ground-state radius multiplied by the square of the principal quantum number. Express the Bohr radius in terms of the fine-structure constant, electron mass, speed of light, and reduced Planck constant. Calculate it to three significant digits, and express the ground-state speed in terms of the fine-structure constant and speed of light.",
      model: String.raw`$$L=n\hbar,\qquad \alpha=\frac{e^2}{4\pi\varepsilon_0\hbar c}$$`,
    },
    {
      part: "A.3",
      title: "Hydrogen energy levels",
      points: 0.5,
      page: 1,
      solutionPage: 2,
      prompt:
        "Determine the electron’s mechanical energy on each allowed orbit in terms of elementary charge, vacuum permittivity, Bohr radius, and principal quantum number. Express the ground-state energy using the fine-structure constant, electron mass, and speed of light, then evaluate it in electronvolts.",
    },
    {
      part: "A.4",
      title: "Magnetic field in the electron frame",
      points: 0.5,
      page: 1,
      solutionPage: 2,
      prompt:
        "In the electron’s reference frame, the proton moves around it at the Bohr radius. Determine the magnitude of the magnetic field at the electron using vacuum permeability, elementary charge, the fine-structure constant, speed of light, and Bohr radius.",
    },
    {
      part: "A.5",
      title: "Fine structure and the 21 cm line",
      points: 0.5,
      page: 2,
      solutionPage: 3,
      prompt:
        "Express the fine-structure energy splitting in terms of the fine-structure constant and ground-state energy. Use the magnetic-moment approximation and hyperfine relation below to obtain the wavelength emitted in a hyperfine transition, and evaluate it to two significant digits.",
      model: String.raw`$$\mathcal M_s\simeq\frac{e\hbar}{m_e},\qquad \Delta E_{\mathrm{HF}}\simeq3.72\frac{m_e}{m_p}\Delta E_{\mathrm F}$$`,
    },
    {
      part: "B.1",
      title: "Circular speed in a spherical galaxy",
      points: 0.2,
      page: 2,
      solutionPage: 4,
      prompt:
        "A spherical galaxy has a gravitational potential per unit mass that depends only on distance from its centre. Express the circular orbital speed at a given radius in terms of that radius and the radial derivative of the potential.",
    },
    {
      part: "B.2",
      title: "Mass of the galactic bulge",
      points: 0.5,
      page: 2,
      solutionPage: 4,
      prompt:
        "Use the red model rotation curve of NGC 6946 in Figure 1(B) to infer the bulge mass, expressed in solar masses. The bulge is approximately homogeneous inside one kiloparsec, and the model outside is Keplerian. Use the axis values and unit conversions from the original page.",
    },
    {
      part: "B.3",
      title: "Dark-halo rotation curve",
      points: 1.8,
      page: 3,
      solutionPage: 5,
      prompt:
        "For the mass-density model below, derive the stated circular-speed form and identify both constants. Simplify it far inside and far outside the characteristic radius. At large radius, show how enclosed mass depends only on the density constant and radius. Use Figure 1 to estimate the mass of NGC 6946 visible within the photograph.",
      model: String.raw`$$\rho_m(r)=\frac{C_m}{r_m^2+r^2},\qquad v_{c,m}(r)=\sqrt{k_1-\frac{k_2\arctan(r/r_m)}r}$$`,
    },
    {
      part: "C.1",
      title: "Vertical stability of the galactic plane",
      points: 0.5,
      page: 3,
      solutionPage: 7,
      prompt:
        "For the potential below, derive the equation of vertical motion at a fixed cylindrical radius smaller than the reference radius. Show that the galactic plane is a stable equilibrium and determine the angular frequency of small vertical oscillations.",
      model: String.raw`$$\varphi_G(r,z)=\varphi_0\ln\!\left(\frac r{r_0}\right)\exp\!\left[-\left(\frac z{z_0}\right)^2\right],\qquad\varphi_0>0$$`,
    },
    {
      part: "C.2",
      title: "Recovering a flat rotation curve",
      points: 0.6,
      page: 3,
      solutionPage: 7,
      prompt:
        "With motion restricted to the galactic plane, identify whether the small-radius or large-radius limit of the density model in Part B recovers the logarithmic potential in C.1. Specify the corresponding potential constant and express the radius-independent circular speed in terms of it.",
    },
    {
      part: "C.3",
      title: "Galactic Doppler geometry",
      points: 0.7,
      page: 4,
      solutionPage: 8,
      prompt:
        "The Sun and a hydrogen-emitting galactic object move on circular orbits with the same speed. Using Figure 2 and the longitude of the line of sight, determine the object’s radial velocity relative to the Sun. Rearrange the result to express its distance from the galactic centre in terms of the Sun’s orbital radius, Sun’s speed, longitude, and measured relative radial velocity.",
    },
    {
      part: "C.4",
      title: "Locate three hydrogen sources",
      points: 0.6,
      page: 5,
      solutionPage: 9,
      prompt:
        "Using the three spectral peaks in Figure 3 on page 4, determine each source’s relative radial velocity to three significant digits and distance from the galactic centre to two significant digits. Express distances as multiples of the Sun’s orbital radius. The observing longitude is 30 degrees, the reference frequency is 1.42 GHz, and the Sun’s orbital speed is 220 kilometres per second.",
    },
    {
      part: "C.5",
      title: "Map the sources in the Milky Way",
      points: 0.6,
      page: 5,
      solutionPage: 10,
      prompt:
        "On the top-view galactic diagram in the official answer sheet, indicate the possible positions of the three sources identified in Figure 3. Explain what repeated measurements at different galactic longitudes would reveal.",
    },
    {
      part: "D.1",
      title: "The Tully–Fisher exponent",
      points: 0.4,
      page: 5,
      solutionPage: 12,
      prompt:
        "Assuming a galaxy’s radius is independent of its mass, show that the density model in Part B produces a power-law relation between total mass and asymptotic circular speed. Determine its exponent and prefactor. Read the observed Tully–Fisher exponent from Figure 4 and compare the two results.",
      model: String.raw`$$M_{\mathrm{tot}}=\eta\,v_{c,\infty}^{\gamma}$$`,
    },
    {
      part: "D.2",
      title: "Acceleration at a galaxy’s outskirts",
      points: 0.2,
      page: 6,
      solutionPage: 13,
      prompt:
        "Use the rotation data for NGC 6946 in Figure 1 on page 2 to estimate, within Newtonian mechanics, the magnitude of the acceleration of an orbiting mass in the galaxy’s outer regions.",
    },
    {
      part: "D.3",
      title: "Tully–Fisher from MOND",
      points: 0.8,
      page: 6,
      solutionPage: 13,
      prompt:
        "In the deep-MOND regime, determine the mass–speed power-law exponent for circular motion around a fixed central mass. Use the NGC 6946 data and/or the Tully–Fisher relation to estimate the MOND acceleration constant and verify that the assumed low-acceleration regime is consistent.",
      model: String.raw`$$\vec F=m\mu(a/a_0)\vec a,\qquad \mu(x)=\frac{x}{1+x},\qquad a\ll a_0$$`,
    },
    {
      part: "D.4",
      title: "A complete MOND rotation curve",
      points: 0.9,
      page: 6,
      solutionPage: 14,
      prompt:
        "Determine the circular-speed profile at every radius for a homogeneous spherical mass distribution of total mass M and radius Rb using the MOND interpolation law. Distinguish the relevant interior/exterior and acceleration regimes.",
      model: String.raw`$$\mu(x)=\frac{x}{1+x}$$`,
    },
  ],
  t2: [
    {
      part: "A.1",
      title: "Pressure and holding force",
      points: 0.2,
      page: 2,
      solutionPage: 2,
      symbolicTaskId: "ipho-2025-timepiece",
      prompt:
        "A thin-walled tube, closed at the top and open at the bottom, is lifted slowly from a liquid bath without initially containing any gas. For configuration b in Figure 2, express the pressure at the top of the liquid and the upward holding-force vector. Use atmospheric pressure, density, empty tube mass, tube cross-sectional area, top height, gravitational acceleration, and the upward unit vector.",
    },
    {
      part: "A.2",
      title: "Cavitation and force plateaus",
      points: 0.8,
      page: 2,
      solutionPage: 3,
      prompt:
        "For each of the three water experiments in Table 1, identify whether force–height behaviour A or B occurs. Complete the official answer-sheet table with the maximum holding force and, when relevant, the threshold height where the force plateaus. Use the stated temperatures, densities, saturated vapour pressures, tube dimensions, and atmospheric pressure.",
    },
    {
      part: "A.3",
      title: "Neglecting mercury vapour pressure",
      points: 0.3,
      page: 3,
      solutionPage: 4,
      prompt:
        "For mercury at 20 degrees Celsius, express the relative error in the maximum holding force caused by neglecting saturated vapour pressure compared with atmospheric pressure. Evaluate the error numerically using the mercury data on page 2.",
    },
    {
      part: "B.1",
      title: "Which mercury adds to the weight?",
      points: 0.3,
      page: 3,
      solutionPage: 5,
      prompt:
        "Consider the air-free barometric tube with a wider bulb shown in Figure 3. On the official answer-sheet diagram, shade the volume of mercury responsible for the added-mass term in the holding force. The lower tube and upper bulb have different cross-sectional areas.",
      model: String.raw`$$\vec F=(m_{\mathrm{tb}}+m_{\mathrm{add}})g\vec u_z$$`,
    },
    {
      part: "B.2",
      title: "Added mass as the tube rises",
      points: 1.4,
      page: 3,
      solutionPage: 6,
      prompt:
        "At fixed atmospheric pressure, lift the two-part tube from full submersion until its base reaches the bath surface. Sketch added mass against the height of the tube–bulb junction over the full specified interval. Give analytical expressions for the slopes of each segment and the heights of all corners, in terms of the dimensions, cross sections, pressure, density, and gravity.",
      model: String.raw`$$h_t\in[-H_b,H_t],\qquad H_t=80\,\mathrm{cm},\quad H_b=20\,\mathrm{cm}$$`,
    },
    {
      part: "B.3",
      title: "Pressure-driven mass variation",
      points: 0.3,
      page: 4,
      solutionPage: 7,
      prompt:
        "Hold the tube–bulb junction at a fixed height so that the mercury free surface stays inside the bulb. Atmospheric pressure follows the triangular perturbation in Figure 4 with amplitude 500 pascals. Derive and evaluate the amplitude of added-mass variation for tube and bulb cross sections of 5 and 200 square centimetres, respectively.",
    },
    {
      part: "C.1",
      title: "The threshold for motion",
      points: 1,
      page: 5,
      solutionPage: 9,
      prompt:
        "Use the cistern, barometric tube, pulley arrangement, dimensions, and initial balance described on pages 4–5. Determine the threshold of the dimensionless friction parameter above which the sliding mass remains permanently at rest. Use its definition in Equation 3 and the periodic pressure forcing.",
    },
    {
      part: "C.2",
      title: "Restoring tension at the stop",
      points: 1,
      page: 6,
      solutionPage: 12,
      prompt:
        "Temporarily block the sliding mass at the positive displacement stop while the atmospheric-pressure perturbation is zero. Derive the vector sum of the two cable tensions on the mass in terms of mercury density, gravity, stop displacement, and the relevant cross-sectional areas.",
    },
    {
      part: "C.3",
      title: "Motion regimes and hysteresis",
      points: 2,
      page: 6,
      solutionPage: 14,
      prompt:
        "When the friction parameter is below the no-motion threshold, distinguish the two possible operating regimes. Complete the official answer-sheet table with conditions expressed as inequalities in the dimensionless friction and displacement parameters defined in Equations 3–4. Sketch the normalized mass displacement over the first three pressure periods, starting from the stated balanced initial condition. Coordinates of special points are not required.",
    },
    {
      part: "C.4",
      title: "Maximize the clock’s energy",
      points: 1,
      page: 6,
      solutionPage: 17,
      prompt:
        "In steady energy-harvesting operation, assume the bulb and cistern areas are approximately equal and the lower-tube area is negligible. Optimize friction force and stop displacement to maximize energy dissipated per pressure cycle. Give the optimal force, displacement, and maximum recovered energy in terms of density, gravity, cistern area, and pressure amplitude. Evaluate the energy for the supplied apparatus and 500-pascal amplitude.",
    },
    {
      part: "C.5",
      title: "Pressure work and efficiency",
      points: 1.7,
      page: 6,
      solutionPage: 17,
      prompt:
        "For the optimal operating configuration, calculate the work supplied to the system by atmospheric-pressure forces during a complete cycle. Determine the ratio of recovered energy to that pressure work. A pressure–volume diagram may be useful.",
    },
  ],
  t3: [
    {
      part: "A.1",
      title: "Laplace pressure of a bubble",
      points: 0.2,
      page: 1,
      solutionPage: 1,
      prompt:
        "A spherical carbon-dioxide bubble forms in champagne at atmospheric liquid pressure. Express the bubble’s internal pressure in terms of ambient pressure, bubble radius, and surface tension. There is one liquid–gas interface.",
    },
    {
      part: "A.2",
      title: "The critical nucleation radius",
      points: 0.5,
      page: 1,
      solutionPage: 1,
      symbolicTaskId: "ipho-2025-champagne",
      prompt:
        "Using Henry’s law and the Laplace pressure jump, express the critical bubble radius above which a bubble grows, in terms of atmospheric pressure, surface tension, dissolved carbon-dioxide concentration, and its equilibrium concentration at atmospheric pressure. Evaluate the radius when the dissolved concentration is four times the equilibrium value.",
    },
    {
      part: "A.3",
      title: "Which bubble-growth law fits?",
      points: 1.2,
      page: 2,
      solutionPage: 2,
      prompt:
        "For a visible bubble, neglect the pressure excess due to surface tension and write its carbon-dioxide content using the ideal-gas law. Derive the radius as a function of time for both interfacial-flux models below, starting from the given initial radius. Use the measured radius–time graph in Figure 2 to select the model and determine the appropriate transport coefficient numerically.",
      model: String.raw`$$j_1=\frac D a(c_\ell-c_b),\qquad j_2=K(c_\ell-c_b),\qquad c_\ell\simeq4c_0$$`,
    },
    {
      part: "A.4",
      title: "Rising bubbles and viscosity",
      points: 0.8,
      page: 2,
      solutionPage: 3,
      prompt:
        "List the main forces on a vertically rising bubble and obtain its terminal speed as a function of radius using Stokes drag. Estimate the liquid’s dynamic viscosity using Figure 3, liquid density, gravitational acceleration, and the bubble-emission frequency of 20 hertz.",
      model: String.raw`$$F_{\mathrm{drag}}=6\pi\eta a v$$`,
    },
    {
      part: "A.5",
      title: "Bubble radius at the surface",
      points: 0.5,
      page: 2,
      solutionPage: 4,
      prompt:
        "Assume a constant bubble-radius growth rate throughout the rise and a final radius much larger than the initial radius. Express the radius at the free surface in terms of the distance risen, growth rate, and any needed constants. Evaluate it for a 10-centimetre liquid depth using the growth rate inferred from Figure 2.",
    },
    {
      part: "A.6",
      title: "How quickly does champagne go flat?",
      points: 1.1,
      page: 3,
      solutionPage: 5,
      prompt:
        "Bubbles are produced at a constant frequency at a specified number of nucleation sites in a glass of known liquid height and volume. Neglect initial bubble radius and direct carbon-dioxide diffusion through the free surface. Derive the differential equation for dissolved concentration versus time and obtain its characteristic decay time.",
    },
    {
      part: "B.1",
      title: "Retraction speed of a pierced film",
      points: 1.1,
      page: 3,
      solutionPage: 6,
      prompt:
        "A circular hole expands at constant speed through a liquid film of uniform thickness. The surrounding film is initially at rest and liquid accumulates in the rim. Only half the decrease in surface energy becomes kinetic energy. Ignore the rim’s surface-area change relative to the film’s. Express the retraction speed in terms of liquid density, surface tension, and film thickness, using Figure 4.",
    },
    {
      part: "B.2",
      title: "The Helmholtz resonator",
      points: 1.1,
      page: 4,
      solutionPage: 7,
      prompt:
        "A gas-filled cavity at atmospheric pressure has an opening of cross-sectional area S containing an effective piston mass. Small piston displacements compress or expand the cavity gas adiabatically. Gravity on the piston is negligible. Express the oscillation frequency using equilibrium cavity volume, opening area, piston mass, pressure, and adiabatic coefficient. Refer to Figure 5.",
    },
    {
      part: "B.3",
      title: "Infer bubble size from its sound",
      points: 1.1,
      page: 4,
      solutionPage: 8,
      prompt:
        "Apply the Helmholtz model to a bursting spherical bubble. Use the aperture-dependent effective gas mass, maximum aperture radius, and gas density given on page 4. The maximum emitted frequency is 40 kilohertz and the bursting time is 0.03 milliseconds. Determine the bubble radius and the thickness of the liquid film separating it from the atmosphere.",
      model: String.raw`$$m_p=\frac83\rho_g r^3,\qquad r_c=\frac2{\sqrt3}a^2\sqrt{\frac{\rho_\ell g_0}{\sigma}}$$`,
    },
    {
      part: "C.1",
      title: "Pressure inside a sealed bottle",
      points: 0.4,
      page: 5,
      solutionPage: 9,
      prompt:
        "A sealed bottle contains a total of 0.2 moles of carbon dioxide, partitioned between 750 millilitres of liquid and 25 millilitres of gas. Calculate the equilibrium gas pressure at 6 and 20 degrees Celsius using Henry’s law, the ideal-gas law, and the temperature-dependent Henry constants on page 1.",
    },
    {
      part: "C.2",
      title: "Blue fog or white fog?",
      points: 0.7,
      page: 5,
      solutionPage: 10,
      prompt:
        "For rapid reversible adiabatic expansion on opening, calculate the final gas temperature starting at 6 and 20 degrees Celsius, first assuming no phase transition. For these questions use initial pressures of 4.69 and 7.45 bar, respectively. Use the supplied carbon-dioxide sublimation curve to decide which of the four statements on page 5 are true: grey-white water fog or blue solid-carbon-dioxide fog at each initial temperature. Several statements may be true.",
      model: String.raw`$$\log_{10}\!\left(\frac{P_{\mathrm{CO}_2}^{\mathrm{sat}}}{P_0}\right)=6.81-\frac{1.30\times10^3\,\mathrm K}{T-3.49\,\mathrm K},\qquad\gamma=1.3$$`,
    },
    {
      part: "C.3",
      title: "How high does the cork fly?",
      points: 1.3,
      page: 5,
      solutionPage: 11,
      prompt:
        "Determine the maximum height reached by the cork when a bottle initially at 6 degrees Celsius is opened. Friction is proportional to the cork’s contact area, and the initial net pressure force only just overcomes friction. The cork mass is 10 grams, its diameter is 1.8 centimetres, and its initially inserted cylindrical length is 2.5 centimetres. Use the specified initial pressure and reversible adiabatic expansion. Neglect net pressure force after the cork clears the neck.",
    },
  ],
  e1: [
    {
      part: "A.1",
      title: "Battery operating time",
      points: 0.2,
      page: 3,
      solutionPage: 4,
      prompt:
        "Estimate the typical operating time of one supplied battery for a current of about 2 amperes. The battery capacity is approximately 300 milliampere-hours. Take this limit into account when planning the later protocols. The coils are needed only in Part A.",
    },
    {
      part: "A.2",
      title: "Map the anti-Helmholtz field",
      points: 0.8,
      page: 4,
      solutionPage: 4,
      prompt:
        "At a fixed current of approximately 1 ampere, measure and plot the axial magnetic field against sensor position inside the anti-Helmholtz coils. Identify the largest position interval over which the measured field is linear. Use the probe positioning and coil wiring instructions on pages 1–2.",
    },
    {
      part: "A.3",
      title: "Calibrate the field gradient",
      points: 0.9,
      page: 4,
      solutionPage: 5,
      prompt:
        "Place the magnetic sensor at two positions within the linear region identified in A.2. Make measurements over different currents and plot a suitable quantity to verify the current dependence in the field model below. Determine the coefficient alpha and its fit-derived uncertainty.",
      model: String.raw`$$\vec B(z)=\alpha i(z-z_0)\vec e_z$$`,
    },
    {
      part: "A.4",
      title: "Magnetic moment from a Gouy balance",
      points: 0.8,
      page: 4,
      solutionPage: 6,
      prompt:
        "Replace the magnetic sensor with the force sensor following the apparatus instructions. Measure the sensor’s gram-force reading as a function of coil current. Use an appropriate graph and the dipole-force model to determine the magnet’s magnetic moment and uncertainty. Convert gram-force readings consistently.",
      model: String.raw`$$F_z=m_m\frac{dB}{dz}$$`,
    },
    {
      part: "A.5",
      title: "Magnetic moment from the dipole field",
      points: 1.3,
      page: 4,
      solutionPage: 7,
      prompt:
        "Measure the axial field of the free magnet as a function of distance. Construct a graph that tests the dipole-field model below and reveals deviations from it. Infer another value of the magnetic moment with uncertainty. The effective axial origin need not coincide with the magnet’s geometric centre.",
      model: String.raw`$$B_z(z)=\frac{\mu_0m_m}{2\pi(z-z_a)^3}$$`,
    },
    {
      part: "A.6",
      title: "Combine the moment measurements",
      points: 0.2,
      page: 4,
      solutionPage: 8,
      prompt:
        "Use the two experimental magnetic moments obtained in A.4 and A.5 to propose a final value of the magnet’s magnetic moment, with its uncertainty. Explain how you use the consistency and uncertainties of the measurements.",
    },
    {
      part: "B.1",
      title: "Design an Earth-field measurement",
      points: 0.3,
      page: 5,
      solutionPage: 9,
      prompt:
        "With the untwisted suspension wire set to 34 centimetres and its neutral angle aligned with Earth’s horizontal field, initially neglect the wire torque. Propose a protocol for determining the horizontal field from magnet oscillations. Define each measured quantity and its unit, draw a detailed schematic, give the governing relation, and label each quantity as fixed or varied. Follow the apparatus setup instructions and magnetic-interference precautions.",
    },
    {
      part: "B.2",
      title: "First estimate of Earth’s field",
      points: 1.1,
      page: 5,
      solutionPage: 10,
      prompt:
        "Carry out the protocol proposed in B.1. Draw a graph from the measured data and obtain a first estimate of the horizontal component of Earth’s magnetic field with its fit-derived uncertainty.",
    },
    {
      part: "B.3",
      title: "Measure the suspension-wire torque",
      points: 0.7,
      page: 5,
      solutionPage: 11,
      prompt:
        "Keep the wire length at 34 centimetres and remove the magnet. Measure an oscillation period in each of two system configurations. State the relation between the measured quantities and the wire’s torsion coefficient, then determine that coefficient and its experimental uncertainty.",
      model: String.raw`$$\Gamma_f=-\frac{C_f}{L}(\theta-\theta_0)$$`,
    },
    {
      part: "B.4",
      title: "When can wire torque be neglected?",
      points: 0.3,
      page: 5,
      solutionPage: 12,
      prompt:
        "From your earlier measurements, express and evaluate the critical wire length where the amplitudes of wire torque and magnetic torque are equal. For your B.2 setup, calculate the wire-to-magnetic torque-amplitude ratio and place it in one of the specified percentage intervals: below 1, 1–5, 5–20, 20–50, or at least 50 percent.",
      model: String.raw`$$\frac{C_f}{L_c}=m_mB_e$$`,
    },
    {
      part: "B.5",
      title: "A static measurement of Earth’s field",
      points: 1.1,
      page: 6,
      solutionPage: 13,
      prompt:
        "Reinsert the magnet and retain a 34-centimetre wire. Vary the wire’s neutral angular position to twist it, and measure the magnet’s equilibrium angle. Choose an appropriate graph to study this dependence and determine a second value of Earth’s horizontal magnetic field with uncertainty. Use the full magnetic torque, not a small-angle assumption unless justified.",
    },
    {
      part: "B.6",
      title: "Vary the suspension length",
      points: 2.3,
      page: 6,
      solutionPage: 14,
      prompt:
        "Repeat the static-angle study for two additional wire lengths to test the wire torque’s length dependence. Construct one final graph summarizing all dependencies and obtain a new value of Earth’s horizontal magnetic field with its uncertainty.",
    },
  ],
  e2: [
    {
      part: "A.1",
      title: "Repeatable crater measurements",
      points: 0.6,
      page: 4,
      solutionPage: 4,
      prompt:
        "Drop ball 3 from 50 centimetres onto the prepared sand bed and measure the crater diameter. Repeat the experiment five times, remixing and carefully leveling the sand without compacting it after each impact. Tabulate all measurements and report the crater diameter with uncertainty. Ball and apparatus specifications are on pages 1–4.",
    },
    {
      part: "A.2",
      title: "A safe free-fall approximation",
      points: 0.5,
      page: 4,
      solutionPage: 5,
      prompt:
        "Determine the maximum release height for which air drag remains below 10 percent of the ball’s weight throughout the fall. Use the supplied drag law and steel density, treating the drag coefficient as order unity. Evaluate the maximum height for each of the four ball diameters listed on page 3.",
      model: String.raw`$$F_{\mathrm{drag}}=\frac18\pi d^2\rho_0C_xv^2,\qquad\rho_0\simeq1.2\,\mathrm{kg\,m^{-3}}$$`,
    },
    {
      part: "A.3",
      title: "Survey crater sizes over impact energy",
      points: 1.7,
      page: 5,
      solutionPage: 5,
      prompt:
        "Measure crater diameters over a broad range of impact energies using different steel balls and release heights. For each ball–height combination, repeat the drop twice and average the diameters. Present a table containing ball mass, drop height, impact energy, and mean crater diameter. Respect the height limit established in A.2 and the stated maximum apparatus height of 2 metres.",
    },
    {
      part: "A.4",
      title: "Compare three crater-formation models",
      points: 1.2,
      page: 5,
      solutionPage: 6,
      prompt:
        "Plot the A.3 measurements on suitable linear or logarithmic axes. Add lines corresponding to all three theoretical models from page 3: diameter controlled only by impactor size, by the cube root of impact energy, or by the fourth root of energy. Decide which model best fits, and examine whether the exponent changes across the measured energy range.",
      model: String.raw`$$D=c_1d,\qquad D=c_2E^{1/3},\qquad D=c_3E^{1/4}$$`,
    },
    {
      part: "B.1",
      title: "A ball rolling down the rail",
      points: 0.4,
      page: 5,
      solutionPage: 7,
      prompt:
        "Ball 4 starts from rest on the inclined rail and rolls without slipping or dissipating energy. Derive its distance along the rail as a function of elapsed time, rail angle, and gravitational acceleration. Account for rotational kinetic energy and the contact geometry in Figure 5. Do not assume that the effective rolling radius necessarily equals the ball radius.",
      model: String.raw`$$J=\frac{md^2}{10},\qquad K=\frac12mv^2+\frac12J\omega^2$$`,
    },
    {
      part: "B.2",
      title: "Timing a 50 cm descent",
      points: 0.7,
      page: 6,
      solutionPage: 8,
      prompt:
        "Set the rail to an angle of 5 degrees and carefully secure it as described on page 5. Measure the time for ball 4 to travel 50 centimetres along the rail five times. Report the result and the order of magnitude of its statistical uncertainty.",
    },
    {
      part: "B.3",
      title: "Distance–time measurements",
      points: 0.8,
      page: 6,
      solutionPage: 8,
      prompt:
        "Measure travel time and estimate the order of magnitude of statistical uncertainty for at least eight different distances along the rail. Present the measurements in a table, keeping the inclination and apparatus preparation consistent.",
    },
    {
      part: "B.4",
      title: "Estimate gravitational acceleration",
      points: 1,
      page: 6,
      solutionPage: 8,
      prompt:
        "Plot the B.3 measurements with error bars to test the distance–time law derived in B.1. Use the graph to estimate gravitational acceleration with its uncertainty, including the actual rolling geometry of the rail.",
    },
    {
      part: "B.5",
      title: "Solid friction versus fluid drag",
      points: 0.6,
      page: 6,
      solutionPage: 10,
      prompt:
        "After traveling a distance along the rail, the ball enters the sand and stops after another distance. Model the ball as a point mass in the sand, neglect transition energy loss, and derive stopping distance versus rail travel distance for each proposed resistance law. Give the power-law exponent in each case.",
      model: String.raw`$$T_1=-\mu_{\mathrm{eff}}mg,\qquad T_2=-kv,\qquad L\sim\ell^{\alpha}$$`,
    },
    {
      part: "B.6",
      title: "Repeated stopping-distance trials",
      points: 0.8,
      page: 7,
      solutionPage: 11,
      prompt:
        "Prepare the wooden track with a uniform, uncompressed sand layer and retain a 5-degree rail angle. Release ball 4 after a 50-centimetre rail descent. Measure its stopping distance in sand at least five times and report the result with units and uncertainty. Stir and relevel the sand, and clean the ball and rail, before each run.",
    },
    {
      part: "B.7",
      title: "Identify the sand-drag law",
      points: 1.5,
      page: 7,
      solutionPage: 12,
      prompt:
        "For at least eight rail travel distances, make repeated stopping-distance measurements while holding the rail angle at 5 degrees. Plot stopping distance against rail travel distance with error bars. Compare with the predictions in B.5 and conclude which drag model best describes your measurements.",
    },
    {
      part: "B.8",
      title: "Extract the drag coefficient",
      points: 0.2,
      page: 7,
      solutionPage: 12,
      prompt:
        "Using the drag model selected in B.7 and its fitted relationship, determine the numerical value of the corresponding effective solid-friction coefficient or linear-drag coefficient. State which coefficient your result represents.",
    },
  ],
};

export const iphoSubproblems: IphoSubproblem[] = iphoPapers.flatMap((paper) =>
  problemsByPaper[paper.id].map((problem) => ({
    ...problem,
    id: `ipho-2025-${paper.id}-${problem.part.toLowerCase().replace(".", "-")}`,
    paperId: paper.id,
  })),
);

export const iphoTheoryCount = iphoSubproblems.filter((task) =>
  task.paperId.startsWith("t"),
).length;
export const iphoExperimentCount = iphoSubproblems.length - iphoTheoryCount;

export function iphoPdf(
  paperId: IphoPaperId,
  kind: "questions" | "solutions" | "answer-sheet",
  page = 1,
) {
  return `/ipho/2025-${paperId}-${kind}.pdf#page=${page}`;
}
