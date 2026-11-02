import "server-only";
import { expression as e, numeric as n, review as r, type ArchiveKeyPart } from "./definitions";
const S = String.raw;
export const keys05: Record<string, ArchiveKeyPart[]> = {
  "arena-a-grin-and-a-wiggle": [
    e("a.trajectory", "First-order signed ray trajectory", S`r_0\cos(kz)+\frac{\theta_0}{k}\sin(kz)`, S`r_0 k z \theta_0`, "Signed transverse r; k > 0, |kr₀| and |θ₀| small; θ₀ and all trig arguments in radians.", { positive: ["k"] }),
    e("b.axial", "First positive image z coordinate", S`\pi/k`, "k", "Paraxial approximation; k > 0.", { positive: ["k"] }),
    e("b.transverse", "Image transverse coordinate", "-r_0", "r_0", "Signed transverse coordinate; same-size inverted image."),
    r("b.description", "Describe the image", "Check that the image is real, inverted and has transverse magnification −1."),
    e("c.radius", "Third-order image radius at the first paraxial image", S`\frac{\pi\theta_m}{2k}(\theta_m^2+k^2r_0^2)`, S`\theta_m k r_0`, "Define θ_m as the nonnegative symmetric acceptance angle θmax (radians); k > 0. This is a half-width in the diagram’s plane; no aperture angle was specified numerically.", { positive: ["k"], nonnegative: [S`\theta_m`] }),
    e("d.focal", "Effective focal length", S`\frac{1}{n_0k\sin(kt)}`, "n_0 k t", "Outside index one; short-cylinder branch 0 < kt < π/2, n₀ > 0; radians.", { positive: ["n_0", "k", "t"] }),
    e("d.back", "Back focal length", S`\frac{\cos(kt)}{n_0k\sin(kt)}`, "n_0 k t", "Same short-cylinder branch and outside index one; radians.", { positive: ["n_0", "k", "t"], alternatives: [S`\frac{\cot(kt)}{n_0k}`] }),
    e("e.radius", "Third-order image radius at the external focus", S`\frac{k^2a^3}{2}(\frac{kt}{\sin(kt)}+n_0^2\cos(kt)\sin^2(kt))`, "k a t n_0", "a is the positive symmetric aperture radius; 0 < kt < π/2; small ka, outside index one. This completion of part (e) follows the repository solution, beyond the supplied handwritten solution.", { positive: ["k", "a", "t", "n_0"] }),
  ],
  "arena-an-atom-with-stage-fright": [
    r("a.dipole", "Complex oscillating vector dipole", "Complex conjugates, vector dipoles and real-part operations are outside this checker. Review the two conjugate cross terms and the sign convention."),
    e("b.power", "Mean transition power", S`\frac{n\omega_0^4\mu_{21}^2}{3\pi\varepsilon_0c^3}x(1-x)`, S`n \omega_0 \mu_{21} \varepsilon_0 c x`, "Use x = |a₂|², 0 ≤ x ≤ 1, and μ₂₁ for the positive norm of the transition dipole; other constants positive. Slowly varying populations, semiclassical model.", { positive: ["n", S`\omega_0`, S`\mu_{21}`, S`\varepsilon_0`, "c"], nonnegative: ["x"] }),
    e("c.energy", "Mean atomic energy", "(1-x)E_1+xE_2", "x E_1 E_2", "Use x = |a₂|² and normalization |a₁|² = 1 − x; 0 ≤ x ≤ 1, E₂ > E₁.", { nonnegative: ["x"], alternatives: ["E_1+(E_2-E_1)x"] }),
    e("d.lifetime", "Lifetime parameter τsp", S`\frac{3\pi\varepsilon_0\hbar c^3}{n\omega_0^3\mu_{21}^2}`, S`\varepsilon_0 \hbar c n \omega_0 \mu_{21}`, "Nonzero transition dipole; all listed scales positive. This is the lifetime parameter of the specified semiclassical equation.", { positive: [S`\varepsilon_0`, S`\hbar`, "c", "n", S`\omega_0`, S`\mu_{21}`] }),
    e("d.function", "Population function f(x)", "x(1-x)", "x", "x = |a₂|², 0 ≤ x ≤ 1; not simply x.", { nonnegative: ["x"], alternatives: ["x-x^2"] }),
    e("e.population", "Excited-state population x(t)", S`\frac{x_0}{x_0+(1-x_0)\exp(t/\tau_{sp})}`, S`x_0 t \tau_{sp}`, "Use x₀ = |a₂(0)|², 0 < x₀ < 1, t ≥ 0, τ_sp > 0. For the sketch the initial amplitude 0.9 means x₀ = 0.81.", { positive: ["x_0", S`\tau_{sp}`], nonnegative: ["t"] }),
    r("e.sketch", "Population sketch for initial amplitude 0.9", "Review x(0) = 0.81, the half-population time about 1.45τsp, and decay towards zero."),
    r("f.explanation", "Pure excited initial state", "Explain why this semiclassical model remains at x = 1 with zero radiated power, and why that is a limitation rather than a prediction of quantum spontaneous emission."),
    e("g.power", "Radiated-power pulse", S`\frac{\hbar\omega_0}{4\tau_{sp}}\frac{1}{\cosh^2(\frac{t-t_0}{2\tau_{sp}})}`, S`\hbar \omega_0 \tau_{sp} t t_0`, "τ_sp, ℏ, ω₀ > 0; t₀ = τsp ln(x₀/(1−x₀)) is the half-population time. Pulse formula within the slowly varying semiclassical treatment.", { positive: [S`\hbar`, S`\omega_0`, S`\tau_{sp}`] }),
    r("g.sketch", "Power sketch for initial amplitude 0.9", "Review the initial rise, maximum at 1.45τsp, and subsequent decay; only t ≥ 0 is physical for the specified initial condition."),
  ],
  "arena-the-invisible-brake": [
    e("one.a.flux", "Upward number flux", S`\frac{n}{4}\sqrt{\frac{8k_BT}{\pi m}}`, "n k_B T m", "Statement §1(a), solution §(a)(i). Dilute isotropic Maxwell–Boltzmann gas; all scales positive.", { positive: ["n", "k_B", "T", "m"] }),
    e("one.b.momentum", "Mean x-momentum transferred per crossing molecule", S`-\frac23m\lambda G`, S`m \lambda G`, "Statement §1(b), solution §(a)(ii). Use G = d⟨vx⟩/dz. Flux-weighted angular average; transfer to the faster layer is negative for G > 0.", { positive: ["m", S`\lambda`] }),
    n("one.c.exponent", "Viscosity temperature exponent α", 0.5, "1", { absTol: 0, relTol: 0, canonical: S`\frac12`, help: "Statement §1(c), solution §(a)(iii); b ≪ λ ≪ D, dilute gas." }),
    e("one.c.coefficient", "Viscosity coefficient ξ", S`\frac{2\sqrt{mk_B}}{3\pi^{3/2}b^2}`, "m k_B b", "The number density cancels; b is molecular diameter; positive scales, dilute-gas approximation.", { positive: ["m", "k_B", "b"] }),
    e("two.a.velocity", "Axial velocity profile", S`-\frac{G}{4\eta}(R^2-r^2)`, S`G \eta R r`, "Statement §2(a), solution §(b)(i). Use G = dp/dx, signed pressure gradient; η, R > 0, 0 ≤ r ≤ R; steady nearly incompressible Poiseuille flow.", { positive: [S`\eta`, "R"], nonnegative: ["r"] }),
    e("two.b.flow", "Volumetric flow rate", S`-\frac{\pi R^4G}{8\eta}`, S`R G \eta`, "Use G = dp/dx, negative for positive flow; fully developed nearly incompressible flow.", { positive: ["R", S`\eta`] }),
    e("two.c.heat", "Wall heat per unit time per unit length", S`\frac{\pi R^4G^2}{8\eta}`, S`R G \eta`, "Use G = dp/dx. Pressure-work dissipation is removed as wall heat; steady nearly incompressible flow. Isothermal compressible gas alone does not justify this formula.", { positive: ["R", S`\eta`] }),
  ],
};
