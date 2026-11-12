import { Atom, Orbit, ScanLine, Thermometer, Waves, Zap } from "lucide-react";
import { legacyPhysicsTopicLabels } from "./physics-taxonomy";

export const topics = [
  {
    name: legacyPhysicsTopicLabels[0],
    icon: Orbit,
    description: "Motion, forces & energy",
    count: 3,
  },
  {
    name: legacyPhysicsTopicLabels[1],
    icon: Zap,
    description: "Charges, fields & circuits",
    count: 3,
  },
  {
    name: legacyPhysicsTopicLabels[2],
    icon: Waves,
    description: "Oscillations, sound & light",
    count: 3,
  },
  {
    name: legacyPhysicsTopicLabels[3],
    icon: Thermometer,
    description: "Heat, work & temperature",
    count: 3,
  },
  {
    name: legacyPhysicsTopicLabels[4],
    icon: ScanLine,
    description: "Reflection, refraction & lenses",
    count: 0,
  },
  {
    name: legacyPhysicsTopicLabels[5],
    icon: Atom,
    description: "Quantum, atomic & nuclear physics",
    count: 0,
  },
] as const;

export type Topic = (typeof topics)[number]["name"];
export type View =
  | "overview"
  | "problems"
  | "contests"
  | "rankings"
  | "guide";

export const viewTitles: Record<View, string> = {
  overview: "Lobby",
  problems: "Problems",
  contests: "Contests",
  rankings: "Rankings",
  guide: "Getting started",
};

export interface Problem {
  id: string;
  addedAt?: string;
  title: string;
  topic: Topic;
  concept: string;
  elo: number;
  minutes: number;
  prompt: string;
  hint: string;
  answer: number;
  unit: string;
  formula: string;
  solution: { title: string; text: string; formula?: string }[];
}

// Retired from public discovery and reader routes on 12 November 2026.
// Keep this immutable legacy model for grading versions, saved progress and regression fixtures.
// New public practice belongs in Arena.
export const problems: Problem[] = [
  {
    id: "incline",
    title: "A block on an incline",
    topic: "Mechanics",
    concept: "Newton’s laws",
    elo: 900,
    minutes: 5,
    prompt:
      "A 2 kg block rests on a smooth, frictionless incline at 30° to the horizontal. What is the magnitude of its acceleration down the incline? Use a gravitational acceleration of 9.8 m/s².",
    hint: "Resolve the gravitational force parallel to the incline. The normal force cancels the perpendicular component, and the mass cancels out.",
    answer: 4.9,
    unit: "m/s²",
    formula: "$$F_{\\parallel}=mg\\sin\\theta$$",
    solution: [
      {
        title: "Identify the force along the slope",
        text: "On a frictionless incline, only the parallel component of gravity accelerates the block.",
        formula: "$$F_{\\parallel}=mg\\sin\\theta$$",
      },
      {
        title: "Apply Newton’s second law",
        text: "Divide the net force by the block’s mass. Notice that the mass cancels.",
        formula: "$$a=g\\sin\\theta$$",
      },
      {
        title: "Substitute the values",
        text: "The acceleration is directed down the incline.",
        formula: "$$a=9.8\\sin 30^{\\circ}=4.9\\;\\mathrm{m/s^2}$$",
      },
    ],
  },
  {
    id: "circuit",
    title: "Finding the missing current",
    topic: "Electromagnetism",
    concept: "Ohm’s law",
    elo: 900,
    minutes: 4,
    prompt:
      "A 12 V ideal battery is connected across a 6 Ω resistor. What current flows through the resistor? Assume connecting wires have negligible resistance.",
    hint: "Ohm’s law connects voltage, current, and resistance. Divide the voltage by the resistance.",
    answer: 2,
    unit: "A",
    formula: "$$V=IR$$",
    solution: [
      {
        title: "Write Ohm’s law",
        text: "For an ohmic resistor, voltage is the product of current and resistance.",
        formula: "$$V=IR$$",
      },
      {
        title: "Solve for the current",
        text: "Divide both sides by the resistance.",
        formula: "$$I=\\frac{V}{R}=\\frac{12}{6}=2\\;\\mathrm{A}$$",
      },
    ],
  },
  {
    id: "string",
    title: "The sound of a vibrating string",
    topic: "Waves",
    concept: "Standing waves",
    elo: 1300,
    minutes: 6,
    prompt:
      "A string is fixed at both ends and has a length of 0.80 m. Waves travel along it at 120 m/s. What is its fundamental frequency?",
    hint: "For a string fixed at both ends, the fundamental mode fits half a wavelength along the string.",
    answer: 75,
    unit: "Hz",
    formula: "$$f_1=\\frac{v}{2L}$$",
    solution: [
      {
        title: "Find the fundamental wavelength",
        text: "Both ends are nodes, so the string length is half a wavelength.",
        formula: "$$\\lambda_1=2L=1.60\\;\\mathrm{m}$$",
      },
      {
        title: "Use the wave equation",
        text: "Frequency equals wave speed divided by wavelength.",
        formula:
          "$$f_1=\\frac{v}{\\lambda_1}=\\frac{120}{1.60}=75\\;\\mathrm{Hz}$$",
      },
    ],
  },
  {
    id: "projectile",
    title: "The projectile challenge",
    topic: "Mechanics",
    concept: "Projectile motion",
    elo: 1700,
    minutes: 8,
    prompt:
      "A ball is launched from level ground at 20 m/s, at an angle of 30° above the horizontal. How far horizontally does it travel before returning to the same height? Ignore air resistance and use a gravitational acceleration of 9.8 m/s². Round to two decimal places.",
    hint: "Find the time of flight from the vertical motion, then multiply it by the constant horizontal velocity. Alternatively, use the projectile range equation.",
    answer: 35.35,
    unit: "m",
    formula: "$$R=\\frac{v_0^2\\sin(2\\theta)}{g}$$",
    solution: [
      {
        title: "Separate the motion",
        text: "Horizontal velocity is constant. The vertical component determines how long the ball stays in the air.",
        formula: "$$v_x=v_0\\cos\\theta,\\qquad v_y=v_0\\sin\\theta$$",
      },
      {
        title: "Find the flight time",
        text: "The ball returns to its launch height, so the flight time is twice the time to reach the peak.",
        formula:
          "$$t=\\frac{2v_0\\sin\\theta}{g}=\\frac{20}{9.8}\\;\\mathrm{s}$$",
      },
      {
        title: "Calculate the range",
        text: "Multiply horizontal velocity by the total flight time.",
        formula:
          "$$R=\\frac{400\\sin60^{\\circ}}{9.8}\\approx35.35\\;\\mathrm{m}$$",
      },
    ],
  },
  {
    id: "spring",
    title: "Energy in a stretched spring",
    topic: "Mechanics",
    concept: "Elastic potential energy",
    elo: 1300,
    minutes: 5,
    prompt:
      "A spring with a spring constant of 200 N/m is stretched 0.10 m from its equilibrium position, within its elastic limit. How much elastic potential energy is stored?",
    hint: "Spring energy depends on the square of the extension, and includes a factor of one half.",
    answer: 1,
    unit: "J",
    formula: "$$E_s=\\frac{1}{2}kx^2$$",
    solution: [
      {
        title: "Choose the spring energy equation",
        text: "For an ideal spring, stored energy increases quadratically with extension.",
        formula: "$$E_s=\\frac{1}{2}kx^2$$",
      },
      {
        title: "Substitute in SI units",
        text: "The extension is already in metres.",
        formula: "$$E_s=\\frac{1}{2}(200)(0.10)^2=1\\;\\mathrm{J}$$",
      },
    ],
  },
  {
    id: "resistors",
    title: "Two resistors, one circuit",
    topic: "Electromagnetism",
    concept: "Series circuits",
    elo: 1300,
    minutes: 5,
    prompt:
      "A 4 Ω resistor and an 8 Ω resistor are connected in series to a 24 V ideal battery. What is the total current in the circuit?",
    hint: "Resistances add in series. Use the total resistance in Ohm’s law.",
    answer: 2,
    unit: "A",
    formula: "$$R_{\\mathrm{total}}=R_1+R_2$$",
    solution: [
      {
        title: "Combine the resistances",
        text: "In a series circuit, the same current flows through both resistors.",
        formula: "$$R_{\\mathrm{total}}=4+8=12\\;\\Omega$$",
      },
      {
        title: "Calculate the current",
        text: "Apply Ohm’s law to the whole circuit.",
        formula: "$$I=\\frac{24}{12}=2\\;\\mathrm{A}$$",
      },
    ],
  },
  {
    id: "power",
    title: "Powering a small lamp",
    topic: "Electromagnetism",
    concept: "Electrical power",
    elo: 900,
    minutes: 3,
    prompt:
      "A lamp operates at a potential difference of 9 V and draws a current of 0.5 A. What electrical power does it consume?",
    hint: "Multiply the voltage across the lamp by the current through it.",
    answer: 4.5,
    unit: "W",
    formula: "$$P=VI$$",
    solution: [
      {
        title: "Calculate electrical power",
        text: "Power is the rate of electrical energy transfer.",
        formula: "$$P=VI=9(0.5)=4.5\\;\\mathrm{W}$$",
      },
    ],
  },
  {
    id: "wave",
    title: "Reading between the waves",
    topic: "Waves",
    concept: "Wave speed",
    elo: 900,
    minutes: 3,
    prompt:
      "A water wave has a frequency of 5 Hz and a wavelength of 0.4 m. What is its propagation speed?",
    hint: "A wave travels one wavelength in one period. Multiply frequency by wavelength.",
    answer: 2,
    unit: "m/s",
    formula: "$$v=f\\lambda$$",
    solution: [
      {
        title: "Apply the wave equation",
        text: "Frequency gives the number of wavelengths passing a point each second.",
        formula: "$$v=f\\lambda=5(0.4)=2\\;\\mathrm{m/s}$$",
      },
    ],
  },
  {
    id: "echo",
    title: "An echo in the mountains",
    topic: "Waves",
    concept: "Sound propagation",
    elo: 1300,
    minutes: 5,
    prompt:
      "You clap while standing in front of a cliff and hear the echo 2 seconds later. If the speed of sound is 340 m/s, how far away is the cliff?",
    hint: "The sound travels to the cliff and back. The total travel distance is twice the distance to the cliff.",
    answer: 340,
    unit: "m",
    formula: "$$d=\\frac{vt}{2}$$",
    solution: [
      {
        title: "Find the total distance travelled",
        text: "Multiply the speed of sound by the round-trip time.",
        formula: "$$d_{\\mathrm{round\\,trip}}=340(2)=680\\;\\mathrm{m}$$",
      },
      {
        title: "Account for the return journey",
        text: "The cliff is half the round-trip distance away.",
        formula: "$$d=\\frac{680}{2}=340\\;\\mathrm{m}$$",
      },
    ],
  },
  {
    id: "heat",
    title: "Warming a cup of water",
    topic: "Thermodynamics",
    concept: "Specific heat capacity",
    elo: 900,
    minutes: 4,
    prompt:
      "How much heat is needed to raise the temperature of 0.25 kg of water by 20 °C? Use a specific heat capacity of 4,200 J/(kg·°C). Assume no heat is lost to the surroundings and no phase change occurs.",
    hint: "Multiply mass, specific heat capacity, and the change in temperature.",
    answer: 21000,
    unit: "J",
    formula: "$$Q=mc\\Delta T$$",
    solution: [
      {
        title: "Apply the heating equation",
        text: "The water stays liquid, so the heat changes its temperature without a phase change.",
        formula: "$$Q=mc\\Delta T=(0.25)(4200)(20)=21000\\;\\mathrm{J}$$",
      },
    ],
  },
  {
    id: "gas",
    title: "Work done by an expanding gas",
    topic: "Thermodynamics",
    concept: "Pressure–volume work",
    elo: 1300,
    minutes: 6,
    prompt:
      "A gas expands at a constant pressure of 100,000 Pa, from a volume of 0.002 m³ to 0.005 m³. How much work does the gas do on its surroundings?",
    hint: "At constant pressure, work done by the gas is pressure multiplied by its increase in volume.",
    answer: 300,
    unit: "J",
    formula: "$$W=P\\Delta V$$",
    solution: [
      {
        title: "Calculate the volume change",
        text: "The positive change in volume means the gas does positive work on its surroundings.",
        formula: "$$\\Delta V=0.005-0.002=0.003\\;\\mathrm{m^3}$$",
      },
      {
        title: "Calculate the work",
        text: "Multiply the constant pressure by the volume change.",
        formula: "$$W=100000(0.003)=300\\;\\mathrm{J}$$",
      },
    ],
  },
  {
    id: "first-law",
    title: "Where does the energy go?",
    topic: "Thermodynamics",
    concept: "First law of thermodynamics",
    elo: 1700,
    minutes: 7,
    prompt:
      "A gas absorbs 500 J of heat and does 180 J of work on its surroundings. What is the change in its internal energy? Use the convention that work done by the gas is positive.",
    hint: "The energy added as heat increases internal energy. The energy transferred out as work decreases it.",
    answer: 320,
    unit: "J",
    formula: "$$\\Delta U=Q-W$$",
    solution: [
      {
        title: "Choose the sign convention",
        text: "Heat entering the gas is positive, and work done by the gas is also positive in this convention.",
        formula: "$$\\Delta U=Q-W$$",
      },
      {
        title: "Apply conservation of energy",
        text: "Some absorbed energy leaves as work. The remainder raises the gas’s internal energy.",
        formula: "$$\\Delta U=500-180=320\\;\\mathrm{J}$$",
      },
    ],
  },
];
