import assert from "node:assert/strict";
import test from "node:test";
import { getArchiveDefinition } from "./archive-grading/catalog";
import { checkArchivePart } from "./archive-grading";
import type { ArchiveKeyPart } from "./archive-grading/definitions";
import { readExpression, SymbolTable } from "./answer-reader";
import { getEstimatedProblemElo } from "./problem-archive";
import { source07 } from "./arena/source-07";
import { source08 } from "./arena/source-08";

// The beginner Arena set F1, all 15 problems. Three kinds of test:
// 1. Shape: one answer box and three hints for each lettered part, and a statement that stands without its figure.
// 2. Check A, numerical: every key is recomputed by a simulation, a scan or a numerical solve that does not use the
//    algebra of the worked solution, and has to agree with the key.
// 3. Check B, second derivation: a form of each answer reached by a different route is typed the way a student
//    would type it and has to be marked correct by the site's own checker. The usual wrong answers have to be refused.
const seeds = [...source07, ...source08];

const part = (problem: string, id: string): ArchiveKeyPart => {
  const found = getArchiveDefinition(`arena-${problem}`)?.parts.find((item) => item.id === id);
  assert.ok(found, `${problem} ${id}`);
  return found;
};
/** The key's value: the target of a number part, or the reference expression at the given symbol values. */
function keyValue(problem: string, id: string, values: Record<string, number> = {}): number {
  const key = part(problem, id);
  if (key.kind === "numeric") return key.target;
  assert.equal(key.kind, "expression");
  if (key.kind !== "expression") return NaN;
  const names = key.symbols.map((symbol) => symbol.latex);
  for (const name of names) assert.ok(name in values, `${problem} ${id}: no value for ${name}`);
  return readExpression(key.canonical, new SymbolTable(names)).evaluate(names.map((name) => values[name]));
}
const close = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.abs(expected), `${label}: computed ${actual}, key ${expected}`);
/** The root of an increasing or decreasing function between two ends, by halving. */
function root(f: (x: number) => number, low: number, high: number): number {
  let a = low, b = high;
  const rising = f(b) > f(a);
  for (let i = 0; i < 200; i++) {
    const mid = (a + b) / 2;
    if ((f(mid) > 0) === rising) b = mid; else a = mid;
  }
  return (a + b) / 2;
}

test("shape: 15 problems, one answer box and three hints for each lettered part", () => {
  assert.equal(seeds.length, 15);
  let parts = 0;
  for (const seed of seeds) {
    const definition = getArchiveDefinition(seed.id);
    assert.ok(definition, seed.id);
    const letters = [...seed.statement.matchAll(/^## \(([a-z])\)$/gm)].map((match) => match[1]);
    assert.ok(letters.length === 2 || letters.length === 3, `${seed.id}: 2 or 3 parts`);
    assert.deepEqual([...seed.solution.matchAll(/^## \(([a-z])\)$/gm)].map((match) => match[1]), letters, `${seed.id}: solution parts`);
    assert.deepEqual(definition.parts.map((item) => item.sourcePart), letters, `${seed.id}: one answer box for each part`);
    assert.ok(definition.parts.every((item) => item.kind === "expression" || item.kind === "numeric"), seed.id);
    assert.deepEqual(Object.keys(seed.hints ?? {}), letters, `${seed.id}: hints for each part`);
    for (const letter of letters) {
      const hints = seed.hints![letter];
      assert.equal(hints.length, 3, `${seed.id} (${letter})`);
      assert.equal(new Set(hints).size, 3, `${seed.id} (${letter}): hints differ`);
    }
    assert.ok((seed.solution.match(/\\boxed\{/g) ?? []).length >= letters.length, `${seed.id}: a boxed result for each part`);
    const words = seed.title.split(/\s+/).length;
    assert.ok(words >= 2 && words <= 5, `${seed.id}: title length`);
    const rating = getEstimatedProblemElo(seed.id);
    assert.ok(rating >= 500 && rating <= 1000 && rating % 50 === 0, `${seed.id}: rating`);
    // An original Physcratic problem has no source document, so nothing can link to a PDF.
    assert.equal(seed.original, true, seed.id);
    assert.equal(seed.statementFile, undefined, seed.id);
    assert.equal(seed.solutionFile, undefined, seed.id);
    assert.ok(definition.parts.every((item) => !/\.pdf/i.test(item.sourceReference ?? "")), seed.id);
    parts += letters.length;
  }
  assert.equal(parts, 44);
  assert.deepEqual(seeds.reduce<Record<string, number>>((count, seed) => ({ ...count, [seed.topic]: (count[seed.topic] ?? 0) + 1 }), {}),
    { Mechanics: 5, Electromagnetism: 3, Thermodynamics: 2, Optics: 1, Waves: 2, "Modern physics": 2 });
});

test("shape: a statement with a figure says everything the figure shows", () => {
  const needed: Record<string, RegExp[]> = {
    "arena-cat-on-a-plank": [/One third of the plank sticks out past the edge/, /distance \$\$x\$\$ past the table’s edge/],
    "arena-the-magnetic-slab": [/slab of thickness \$\$d\$\$/, /at right angles to its face, and at right angles to the field/],
    "arena-the-rectangular-cycle": [/A:\(p_0,\\ V_0\)/, /C:\(2p_0,\\ 3V_0\)/, /A, B, C, D and back to A/],
    "arena-a-lamp-under-a-raft": [/depth \$\$h\$\$ below the flat surface/, /centre directly above the lamp/],
    "arena-walking-past-two-speakers": [/a distance \$\$d\$\$ apart/, /at right angles to the line joining the speakers/],
    "arena-round-the-funnel": [/vertical axis and its tip at the bottom/, /makes an angle \$\$\\alpha\$\$ with the axis/, /height \$\$h\$\$ above the tip/, /height \$\$4h\$\$ above the tip/],
  };
  const withFigure = seeds.filter((seed) => seed.statement.includes("!["));
  assert.deepEqual(withFigure.map((seed) => seed.id).sort(), Object.keys(needed).sort());
  for (const seed of withFigure) {
    const text = seed.statement.replace(/!\[[^\]]+\]\([^)]+\)/g, "");
    for (const pattern of needed[seed.id]) assert.match(text, pattern, seed.id);
    for (const [, alt, path] of seed.statement.matchAll(/!\[([^\]]+)\]\(([^)]+)\)/g)) {
      assert.ok(alt.length > 60, `${seed.id}: alt text describes the figure`);
      assert.match(path, /^\/corpus\/arena\/figures\/[a-z-]+\.svg$/);
    }
  }
});

test("check A: Cat on a Plank, torque balance of a plank cut into small pieces", () => {
  const tipping = (M: number, m: number, L: number) => root((x) => {
    // Torque about the table edge, positive when it tips the plank. The plank runs from -2L/3 to L/3.
    let torque = m * x;
    const pieces = 20000;
    for (let i = 0; i < pieces; i++) torque += (M / pieces) * (-2 * L / 3 + (i + 0.5) * L / pieces);
    return torque;
  }, 0, 10 * L);
  close(tipping(12, 8, 3), keyValue("cat-on-a-plank", "b.distance"), 1e-6, "b");
  close(tipping(5, 2, 1.7), keyValue("cat-on-a-plank", "a.distance", { M: 5, m: 2, L: 1.7 }), 1e-6, "a");
  const M = 7.3, L = 2.2;
  close(root((m) => tipping(M, m, L) - L / 3, 0.01 * M, 10 * M), keyValue("cat-on-a-plank", "c.mass", { M }), 1e-6, "c");
});

test("check A: Two Sleds, One Rope, stepping the two sleds forward in time", () => {
  const m_A = 60, m_B = 90, L = 12, F = 50, dt = 1e-5;
  let xA = 0, xB = L, vA = 0, vB = 0;
  while (xB - xA > 0) { vA += (F / m_A) * dt; vB -= (F / m_B) * dt; xA += vA * dt; xB += vB * dt; }
  close(xA, keyValue("two-sleds-one-rope", "a.distance", { m_A, m_B, L }), 1e-3, "a");
  close(vA - vB, keyValue("two-sleds-one-rope", "b.speed", { F, L, m_A, m_B }), 1e-3, "b");
});

test("check A: Rough Ramp, Smooth Ramp, stepping the ball with the friction force solved at each step", () => {
  const g = 9.8, H = 1.3, m = 0.4, r = 0.05, I = 0.4 * m * r * r, down = 0.5, up = 0.7, dt = 1e-6;
  // Rough ramp: m a = m g sin - f, I alpha = f r, a = alpha r. Solve the three for f numerically.
  const f = root((force) => (m * g * Math.sin(down) - force) / m - (force * r / I) * r, 0, m * g);
  let v = 0, omega = 0, dropped = 0;
  while (dropped < H) { v += ((m * g * Math.sin(down) - f) / m) * dt; omega += (f * r / I) * dt; dropped += v * Math.sin(down) * dt; }
  close(v, keyValue("rough-ramp-smooth-ramp", "a.speed", { g, H }), 1e-3, "a");
  close(omega * r, v, 1e-6, "rolls without slipping");
  // Frictionless ramp: no torque, so omega is left alone.
  let height = 0;
  while (v > 0) { v -= g * Math.sin(up) * dt; height += v * Math.sin(up) * dt; }
  close(height, keyValue("rough-ramp-smooth-ramp", "b.height", { H }), 1e-3, "b");
  close(0.5 * I * omega * omega / (m * g * H), keyValue("rough-ramp-smooth-ramp", "c.fraction"), 1e-3, "c");
});

test("check A: Hosing the Wall, scanning every aim angle", () => {
  const best = (v: number, g: number, d: number) => {
    let top = -Infinity, tangent = 0;
    for (let i = 1; i < 400000; i++) {
      const angle = (i / 400000) * (Math.PI / 2);
      const time = d / (v * Math.cos(angle));
      const y = v * Math.sin(angle) * time - 0.5 * g * time * time;
      if (y > top) { top = y; tangent = Math.tan(angle); }
    }
    return { top, tangent };
  };
  close(best(14, 9.8, 10).top, keyValue("hosing-the-wall", "c.height"), 1e-6, "c");
  const scan = best(9, 9.8, 4.5);
  close(scan.top, keyValue("hosing-the-wall", "b.height", { v: 9, g: 9.8, d: 4.5 }), 1e-6, "b");
  close(scan.tangent, keyValue("hosing-the-wall", "a.tangent", { v: 9, g: 9.8, d: 4.5 }), 1e-3, "a");
});

test("check A: The Loading Voltmeter, current balance at the middle node", () => {
  // The node between the resistors is at voltage V. Current in through the top resistor equals current out.
  const reading = (V_0: number, R: number, R_V: number, meters: 1 | 2) =>
    root((V) => (V_0 - V) / R + (meters === 2 ? (V_0 - V) / R_V : 0) - V / R - V / R_V, 0, V_0);
  close(reading(6, 3.3, 7.1, 1), keyValue("the-loading-voltmeter", "a.reading", { V_0: 6, R: 3.3, R_V: 7.1 }), 1e-9, "a");
  close(root((R_V) => reading(9, 10, R_V, 1) - 4, 1, 1000), keyValue("the-loading-voltmeter", "b.resistance"), 1e-6, "b");
  close(reading(9, 10, 40, 2), keyValue("the-loading-voltmeter", "c.reading"), 1e-9, "c");
});

test("check A: The Magnetic Slab, stepping the particle through the field", () => {
  const q = 1.6, B = 0.7, d = 0.3, m = 2.1;
  /** Follows the particle until it leaves the slab. The force q v × B turns the velocity at the rate qB/m. */
  const cross = (speed: number) => {
    const dt = 1e-5 * m / (q * B);
    let x = 0, vx = speed, vy = 0, t = 0;
    while (x >= 0 && x < d && t < 10 * m / (q * B)) {
      const turn = (q * B / m) * dt, c = Math.cos(turn), s = Math.sin(turn);
      [vx, vy] = [vx * c + vy * s, vy * c - vx * s];
      x += vx * dt; t += dt;
    }
    return { through: x >= d, angle: Math.abs(Math.atan2(vy, vx)) * 180 / Math.PI, t };
  };
  const least = root((speed) => (cross(speed).through ? 1 : -1), 0.01, 10);
  close(least, keyValue("the-magnetic-slab", "a.speed", { q, B, d, m }), 1e-3, "a");
  const fast = cross(2 * keyValue("the-magnetic-slab", "a.speed", { q, B, d, m }));
  assert.ok(fast.through);
  close(fast.angle, keyValue("the-magnetic-slab", "b.angle"), 1e-3, "b");
  close(fast.t, keyValue("the-magnetic-slab", "c.time", { m, q, B }), 1e-3, "c");
});

test("check A: Two Charges Head On, stepping both beads under the Coulomb force", () => {
  const k = 1, q = 1, m = 1, v = 1, start = 4000;
  let xA = 0, xB = start, vA = v, vB = 0, least = Infinity, common = 0;
  const push = (gap: number) => k * q * q / (gap * gap);
  while (xB - xA <= start) {
    const gap = xB - xA, dt = 2e-4 * gap;
    // Velocity Verlet.
    const f = push(gap);
    const hA = vA - (f / m) * dt / 2, hB = vB + (f / (3 * m)) * dt / 2;
    xA += hA * dt; xB += hB * dt;
    const f2 = push(xB - xA);
    vA = hA - (f2 / m) * dt / 2; vB = hB + (f2 / (3 * m)) * dt / 2;
    if (xB - xA < least) { least = xB - xA; common = (vA + vB) / 2; }
  }
  // The start is 4000 length units away and not at infinity, which costs under 0.1 percent.
  close(common, keyValue("two-charges-head-on", "a.speed", { v }), 5e-3, "a");
  close(least, keyValue("two-charges-head-on", "b.distance", { k, q, m, v }), 5e-3, "b");
  close(vB, keyValue("two-charges-head-on", "c.speed", { v }), 5e-3, "c");
  assert.ok(vA < 0, "bead A comes back");
});

test("check A: The Rectangular Cycle, adding up work and heat along the path in small steps", () => {
  const p_0 = 1.7, V_0 = 0.6;
  const corners = [[p_0, V_0], [2 * p_0, V_0], [2 * p_0, 3 * V_0], [p_0, 3 * V_0], [p_0, V_0]];
  let work = 0, heatIn = 0, heatAll = 0;
  const steps = 20000;
  for (let leg = 0; leg < 4; leg++) {
    const [p1, V1] = corners[leg], [p2, V2] = corners[leg + 1];
    for (let i = 0; i < steps; i++) {
      const pa = p1 + (p2 - p1) * i / steps, pb = p1 + (p2 - p1) * (i + 1) / steps;
      const Va = V1 + (V2 - V1) * i / steps, Vb = V1 + (V2 - V1) * (i + 1) / steps;
      const dW = 0.5 * (pa + pb) * (Vb - Va), dQ = 1.5 * (pb * Vb - pa * Va) + dW;
      work += dW; heatAll += dQ; if (dQ > 0) heatIn += dQ;
    }
  }
  close(work, keyValue("the-rectangular-cycle", "a.work", { p_0, V_0 }), 1e-9, "a");
  close(heatIn, keyValue("the-rectangular-cycle", "b.heat", { p_0, V_0 }), 1e-9, "b");
  close(work / heatIn, keyValue("the-rectangular-cycle", "c.efficiency"), 1e-9, "c");
  close(heatAll, work, 1e-9, "first law round the cycle");
});

test("check A: A Lamp Under a Raft, tracing rays with Snell’s law", () => {
  /** The widest point on the surface where a ray from the lamp still gets out. */
  const escapeRadius = (h: number, n: number) => {
    let widest = 0;
    for (let i = 0; i < 200000; i++) {
      const angle = (i / 200000) * (Math.PI / 2);
      if (n * Math.sin(angle) < 1) widest = h * Math.tan(angle);
    }
    return widest;
  };
  close(escapeRadius(2.4, 1.5), keyValue("a-lamp-under-a-raft", "a.radius", { h: 2.4, n: 1.5 }), 1e-4, "a");
  close(escapeRadius(1.5, 4 / 3), keyValue("a-lamp-under-a-raft", "b.radius"), 1e-4, "b");
  close(root((h) => escapeRadius(h, 4 / 3) - 1.0, 0.1, 3), keyValue("a-lamp-under-a-raft", "c.depth"), 1e-4, "c");
});

test("check A: Walking Past Two Speakers, adding the two waves along the walk", () => {
  const d = 3.0, wavelength = 340 / 340, wave = 2 * Math.PI / wavelength;
  const loudness = (x: number) => Math.abs(2 * Math.cos(wave * (Math.sqrt(x * x + d * d) - x) / 2));
  const quiet: number[] = [];
  const step = 1e-4;
  for (let x = step; x < 500; x += step) {
    const here = loudness(x);
    if (here < 1e-3 && here <= loudness(x - step) && here < loudness(x + step)) quiet.push(x);
  }
  assert.equal(quiet.length, keyValue("walking-past-two-speakers", "b.count"), `quiet points at ${quiet}`);
  close(quiet[quiet.length - 1], keyValue("walking-past-two-speakers", "c.distance"), 1e-4, "c");
  for (const [spacing, gap] of [[3, 0.5], [2.2, 1.3], [4.1, 0.2]]) {
    const x = keyValue("walking-past-two-speakers", "a.distance", { d: spacing, [String.raw`\Delta`]: gap });
    close(Math.sqrt(x * x + spacing * spacing) - x, gap, 1e-9, "a");
  }
});

test("check A: Two Isotopes, One Sample, stepping the decays in time", () => {
  const rate = { X: Math.LN2 / 2, Y: Math.LN2 / 6 }, dt = 1e-5;
  let X = 1, Y = 1, equal = NaN, atSix = { nuclei: NaN, activity: NaN };
  for (let step = 1; step * dt <= 6 + dt / 2; step++) {
    const before = rate.X * X - rate.Y * Y;
    X -= rate.X * X * dt; Y -= rate.Y * Y * dt;
    if (before > 0 && rate.X * X - rate.Y * Y <= 0) equal = step * dt;
    if (Math.abs(step * dt - 6) < dt / 2) atSix = { nuclei: X / Y, activity: (rate.X * X) / (rate.Y * Y) };
  }
  close(atSix.nuclei, keyValue("two-isotopes-one-sample", "a.nuclei"), 1e-3, "a");
  close(atSix.activity, keyValue("two-isotopes-one-sample", "b.activity"), 1e-3, "b");
  close(equal, keyValue("two-isotopes-one-sample", "c.time"), 1e-3, "c");
});

test("check A: Round the Funnel, stepping both balls on the cone with the equations of motion along the wall", () => {
  const g = 9.8, h = 0.3, alpha = 0.6;
  /** A ball on the cone at distance s from the tip along the wall. Returns the path after a start on a circle at this height and speed. */
  const run = (height: number, speed: number, until: (angle: number, t: number) => boolean) => {
    let s = height / Math.cos(alpha), sDot = 0, angle = 0, t = 0;
    const momentum = s * Math.sin(alpha) * speed, dt = 2e-6;
    let lowest = s, highest = s;
    while (!until(angle, t)) {
      const radius = s * Math.sin(alpha), rate = momentum / (radius * radius);
      // Along the wall: s'' = s sin²α φ'² - g cos α. Angular momentum about the axis is conserved.
      sDot += (s * Math.sin(alpha) ** 2 * rate * rate - g * Math.cos(alpha)) * dt;
      s += sDot * dt; angle += rate * dt; t += dt;
      lowest = Math.min(lowest, s); highest = Math.max(highest, s);
    }
    return { t, wobble: (highest - lowest) / s };
  };
  const speed = keyValue("round-the-funnel", "a.speed", { g, h });
  const lower = run(h, speed, (angle) => angle >= 2 * Math.PI);
  assert.ok(lower.wobble < 1e-4, `the key speed keeps the ball on its circle (${lower.wobble})`);
  assert.ok(run(h, 1.05 * speed, (angle) => angle >= 2 * Math.PI).wobble > 0.05, "a different speed does not");
  const upper = run(4 * h, keyValue("round-the-funnel", "a.speed", { g, h: 4 * h }), (angle) => angle >= 2 * Math.PI);
  assert.ok(upper.wobble < 1e-4);
  close(upper.t / lower.t, keyValue("round-the-funnel", "b.ratio"), 1e-3, "b");
  // The lower ball has gained one full turn when its angle leads by 2π.
  const rateLower = 2 * Math.PI / lower.t, rateUpper = 2 * Math.PI / upper.t;
  close(root((t) => (rateLower - rateUpper) * t - 2 * Math.PI, 0, 100), keyValue("round-the-funnel", "c.time", { h, g, [String.raw`\alpha`]: alpha }), 1e-3, "c");
});

test("check A: Ice in the Flask, passing heat from the warm side to the cold side one joule at a time", () => {
  /** Returns the ice left in grams. The cold body is the ice and later its meltwater. The warm body is the water and the flask. */
  const iceLeft = (start: number, iceMass: number) => {
    const warmCapacity = 0.250 * 4200 + 280, dq = 0.5;
    let warm = start, cold = -20, melted = 0;
    while (warm > cold) {
      warm -= dq / warmCapacity;
      if (cold < 0) cold = Math.min(0, cold + dq / (iceMass * 2100));
      else if (melted < iceMass) melted = Math.min(iceMass, melted + dq / 3.36e5);
      else cold += dq / (iceMass * 4200);
    }
    return (iceMass - melted) * 1000;
  };
  close(iceLeft(30, 0.150), keyValue("ice-in-the-flask", "a.mass"), 1e-3, "a");
  close(root((start) => (iceLeft(start, 0.150) > 1e-6 ? -1 : 1), 30, 90), keyValue("ice-in-the-flask", "b.temperature"), 1e-3, "b");
  close(1000 * root((mass) => (iceLeft(30, mass) > 1e-6 ? 1 : -1), 0.01, 0.150), keyValue("ice-in-the-flask", "c.mass"), 1e-3, "c");
});

test("check A: The Unknown Pipe, trying every harmonic pair for both kinds of pipe", () => {
  const fits: { kind: string; fundamental: number }[] = [];
  for (const kind of ["open", "closed"] as const) {
    const allowed = (n: number) => kind === "open" || n % 2 === 1;
    for (let low = 1; low <= 60; low++) {
      if (!allowed(low)) continue;
      const fundamental = 255 / low, high = 595 / fundamental;
      if (Math.abs(high - Math.round(high)) > 1e-9 || !allowed(Math.round(high))) continue;
      let between = 0;
      for (let n = low + 1; n < Math.round(high); n++) if (allowed(n)) between++;
      if (between === 1) fits.push({ kind, fundamental });
    }
  }
  assert.deepEqual(fits, [{ kind: "closed", fundamental: 85 }]);
  close(fits[0].fundamental, keyValue("the-unknown-pipe", "a.fundamental"), 1e-9, "a");
  // Closed at one end: pressure node at the open end and antinode at the cap, so cos(2π f L / v) = 0. Shortest pipe.
  let length = 0;
  for (let L = 1e-5; L < 5; L += 1e-5) if (Math.cos(2 * Math.PI * 85 * L / 340) <= 0) { length = L; break; }
  close(length, keyValue("the-unknown-pipe", "b.length"), 1e-4, "b");
  // Open at both ends: sin(2π f L / v) = 0. Lowest frequency above zero.
  let lowest = 0;
  for (let f = 1; f < 1000; f += 0.001) if (Math.sin(2 * Math.PI * f * length / 340) <= 0) { lowest = f; break; }
  close(lowest, keyValue("the-unknown-pipe", "c.fundamental"), 1e-4, "c");
});

test("check A: Two Colours, One Cathode, solving for the work function numerically", () => {
  /** Speed ratio of the fastest electrons, second light over first, for a trial work function. Energies in eV. */
  const speedRatio = (work: number, stop: number) => {
    const firstPhoton = work + stop, secondPhoton = firstPhoton / (3 / 5);
    return Math.sqrt((secondPhoton - work) / (firstPhoton - work));
  };
  const work = root((trial) => speedRatio(trial, 0.60) - 2, 0.01, 20);
  close(work, keyValue("two-colours-one-cathode", "b.work"), 1e-6, "b");
  close(1240 / (work + 0.60), keyValue("two-colours-one-cathode", "c.wavelength"), 1e-6, "c");
  const e = 1.7, V_1 = 0.9;
  close(root((trial) => speedRatio(trial, e * V_1) - 2, 0.01, 50), keyValue("two-colours-one-cathode", "a.work", { e, V_1 }), 1e-6, "a");
  // The statement says the second light has the shorter wavelength and gives the faster electrons.
  const statement = seeds.find((seed) => seed.id === "arena-two-colours-one-cathode")!.statement;
  assert.match(statement, /The second light has the shorter wavelength/);
  assert.match(statement, /it gives the faster electrons/);
  assert.ok(1240 / (work + 0.60) * 3 / 5 < 1240 / (work + 0.60) && speedRatio(work, 0.60) > 1);
});

// Check B. `right` holds forms from a second route (energy where the solution used forces, a ratio where it used a
// formula, and so on) and other ways a student may type the answer. `wrong` holds the usual mistakes.
const S = String.raw;
const secondRoute: Record<string, Record<string, { right: string[]; wrong: string[] }>> = {
  "cat-on-a-plank": {
    "a.distance": { right: [S`\frac{M}{m}(\frac{L}{2}-\frac{L}{3})`, "M*L/(6*m)"], wrong: [S`\frac{ML}{2m}`, S`\frac{ML}{3m}`, S`\frac{mL}{6M}`] },
    "b.distance": { right: ["0.75", S`\frac{3}{4}`, ".75"], wrong: ["1.0", "0.5", "1.5"] },
    "c.mass": { right: ["0.5M", "M/2"], wrong: ["M", "2M", S`\frac{M}{3}`] },
  },
  "two-sleds-one-rope": {
    "a.distance": { right: [S`L-\frac{m_AL}{m_A+m_B}`, S`\frac{L}{1+m_A/m_B}`], wrong: [S`\frac{m_AL}{m_A+m_B}`, S`\frac{L}{2}`] },
    "b.speed": { right: [S`\sqrt{\frac{2FL}{m_A}+\frac{2FL}{m_B}}`, S`\sqrt{2FL(\frac{1}{m_A}+\frac{1}{m_B})}`], wrong: [S`\sqrt{\frac{2FL}{m_A+m_B}}`, S`\sqrt{\frac{FL(m_A+m_B)}{m_Am_B}}`] },
  },
  "rough-ramp-smooth-ramp": {
    "a.speed": { right: [S`\sqrt{\frac{2gH}{1+\frac{2}{5}}}`, S`\sqrt{10gH/7}`], wrong: [S`\sqrt{2gH}`, S`\sqrt{\frac{7gH}{10}}`] },
    "b.height": { right: [S`\frac{H}{1+\frac{2}{5}}`, S`H-\frac{2H}{7}`], wrong: ["H", S`\frac{2H}{7}`, S`\frac{7H}{10}`] },
    "c.fraction": { right: ["0.2857", S`\frac{2}{7}`, "2/7"], wrong: ["0.4", "0.714", "0"] },
  },
  "hosing-the-wall": {
    "a.tangent": { right: [S`\frac{v^2}{dg}`, "v^2/(g*d)"], wrong: ["1", S`\frac{gd}{v^2}`, S`\frac{v^2}{2gd}`] },
    "b.height": { right: [S`\frac{v^4-g^2d^2}{2gv^2}`, S`\frac{1}{2}(\frac{v^2}{g}-\frac{gd^2}{v^2})`], wrong: [S`\frac{v^2}{2g}`, S`\frac{v^2}{2g}-\frac{gd^2}{v^2}`, S`\frac{v^2}{g}-\frac{gd^2}{2v^2}`] },
    "c.height": { right: ["7.5", "7.50"], wrong: ["10", "5", "2.5"] },
  },
  "the-loading-voltmeter": {
    "a.reading": { right: [S`\frac{V_0}{2+\frac{R}{R_V}}`, S`V_0\frac{\frac{RR_V}{R+R_V}}{R+\frac{RR_V}{R+R_V}}`], wrong: [S`\frac{V_0}{2}`, S`\frac{V_0R_V}{R+R_V}`, S`\frac{V_0R}{R+2R_V}`] },
    "b.resistance": { right: ["40", "40.0"], wrong: ["80", "8", "4"] },
    "c.reading": { right: ["4.5", "4.50"], wrong: ["4.0", "9.0", "3.6"] },
  },
  "the-magnetic-slab": {
    "a.speed": { right: [S`\frac{dqB}{m}`, "q*B*d/m"], wrong: [S`\frac{2qBd}{m}`, S`\frac{qBd}{2m}`, S`\frac{m}{qBd}`] },
    "b.angle": { right: ["30", "30.0"], wrong: ["60", "45", "0.5236"] },
    "c.time": { right: [S`\frac{\pi}{6}\cdot\frac{m}{qB}`, "pi*m/(6*q*B)"], wrong: [S`\frac{\pi m}{3qB}`, S`\frac{30m}{qB}`, S`\frac{2\pi m}{qB}`] },
  },
  "two-charges-head-on": {
    "a.speed": { right: ["0.25v", S`\frac{v}{4}`], wrong: ["0", S`\frac{v}{2}`, S`\frac{v}{3}`] },
    "b.distance": { right: [S`\frac{kq^2}{\frac{3}{8}mv^2}`, "8*k*q^2/(3*m*v^2)"], wrong: [S`\frac{2kq^2}{mv^2}`, S`\frac{8kq^2}{mv^2}`, S`\frac{3kq^2}{8mv^2}`] },
    "c.speed": { right: ["0.5v", S`\frac{2v}{1+3}`], wrong: [S`\frac{v}{4}`, "v", S`\frac{v}{3}`] },
  },
  "the-rectangular-cycle": {
    "a.work": { right: [S`2p_0\cdot2V_0-p_0\cdot2V_0`, S`(2p_0-p_0)(3V_0-V_0)`], wrong: [S`4p_0V_0`, S`p_0V_0`, S`6p_0V_0`] },
    "b.heat": { right: [S`\frac{3}{2}p_0V_0+10p_0V_0`, S`11.5p_0V_0`], wrong: [S`2p_0V_0`, S`10p_0V_0`, S`\frac{19}{2}p_0V_0`] },
    "c.efficiency": { right: ["0.174", S`\frac{4}{23}`, "4/23"], wrong: ["1", "0.2", "0.5", "17.4"] },
  },
  "a-lamp-under-a-raft": {
    "a.radius": { right: [S`h\tan(\arcsin(\frac{1}{n}))`, S`\frac{h}{n\sqrt{1-\frac{1}{n^2}}}`], wrong: [S`\frac{h}{n}`, S`h\sqrt{n^2-1}`, S`\frac{h}{\sqrt{n^2+1}}`] },
    "b.radius": { right: ["1.70", "1.7"], wrong: ["1.13", "1.32", "2.0"] },
    "c.depth": { right: ["0.88", "0.882"], wrong: ["1.13", "0.75", "1.0"] },
  },
  "walking-past-two-speakers": {
    "a.distance": { right: [S`\frac{d^2}{2\Delta}-\frac{\Delta}{2}`, S`\frac{(d-\Delta)(d+\Delta)}{2\Delta}`], wrong: [S`\sqrt{d^2-\Delta^2}`, S`\frac{d^2-\Delta^2}{\Delta}`, S`\frac{d^2+\Delta^2}{2\Delta}`] },
    "b.count": { right: ["3", "3.0"], wrong: ["2", "4", "6", "3.01"] },
    "c.distance": { right: ["8.75"], wrong: ["0.55", "2.25", "4.0", "9.0"] },
  },
  "round-the-funnel": {
    "a.speed": { right: [S`\sqrt{hg}`, S`(gh)^{1/2}`], wrong: [S`\sqrt{2gh}`, S`\sqrt{\frac{g}{h}}`, "gh"] },
    "b.ratio": { right: ["2", "2.0"], wrong: ["4", "0.5", "1.41"] },
    "c.time": { right: [S`2\cdot2\pi\tan(\alpha)\sqrt{\frac{h}{g}}`, S`\frac{4\pi h\tan(\alpha)}{\sqrt{gh}}`], wrong: [S`2\pi\tan(\alpha)\sqrt{\frac{h}{g}}`, S`4\pi\sqrt{\frac{h}{g}}`, S`\frac{4\pi\tan(\alpha)}{3}\sqrt{\frac{h}{g}}`] },
  },
  "ice-in-the-flask": {
    "a.mass": { right: ["50", "50.0"], wrong: ["0", "75", "100", "150"] },
    "b.temperature": { right: ["42.6", "42.63"], wrong: ["54", "37.9", "30"] },
    "c.mass": { right: ["106", "105.6"], wrong: ["119", "100", "150"] },
  },
  "the-unknown-pipe": {
    "a.fundamental": { right: ["85", "85.0"], wrong: ["170", "340", "42.5"] },
    "b.length": { right: ["1.00", "1"], wrong: ["2.0", "0.5", "4"] },
    "c.fundamental": { right: ["170", "170.0"], wrong: ["85", "340", "255"] },
  },
  "two-colours-one-cathode": {
    "a.work": { right: [S`3.5eV_1`, S`\frac{7eV_1}{2}`], wrong: [S`\frac{1}{2}eV_1`, S`2eV_1`, S`4eV_1`, S`\frac{7}{2}V_1`] },
    "b.work": { right: ["2.10", "2.1"], wrong: ["0.30", "1.20", "2.70"] },
    "c.wavelength": { right: ["459", "459.3"], wrong: ["276", "590", "1033"] },
  },
  "two-isotopes-one-sample": {
    "a.nuclei": { right: ["0.25", S`\frac{1}{4}`, "1/4"], wrong: ["4", "0.5", "0.75"] },
    "b.activity": { right: ["0.75", S`\frac{3}{4}`], wrong: ["0.25", "3", "1.33"] },
    "c.time": { right: ["4.75", "4.755", "4.76"], wrong: ["6", "3", "4.0", "5.0"] },
  },
};

test("check B: a second route to each answer is marked correct and the usual mistakes are refused", () => {
  let parts = 0;
  for (const [problem, forms] of Object.entries(secondRoute)) {
    const definition = getArchiveDefinition(`arena-${problem}`);
    assert.ok(definition, problem);
    assert.deepEqual(Object.keys(forms), definition.parts.map((item) => item.id), problem);
    for (const [id, { right, wrong }] of Object.entries(forms)) {
      const key = part(problem, id);
      for (const answer of right) assert.equal(checkArchivePart(key, answer, definition.problemId).status, "correct", `${problem} ${id}: ${answer}`);
      for (const answer of wrong) assert.equal(checkArchivePart(key, answer, definition.problemId).status, "incorrect", `${problem} ${id}: ${answer}`);
      parts++;
    }
  }
  assert.equal(parts, 44);
  assert.equal(Object.keys(secondRoute).length, seeds.length);
});
