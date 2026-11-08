import "server-only";
import { expression as e, numeric as n, review as r, type ArchiveKeyPart } from "./definitions";
const S = String.raw;
export const keys03: Record<string, ArchiveKeyPart[]> = {
  "arena-the-clock-in-the-racing-mirror": [
    e("a.arrival", "Absolute mirror arrival time", S`t_0+\frac{\delta}{r-1}`, S`t_0 \delta r`, "Approaching mirror: r > 1, δ > 0. Include the reference camera time t₀, rather than just remaining time.", { positive: [S`\delta`], exclusions: ["r != 1"] }),
    e("b.height", "Actual mirror height H", S`\frac{hc\delta}{2f}`, S`h c \delta f`, "Distant-object, small-angle focal-plane approximation. All quantities positive. No longitudinal contraction of the transverse height.", { positive: ["h", "c", S`\delta`, "f"] }),
    e("c.distance", "Apparent virtual-image distance", S`\frac{(1+r)c\delta}{2}`, S`r c \delta`, "Small reflected angles with r > 1, c > 0, δ > 0. Use the reflected-ray back-traced image, not twice the mirror’s present distance.", { positive: ["r", "c", S`\delta`] }),
  ],
  "arena-the-dodecahedron-conspiracy": [
    e("a.flux", "Flux through one face", S`\frac{Q}{12\varepsilon_0}`, S`Q \varepsilon_0`, "Signed central charge Q, positive ε₀ and outward flux.", { positive: [S`\varepsilon_0`] }),
    e("b.field", "Central field magnitude, one negative face", S`\frac{|\sigma|}{6\varepsilon_0}`, S`\sigma \varepsilon_0`, "Field magnitude. The problem’s +σ convention takes σ > 0. Absolute-value and positive-density forms are accepted.", { positive: [S`\sigma`, S`\varepsilon_0`], alternatives: [S`\frac{\sigma}{6\varepsilon_0}`] }),
    e("c.field", "Central field magnitude, six negative faces", S`\frac{|\sigma|}{6\varepsilon_0}(1+\sqrt{5})`, S`\sigma \varepsilon_0`, "Field magnitude. Adjacent face normals have cosine 1/√5. σ and ε₀ are positive in the charge-density convention.", { positive: [S`\sigma`, S`\varepsilon_0`], alternatives: [S`\frac{\sigma(1+\sqrt{5})}{6\varepsilon_0}`] }),
  ],
  "arena-the-gas-with-elbows": [
    e("a.i.concentration", "Quantum concentration nQ", S`(\frac{Mk_BT}{2\pi\hbar^2})^{3/2}`, S`M k_B T \hbar`, "Large-box continuum limit, one internal state. M, T and constants positive.", { positive: ["M", "k_B", "T", S`\hbar`] }),
    n("a.ii.exponent", "Exponent a", 2, "1", { absTol: 0, relTol: 0 }),
    e("a.ii.function", "Function f(Z₁)", S`\ln Z_1`, "Z_1", "Canonical logarithm convention. Use positive Z₁. Additive constants cannot be inferred from the derivative alone and require self-review.", { positive: ["Z_1"] }),
    e("a.ii.energy", "Mean single-particle energy", S`\frac32k_BT`, "k_B T", "Fixed volume, classical translational degrees of freedom.", { positive: ["k_B", "T"] }),
    e("a.iii.energy", "N-particle internal energy", S`\frac32Nk_BT`, "N k_B T", "N indistinguishable particles. Positive N, kB and T.", { positive: ["N", "k_B", "T"] }),
    r("a.iv.entropy", "Entropy as a derivative of F", "Check the negative T derivative at fixed V and N. Partial-derivative notation is outside the checker’s expression language."),
    r("a.iv.pressure", "Pressure as a derivative of F", "Check the negative V derivative at fixed T and N. Partial derivatives and the first-law argument require self-review."),
    n("a.v.b", "Exponent b", 2, "1", { absTol: 0, relTol: 0 }),
    n("a.v.c", "Exponent c", -1, "1", { absTol: 0, relTol: 0 }),
    r("a.v.proof", "Identity relating U and F", "Review the derivative identity from F = U − TS. Matching the two exponents is not a proof."),
    e("a.vi.partition", "Helmholtz energy in terms of ZN", S`-k_BT\ln Z_N`, "k_B T Z_N", "Canonical partition function. T, kB and ZN positive.", { positive: ["k_B", "T", "Z_N"] }),
    e("a.vi.energy", "Stirling-approximated ideal-gas Helmholtz energy", S`Nk_BT(\ln(n/n_Q)-1)`, "N k_B T n n_Q", "Positive densities, large N. n = N/V and n_Q is the quantum concentration.", { positive: ["N", "k_B", "T", "n", "n_Q"] }),
    r("a.vi.proof", "Stirling approximation derivation", "The result can be matched, but the state-counting and Stirling derivation are not graded."),
    n("b.i.factor", "Excluded-volume integer c", 4, "1", { absTol: 0, relTol: 0 }),
    e("b.ii.energy", "Volume-corrected Helmholtz energy", S`Nk_BT(\ln(\frac{N}{(V-Nb)n_Q})-1)`, "N k_B T V b n_Q", "Accessible volume V − Nb > 0. N, kB, T, b and nQ positive. Use full corrected F, not just its difference from ideal F.", { positive: ["N", "k_B", "T", "V", "b", "n_Q"] }),
    e("b.iii.attraction", "Attraction constant a", S`\varepsilon b`, S`\varepsilon b`, "Positive well depth ε and excluded volume b. Uniform-density mean field.", { positive: [S`\varepsilon`, "b"] }),
    e("b.iv.energy", "Full Helmholtz free energy", S`Nk_BT(\ln(\frac{N}{(V-Nb)n_Q})-1)-\frac{aN^2}{V}`, "N k_B T V b n_Q a", "V > Nb > 0. Positive T, kB, nQ and a. Pair attraction is counted once.", { positive: ["N", "k_B", "T", "V", "b", "n_Q", "a"] }),
    e("b.v.pressure", "Equation of state, solved for p", S`\frac{Nk_BT}{V-Nb}-\frac{aN^2}{V^2}`, "N k_B T V b a", "Right-hand side only. V > Nb > 0, all parameters positive.", { positive: ["N", "k_B", "T", "V", "b", "a"] }),
    r("b.v.derivation", "Equation-of-state derivation", "Review differentiation of F at fixed T and N. Only the final pressure expression is checked."),
    e("b.vi.energy", "Van der Waals internal energy", S`\frac32Nk_BT-\frac{aN^2}{V}`, "N k_B T a V", "Classical gas with temperature-independent attraction parameter a. Positive quantities and V > Nb.", { positive: ["N", "k_B", "T", "a", "V"] }),
  ],
};
