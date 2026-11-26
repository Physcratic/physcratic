import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { batchSevenParts } from "./olympiad/keys-batch-7";
import { olympiadDefinitions } from "./olympiad/keys";
import { checkArchivePart } from "./archive-grading";
import { publicArchiveMetadata } from "./archive-grading/catalog";
import sources from "../docs/engineering/native-archive-batch-7-sources.json";
import figures from "../docs/engineering/native-archive-batch-7-figures.json";
const t = String.raw;
const part = (id: string, field: string) => {
  const found = batchSevenParts[id]?.find(p => p.id === field);
  assert.ok(found, `${id}/${field}`);
  return found;
};
const correct = (id: string, field: string, answer: string | number) => assert.equal(checkArchivePart(part(id, field), typeof answer === "number" ? answer.toExponential(14) : answer, id).status, "correct", `${id}/${field}: ${answer}`);

test("batch seven adds exactly twenty source-backed problems with private keys", () => {
  assert.equal(Object.keys(batchSevenParts).length, 20);
  assert.equal(sources.length, 40);
  for (const id of Object.keys(batchSevenParts)) {
    assert.equal(sources.filter(s => s.id === id).length, 2);
    const definition = olympiadDefinitions.find(d => d.problemId === id)!;
    assert.equal(new Set(definition.parts.map(p => p.sourcePart)).size, definition.parts.length);
    const publicParts = JSON.stringify(publicArchiveMetadata(definition));
    assert.doesNotMatch(publicParts, /"(?:canonical|target|alternatives|wrong|policy)"\s*:/);
    assert.ok(definition.parts.some(p => p.kind !== "self-review"));
    assert.equal(part(id, "working").kind, "self-review");
  }
});

test("all retained PDFs and original figure crops match their provenance", () => {
  for (const source of sources) assert.equal(createHash("sha256").update(readFileSync("public" + source.originalPdf)).digest("hex"), source.originalSha256);
  assert.equal(figures.length, 48);
  for (const image of figures) {
    assert.equal(createHash("sha256").update(readFileSync("public" + image.source)).digest("hex"), image.sourceSha256);
    assert.equal(createHash("sha256").update(readFileSync("public" + image.path)).digest("hex"), image.sha256);
    const [left, top, right, bottom] = image.crop;
    assert.ok(left >= 0 && top >= 0 && right <= image.renderSize[0] && bottom <= image.renderSize[1] && right > left && bottom > top);
  }
});

test("independent expressions for every new problem reject physical mistakes", () => {
  const cases = [
    ["ipho-2004-t3", "c", t`c_1*c_2*V_R^2/(2*b*omega_0)`, t`c_1*c_2*V_R^2/(b*omega_0)`],
    ["ipho-2007-t2", "1.1", t`(Q/A)^2*A/(2*epsilon_0)`, t`Q^2/(epsilon_0*A)`],
    ["ipho-2008-t2", "5.1", t`M*c^2*(n/sqrt(n^2-1)-1)`, t`M*c^2/sqrt(n^2-1)`],
    ["ipho-2009-t2", "5a", t`-v*q*hbar`, t`-hbar*q*v/2`],
    ["ipho-2011-t1", "1.3", t`omega_0*sqrt(1.75)`, t`omega_0*sqrt(3)/2`],
    ["ipho-2013-t3", "3.2a", t`-g*rho_i`, t`g*rho_i`],
    ["ipho-2016-t2", "b2", "6.12", "0.00000612"],
    ["ipho-2018-t1", "b.3", t`mu^{3/5}*M^{2/5}`, t`mu^{2/5}*M^{3/5}`],
    ["ipho-2018-t2", "a.2", "330", "660"],
    ["ipho-2018-t3", "b.1", t`(1+mu-sqrt((1+mu)^2-4*mu*(1-kappa)))/(2*(1-kappa))`, t`mu/(1+mu)`],
    ["ipho-2019-t2", "a.7", t`pi*f*B_0*(b-a)*(b+a)/4`, t`pi*f*B_0*(b-a)^2/4`],
    ["ipho-2021-t1", "b.2", t`E/(2*pi*z_0*(1+(x/(2*z_0))^2))`, t`E/(pi*(4*z_0^2+x^2))`],
    ["ipho-2021-t3", "a.3", t`h*c/(3*h^2/(8*m*L^2))`, t`8*m*c*L^2/h`],
    ["apho-2009-t1", "1.8", t`sqrt(33*g*(R-r)/R^2)`, t`sqrt(24*g*(R-r))/R`],
    ["apho-2013-t3", "b.3", t`sqrt((gamma*B_0-omega)^2+(gamma*b)^2)`, t`gamma*(B_0-omega/gamma+b)`],
    ["apho-2018-t1", "6.1", t`-(omega_0^2-omega^2)/(2*gamma*omega*(omega/omega_0)^2)`, t`-(omega_0^2-omega^2)/(2*gamma*omega)`],
    ["apho-2019-t1", "c.1", t`(1-Z_0/Z_1)/(1+Z_0/Z_1)`, t`(Z_0-Z_1)/(Z_0+Z_1)`],
    ["apho-2019-t2", "c.1", t`e*B/(m*gamma)`, t`e*B*0.5/(m*gamma)`],
    ["apho-2019-t3", "a.6", t`R*alpha*F_y*sin(theta)`, t`-R*alpha*F_y*sin(theta)`],
    ["apho-2025-t1", "e.1", t`1/(1+M_M*d_S^3/(M_S*d_M^3))`, t`1+M_M*d_S^3/(M_S*d_M^3)`],
  ];
  for (const [id, field, equivalent, wrong] of cases) {
    correct(id, field, equivalent);
    assert.notEqual(checkArchivePart(part(id, field), wrong, id).status, "correct", `${id}/${field} must reject ${wrong}`);
  }
});

test("numerical results follow source inputs rather than extraction order", () => {
  const omega0 = Math.sqrt(1 / 1e-12);
  correct("ipho-2004-t3", "d", (1e3 * 1e-12) / omega0 * Math.PI / 1800);
  correct("ipho-2004-t3", "f.value", Math.cbrt(9e9 * 6 * (1.6e-19) ** 2 / (1e-12 * omega0 * 20)) / 1e-9);
  const ron = 1, roff = 10, R = 3, C = 1e-6, E = 15, uh = 4, uth = 10;
  const uon = E * ron / (R + ron), uoff = E * roff / (R + roff);
  const ton = C * R * ron / (R + ron) * Math.log((uth - uon) / (uh - uon));
  const toff = C * R * roff / (R + roff) * Math.log((uoff - uh) / (uoff - uth));
  correct("ipho-2016-t2", "b2", (ton + toff) * 1e6);
  correct("ipho-2016-t2", "c2", C * R * roff / (R + roff) * Math.log((uoff - 12 * roff / (R + roff)) / (uoff - uth)) * 1e6);
  const A = 1.71e12, rho = 917, g = 9.82;
  const hm = Math.sqrt(2e5 * Math.sqrt(A / 10) / (rho * g));
  correct("ipho-2013-t3", "3.8", rho / 998 * 2 / 3 * A * hm / 3.61e14);
  correct("ipho-2018-t3", "b.3", 3 * .6 * 6 / .05 ** 2 / 1000);
});

test("cooling corrections conserve energy and momentum at retained order", () => {
  const m = 2, v = 7, recoil = 1e-5;
  const before = m * v * v / 2;
  const afterForward = (m * v - 2 * recoil) ** 2 / (2 * m);
  const meanLoss = (before + afterForward) / 2 - before;
  assert.ok(Math.abs(meanLoss + recoil * v) < 2 * recoil ** 2 / m);
  const id = "ipho-2009-t2";
  correct(id, "3d", t`(m*v^2-4*hbar*q*v)/2`);
  assert.notEqual(checkArchivePart(part(id, "3d"), t`m*v^2/2-hbar*q*v`, id).status, "correct");
});

test("batch scope and explicit source correction notes remain reviewable", () => {
  assert.equal(Object.values(batchSevenParts).reduce((n, parts) => n + parts.length - 1, 0), 251);
  const index = JSON.parse(readFileSync("lib/corpus/import-index.json", "utf8"));
  const text = (id: string) => {
    const path = index.problems.find((p: { id: string }) => p.id === id).path;
    return JSON.parse(readFileSync("public" + path, "utf8")).solution.text as string;
  };
  assert.match(text("ipho-2009-t2"), /factor|consistent|incorrect/);
  assert.match(text("apho-2019-t2"), /Jacobian/);
  assert.match(text("apho-2019-t2"), /132/);
  assert.match(text("apho-2018-t1"), /rms/);
});
