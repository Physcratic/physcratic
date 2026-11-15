import "server-only";
import { expression, numeric, review, type ArchiveKeyPart } from "../archive-grading/definitions";
const t = String.raw;
const label = (part: ArchiveKeyPart, sourcePart: string): ArchiveKeyPart => ({ ...part, sourcePart });
const expr = (id: string, source: string, title: string, key: string, symbols: string, help: string, options: Parameters<typeof expression>[5] = {}) => label(expression(id, title, key, symbols, help, options), source);
const manual = (id: string, source: string, title: string, help: string) => label(review(id, title, help), source);
const num = (id: string, source: string, title: string, target: number, unit: string, absTol: number, help: string) => label(numeric(id, title, target, unit, { absTol, relTol: 0, help }), source);
export const batchFiveParts: Record<string, ArchiveKeyPart[]> = {
  "eupho-2023-t2": [
    expr("a", "a", "Final speed for equal plane speeds", t`u/\sqrt{2}`, "u", "Use u for either plane's common speed.", { positive: ["u"] }),
    expr("b", "b", "Final speed for unequal plane speeds", t`\sqrt{u_1^2*(1-(u_1-u_2)/\sqrt{u_1^2+u_2^2})^2+u_2^2*(1+(u_1-u_2)/\sqrt{u_1^2+u_2^2})^2}/2`, "u_1 u_2", "Use u_1 and u_2 for positive plane speeds. Substitute any D or delta shorthand before submitting.", { positive: ["u_1", "u_2"] }),
  ],
  "eupho-2023-t3": [
    manual("a", "a", "Current streamlines", "Sketch the closed current loops, label x and y, show circulation and the kinks at the circular patch boundary. This drawing is self-review."),
    expr("b.inside", "b.inside", "Current density j_x inside the patch", t`v*B/(2*\varrho)`, t`v B \varrho`, "Enter the signed x component for |y|<R. The plate moves along +y and the field points along +z. Use varrho for resistivity.", { positive: ["v", "B", t`\varrho`] }),
    expr("b.outside", "b.outside", "Current density j_x outside the patch", t`-v*B*R^2/(2*\varrho*y^2)`, t`v B R \varrho y`, "Enter the signed x component at x=0 for |y|>R. Use varrho for resistivity. Do not submit the force or current magnitude.", { positive: ["v", "B", "R", t`\varrho`], ranges: { R: [0.5, 1], y: [2, 4] }, exclusions: ["y != 0"] }),
    manual("b.graph", "b.graph", "Current-density graph", "Plot j_x against y, including both rims, signs, interior plateau and far-field decay. The two algebraic fields do not assess the graph."),
    expr("c", "c", "Required pulling force magnitude", t`\pi*R^2*\delta*B^2*v/(2*\varrho)`, t`R \delta B v \varrho`, "Enter the positive magnitude of the force maintaining motion along +y. Use delta for plate thickness and varrho for resistivity.", { positive: ["R", t`\delta`, "B", "v", t`\varrho`] }),
  ],
  "eupho-2024-t1": [
    expr("a.sliding", "a.sliding", "Exit speed on the sliding branch", t`v_0*\exp(-\pi*\mu)`, t`v_0 \mu`, "Enter the exit speed when pi*mu <= ln(3/2). Use v_0 and mu. State the piecewise condition in your reasoning.", { positive: ["v_0"], nonnegative: [t`\mu`], ranges: { [t`\mu`]: [0.001, 0.12] } }),
    expr("a.rolling", "a.rolling", "Exit speed after rolling begins", "2*v_0/3", "v_0", "Enter the exit speed when pi*mu >= ln(3/2). Use v_0.", { positive: ["v_0"] }),
    expr("b.threshold", "b.threshold", "Critical friction coefficient", t`\ln(3/2)/\pi`, "", "Enter the transition value of mu. Use ln for natural logarithms."),
    manual("b.graph", "b.graph", "Exit-speed graph and branch conditions", "Sketch v_e(mu), label the zero-friction intercept, threshold, corner and plateau. Include the conditions for both branches. These are self-review."),
  ],
  "eupho-2024-t2": [
    expr("a.i", "a.i", "Gift spacing in Bob's frame", "16*c*t_0/37", "c t_0", "Use t_0 for Delta t_0 and c for light speed. This is a simultaneous spacing in Bob's frame.", { positive: ["c", "t_0"] }),
    expr("a.ii", "a.ii", "Gift arrival interval at Bob", "16*t_0/35", "t_0", "Use t_0 for Delta t_0. Enter the arrival interval in Bob's frame.", { positive: ["t_0"] }),
    num("b", "b", "Visible outgoing-to-incoming gift ratio", 18, "", 0, "Enter N_out/N_in for gifts Alice sees at one instant. Include the light travel time when deriving the counts."),
  ],
  "eupho-2024-t3": [
    manual("a", "a", "Nonzero relative mirror phase", "Show why reflected and transmitted amplitudes cannot have the same phase. The source defines phi as their relative phase. This proof is self-review."),
    num("b", "b", "Relative phase magnitude", Math.PI/2, "rad", 0.005, "Enter the magnitude in radians, using the official reflected-versus-transmitted phase convention. pi/2 is accepted."),
    expr("c", "c", "Returning pulse energy", "L*P/(c*(1-R))", "L P c R", "Use intensity reflectivity R, not amplitude reflectivity. Enter the leading high-reflectivity result. The exact ideal abrupt-switch result is also accepted.", { positive: ["L", "P", "c", "R"], ranges: { R: [0.97, 0.999] }, exclusions: ["R != 1"], alternatives: ["2*L*P*R/(c*(1-R^2))"] }),
    expr("d", "d", "Energy-envelope decay time", "L/(c*(1-R))", "L c R", "Use the leading energy-envelope e-folding time. The exact round-trip logarithmic time is also accepted. Other stated pulse-duration conventions require self-review.", { positive: ["L", "c", "R"], ranges: { R: [0.97, 0.999] }, exclusions: ["R != 1"], alternatives: [t`L/(c*\ln(1/R))`] }),
    manual("d.convention", "d.convention", "Pulse-duration convention", "State whether your duration refers to the energy envelope, amplitude envelope or another width. A different justified convention must be compared with the source rather than treated as an automatically wrong estimate."),
  ],
  "eupho-2025-t1": [
    expr("a", "a", "Illuminance surplus I(r,theta)", t`I_0*a/(2*r)*\sin(\theta/2)`, t`I_0 a r \theta`, "Use I_0 for the A-B illuminance difference and the figure's polar-angle convention, 0<=theta<=2*pi. Enter the leading result for r much larger than a.", { positive: ["I_0", "a", "r"], ranges: { a: [0.05, 0.1], r: [10, 20], [t`\theta`]: [0.1, 6.1] } }),
    expr("b", "b", "Middle-ring radial excess", t`2*a*\sin(\theta/2)`, t`a \theta`, "Enter R(theta)-R_min to first order in a/R_min. Use the full polar angle shown in the photograph.", { positive: ["a"], ranges: { [t`\theta`]: [0.1, 6.1] } }),
  ],
  "eupho-2025-t2": [
    manual("a", "a", "Stable-equilibrium proof", "Show positive chain tensions and a restoring force or a positive quadratic rise in gravitational potential. Account for the absence of first-order rotation. This proof is self-review."),
    num("b", "b", "Small-oscillation period", 0.777, "s", 0.008, "Enter seconds, using a=0.100 m and g=9.81 m/s^2. Treat each paired chain as one combined constraint."),
  ],
  "eupho-2025-t3": [
    manual("a", "a", "Field-line sketch", "Draw a smooth helical field line centred on the wire, with handedness matching the indicated current and imposed axial field. This drawing is self-review."),
    expr("b", "b", "Closest field-line distance d", t`r/\sqrt{10}`, "r", "Use r for the initial distance at x=3a. Enter the leading result for r much smaller than a.", { positive: ["r"] }),
    num("c", "c", "Field-line length L", 179, "m", 35.8, "Enter metres. The requested 20 percent tolerance accepts the exact-integral and trapezoid estimates."),
  ],
  "ipho-2010-t2": [
    expr("1.a", "1.a", "Minimum chimney height", "B^2*T_a/(2*g*A^2*d_T)", "B T_a g A d_T", "Use T_a for absolute ambient temperature and d_T for the positive temperature difference. A is chimney cross-section and B is furnace volume rate.", { positive: ["B", "T_a", "g", "A", "d_T"] }),
    num("1.b", "1.b", "Warm-region chimney height", 145, "m", 2, "Enter metres. Convert the source temperatures to kelvin before forming ratios."),
    manual("1.c", "1.c", "Velocity profile", "Sketch velocity versus height, showing the entry point and the idealized change from furnace to chimney. This graph is self-review."),
    expr("1.d", "1.d", "Smoke pressure p(z)", t`p_0-(\rho_a-\rho_s)*g*h-\rho_s*g*z`, t`p_0 \rho_a \rho_s g h z`, "Use p_0 for ambient pressure at ground, rho_a and rho_s for air and smoke densities. Enter the chimney-interior pressure, 0<z<h.", { positive: ["p_0", t`\rho_a`, t`\rho_s`, "g", "h", "z"], ranges: { [t`\rho_a`]: [1.2, 1.4], [t`\rho_s`]: [0.7, 1], h: [10, 20], z: [1, 5] } }),
    expr("2.a", "2.a", "Ideal solar-chimney efficiency", "g*h/(c*T_a)", "g h c T_a", "Use c for air specific heat and T_a for absolute ambient temperature. Enter a fraction, not percent.", { positive: ["g", "h", "c", "T_a"] }),
    manual("2.b", "2.b", "Efficiency versus height", "Sketch and label efficiency versus h with the other parameters fixed. State the model's domain. This graph is self-review."),
    num("3.a", "3.a", "Prototype efficiency", 0.006407684596, "", 0.0001, "Enter a fraction, not a percentage. Use the supplied prototype dimensions and temperatures."),
    num("3.b", "3.b", "Prototype available power", 45, "kW", 1, "Enter kilowatts of ideal available kinetic power using the problem's efficiency definition."),
    num("3.c", "3.c", "Energy for eight sunny hours", 360, "kWh", 8, "The statement does not specify sunlight duration. This field uses the official eight-hour assumption. For another duration compare E=P*t in your workings."),
    expr("4.a.formula", "4.a.formula", "General air-temperature rise", t`(G^2*S^2*T_a/(2*g*h*A^2*c^2*\rho_h^2))^{1/3}`, t`G S T_a g h A c \rho_h`, "Use S for collector area, A for chimney cross-section, G for irradiance, c for specific heat, T_a in kelvin and rho_h for hot-air density.", { positive: ["G", "S", "T_a", "g", "h", "A", "c", t`\rho_h`] }),
    num("4.a.value", "4.a.value", "Prototype temperature rise", 9.1, "K", 0.2, "Enter the temperature rise in kelvin."),
    num("4.b", "4.b", "Prototype mass flow rate", 760, "kg/s", 20, "Enter kilograms per second. Use the source's supplied hot-air density."),
  ],
  "apho-2014-t2": [
    expr("a", "a", "Near-filament potential V(x,z)", t`V_a*\ln(b/\sqrt{x^2+z^2})/\ln(b/a)`, "V_a b x z a", "Use V_a for filament potential. This is the cylindrical near-filament approximation in the region a<sqrt(x^2+z^2)<b, with grounded mesh.", { positive: ["V_a", "b", "a"], ranges: { a: [0.05, 0.1], b: [3, 5], x: [0.2, 0.4], z: [0.5, 1] } }),
    expr("b", "b", "Transverse wave-vector magnitude", t`2*\pi^2*e*V_a/(h*v_z*\ln(b/a))`, "e V_a h v_z b a", "Enter |k_x|, with e the positive charge magnitude and h Planck's constant. Use the straight-line, small-deflection near-filament approximation. Sign reverses on opposite sides.", { positive: ["e", "V_a", "h", "v_z", "b", "a"], ranges: { a: [0.05, 0.1], b: [3, 5] } }),
    expr("c.i", "c.i", "Nonrelativistic wavelength", t`h/\sqrt{2*m*e*V_0}`, "h m e V_0", "Use h, rest mass m, positive charge magnitude e and accelerating voltage V_0.", { positive: ["h", "m", "e", "V_0"] }),
    expr("c.ii", "c.ii", "Relativistic wavelength", t`h/\sqrt{2*m*e*V_0*(1+e*V_0/(2*m*c^2))}`, "h m e V_0 c", "Use c for light speed and m for electron rest mass.", { positive: ["h", "m", "e", "V_0", "c"] }),
    num("d.i", "d.i", "Transverse wave-vector magnitude", 3.46e7, "1/m", 8e5, "Enter |k_x| in inverse metres, using the supplied v_z=c/2."),
    num("d.ii", "d.ii", "Plane-wave fringe spacing", 90.7, "nm", 2, "Enter nanometres. Both +k_x and -k_x contribute to the phase difference."),
    manual("d.iii", "d.iii", "Spherical-wave comparison", "State whether the fringe spacing becomes larger, equal or smaller for a spherical incident wave, and explain the geometry. This is self-review."),
    num("d.iv", "d.iv", "Nonrelativistic wavelength error", 2.4, "%", 0.1, "Enter percentage points, using 100*(lambda_nr-lambda_rel)/lambda_rel."),
    manual("d.v", "d.v", "Apparent double-slit separation", "Give your virtual-source geometry and d. Compare the official substitution with the consistent spherical-wave model described in the worked solution. The source mixes these models, so no unique automatic numerical key is enforced."),
  ],
};
