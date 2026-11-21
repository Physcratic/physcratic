import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { olympiadDefinitions } from "./olympiad/keys";
import { checkArchivePart } from "./archive-grading";
import review from "../docs/engineering/native-archive-physics-review.json";

const digest = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const part = (id: string, field: string) => olympiadDefinitions.find(d => d.problemId === id)!.parts.find(p => p.id === field)!;
const record = (id: string) => JSON.parse(readFileSync(`public/corpus/english-problems/${id}.json`, "utf8"));
const close = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) < tol, `${a} versus ${b}`);

test("the review binds all 112 current records, every original PDF and exactly fourteen corrections", () => {
  const records = JSON.parse(readFileSync("public/corpus/collection.json", "utf8")).problems;
  assert.equal(records.length, 112);
  assert.equal(review.records.length, 112);
  assert.equal(new Set(review.records.map(r => r.id)).size, 112);
  assert.equal(review.records.filter(r => r.changed).length, 14);
  for (const r of records) {
    const item = review.records.find(q => q.id === r.id)!;
    assert.ok(item.focus.length > 25, r.id);
    assert.equal(digest(JSON.stringify(r)), item.after, r.id);
    assert.equal(item.changed, item.before !== item.after);
    for (const original of item.originals) assert.equal(digest(readFileSync("public" + original.path)), original.sha256);
  }
});

test("integrating incident relative Maxwellian speed rejects the source's disk-flux ratios", () => {
  const flux = (u: number) => {
    const n = 40000, dx = (12 - u) / n;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const v = u + (i + .5) * dx;
      s += (v - u) * Math.exp(-v * v / 2) / Math.sqrt(2 * Math.PI) * dx;
    }
    return s;
  };
  close(flux(2) / flux(0), .0212830353, 1e-8);
  close(flux(3) / flux(0), .00095791893, 1e-9);
});

test("direct Rayleigh-Plesset integration rebounds before the formal vacuum-growth asymptote", () => {
  const rho = 997, sigma = .0728, pv = 2340, r0 = 1e-5, gamma = 1.4;
  const q0 = 101000 - pv + 2 * sigma / r0;
  const deriv = ([r, v]: number[]) => [v, ((pv + q0 * (r0 / r) ** (3 * gamma) - 2 * sigma / r) / rho - 1.5 * v * v) / r];
  let state = [r0, 0], t = 0;
  const dt = 2e-9;
  for (let i = 0; i < 50000; i++) {
    const a = deriv(state), b = deriv(state.map((v, j) => v + dt * a[j] / 2));
    const c = deriv(state.map((v, j) => v + dt * b[j] / 2));
    const d = deriv(state.map((v, j) => v + dt * c[j]));
    state = state.map((v, j) => v + dt * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6);
    t += dt;
    if (state[1] < 0) break;
  }
  close(state[0] / r0, 5.2684645118, 1e-7);
  close(t, 7.061214e-5, dt * 2);
  // The formal R -> infinity velocity exists algebraically but is not dynamically reachable.
  close(Math.sqrt(2 * pv / (3 * rho)), 1.25, .002);
  const field = part("apho-2023-t3", "b.2");
  assert.equal(field.kind, "self-review");
  assert.equal(checkArchivePart(field, "1.25").status, "self-review");
  assert.match(record("apho-2023-t3").solution.text, /5\.26846/);
});

test("the ozone threshold minimizes kinetic energy over a nonnegative outgoing momentum", () => {
  // Normalize mc^2 = hbar = c = 1 and keep a small but well-resolved recoil energy.
  const delta = .02;
  for (const theta of [0, Math.PI / 6, Math.PI / 2, 2 * Math.PI / 3, Math.PI]) {
    const a = 3 - 2 * Math.max(0, Math.cos(theta)) ** 2;
    const energy = 2 * delta / (1 + Math.sqrt(1 - 2 * a * delta / 3));
    const momentum = Math.max(0, 2 * energy * Math.cos(theta) / 3);
    const kinetic = momentum ** 2 / 4 + (energy ** 2 + momentum ** 2 - 2 * energy * momentum * Math.cos(theta)) / 2;
    close(delta + kinetic, energy, 1e-14);
    const lower = energy - 1e-7;
    const pLower = Math.max(0, 2 * lower * Math.cos(theta) / 3);
    assert.ok(delta + pLower ** 2 / 4 + (lower ** 2 + pLower ** 2 - 2 * lower * pLower * Math.cos(theta)) / 2 > lower);
  }
  const text = record("ipho-2026-t1").solution.text;
  assert.ok(text.includes(String.raw`\frac{2\Delta U}{3mc^2}`));
  assert.ok(text.includes(String.raw`4ke^2(15\hbar)^2`));
  assert.match(text, /nonnegative.*16\.60/);
  assert.match(text, /strictly above that infimum/);
  assert.ok(!text.includes(String.raw`\frac{1}{2}\times\frac{p_\gamma^2\sin^2(\theta)}{3m}`));
});

test("a reflected-ray finite difference checks the corrected 2026 caustic slope expansion", () => {
  const cot = (x: number) => 1 / Math.tan(x), theta = .4, eps = 1e-6;
  const slope = (cot(2 * (theta + eps)) - cot(2 * (theta - eps))) / (2 * eps);
  close(slope, -2 * (1 + cot(2 * theta) ** 2), 1e-9);
  const text = record("ipho-2026-t2").solution.text;
  assert.ok(text.includes(String.raw`1+\cot^2(2\theta)`));
  assert.ok(!record("ipho-2026-t2").solution.nodes.some((n: {children?: {text?: string}[]}) => n.children?.some(c => c.text?.startsWith("$$") && c.text.includes(String.raw`1-\tan^2(2\Delta\theta)`))));
});

test("nonunique equation and diffraction estimates require self-review with new key versions", () => {
  for (const [id, field] of [["ipho-2024-t1", "a-3"], ["ipho-2022-t2", "a.2"], ["apho-2023-t3", "b.2"]]) {
    assert.equal(part(id, field).kind, "self-review");
    assert.equal(olympiadDefinitions.find(d => d.problemId === id)!.keyVersion, 2);
  }
  const diameter = 2 * Math.sqrt(25 / Math.PI);
  close(2.44 * 800e-9 * 130 / diameter * 1e6, 45, .1);
  close(2 * 800e-9 * 130 / diameter * 1e6, 36.9, .1);
});
