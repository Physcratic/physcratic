import "server-only";
import { expression as e, numeric as n, review as r, type ArchiveKeyPart } from "./definitions";
const S = String.raw;
export const keys02: Record<string, ArchiveKeyPart[]> = {
  "arena-the-five-fold-collision": [
    e("a.mass", "Composite rest mass", S`3\sqrt{3}m`, "m", "Positive rest mass scale m. Composite internal energy is included.", { positive: ["m"] }),
    e("a.speed", "Composite speed", "c/2", "c", "Positive c. Speed along +x.", { positive: ["c"] }),
    e("b.heavy", "Outgoing velocity of the 4m particle", "5c/13", "c", "Nontrivial elastic collision with momentum exchange, and +x is the incoming direction. The unchanged-velocity no-exchange branch is not requested in this field.", { positive: ["c"] }),
    e("b.light", "Outgoing velocity of the m particle", "4c/5", "c", "Nontrivial elastic collision with momentum exchange. Signed velocity along +x.", { positive: ["c"] }),
    n("c.angle", "Maximum heavy-particle deflection", 14.4775, "degrees", { absTol: 0.02, relTol: 0, alternatives: ["14.48"], help: "Same two outgoing rest masses, elastic two-body final state. Enter degrees, not radians." }),
    n("d.lower", "Smallest photon separation angle", 120, "degrees", { absTol: 0, relTol: 0 }),
    n("d.upper", "Largest photon separation angle", 180, "degrees", { absTol: 0, relTol: 0 }),
    e("e.frequency", "Maximum f₁", S`\frac{9mc^2}{2h}`, "m c h", "All three photon energies are strictly positive. The other two may be collinear backwards. Constants m, c and h are positive.", { positive: ["m", "c", "h"] }),
  ],
  "arena-the-phantom-charge": [
    e("a.charge", "Total signed sheet charge", S`\frac{2\pi c}{d}`, "c d", "d > 0. c is the signed surface-density parameter, not the speed of light.", { positive: ["d"] }),
    e("b.above", "Axial field Ez above the sheet", S`\frac{c}{2\varepsilon_0d(d+z)^2}`, S`c \varepsilon_0 d z`, "z > 0, d > 0, ε₀ > 0. c may have either sign. Supply the scalar z component, without a unit vector.", { positive: [S`\varepsilon_0`, "d", "z"], alternatives: [S`\frac{2\pi c/d}{4\pi\varepsilon_0(z+d)^2}`] }),
    e("b.below", "Axial field Ez below the sheet", S`-\frac{c}{2\varepsilon_0d(d-z)^2}`, S`c \varepsilon_0 d z`, "z < 0, d > 0, ε₀ > 0. The normal field has no unique continuous value at z = 0.", { positive: [S`\varepsilon_0`, "d"] }),
    e("c.magnitude", "Effective point-charge magnitude", S`\frac{2\pi|c|}{d}`, "c d", "Magnitude rather than signed charge, with d > 0. One point charge cannot reproduce both halves of the axis.", { positive: ["d"] }),
    e("c.above-position", "Effective charge z coordinate for observations above", "-d", "d", "x = y = 0, zP > 0, d > 0.", { positive: ["d"] }),
    e("c.below-position", "Effective charge z coordinate for observations below", "d", "d", "x = y = 0, zP < 0, d > 0.", { positive: ["d"] }),
    e("d.repulsive", "Crossing-speed infimum when qc > 0", S`\sqrt{\frac{qc}{m\varepsilon_0d^2}}`, S`q c m \varepsilon_0 d`, "qc > 0 and m, ε₀, d > 0. Speeds above this threshold guarantee passage. Equality at the discontinuous force does not fix continuation.", { positive: ["m", S`\varepsilon_0`, "d"] }),
    n("d.attractive", "Crossing-speed infimum when qc ≤ 0", 0, "m/s", { absTol: 0, relTol: 0, help: "No positive barrier. Arbitrarily small positive speeds suffice. Zero is the infimum, not a guarantee of travel from infinity at rest." }),
  ],
  "arena-the-string-that-answered-back": [
    e("a.left", "Periodic displacement for 0 ≤ x ≤ L/2", S`-\frac{\sqrt{2}L}{50\pi}\sin(\frac{2\pi t}{\tau})\sin(\frac{5\pi x}{2L})`, S`L t \tau x`, "Small slopes, with L, τ > 0. Exclude free oscillations depending on initial conditions. Angles in radians.", { positive: ["L", S`\tau`] }),
    e("a.right", "Periodic displacement for L/2 ≤ x ≤ L", S`-\frac{\sqrt{2}L}{50\pi}\sin(\frac{2\pi t}{\tau})\sin(\frac{5\pi(L-x)}{2L})`, S`L t \tau x`, "Same periodic particular solution, with L, τ > 0. Angles in radians.", { positive: ["L", S`\tau`] }),
    r("a.sketches", "Four midpoint-driven string sketches", "Review the profiles at t = 0, τ/4, τ/2 and 3τ/4, including zero-displacement instants and opposite extrema."),
    e("b.left", "Periodic displacement for 0 ≤ x ≤ 2L/3", S`\frac{L}{50\pi}\sin(\frac{2\pi t}{\tau})\sin(\frac{5\pi x}{2L})`, S`L t \tau x`, "Small-slope periodic response, not the full undamped initial-value solution, with L, τ > 0. Radians.", { positive: ["L", S`\tau`] }),
    e("b.right", "Periodic displacement for 2L/3 ≤ x ≤ L", S`-\frac{\sqrt{3}L}{50\pi}\sin(\frac{2\pi t}{\tau})\sin(\frac{5\pi(L-x)}{2L})`, S`L t \tau x`, "Same periodic particular solution, with L, τ > 0. Radians.", { positive: ["L", S`\tau`] }),
    r("b.sketches", "Four off-centre-driven string sketches", "Review all four times t = 0, τ/4, τ/2 and 3τ/4 and the derivative jump at the driving point."),
  ],
};
