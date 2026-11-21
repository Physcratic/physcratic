import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { batchEightParts } from "./olympiad/keys-batch-8";
import { olympiadDefinitions } from "./olympiad/keys";
import { checkArchivePart } from "./archive-grading";
import { publicArchiveMetadata } from "./archive-grading/catalog";
import sources from "../docs/engineering/native-archive-batch-8-sources.json";
import figures from "../docs/engineering/native-archive-batch-8-figures.json";
const t = String.raw;
const part = (id: string, field: string) => {
  const found = batchEightParts[id]?.find(p => p.id === field);
  assert.ok(found, `${id}/${field}`);
  return found;
};
const correct = (id: string, field: string, answer: string | number) => assert.equal(checkArchivePart(part(id, field), typeof answer === "number" ? answer.toExponential(14) : answer, id).status, "correct", `${id}/${field}: ${answer}`);

test("batch eight adds exactly twenty source-backed problems with private keys", () => {
  assert.equal(Object.keys(batchEightParts).length, 20);
  assert.equal(sources.length, 40);
  for (const id of Object.keys(batchEightParts)) {
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
  assert.equal(figures.length, 50);
  for (const image of figures) {
    assert.equal(createHash("sha256").update(readFileSync("public" + image.source)).digest("hex"), image.sourceSha256);
    assert.equal(createHash("sha256").update(readFileSync("public" + image.path)).digest("hex"), image.sha256);
    const [left, top, right, bottom] = image.crop;
    assert.ok(left >= 0 && top >= 0 && right <= image.renderSize[0] && bottom <= image.renderSize[1] && right > left && bottom > top);
  }
});

test("independent results for every new problem reject physical mistakes", () => {
  const cases = [
    ["ipho-2008-t1", "1.1", "0.016", "0.1571"],
    ["ipho-2017-t3", "a.1", t`(4*pi*G)*2/3`, t`4*pi*G`],
    ["ipho-2021-t2", "c.1", t`E/(e*beta*d*(-q))`, t`E/(e*beta*d*q)`],
    ["ipho-2022-t1", "a.1", "0.00021", "0.0021"],
    ["ipho-2023-t1", "c.5", t`T/(gamma/k)`, t`k*T*gamma`],
    ["ipho-2024-t1", "b-2", t`(r_A+r_E-2*r_A*r_E)/(1-r_A*r_E)`, t`r_A+(1-r_A)*r_E`],
    ["ipho-2024-t2", "b-4", t`hbar/(alpha*k_B*2*tau)`, t`hbar/(alpha*k_B*tau)`],
    ["ipho-2024-t3", "b-1", t`-(4/3)*pi*G*rho_c*r`, t`(4/3)*pi*G*rho_c*r`],
    ["apho-2015-t1", "b", t`phi/e/N`, t`phi*N/e`],
    ["apho-2015-t3", "b.ii", "1010000", "10100"],
    ["apho-2016-t3", "c1", t`e*B_z/hbar`, t`e*B_z/(2*hbar)`],
    ["apho-2017-t2", "c.1", t`-(256/5)*(G*M)^3/(c^5*a^3)`, t`-64*(G*M)^3/(5*c^5*a^3)`],
    ["apho-2018-t3", "a4.2", t`sqrt((2+Z*T_1+Z*T_2)/2)`, t`sqrt(1+Z*(T_1+T_2))`],
    ["apho-2021-t1", "a.2", "5.93", "5930000"],
    ["apho-2021-t2", "c.4", t`(1-cos(2*(alpha+beta)))/4`, t`sin(alpha+beta)^2`],
    ["apho-2021-t3", "c.2", t`2*sqrt(g/h_0)`, t`sqrt(g/h_0)`],
    ["apho-2022-t1", "d.1", t`(2*mu_s*mu*I_0*a*x)/(pi*(a*a+x*x)^2)`, t`mu_s*mu*I_0*a*x/(pi*(a*a+x*x)^2)`],
    ["apho-2022-t3", "a.4", t`sqrt(q^2/(4*pi*epsilon_0*m*r^3))`, t`q/sqrt(4*pi*epsilon_0*m*r^2)`],
    ["apho-2025-t2", "b.4", t`hbar/(S*J*a*a*2)`, t`hbar/(J*S*a*a)`],
    ["apho-2025-t3", "b.1", t`sqrt(k/m_A+k/m_B)`, t`sqrt(k/(m_A+m_B))`],
  ];
  for (const [id, field, equivalent, wrong] of cases) {
    correct(id, field, equivalent);
    assert.notEqual(checkArchivePart(part(id, field), wrong, id).status, "correct", `${id}/${field}: ${wrong}`);
  }
});

test("source numerical values follow independent physical balances", () => {
  const sigma = 5.67e-8, rs = 6.96e8, d = 1.5e11, ts = 5770;
  const s0 = sigma * ts ** 4 * (rs / d) ** 2;
  correct("ipho-2024-t1", "a-1", s0);
  correct("ipho-2024-t1", "a-2", (s0 / (4 * sigma)) ** .25);
  const ra = .255, re = .102;
  const albedo = ra + (1 - ra) ** 2 * re / (1 - ra * re);
  const te = 288, ta = 245;
  const eps = (sigma * te ** 4 - (1 - albedo) * s0 / 4) / (sigma * (te ** 4 - ta ** 4));
  const k = eps * sigma * (2 * ta ** 4 - te ** 4) / (te - ta);
  // Differentiate the two energy balances independently of the printed sensitivity formula.
  const a = 4 * sigma * te ** 3 + k, b = -(4 * eps * sigma * ta ** 3 + k);
  const c = 4 * eps * sigma * te ** 3 + k, e = -(8 * eps * sigma * ta ** 3 + k);
  const f = sigma * ta ** 4, h = sigma * (2 * ta ** 4 - te ** 4);
  correct("ipho-2024-t1", "b-6b", (f * e - b * h) / (a * e - b * c) * .01 * eps);
  correct("ipho-2024-t2", "b-5", 1.055e-34 / (2 * 4 * 1.381e-23 * 5e-9));
  const moment = .75, mu0 = 4 * Math.PI * 1e-7;
  correct("ipho-2022-t1", "a.1", 3 * mu0 * moment ** 2 / (2 * Math.PI * .2 ** 4));
  const z = (420e-6) ** 2 / (4 * 1e-5 * 1.4);
  correct("apho-2018-t3", "a6.1", 120 / (4 / z + (3 * 423 + 303) / 2));
  correct("apho-2018-t3", "b2.1", (Math.sqrt(1 + 2 * z * 300) - 1) / z);
  correct("apho-2021-t1", "a.2", 4 * Math.sqrt(1000 * 2.2e9) / 1e6);
  correct("apho-2022-t3", "f.1", 500e-9 * 3000 / (6 * 5e-9) / 1000);
  correct("apho-2025-t3", "e.3", (2 * Math.asin(1.31 * Math.sin(Math.PI / 6)) - Math.PI / 3) * 180 / Math.PI);
});

test("source subparts and model convention notes are retained", () => {
  assert.equal(Object.values(batchEightParts).reduce((n, p) => n + p.length - 1, 0), 278);
  assert.equal(Object.values(batchEightParts).flat().filter(p => p.kind !== "self-review").length, 141);
  const index = JSON.parse(readFileSync("lib/corpus/import-index.json", "utf8"));
  const text = (id: string) => {
    const path = index.problems.find((p: { id: string }) => p.id === id).path;
    return JSON.parse(readFileSync("public" + path, "utf8")).solution.text as string;
  };
  assert.match(text("ipho-2017-t3"), /negative before|conflicts|sign/);
  assert.match(text("apho-2021-t2"), /incorrectly|inconsistent/);
  assert.match(text("apho-2025-t2"), /different approximations/);
  assert.match(text("apho-2025-t3"), /resonant laboratory/);
  assert.match(text("apho-2022-t1"), /10\^|10\{/);
});
