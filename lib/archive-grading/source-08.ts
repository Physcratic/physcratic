import "server-only";
import { expression as e, numeric as n, type ArchiveKeyPart } from "./definitions";
const S = String.raw;
// Keys for the beginner Arena set F1, thermodynamics, waves, optics and modern physics. Each lettered part has one answer box.
export const keys08: Record<string, ArchiveKeyPart[]> = {
  "arena-the-rectangular-cycle": [
    e("a.work", "Net work done by the gas in one cycle", S`2p_0V_0`, "p_0 V_0", "Work done by the gas, counted positive. p_0 and V_0 are positive.", { positive: ["p_0", "V_0"] }),
    e("b.heat", "Heat that flows into the gas in one cycle", S`\frac{23}{2}p_0V_0`, "p_0 V_0", "Count only the legs where heat flows in. p_0 and V_0 are positive.", { positive: ["p_0", "V_0"] }),
    n("c.efficiency", "Efficiency of the cycle", 4 / 23, "1", { canonical: S`\frac{4}{23}`, help: "Enter a number between 0 and 1, as a decimal or a fraction." }),
  ],
  "arena-a-lamp-under-a-raft": [
    e("a.radius", "Smallest raft radius", S`\frac{h}{\sqrt{n^2-1}}`, "h n", "The lamp is directly below the raft’s centre. h is positive and n is greater than 1.", { positive: ["h"], ranges: { n: [1.1, 3] } }),
    n("b.radius", "Smallest raft radius for the given values", 1.5 / Math.sqrt(7 / 9), "m", { canonical: "1.70" }),
    n("c.depth", "Greatest lamp depth for a raft of radius 1.0 m", Math.sqrt(7 / 9), "m", { canonical: "0.88" }),
  ],
  "arena-walking-past-two-speakers": [
    e("a.distance", "Listener’s distance x from the first speaker", S`\frac{d^2-\Delta^2}{2\Delta}`, S`d \Delta`, "Use Δ for the path difference. d and Δ are positive, and Δ is less than d.", { positive: ["d", S`\Delta`] }),
    n("b.count", "Number of quiet points on the walk", 3, "1", { absTol: 0, relTol: 0, help: "Enter a whole number." }),
    n("c.distance", "Distance of the last quiet point from the first speaker", 8.75, "m"),
  ],
  "arena-two-isotopes-one-sample": [
    n("a.nuclei", "Ratio of nuclei left, X to Y, after 6.0 h", 0.25, "1", { help: "Enter a number, as a decimal or a fraction." }),
    n("b.activity", "Ratio of activities, X to Y, after 6.0 h", 0.75, "1", { help: "Enter a number, as a decimal or a fraction." }),
    n("c.time", "Time at which the activities are equal", 3 * Math.log2(3), "h", { canonical: "4.75" }),
  ],
};
