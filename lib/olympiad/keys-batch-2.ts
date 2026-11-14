import "server-only";
import { expression, numeric, review, type ArchiveKeyPart } from "../archive-grading/definitions";
const label = (part: ArchiveKeyPart, sourcePart: string): ArchiveKeyPart => ({ ...part, sourcePart });
const expr = (id: string, sourcePart: string, title: string, key: string, symbols: string, help: string, positive: string[] = []): ArchiveKeyPart =>
  label(expression(id, title, key, symbols, help, { positive }), sourcePart);
const manual = (id: string, sourcePart: string, title: string, help: string) => label(review(id, title, help), sourcePart);
export const batchTwoParts: Record<string, ArchiveKeyPart[]> = {
  "eupho-2019-t1": [
    label(numeric("a", "Frozen mass fraction", 0.8, "", { absTol: 0.005, relTol: 0, help: "Enter the mass fraction from 0 to 1, not a percentage. Tolerance is 0.005." }), "a"),
    label(numeric("b", "Droplet temperature at ground", 7.9, "degrees Celsius", { absTol: 0.15, relTol: 0, help: "Enter degrees Celsius. Both source estimates, 7.9 with thermal lag and 8.0 with dissipation, are accepted within 0.15 degrees. Explain your approximation in your workings." }), "b"),
  ],
  "eupho-2019-t2": [
    expr("speed", "Motion", "Speed of the centre", "v_0", "v_0", "Use v_0 for the initial speed.", ["v_0"]),
    expr("radius", "Trajectory", "Circular path radius", "7m v_0/(6Q B)", "m v_0 Q B", "Use positive Q for the magnitude of the charge, B for field magnitude and v_0 for initial speed.", ["m", "v_0", "Q", "B"]),
    expr("omega", "Trajectory", "Angular speed of the circular path", "6Q B/(7m)", "Q B m", "Use positive Q for charge magnitude. This is the angular speed of the centre's path, not the rolling angular speed.", ["Q", "B", "m"]),
    manual("description", "Motion", "Describe the trajectory and circulation", "State the shape, speed and circulation direction. Explain why the speed stays constant and compare with the official solution. This reasoning is not automatically graded."),
  ],
  "eupho-2019-t3": [
    label(numeric("speed", "Water exit speed", 12, "m/s", { absTol: 0.3, relTol: 0, help: "Enter metres per second. The graph-reading tolerance is 0.3 m/s." }), "Answer"),
  ],
  "apho-2012-t3": [
    expr("iii.1", "III.1", "Intensity with two linear beams", String.raw`\beta E_0^2(1+\cos(\omega d\sin(\theta)/c))`, String.raw`\beta E_0 \omega d \theta c`, "Use beta, E_0, omega, d, theta and c for the speed of light. Angles are in radians.", [String.raw`\beta`, "E_0", String.raw`\omega`, "d", "c"]),
    expr("iii.2", "III.2", "Intensity with the glass slab", String.raw`\beta E_0^2(1+\cos(\omega*(d\sin(\theta)-(\mu-1)w)/c))`, String.raw`\beta E_0 \omega d \theta \mu w c`, "Use mu for the refractive index and w for slab thickness. c is the speed of light.", [String.raw`\beta`, "E_0", String.raw`\omega`, "d", String.raw`\mu`, "w", "c"]),
    expr("iii.3.a", "III.3.a", "Intensity after the quarter wave plate", String.raw`\beta E_0^2(1+\cos(\omega d\sin(\theta)/c)/\sqrt{2})`, String.raw`\beta E_0 \omega d \theta c`, "Use the same symbols as III.1. Include beta.", [String.raw`\beta`, "E_0", String.raw`\omega`, "d", "c"]),
    expr("iii.3.b", "III.3.b", "Maximum intensity", String.raw`\beta E_0^2(1+1/\sqrt{2})`, String.raw`\beta E_0`, "Use beta and E_0.", [String.raw`\beta`, "E_0"]),
    expr("iii.3.c", "III.3.c", "Minimum intensity", String.raw`\beta E_0^2(1-1/\sqrt{2})`, String.raw`\beta E_0`, "Use beta and E_0.", [String.raw`\beta`, "E_0"]),
    manual("iii.4.a", "III.4.a", "Vector field after polarizer I", "Write the full vector field at z=b, including the direction i-prime. Compare the projection and phase with the official solution."),
    manual("iii.4.b", "III.4.b", "Vector field after polarizer II", "Write the full vector field at z=c, including the amplitude projection cos(gamma) and the direction i. This vector response is for self-review."),
    label(expression("iii.4.c", "Relative phase", String.raw`\gamma`, String.raw`\gamma`, "Use gamma in radians. This check uses the positive-amplitude branch 0<gamma<pi/2, away from the extinguished beam at pi/2.", { positive: [String.raw`\gamma`], ranges: { [String.raw`\gamma`]: [0.05, 1.5] }, domain: "0 < gamma < pi/2. Positive-amplitude, nonzero-beam phase branch." }), "III.4.c"),
    manual("iii.5.a", "III.5.a", "Electric field on the equator", "Write the full field vector for e=0. This vector response is for self-review."),
    manual("iii.5.b", "III.5.b", "Polarization on the equator", "Name the polarization and its direction. This qualitative response is for self-review."),
    manual("iii.6.a", "III.6.a", "Electric field at the north pole", "Write the full field vector for e=pi/4. You may choose gamma=0 as in the official solution."),
    manual("iii.6.b", "III.6.b", "Polarization at the north pole", "Name the polarization. This qualitative response is for self-review."),
    manual("iii.7", "III.7", "Locate A1, A2 and A3", "Describe or sketch the points on the Poincare sphere, with their latitudes and relative longitudes. Compare with the official answer diagram."),
    label(expression("iii.8", "Spherical triangle area", String.raw`2\alpha`, String.raw`\alpha`, "Use alpha in radians. Enter the area on the unit sphere in the source's positive-area branch 0<alpha<pi/2.", { positive: [String.raw`\alpha`], ranges: { [String.raw`\alpha`]: [0.05, 1.5] }, domain: "Unit sphere, 0 < alpha < pi/2, source positive-area branch." }), "III.8"),
  ],
};
