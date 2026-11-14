import "server-only";
import { expression, numeric, review, type ArchiveDefinition, type ArchiveKeyPart } from "../archive-grading/definitions";
import { nativeOlympiadContent } from "./native-content";
import "./native-2012";

const label = (part: ArchiveKeyPart, sourcePart: string): ArchiveKeyPart => ({ ...part, sourcePart });
const expr = (id: string, sourcePart: string, title: string, key: string, symbols: string, help: string, positive: string[] = []): ArchiveKeyPart =>
  label(expression(id, title, key, symbols, help, { positive }), sourcePart);
const parts: Record<string, ArchiveKeyPart[]> = {
  "eupho-2018-t1": [
    expr("answer", "Answer", "Minimum separation d", "\\ell\\sqrt{5/2}", "\\ell", "Use ell for the length of either rod.", ["\\ell"]),
  ],
  "eupho-2018-t2": [
    label(numeric("answer", "Current when boiling starts", 4.4, "kA", { relTol: 0.02, help: "Use the approximations stated in the official solution. Enter current in kA." }), "Answer"),
  ],
  "eupho-2018-t3": [
    expr("a", "A", "Large-n step spacing d_n", "2\\lambda/(3n^{1/3})", "\\lambda n", "Use lambda and n. This is the leading large-n approximation.", ["\\lambda", "n"]),
    label(numeric("b", "Interaction exponent nu", -2, "", { absTol: 0, relTol: 0, help: "Enter the nontrivial exponent that selects the equilibrium shape." }), "B"),
  ],
  "ipho-2012-t2": [
    expr("a.i", "A.i", "Detachment radius r_max", "(3\\sigma d/(4\\rho g))^{1/3}", "\\sigma d \\rho g", "Use sigma, d, rho and g.", ["\\sigma", "d", "\\rho", "g"]),
    expr("a.ii", "A.ii", "Drop charge Q", "4\\pi\\epsilon_0\\varphi r", "\\epsilon_0 \\varphi r", "Use epsilon_0, varphi and r.", ["\\epsilon_0", "r"]),
    expr("a.iii", "A.iii", "Critical potential magnitude", "2\\sqrt{\\sigma r/\\epsilon_0}", "\\sigma r \\epsilon_0", "Enter the positive critical potential.", ["\\sigma", "r", "\\epsilon_0"]),
    expr("b.i", "B.i", "Drop charge magnitude Q_0", "2\\pi\\epsilon_0 q r_0/C", "\\epsilon_0 q r_0 C", "Use r_0 for r_max from A.i and positive q for the capacitor charge magnitude.", ["\\epsilon_0", "q", "r_0", "C"]),
    expr("b.ii", "B.ii", "Capacitor charge q(t)", "q_0\\exp(2\\pi\\epsilon_0 r_0 n t/C)", "q_0 \\epsilon_0 r_0 n t C", "Use r_0 for r_max, q_0 for the initial charge, and n for drops per unit time.", ["\\epsilon_0", "r_0", "n", "C"]),
    expr("b.iii", "B.iii", "Maximum voltage U_max", "\\sqrt{H\\sigma d/(2\\epsilon_0 r_0)}", "H \\sigma d \\epsilon_0 r_0", "Use r_0 for r_max from A.i.", ["H", "\\sigma", "d", "\\epsilon_0", "r_0"]),
  ],
  "apho-2012-t1": [
    expr("i.1", "I.1", "Terminal speed", "m g/k", "m g k", "Use m, g and k.", ["m", "g", "k"]),
    expr("i.2", "I.2", "Position z(t)", "m g/k*(t+m/k*(\\exp(-k*t/m)-1))", "m g k t", "Use m, g, k and t with the stated zero initial position and velocity.", ["m", "g", "k"]),
    expr("i.3", "I.3", "Induced emf magnitude", "3\\mu_0 p a^2 v s/(2(a^2+s^2)^{5/2})", "\\mu_0 p a v s", "Use s=z_0-z>0 for the separation before reaching the ring. All displayed quantities are magnitudes.", ["\\mu_0", "p", "a", "v", "s"]),
    expr("i.4", "I.4", "Force magnitude on the ring", "2\\pi a i B_a", "a i B_a", "Use B_a for the magnitude of the radial field at the ring and i for current magnitude.", ["a", "i", "B_a"]),
    expr("i.5", "I.5", "Force magnitude on the magnet", "2\\pi a i B_a", "a i B_a", "Enter the same force magnitude as I.4. Its direction is opposite.", ["a", "i", "B_a"]),
    expr("i.6", "I.6", "Circuit emf", "L j+i R", "L j i R", "Use j for di/dt. Enter the right-hand side of the circuit equation.", ["L", "R"]),
    label(review("i.7", "Energy contributions", "Name the three forms and give their expressions. The checker does not assess multi-part reasoning."), "I.7"),
    label(review("i.8", "Work done by the magnetic field", "Give yes or no and compare with the official explanation. This qualitative response is not automatically graded."), "I.8"),
    expr("i.9", "I.9", "Resistance of one ring", "2\\pi a/(\\sigma w h)", "a \\sigma w h", "Use h for the ring height Delta z', and sigma for the conductivity.", ["a", "\\sigma", "w", "h"]),
    expr("i.10", "I.10", "Pipe damping parameter", "9\\mu_0^2 p^2\\sigma w I_0/(8\\pi a^4)", "\\mu_0 p \\sigma w I_0 a", "Use I_0 for the dimensionless integral of u^2/(1+u^2)^5 over the entire real line.", ["\\mu_0", "p", "\\sigma", "w", "I_0", "a"]),
    expr("i.11", "I.11", "Dimensional-analysis damping", "p^2\\mu_0^2/(a^4 R_0)", "p \\mu_0 a R_0", "Take the dimensionless constant as one, as requested.", ["p", "\\mu_0", "a", "R_0"]),
  ],
};

/** Deliberately separate from the account-persistence catalogue: these checks are stateless and unrated. */
export const olympiadDefinitions: ArchiveDefinition[] = Object.entries(parts).map(([problemId, parts]) => ({
  problemId, keyVersion: 1, content: JSON.stringify(nativeOlympiadContent[problemId]),
  parts: parts.map(part => ({ ...part, sourceReference: problemId + " original official solution, part " + part.sourcePart })),
}));
