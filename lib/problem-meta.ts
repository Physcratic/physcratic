/**
 * Search and share descriptions for the practice problems whose prompt is too long to use as one
 * (a description should be 70 to 160 characters). Each says what the problem asks, in plain words.
 * Only metadata: the problems themselves are unchanged.
 */
const practiceDescriptions: Readonly<Record<string, string>> = {
  "first-law":
    "Find the change in internal energy of a gas that absorbs 500 J of heat and does 180 J of work, using the first law of thermodynamics.",
  heat: "Calculate the heat needed to warm 0.25 kg of water by 20 °C, using its specific heat capacity and assuming no heat is lost.",
  incline:
    "Find the acceleration of a 2 kg block sliding down a smooth, frictionless 30° incline using Newton's laws.",
  projectile:
    "Find how far a ball launched at 20 m/s and 30° above the horizontal travels before it returns to the height it started from.",
  spring:
    "Calculate the elastic potential energy stored in a spring of constant 200 N/m that is stretched 0.10 m from equilibrium.",
};

export function practiceProblemDescription(id: string): string | undefined {
  return practiceDescriptions[id];
}
