import "server-only";
import { expression, numeric, review, type ArchiveKeyPart } from "../archive-grading/definitions";
const t = String.raw;
const label = (part: ArchiveKeyPart, sourcePart: string): ArchiveKeyPart => ({ ...part, sourcePart });
const expr = (id: string, source: string, title: string, key: string, symbols: string, help: string, positive: string[] = []) => label(expression(id, title, key, symbols, help, { positive, ...(symbols.includes("T_c") ? { ranges: { T_c: [350, 450] as [number, number], T_0: [250, 300] as [number, number] } } : {}) }), source);
const manual = (id: string, source: string, title: string, help: string) => label(review(id, title, help), source);
const num = (id: string, source: string, title: string, target: number, unit: string, tolerance: number, help: string) => label(numeric(id, title, target, unit, { absTol: tolerance, relTol: 0, help }), source);
export const batchFourParts: Record<string, ArchiveKeyPart[]> = {
  "eupho-2017-t1": [
    manual("a.model", "A.model", "Fundamental-mode model", "Describe and justify your model for the rope. The numeric check alone does not assess this reasoning."),
    num("a.frequency", "A.frequency", "Estimated fundamental frequency", 0.61, "Hz", 0.03, "Use the physical-pendulum estimate with the supplied length and gravity. Enter Hz. Other justified models require self-review."),
    num("b.ratio2", "B.ratio2", "Frequency ratio f_2/f_1", 2.2, "", 0.12, "Normalize f_1 to one. Enter f_2/f_1, using the source graph."),
    num("b.ratio3", "B.ratio3", "Frequency ratio f_3/f_1", 3.5, "", 0.18, "Normalize f_1 to one. Enter f_3/f_1. The tolerance allows graph reading and rounding."),
  ],
  "eupho-2017-t2": [
    expr("acceleration", "Acceleration", "Initial acceleration scale", t`S*\rho*k_B*\sqrt{T_0*T_1}/(m*M)`, t`S \rho k_B T_0 T_1 m M`, "This field checks the scaling estimate with order-one prefactors set to one. Use k_B, T_0, T_1 and the other statement symbols.", ["S", t`\rho`, "k_B", "T_0", "T_1", "m", "M"]),
    expr("speed", "Speed", "Maximum speed scale", t`\sqrt{k_B*T_0/m}`, "k_B T_0 m", "Enter the thermal-speed scaling estimate with the order-one prefactor set to one.", ["k_B", "T_0", "m"]),
    manual("reasoning", "Reasoning", "Pressure bias and slow cooling", "Explain the molecular momentum flux, speed limit and cooling timescale. The formula checks only compare the scaling estimates, not the reasoning or a kinetic-theory prefactor."),
  ],
  "eupho-2017-t3": [
    expr("force", "Force", "Signed normal force", t`3*\mu_0*m^2/(2*\pi)*(1/(16*b^4)-1/(a+b)^4)`, t`\mu_0 m a b`, "Positive force points away from the mesh. Use mu_0 for vacuum permeability. Include both trapped-flux image dipoles.", [t`\mu_0`, "m", "a", "b"]),
  ],
  "eupho-2021-t1": [
    expr("a", "a", "Leak-onset volume V_0", "V*(1+x)^{-3/5}", "V x", "Use x=mgH/(pV) and V for the initial volume of either chamber.", ["V", "x"]),
    expr("b", "b", "Final upper-chamber temperature T_1", "T/2*((1+(1+x)^{3/5})^{5/3}-x)", "T x", "Use x=mgH/(pV) and T for the initial temperature.", ["T", "x"]),
    expr("c", "c", "Limiting lower-chamber temperature T_2", "T*(1+(1+x)^{3/5})^{2/3}", "T x", "Use x=mgH/(pV). Enter the limiting temperature before contact.", ["T", "x"]),
  ],
  "eupho-2021-t2": [
    expr("length", "Answer", "Critical loop length L_0", t`\pi*R*\sqrt{1+(\pi*\mu)^2}+R/\mu*\ln(\pi*\mu+\sqrt{1+(\pi*\mu)^2})`, t`R \mu`, "Use R and mu. Write the inverse hyperbolic sine using ln(x+sqrt(1+x^2)). Assume mu>0. The zero-friction limit is reviewed in the solution.", ["R", t`\mu`]),
  ],
  "eupho-2021-t3": [
    manual("a", "a", "Closed-loop ray diagram", "Explain the two rays from each visible thread point and where their images merge. Draw a labelled ray diagram and compare with the solution. This is self-review."),
    num("b", "b", "Red refractive index n_R", 1.50, "", 0.03, "Read the supplied original photograph. The absolute tolerance is 0.03, matching the source's full-credit measurement range."),
    num("c", "c", "Index difference n_V minus n_R", 0.0132, "", 0.003, "Enter the index difference, not a percentage. Absolute tolerance 0.003 accepts both official constructions. Explain your measured width in your workings."),
  ],
  "eupho-2022-t1": [
    num("period", "Answer", "Oscillation period", 0.53, "s", 0.015, "Enter seconds. Include the inertia of the liquid flowing in the narrow gap."),
  ],
  "eupho-2022-t2": [
    expr("a.low", "a.low", "Lower critical voltage V_1", t`\sqrt{R_1*\alpha*(T_c-T_0)}`, t`R_1 \alpha T_c T_0`, "Use R_1, alpha, T_c and T_0. Assume T_c>T_0.", ["R_1", t`\alpha`, "T_c", "T_0"]),
    expr("a.high", "a.high", "Upper critical voltage V_2", t`\sqrt{R_2*\alpha*(T_c-T_0)}`, t`R_2 \alpha T_c T_0`, "Use R_2, alpha, T_c and T_0. Assume T_c>T_0.", ["R_2", t`\alpha`, "T_c", "T_0"]),
    manual("b.graph", "b.graph", "Temperature versus time graph", "Sketch T(t), label T_c and the extrema, and show what happens to current and temperature at each phase transition. The graph is self-review."),
    expr("b.ratio", "b.ratio", "Temperature-rise ratio", "(R_2/R_1)^2", "R_1 R_2", "Enter (T_max-T_0)/(T_min-T_0). Use R_1 and R_2.", ["R_1", "R_2"]),
    expr("c", "c", "Oscillation period", t`L/R_1*(\ln(7/4)+\ln(7)/16)`, "L R_1", "Use L and R_1. This field uses the specified voltage and R_2=16R_1. Use ln for natural logarithms.", ["L", "R_1"]),
  ],
  "eupho-2022-t3": [
    num("a.omega", "a.omega", "Initial angular velocity for translation", 0, "rad/s", 0, "Enter the required angular velocity. State the velocity direction separately."),
    manual("a.direction", "a.direction", "Translation direction", "Give the allowed direction of v_0 and explain why both the force and torque vanish. This reasoning is self-review."),
    expr("b.vx", "b.vx", "Circular-orbit initial velocity x component", "0", "", "Enter the x component of the required initial velocity."),
    expr("b.vy", "b.vy", "Circular-orbit initial velocity y component", "-q*B*d/(2*m)", "q B d m", "Use positive q, B, d and m. The field points along +z.", ["q", "B", "d", "m"]),
    expr("b.radius", "b.radius", "Circle radius R_c", "q*B*d/(2*m*w)", "q B d m w", "Use w for the positive magnitude of omega_0. This circular branch requires nonzero angular velocity.", ["q", "B", "d", "m", "w"]),
    expr("b.xc", "b.xc", "Circle centre x_c", t`q*B*d/(2*m*\omega_0)`, t`q B d m \omega_0`, "Use signed nonzero omega_0. Counterclockwise rotation is positive. Other parameters are positive.", ["q", "B", "d", "m"]),
    num("b.yc", "b.yc", "Circle centre y_c", 0, "m", 0, "Enter the y coordinate of the circle centre."),
    expr("c", "c", "Reversal threshold angular speed", "2*q*B/m", "q B m", "Enter the positive limiting angular speed. At exact equality the reversed orientation is approached asymptotically.", ["q", "B", "m"]),
    expr("d", "d", "Distance to the asymptote D", "d", "d", "Use d for the charge separation. Enter a positive distance.", ["d"]),
  ],
  "eupho-2023-t1": [
    manual("a", "a", "Radial temperature graph", "Sketch T(r) with the central tangent, illuminated and outer regions, matching at sigma and rim temperature T_h. This sketch is self-review."),
    num("b.temperature", "b.temperature", "Central temperature T_c", 40.7, "degrees Celsius", 0.6, "Enter degrees Celsius. The tolerance includes the official rounded value 41."),
    num("b.curvature", "b.curvature", "Quadratic coefficient m", -1.061032953945969e7, "K/m^2", 5e5, "Use metres for r in T(r)=T_c+m*r^2. Enter the signed coefficient in K/m^2."),
    num("c.focus", "c.focus", "Focal distance f", 0.9424777961, "m", 0.015, "Enter metres. Use the thin-plate, paraxial approximation."),
    manual("c.proof", "c.proof", "Common focal point", "Show why every illuminated radius gives the same focal distance, using optical paths or ray tracing. A numerical focal-length check does not assess this proof."),
  ],
};
