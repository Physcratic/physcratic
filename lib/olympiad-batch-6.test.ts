import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { batchSixParts } from "./olympiad/keys-batch-6";
import { olympiadDefinitions } from "./olympiad/keys";
import { checkArchivePart } from "./archive-grading";
import { publicArchiveMetadata } from "./archive-grading/catalog";
import sources from "../docs/engineering/native-archive-batch-6-sources.json";
import figures from "../docs/engineering/native-archive-batch-6-figures.json";
const t = String.raw;
const part = (id: string, field: string) => {
  const found = batchSixParts[id]?.find(p => p.id === field);
  assert.ok(found, `${id}/${field}`);
  return found;
};
const correct = (id: string, field: string, answer: string | number) => assert.equal(checkArchivePart(part(id, field), typeof answer === "number" ? answer.toExponential(14) : answer, id).status, "correct", `${id}/${field}: ${answer}`);

test("batch six adds exactly twenty source-backed problems with private keys", () => {
  assert.equal(Object.keys(batchSixParts).length, 20);
  assert.equal(sources.length, 40);
  for (const id of Object.keys(batchSixParts)) {
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
  assert.equal(figures.length, 36);
  for (const image of figures) {
    assert.equal(createHash("sha256").update(readFileSync("public" + image.source)).digest("hex"), image.sourceSha256);
    assert.equal(createHash("sha256").update(readFileSync("public" + image.path)).digest("hex"), image.sha256);
    const [left, top, right, bottom] = image.crop;
    assert.ok(left >= 0 && top >= 0 && right <= image.renderSize[0] && bottom <= image.renderSize[1] && right > left && bottom > top);
  }
});

test("independent rearrangements for all twenty problems reject common physics mistakes", () => {
  const cases = [
    ["ipho-2005-t1", "4.2", t`r_0*(\beta^2-1)^{-1/2}`, t`r_0/\beta`],
    ["ipho-2005-t2", "6", t`\sqrt{m*g*h*x/(\mu_0*a*d)}/2`, t`\sqrt{m*g*h*x/(2*\mu_0*a*d)}`],
    ["ipho-2009-t1", "2b", t`(L_1/M_M)^2/(G*M_E)`, t`L_1^2/(G*M_E*M_M)`],
    ["ipho-2010-t1", "4c", t`-q^2*R/(8*\pi*\epsilon_0*(d-R)*(d+R))`, t`-q^2*R/(4*\pi*\epsilon_0*(d^2-R^2))`],
    ["ipho-2013-t1", "1.3b", "1.59", "15.9"],
    ["ipho-2013-t2", "2.5a", t`(3/2)^2*\pi*\epsilon_0*R`, t`4*\pi*\epsilon_0*R`],
    ["ipho-2014-t3", "b6", t`\ln((1+\gamma)/\gamma)/\alpha`, t`\ln(1+\gamma)/\alpha`],
    ["ipho-2015-t1", "a5", t`x_g*(1+x_g+x_g^2/2)*\exp(-x_g)/3`, t`(x_g^2+2*x_g+2)*\exp(-x_g)/6`],
    ["ipho-2015-t2", "c1", t`A/(h/(2*\pi))`, t`A/h`],
    ["ipho-2015-t3", "b3", t`(1+\alpha)/2+(1-\alpha)*\cos(\theta)/2`, t`(1+\alpha+(1+\alpha)*\cos(\theta))/2`],
    ["ipho-2019-t1", "a.3", t`L_0*(1+\alpha^2)/(2*\alpha)`, t`L_0/(2*\alpha)`],
    ["ipho-2019-t3", "b.1", t`\sqrt{2}*a*\tau/(2*l)`, t`a*\tau/l`],
    ["ipho-2022-t3", "d.1", t`r_0*(0.0199)^{1/3}`, t`r_0*\sqrt{0.0199}`],
    ["ipho-2023-t2", "c.3", t`4*G*M/c^3*\ln(2/\varepsilon)`, t`2*G*M/c^3*\ln(2/\varepsilon)`],
    ["ipho-2023-t3", "c.2", t`-\rho*g*(z_0/\sqrt{2})^2`, t`\rho*g*z_0^2/2`],
    ["apho-2006-t2", "b4.drop", t`4*g*\mu/(k/m)`, t`2*\mu*m*g/k`],
    ["apho-2011-t2", "c", t`\mu_k*g/(k/m)`, t`\mu_s*m*g/k`],
    ["apho-2013-t1", "7.rc", t`1/(\sigma/\epsilon_0)`, t`\sigma/\epsilon_0`],
    ["apho-2014-t3", "g", t`\theta_E^2*D_L/(2*(1-D_L/D_S))`, t`\theta_E^2*D_L/2`],
    ["apho-2018-t2", "1.3", t`\rho*g*R*(1-3*R/(2*R_G)+R^3/(2*R_G^3))`, t`\rho*g*R`],
  ];
  for (const [id, field, equivalent, wrong] of cases) {
    correct(id, field, equivalent);
    assert.notEqual(checkArchivePart(part(id, field), wrong, id).status, "correct", id + " must reject " + wrong);
  }
});

test("numerical checks independently reproduce the source physics", () => {
  const pi = Math.PI, G = 6.67e-11;
  const r0 = Math.cbrt(9.81 * 6.37e6 ** 2 * 86400 ** 2 / (4 * pi ** 2));
  correct("ipho-2005-t1", "1.1", r0);
  correct("ipho-2005-t1", "1.2.value", 2 * pi * r0 / 86400);
  const inertia = 8 * pi / 15 * (4000 * 6.4e6 ** 5 + 9000 * 3.5e6 ** 5);
  correct("ipho-2009-t1", "2e", inertia);
  const torque = 6 * 6.7e-11 * 3.6e16 * 7.3e22 * 6.4e6 ** 2 * Math.sin(pi / 60) * Math.cos(pi / 60) / 3.8e8 ** 3;
  correct("ipho-2009-t1", "3f", torque);
  correct("ipho-2013-t1", "1.2a", 30 / (.60 * .0041 * pi * .13 ** 2 * 29100) / 9);
  correct("ipho-2013-t1", "1.5", 2 * pi * Math.sqrt(((4.95e10 + 6.16e11) / 2) ** 3 / (G * 1.99e30)) / (365.25 * 86400));
  const eps = 8.854e-12, e = 1.602e-19, me = 9.109e-31, n = 1.049e4 * 6.022e23 / .1079;
  correct("ipho-2013-t2", "2.7b", 2 * pi * 2.998e8 / Math.sqrt(n * e ** 2 / (3 * eps * me)) * 1e9);
  correct("ipho-2014-t3", "a2", Math.hypot(12e10, 16e10));
  correct("ipho-2015-t1", "a1", (3.85e26 / (4 * pi * (7e8) ** 2 * 5.67e-8)) ** .25);
  correct("ipho-2015-t1", "b1", 2 * 3.85e26 / (4 * pi * (1.5e11) ** 2 * 4e-12));
  correct("ipho-2015-t2", "b4", 30 * Math.acosh(4 / 3));
  const siliconGap = 1.11 * 1.60e-19 / (1.38e-23 * 5760);
  correct("ipho-2015-t1", "a8", siliconGap * (siliconGap ** 2 + 2 * siliconGap + 2) * Math.exp(-siliconGap) / 6);
  const ef = (235.044 - 93.9063 - 139.905 - 1.00867) * 931.502;
  correct("ipho-2015-t3", "a1", ef);
  const heat = .8 * ef * 1.602e-13 * (.0072 * 10600 * 6.022e23 / .270) * 5.4e-26 * 2e18;
  correct("ipho-2015-t3", "a3", heat);
  correct("ipho-2015-t3", "a5", Math.sqrt(4 * 3.280 * (3138 - 577) / heat) * 1000);
  const alpha = 1.02 * .055 / (.201 * 9.8);
  correct("ipho-2019-t1", "b.1.value", Math.sqrt(.055 * (1 - alpha) ** 3 / (3 * 9.8 * alpha)));
  correct("ipho-2022-t3", "a.1", .5 * Math.sqrt(10));
  correct("ipho-2022-t3", "b.1", 10 * Math.cbrt(10));
  correct("ipho-2023-t2", "a.3", (Math.cbrt(2) - 1) / (1 - 2 ** (-2 / 3)));
  correct("ipho-2023-t3", "a.1", Math.sqrt(3 * .06 * .0727 * (2 - 2 ** (2 / 3)) / (1000 * 1e-4)));
  correct("apho-2011-t2", "g", 20 * .2 * 30 * 9.8 * .03 / (pi * 8e10 * .005 ** 2 * .001));
  correct("apho-2014-t3", "h", Math.sqrt(4 * G * 6e30 / (3e8) ** 2 * (9.2e18 - 2.6e18) / (2.6e18 * 9.2e18)));
  correct("apho-2018-t2", "2.2", 8 * 4.93 * e / (0.142e-9) ** 2);
  correct("apho-2018-t2", "2.6", 54 * .012 / (6.022e23 * pi * (27 * .246e-9 / pi) ** 2 / 4 * 1.5 * .142e-9));
});

test("far-field screening retains the source's inverse-cube correction", () => {
  correct("ipho-2010-t1", "2b", t`q*(1-R/d)/(4*\pi*\epsilon_0*r^2)-q*R*(d-R^2/d)/(2*\pi*\epsilon_0*d*r^3)`);
  assert.notEqual(checkArchivePart(part("ipho-2010-t1", "2b"), t`q*(1-R/d)/(4*\pi*\epsilon_0*r^2)`, "ipho-2010-t1").status, "correct");
});
