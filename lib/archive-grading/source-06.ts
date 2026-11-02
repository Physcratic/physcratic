import "server-only";
import { expression as e, numeric as n, review as r, type ArchiveKeyPart } from "./definitions";
const S = String.raw;
const stressComponents = ["xx", "xy", "xz", "yx", "yy", "yz", "zx", "zy", "zz"];
export const keys06: Record<string, ArchiveKeyPart[]> = {
  "arena-the-bending-beam-riddle": [
    e("a.i.shear", "Right-hand side of dM/dx", "V", "V", "Use V for the signed shear V(x) in the source convention."),
    e("a.ii.curvature", "Second derivative d²M/dx²", S`-\rho bdg`, S`\rho b d g`, "Uniform beam and stated shear convention; all dimensional parameters positive.", { positive: [S`\rho`, "b", "d", "g"] }),
    e("a.iii.shear", "Shear V(x)", S`\rho bdg(L/2-x)`, S`\rho b d g L x`, "Simply supported beam; 0 ≤ x ≤ L, positive dimensions, density and g.", { positive: [S`\rho`, "b", "d", "g", "L"] }),
    e("a.iii.moment", "Bending moment M(x)", S`\frac{\rho bdg}{2}x(L-x)`, S`\rho b d g L x`, "Simply supported beam; M(0) = M(L) = 0 and 0 ≤ x ≤ L.", { positive: [S`\rho`, "b", "d", "g", "L"] }),
    e("b.i.stress", "Normal stress fxx(y)", "Yy/R", "Y y R", "Use R for the signed radius R(x), R ≠ 0. Source convention Y = −fxx/(Δl/l).", { positive: ["Y"], exclusions: ["v2 != 0"] }),
    e("b.ii.moment", "Bending moment from curvature", S`\frac{Ybd^3}{12R}`, "Y b d R", "R is the signed curvature radius R(x), R ≠ 0; rectangular section.", { positive: ["Y", "b", "d"], exclusions: ["v3 != 0"] }),
    e("b.iii.drop", "Positive midpoint drop", S`\frac{5\rho gL^4}{32Yd^2}`, S`\rho g L Y d`, "Small slopes, simple supports, self-weight only. Enter a positive drop, not the negative upward displacement.", { positive: [S`\rho`, "g", "L", "Y", "d"] }),
    n("c.i.order", "Wave-equation order n", 4, "1", { absTol: 0, relTol: 0 }),
    e("c.i.a", "Wave-equation coefficient A", S`-\frac{12\rho}{Yd^2}`, S`\rho Y d`, "Rayleigh beam model including rotational inertia; positive physical parameters.", { positive: [S`\rho`, "Y", "d"] }),
    e("c.i.b", "Wave-equation coefficient B", S`\rho/Y`, S`\rho Y`, "Rotational inertia term on the right-hand side has positive coefficient.", { positive: [S`\rho`, "Y"] }),
    e("c.ii.phase", "Thin-beam phase velocity", S`(\frac{Yd^2}{12\rho})^{1/4}\sqrt{\omega}`, S`Y d \rho \omega`, "Neglect rotational inertia; all parameters positive; ω is angular frequency, not ordinary frequency.", { positive: ["Y", "d", S`\rho`, S`\omega`] }),
    e("c.ii.group", "Thin-beam group velocity", S`2(\frac{Yd^2}{12\rho})^{1/4}\sqrt{\omega}`, S`Y d \rho \omega`, "Same thin-beam limit; group velocity is twice phase velocity.", { positive: ["Y", "d", S`\rho`, S`\omega`] }),
  ],
  "arena-the-capacitors-missing-energy": [
    e("a.i.energy", "Rest-frame field energy U₀", S`\frac12\varepsilon_0E_0^2Ad`, S`\varepsilon_0 E_0 A d`, "Neglect fringing, √A ≫ d; positive dimensions and ε₀.", { positive: [S`\varepsilon_0`, "A", "d"] }),
    e("a.ii.electric", "Longitudinal electric field Ex in S", "E_0", "E_0", "Boost parallel to the field; capacitor moves along +x in S. Other electric components vanish."),
    n("a.ii.magnetic", "Magnetic field magnitude in S", 0, "T", { absTol: 0, relTol: 0 }),
    e("a.iii.field", "Moving-frame field energy", S`U_0/\gamma`, S`U_0 \gamma`, "γ = 1/√(1−β²) > 0; gap contracts longitudinally.", { positive: ["U_0", S`\gamma`] }),
    e("a.iii.plate", "Energy of each moving plate", S`\gamma m_pc^2`, S`\gamma m_p c`, "Each plate, not both; γ > 0, mp > 0, c > 0.", { positive: [S`\gamma`, "m_p", "c"] }),
    r("a.iii.observation", "Explain the apparent energy discrepancy", "The field and plates alone are not a closed static system; review why stressed supports carry the missing energy."),
    ...stressComponents.map((component) => e(`b.i.${component}`, `Moving material-surface stress f${component}`, `${component === "xy" || component === "xz" ? S`\gamma ` : ""}f_{0${component}}${component === "yx" || component === "zx" ? S`/\gamma` : ""}`, S`\gamma f_{0${component}}`, "Cauchy force per moving material-surface area, not a spatial stress-energy-tensor component. Positive stress means tension; γ = 1/√(1−β²).", { positive: [S`\gamma`] })),
    e("b.ii.interval", "Right-minus-left force-release time interval", S`\frac{\gamma\beta x_0}{c}`, S`\gamma \beta x_0 c`, "Use x₀ for the positive rest-frame length Δx′. The right force disappears later; 0 < β < 1 and γ = 1/√(1−β²).", { positive: [S`\gamma`, S`\beta`, "x_0", "c"] }),
    e("b.iii.work", "Energy change during release", S`\gamma\beta^2f_{xx}V_0`, S`\gamma \beta f_{xx} V_0`, "Use V₀ for rest volume Δx′Δy′Δz′. Signed Cauchy stress fxx is negative for compression; work is then negative.", { positive: [S`\gamma`, "V_0"] }),
    e("b.iv.density", "Mass-equivalent density after release", S`\gamma^2\rho_0`, S`\gamma \rho_0`, "Rest energy density/c² is ρ₀; γ = 1/√(1−β²).", { positive: [S`\gamma`, S`\rho_0`] }),
    e("b.v.density", "Mass-equivalent density while stressed", S`\gamma^2(\rho_0-\beta^2t_{0xx}/c^2)`, S`\gamma \rho_0 \beta t_{0xx} c`, "t₀xx = f₀xx, positive for tension and negative for compression; γ = 1/√(1−β²).", { positive: [S`\gamma`, S`\rho_0`, "c"] }),
    e("b.vi.stress", "Required rest-frame strut stress", S`-\frac{\varepsilon_0E_0^2A}{4A_b}`, S`\varepsilon_0 E_0 A A_b`, "Two identical struts share the plate attraction; compressive stress is negative.", { positive: [S`\varepsilon_0`, "A", "A_b"] }),
    e("b.vii.mass", "Energy-equivalent mass of one moving strut", S`\gamma(m_{0b}+\frac{\beta^2\varepsilon_0E_0^2Ad}{4c^2})`, S`\gamma m_{0b} \beta \varepsilon_0 E_0 A d c`, "γ = 1/√(1−β²); one strut, including its stress contribution. The strut area cancels.", { positive: [S`\gamma`, "m_{0b}", S`\varepsilon_0`, "A", "d", "c"] }),
    e("b.viii.energy", "Total field, plate and strut energy", S`\gamma(U_0+2(m_p+m_{0b})c^2)`, S`\gamma U_0 m_p m_{0b} c`, "Complete closed system; U₀ is rest field energy and γ = 1/√(1−β²). Includes both plates and both supports.", { positive: [S`\gamma`, "U_0", "m_p", "m_{0b}", "c"] }),
  ],
  "arena-the-infinite-v": [
    r("a.radial", "General radial electric field", "For the strictly infinite half-planes there is no finite general cutoff-independent field. Review the logarithmic divergence and finite-L regularization in the solution; do not invent a finite value."),
    r("a.tangential", "General tangential electric field", "The general-point component depends on the distant-boundary regularization. Review the finite-L field and its projection; cancellation is special to symmetry, not a general finite field."),
    r("b.radial", "Radial field at S, α = 60°", "Even at S the radial field diverges logarithmically as a common cutoff L goes to infinity. A finite radius-independent field would be a false answer."),
    n("b.tangential", "Symmetric-cutoff tangential field at S", 0, "N/C", { absTol: 0, relTol: 0, help: "Reflection symmetry makes this component exactly zero for every common finite cutoff. This does not make the full infinite-sheet field finite." }),
    r("c.stability", "Whether small displacements oscillate", "A finite cutoff and a taut string must first be specified. The regularized stability condition is QK_L < 0; the strictly infinite geometry is ill-posed."),
    r("c.frequency", "Oscillation frequency", "There is no finite cutoff-independent frequency. Review the regularized ω² = −QK_L/(mr); never substitute a fabricated finite infinite-limit answer."),
  ],
};
