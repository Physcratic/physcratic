import "server-only";
import { expression as e, numeric as n, review as r, type ArchiveKeyPart } from "./definitions";
const S = String.raw;
export const keys04: Record<string, ArchiveKeyPart[]> = {
  "arena-the-quantum-escape-room": [
    e("a.wave-number", "Free wave number k₀", S`\frac{\sqrt{2mE}}{\hbar}`, S`m E \hbar`, "m, E and ℏ positive; principal positive wave number.", { positive: ["m", "E", S`\hbar`] }),
    e("b.parallel", "Wave number k₂y", S`k_0\sin\theta`, S`k_0 \theta`, "Conserved tangential momentum; k₀ > 0; incidence angle in radians, 0 ≤ θ < π/2.", { positive: ["k_0"] }),
    e("c.decay", "Barrier decay parameter κ", S`\frac{\sqrt{2m(V_0-E\cos^2\theta)}}{\hbar}`, S`m V_0 E \theta \hbar`, "V₀ > E > 0; m, ℏ > 0; real positive decay constant; θ in radians.", { positive: ["m", "V_0", "E", S`\hbar`] }),
    e("d.normal", "Transmitted wave number k₃x", S`k_0\cos\theta`, S`k_0 \theta`, "Positive-x transmitted wave; k₀ > 0; 0 ≤ θ < π/2 in radians.", { positive: ["k_0"] }),
    e("d.parallel", "Transmitted wave number k₃y", S`k_0\sin\theta`, S`k_0 \theta`, "Tangential momentum is conserved; radians.", { positive: ["k_0"] }),
    e("e.probability", "Transmission probability", S`(1+\frac{V_0^2}{4E_x(V_0-E_x)}\sinh^2(\kappa d))^{-1}`, S`V_0 E_x \kappa d`, "Use E_x = E cos²θ > 0 and κ from part (c); V₀ > E_x, d > 0. This form uses the normal energy, not total E.", { positive: ["V_0", "E_x", S`\kappa`, "d"], alternatives: [S`\frac{1}{1+\frac{V_0^2}{4E_x(V_0-E_x)}\sinh^2(\kappa d)}`] }),
    e("f.rate", "Square-box escape-rate approximation λ", S`\frac2a\sqrt{\frac Em}(1+\frac{V_0^2}{E(2V_0-E)}\sinh^2(\kappa_{45}d))^{-1}`, S`a E m V_0 \kappa_{45} d`, "a ≫ d; independent collisions and small escape probability. κ₄₅ = √(2m(V₀ − E/2))/ℏ. Count all four wall collisions; all length/energy/mass scales positive.", { positive: ["a", "E", "m", "V_0", S`\kappa_{45}`, "d"] }),
  ],
  "arena-the-three-way-wave-split": [
    e("a.wave-two", "Transmitted wave in string 2", S`\frac{10k_1A}{5k_1+4k_2+3k_3}\sin(\omega t-k_2r_2)`, S`k_1 k_2 k_3 A \omega t r_2`, "r₂ increases away from the junction; positive wave numbers and ω; angles in radians. T₁ = 5T₀.", { positive: ["k_1", "k_2", "k_3", S`\omega`] }),
    e("a.wave-three", "Transmitted wave in string 3", S`\frac{10k_1A}{5k_1+4k_2+3k_3}\sin(\omega t-k_3r_3)`, S`k_1 k_2 k_3 A \omega t r_3`, "r₃ increases away from the junction; positive wave numbers and ω; angles in radians.", { positive: ["k_1", "k_2", "k_3", S`\omega`] }),
    e("b.density-two", "Linear mass density μ₂", S`\mu/5`, S`\mu`, "μ₁ = μ > 0; zero reflection and outgoing power ratio 2:3.", { positive: [S`\mu`] }),
    e("b.density-three", "Linear mass density μ₃", S`3\mu/5`, S`\mu`, "μ₁ = μ > 0; zero reflection and outgoing power ratio 2:3.", { positive: [S`\mu`] }),
  ],
  "arena-titans-double-take": [
    n("a.index", "Liquid refractive index relative to the atmosphere", 1.28863, "1", { absTol: 0.003, relTol: 0, alternatives: ["1.29"], help: "Spherical droplets; atmosphere index taken as one. Solve stationary primary deviation at an antisolar radius of 49°. Tolerance ±0.003." }),
    n("b.angle", "Secondary antisolar angular radius", 38.5268, "degrees", { absTol: 0.1, relTol: 0, alternatives: ["38.53"], help: "Use the index inferred in part (a), not a generic terrestrial index. This branch lies inside the 49° primary bow; tolerance ±0.1°." }),
    r("b.diagram", "Relative position diagram", "Review the two concentric bows around the antisolar point, secondary inside primary, with opposite colour ordering for normal dispersion."),
  ],
};
