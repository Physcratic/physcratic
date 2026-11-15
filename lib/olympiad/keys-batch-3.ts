import "server-only";
import { expression, numeric, review, type ArchiveKeyPart } from "../archive-grading/definitions";

const t = String.raw;
const label = (part: ArchiveKeyPart, sourcePart: string): ArchiveKeyPart => ({ ...part, sourcePart });
const forceSymbols = t`\mu_0 N I A E \ell R r`;
const positiveForceSymbols = forceSymbols.split(" ");
const forceHelp = "Enter the signed z component. Use E for the battery emf and ell for solenoid length. Use the long, thin solenoid approximation.";

export const batchThreeParts: Record<string, ArchiveKeyPart[]> = {
  "eupho-2020-t1": [
    label(expression("a.1", "Force F_1 along z", t`\mu_0*N*I*A*E/(2*\ell*R*r)`, forceSymbols, forceHelp, { positive: positiveForceSymbols }), "a"),
    label(expression("a.2", "Force F_2 along z", t`-\mu_0*N*I*A*E/(2*\ell*R*r)`, forceSymbols, forceHelp, { positive: positiveForceSymbols }), "a"),
    label(expression("b.min", "Minimum loop current", t`E/R-v*\mu_0*N*I*A/(2*R*r*\ell)`, forceSymbols + " v", "Use E for emf, ell for solenoid length and v for speed. Enter the leading long-solenoid result.", { positive: [...positiveForceSymbols, "v"] }), "b"),
    label(expression("b.max", "Maximum loop current", t`E/R+v*\mu_0*N*I*A/(2*R*r*\ell)`, forceSymbols + " v", "Use E for emf, ell for solenoid length and v for speed. Enter the leading long-solenoid result.", { positive: [...positiveForceSymbols, "v"] }), "b"),
    label(review("b.graph", "Labelled current versus time graph", "Draw J(t) and label its baseline, dip, peak and time scales. Take t=0 when the solenoid centre passes the loop centre. Compare with the worked solution. The checker does not assess drawings."), "b"),
  ],
  "eupho-2020-t2": [
    label(expression("answer", "Maximum speed", t`u*(2*\pi*N+1)`, "u N", "Use u for the pulling speed and N for the number of turns. Include motion after the thread leaves the cylinder.", { positive: ["u", "N"] }), "Answer"),
  ],
  "eupho-2020-t3": [
    label(numeric("answer", "Lamp-to-camera separation h", 80, "mm", { absTol: 16, relTol: 0, help: "Enter h in mm. Estimates within 20 percent of the official 80 mm result are accepted." }), "Answer"),
  ],
};
