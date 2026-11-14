import "server-only";
import { expression as e, numeric as n, type ArchiveKeyPart } from "./definitions";
const S = String.raw;
// Keys for the beginner Arena set F1, mechanics and electromagnetism. Each lettered part has one answer box.
export const keys07: Record<string, ArchiveKeyPart[]> = {
  "arena-cat-on-a-plank": [
    e("a.distance", "Distance x past the edge at tipping", S`\frac{ML}{6m}`, "M m L", "The plank is uniform and one third of it is past the edge. M, m and L are positive.", { positive: ["M", "m", "L"] }),
    n("b.distance", "Distance x for the given values", 0.75, "m"),
    e("c.mass", "Cat mass that tips the plank at its end", S`\frac{M}{2}`, "M", "Give the mass in terms of M, which is positive.", { positive: ["M"] }),
  ],
  "arena-two-sleds-one-rope": [
    e("a.distance", "Distance sled A moves", S`\frac{m_BL}{m_A+m_B}`, "m_A m_B L", "Frictionless ice and a start from rest. The masses and L are positive.", { positive: ["m_A", "m_B", "L"] }),
    e("b.speed", "Closing speed just before the sleds meet", S`\sqrt{\frac{2FL(m_A+m_B)}{m_Am_B}}`, "F L m_A m_B", "The sum of the two sled speeds. F, L and the masses are positive.", { positive: ["F", "L", "m_A", "m_B"] }),
  ],
  "arena-rough-ramp-smooth-ramp": [
    e("a.speed", "Speed of the ball’s centre on the floor", S`\sqrt{\frac{10gH}{7}}`, "g H", "Uniform solid ball that rolls without slipping. g and H are positive.", { positive: ["g", "H"] }),
    e("b.height", "Greatest height gained on the frictionless ramp", S`\frac{5H}{7}`, "H", "Height of the centre above its level on the floor. H is positive.", { positive: ["H"] }),
    n("c.fraction", "Rotational share of the starting energy", 2 / 7, "1", { canonical: S`\frac{2}{7}`, help: "Enter a number between 0 and 1, as a decimal or a fraction." }),
  ],
  "arena-hosing-the-wall": [
    e("a.tangent", "tan θ for the highest point on the wall", S`\frac{v^2}{gd}`, "v g d", "Give tan θ, not the angle. v, g and d are positive.", { positive: ["v", "g", "d"] }),
    e("b.height", "Greatest height on the wall", S`\frac{v^2}{2g}-\frac{gd^2}{2v^2}`, "v g d", "No air resistance and v² greater than gd. v, g and d are positive.", { positive: ["v", "g", "d"] }),
    n("c.height", "Greatest height for the given values", 7.5, "m"),
  ],
  "arena-the-loading-voltmeter": [
    e("a.reading", "Voltmeter reading across one resistor", S`\frac{V_0R_V}{R+2R_V}`, "V_0 R R_V", "Use V_0 for the battery voltage and R_V for the voltmeter’s resistance. All three are positive.", { positive: ["V_0", "R", "R_V"] }),
    n("b.resistance", "Voltmeter resistance", 40, S`k\Omega`),
    n("c.reading", "Reading on each of the two voltmeters", 4.5, "V"),
  ],
  "arena-the-magnetic-slab": [
    e("a.speed", "Entry speed above which the particle gets through", S`\frac{qBd}{m}`, "q B d m", "Entry at right angles to the face and to the field. q, B, d and m are positive.", { positive: ["q", "B", "d", "m"] }),
    n("b.angle", "Angle between the exit and entry velocities", 30, "degrees"),
    e("c.time", "Time spent inside the slab", S`\frac{\pi m}{6qB}`, "m q B", "For the particle of part (b). Write pi for π. m, q and B are positive.", { positive: ["m", "q", "B"] }),
  ],
  "arena-two-charges-head-on": [
    e("a.speed", "Speed of the beads at closest approach", S`\frac{v}{4}`, "v", "Bead B is free to move. v is positive.", { positive: ["v"] }),
    e("b.distance", "Closest distance between the beads", S`\frac{8kq^2}{3mv^2}`, "k q m v", "Use k for the Coulomb constant. k, q, m and v are positive.", { positive: ["k", "q", "m", "v"] }),
    e("c.speed", "Final speed of bead B", S`\frac{v}{2}`, "v", "Long after, with the beads far apart again. v is positive.", { positive: ["v"] }),
  ],
};
