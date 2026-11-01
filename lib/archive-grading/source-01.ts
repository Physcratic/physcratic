import "server-only";
import { expression as e, numeric as n, review as r, infinity, type ArchiveKeyPart } from "./definitions";
const S = String.raw;
export const keys01: Record<string, ArchiveKeyPart[]> = {
  "arena-mind-the-gap": [
    e("a.radius", "Dark-ring radius", S`\sqrt{\frac{m\lambda}{1/R_1-1/R_0}}`, S`m \lambda R_0 R_1`, "Reflected light, near-normal incidence; R₀ > R₁ > 0, λ > 0, m = 0, 1, …; principal positive root.", { alternatives: [S`\sqrt{\frac{m\lambda R_0R_1}{R_0-R_1}}`], positive: [S`\lambda`, "R_0", "R_1"], nonnegative: ["m"] }),
    n("b.radius", "Fitted lens radius R₁", 0.89895, "m", { absTol: 0.005, relTol: 0.005, alternatives: ["0.90"], help: "Use the least-squares fit to consecutive squared ring radii. Measurement precision supports rounding to two significant figures." }),
  ],
  "arena-the-bubble-treaty": [
    n("a.i.pressure", "Absolute pressure in either initial bubble", 101003.33, "Pa", { absTol: 0.02, relTol: 0, alternatives: [S`1.01\times10^5+\frac{4(0.025)}{0.03}`], help: "Absolute pressure, not pressure excess. Use pₐ = 101000 Pa; tolerance ±0.02 Pa." }),
    n("a.ii.radius", "Outer radius of either attached bubble", 3.174804, "cm", { alternatives: ["3.17"], help: "Ideal gas, separately conserved amounts, isothermal process; use absolute pressures. Enter the radius in cm." }),
    infinity("a.iii.interface", "Radius of curvature of the common interface", S`Equal pressures give a flat film. Use \infty for an unbounded radius, not zero radius.`),
    e("a.iv.distance", "Centre separation in terms of the common final radius", "R_p", "R_p", "Use R_p for the common outer radius R′ after attachment; each centre is R′/2 from the shared plane.", { positive: ["R_p"] }),
    n("b.i.radius", "Separating-film radius", 12, "cm", { alternatives: [S`\frac{1}{1/3-1/4}`] }),
    n("b.ii.distance", "Centre separation", Math.sqrt(13), "cm", { canonical: S`\sqrt{13}`, alternatives: ["3.61"] }),
  ],
  "arena-the-cosmic-kitchen": [
    n("a.energy", "Photon thermal-energy scale kBT", 86.25, "MeV", { help: "Use the question’s kBT scale at 10¹² K, not the blackbody mean 2.701kBT. Polarization counting does not derive the photon mean energy." }),
    e("b.density", "Nonrelativistic particle number density", S`(\frac{mk_BT}{2\pi\hbar^2})^{3/2}\exp(\frac{\mu-mc^2}{k_BT})`, S`m k_B T \hbar \mu c`, "Dilute nonrelativistic gas; one internal state, g = 1, kBT ≪ mc². Dimensional constants and T are positive; μ is real.", { positive: ["m", "k_B", "T", S`\hbar`, "c"] }),
    n("c.ratio", "Initial neutron-to-proton ratio", 0.985, "1", { relTol: 0.02, alternatives: ["1"], help: "Neglect electron/neutrino chemical potentials and use the kBT energy scale. A ratio near one is an intended estimate." }),
    n("d.temperature", "Estimated T₁", 9.3e9, "K", { relTol: 0.02, absTol: 0, help: "Use kBT₁ ≈ 0.8 MeV (or 0.79 MeV threshold); not a weak-rate freeze-out calculation." }),
    n("d.ratio", "Neutron-to-proton ratio at T₁", 0.20, "1", { absTol: 0.006, relTol: 0.03, alternatives: ["0.197"], help: "The worked estimate rounds this ratio to 0.20." }),
    n("e.temperature", "Estimated T₂", 5.9e9, "K", { absTol: 0, relTol: 0.02, help: "Use kBT₂ ≈ mₑc² = 0.51 MeV; an estimate of pair-abundance suppression, not exact loss of chemical equilibrium." }),
    e("f.ratio", "Deuterium equilibrium ratio nD/(np nn)", S`(\frac{m_D}{m_pm_n})^{3/2}(\frac{2\pi\hbar^2}{k_BT})^{3/2}\exp(\frac{B_D}{k_BT})`, S`m_D m_p m_n \hbar k_B T B_D`, "Single-state convention; B_D is the positive binding energy 2.24 MeV in consistent units. Spin multiplicities are not included.", { positive: ["m_D", "m_p", "m_n", S`\hbar`, "k_B", "T", "B_D"] }),
    e("g.equation", "Numerical-equation right-hand side (set equal to 1)", S`5.95305\times10^{-12}u^{3/2}\exp(2240/u)`, "u", "u is the numerical value of kBT in keV; ηB = 6.1×10⁻¹⁰, Xp ≈ 1, XD/Xn ≈ 1. Use the coefficient precision in the solution.", { positive: ["u"] }),
    n("g.temperature", "Low-temperature root T₃", 8e8, "K", { absTol: 0, relTol: 0.02, help: "Select the low-temperature root near kBT₃ = 69.1 keV, not the unrelated high-temperature root." }),
    e("h.zeta", "Coefficient ζ", S`\frac{8\pi G}{3}`, "G", "Uniform Newtonian sphere; ρ is mass-equivalent density.", { positive: ["G"] }),
    e("h.xi", "Curvature term ξ", S`-\frac{kc^2}{a^2}`, "k c a", "a is the positive scale factor; k is signed curvature, c > 0.", { positive: ["c", "a"] }),
    n("i.i.exponent", "Dust exponent p in energy density proportional to aᵖ", -3, "1", { absTol: 0, relTol: 0 }),
    n("i.ii.exponent", "Radiation exponent p in energy density proportional to aᵖ", -4, "1", { absTol: 0, relTol: 0 }),
    n("j.exponent", "Temperature exponent p in T proportional to aᵖ", -1, "1", { absTol: 0, relTol: 0, help: "Radiation domination with fixed relativistic particle content." }),
    e("k.ratio", "Temperature ratio T(t₁)/T(t₂)", S`\sqrt{\frac{t_2}{t_1}}`, "t_1 t_2", "Flat radiation-dominated Universe; Big Bang at t = 0; both times positive.", { positive: ["t_1", "t_2"], alternatives: [S`(t_2/t_1)^{1/2}`] }),
    n("l.temperature", "Temperature at matter–radiation equality", 9900, "K", { absTol: 0, relTol: 0.01, alternatives: ["9899.78"], help: "Separate matter-dominated power law from equality to recombination." }),
    n("m.fraction", "Helium mass fraction", 0.24, "1", { absTol: 0.005, relTol: 0.02, help: "Enter a fraction, not percent. Rounded r₁ = 0.20, Δt ≈ 290 s, half-life 612 s; all surviving neutrons enter helium; neglect baryonic mass differences." }),
    r("m.reasoning", "Baryon counting and decay reasoning", "Check comoving baryon counting and the neutron-decay derivation against the solution; only the final fraction is checked automatically."),
  ],
};
