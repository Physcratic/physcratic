import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { batchTwoParts } from "./olympiad/keys-batch-2";
import { checkArchivePart } from "./archive-grading";
import { readExpression, SymbolTable } from "./answer-reader";
import figures from "../docs/engineering/native-archive-batch-2-figures.json";
const part = (id: string, key: string) => batchTwoParts[id].find(p => p.id === key)!;
const value = (id: string, key: string, inputs: Record<string, number>) => {
  const p = part(id, key);
  if (p.kind === "numeric") return p.target;
  if (p.kind !== "expression") throw Error("Expected automatic field");
  return readExpression(p.canonical, new SymbolTable(p.symbols.map(s => s.latex))).evaluate(p.symbols.map(s => inputs[s.latex]));
};
test("thermal area balance, relaxation and graph-reading estimates match accepted ranges", () => {
  const meltArea = 5, freezeArea = 4, c = 4.2, latentHeat = 334;
  assert.equal(checkArchivePart(part("eupho-2019-t1", "a"), String(freezeArea / meltArea)).status, "correct");
  for (const wrong of ["80", "0.2", "1.25"]) assert.notEqual(checkArchivePart(part("eupho-2019-t1", "a"), wrong).status, "correct");
  const relaxationKm = c * meltArea / latentHeat;
  const lagOnly = 8 - 2 * relaxationKm;
  const withDissipation = lagOnly + 9.8 * meltArea * 1000 / (latentHeat * 1000);
  for (const x of [7.9, 8, lagOnly, withDissipation]) assert.equal(checkArchivePart(part("eupho-2019-t1", "b"), String(x)).status, "correct", String(x));
  for (const x of [0, 4, 7.5, 8.5]) assert.notEqual(checkArchivePart(part("eupho-2019-t1", "b"), String(x)).status, "correct");
  const plottedX = 10.8, plottedY = 3.3;
  const measuredSpeed = Math.sqrt(9.8 * (plottedY + Math.hypot(plottedX, plottedY)));
  assert.equal(checkArchivePart(part("eupho-2019-t3", "speed"), String(measuredSpeed)).status, "correct");
  for (const x of [Math.sqrt(2 * 9.8 * 4.9), 6, 14]) assert.notEqual(checkArchivePart(part("eupho-2019-t3", "speed"), String(x)).status, "correct");
});
test("volume-sampled charge forces and torque independently reproduce circular-path keys", () => {
  const m = 2.3, radius = 1.7, charge = 1.2, field = 0.8, speed = 3.1;
  let count = 0, totalForce = 0, torqueX = 0;
  const n = 35;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++) {
    const x = i / n * radius, y = j / n * radius, z = k / n * radius;
    if (x*x + y*y + z*z > radius*radius) continue;
    const forceY = -(speed + speed/radius * z) * field;
    totalForce += forceY;
    torqueX -= z * forceY;
    count++;
  }
  totalForce *= charge / count; torqueX *= charge / count;
  // Translate and rotate the ball together, with static contact velocity zero.
  const measuredOmega = (-totalForce + torqueX/radius) / (1.4*m*speed);
  const inputs = { m, v_0: speed, Q: charge, B: field };
  assert.ok(Math.abs(value("eupho-2019-t2", "omega", inputs) / measuredOmega - 1) < 0.001);
  assert.ok(Math.abs(value("eupho-2019-t2", "radius", inputs) / (speed/measuredOmega) - 1) < 0.001);
  assert.equal(value("eupho-2019-t2", "speed", inputs), speed);
});
test("time-averaged vector fields independently reproduce all five intensity keys", () => {
  const id = "apho-2012-t3";
  const beta = 1.3, amplitude = 2.1;
  for (const theta of [-0.7, 0.2, 0.9]) {
    const omega = 1.9, d = 2.3, c = 3.2, mu = 1.4, w = 0.8;
    const phase = omega*d*Math.sin(theta)/c, extra = omega*(mu-1)*w/c;
    const inputs = { [String.raw`\beta`]: beta, E_0: amplitude, [String.raw`\omega`]: omega, d, [String.raw`\theta`]: theta, c, [String.raw`\mu`]: mu, w };
    const average = (circular: boolean, a: number, b: number) => {
      let sum = 0;
      for (let i = 0; i < 2048; i++) {
        const t = 2*Math.PI*i/2048;
        const firstX = amplitude*Math.cos(t+a)/(circular ? Math.sqrt(2) : 1);
        const firstY = circular ? amplitude*Math.sin(t+a)/Math.sqrt(2) : 0;
        const secondX = amplitude*Math.cos(t+b);
        sum += beta*((firstX+secondX)**2+firstY**2);
      }
      return sum / 2048;
    };
    const close = (key: string, expected: number) => assert.ok(Math.abs(value(id, key, inputs)-expected) < 1e-10, key);
    close("iii.1", average(false, 0, phase));
    close("iii.2", average(false, extra, phase));
    close("iii.3.a", average(true, 0, phase));
    close("iii.3.b", average(true, 0, 0));
    close("iii.3.c", average(true, 0, Math.PI));
  }
});
test("positive-amplitude phase and spherical triangle area agree on the declared branch", () => {
  for (const gamma of [0.1, 0.6, 1.4]) {
    const projectedReal = Math.cos(gamma)*Math.cos(gamma)/Math.sqrt(2);
    const projectedImaginary = -Math.cos(gamma)*Math.sin(gamma)/Math.sqrt(2);
    const phaseLag = -Math.atan2(projectedImaginary, projectedReal);
    const area = 2*Math.atan2(Math.abs(Math.sin(2*gamma)), 1+Math.cos(2*gamma));
    assert.ok(Math.abs(value("apho-2012-t3", "iii.4.c", { [String.raw`\gamma`]: gamma })-phaseLag) < 1e-12);
    assert.ok(Math.abs(value("apho-2012-t3", "iii.8", { [String.raw`\alpha`]: phaseLag })-area) < 1e-12);
  }
  assert.equal(batchTwoParts["apho-2012-t3"].filter(p => p.kind === "self-review").length, 7);
});
test("alternate algebra passes and plausible physical mistakes are refused", () => {
  const cases = [
    ["eupho-2019-t2", "radius", String.raw`m*v_0/(Q*B)*(1+1/6)`, String.raw`m*v_0/(Q*B)`],
    ["eupho-2019-t2", "omega", String.raw`Q*B/(m*(7/6))`, String.raw`5Q*B/(7m)`],
    ["apho-2012-t3", "iii.1", String.raw`2\beta E_0^2\cos(\omega*d*\sin(\theta)/(2c))^2`, String.raw`\beta E_0^2(1+\cos(\omega*d*\theta/c))`],
    ["apho-2012-t3", "iii.2", String.raw`2\beta E_0^2\cos(\omega*(d*\sin(\theta)-(\mu-1)*w)/(2c))^2`, String.raw`\beta E_0^2(1+\cos(\omega*(d*\sin(\theta)+(\mu-1)*w)/c))`],
    ["apho-2012-t3", "iii.3.a", String.raw`\beta E_0^2*(1+\sqrt{2}*\cos(\omega*d*\sin(\theta)/c)/2)`, String.raw`\beta E_0^2*(1+\cos(\omega*d*\sin(\theta)/c)/2)`],
    ["apho-2012-t3", "iii.8", String.raw`\alpha+\alpha`, String.raw`\alpha/2`],
  ];
  for (const [id, key, equal, wrong] of cases) {
    assert.equal(checkArchivePart(part(id, key), equal, id).status, "correct", id+"/"+key);
    assert.notEqual(checkArchivePart(part(id, key), wrong, id).status, "correct", id+"/"+key);
  }
});
test("every batch-two diagram matches its original PDF crop ledger", () => {
  assert.equal(figures.length, 10);
  for (const figure of figures) {
    const digest = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
    assert.equal(digest("public"+figure.asset), figure.assetSha256);
    assert.equal(digest(figure.source), figure.sourceSha256);
    assert.ok(figure.page >= 1 && figure.crop[2] > figure.crop[0] && figure.crop[3] > figure.crop[1]);
  }
});
test("EuPhO 2019 shared papers are split without other problems leaking into each reader", () => {
  const index = JSON.parse(readFileSync("lib/corpus/import-index.json", "utf8"));
  const get = (id: string) => JSON.parse(readFileSync("public"+index.problems.find((p: {id: string}) => p.id === id).path, "utf8"));
  const unwanted = [/Motion of a charged ball|Water hose/, /Ice pellets|Water hose/, /Ice pellets|Motion of a charged ball/];
  for (const [i, id] of ["eupho-2019-t1", "eupho-2019-t2", "eupho-2019-t3"].entries()) {
    for (const kind of ["statement", "solution"]) assert.doesNotMatch(get(id)[kind].text, unwanted[i]);
  }
  assert.equal(get("apho-2012-t3").statement.nodes.filter((n: {tag?: string})=>n.tag==="h3").length, 8);
  assert.match(get("apho-2012-t3").solution.text, /signed amplitude/);
  assert.match(get("apho-2012-t3").solution.text, /not exact as printed/);
});
