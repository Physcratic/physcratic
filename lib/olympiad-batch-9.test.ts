import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { batchNineParts } from "./olympiad/keys-batch-9";
import { olympiadDefinitions } from "./olympiad/keys";
import { checkArchivePart } from "./archive-grading";
import { publicArchiveMetadata } from "./archive-grading/catalog";
import sources from "../docs/engineering/native-archive-batch-9-sources.json";
import figures from "../docs/engineering/native-archive-batch-9-figures.json";
import supplements from "../docs/engineering/native-archive-batch-9-supplements.json";
import physicsReview from "../docs/engineering/native-archive-physics-review.json";
import preservation from "../docs/engineering/native-archive-batch-9-preservation.json";
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const load = (path: string) => JSON.parse(readFileSync(path, "utf8"));

test("the final seventeen complete all 112 documents and preserve earlier records and metadata", () => {
  assert.equal(Object.keys(batchNineParts).length, 17);
  assert.equal(olympiadDefinitions.length, 109);
  const records = load("public/corpus/collection.json").problems;
  assert.equal(records.length, 112);
  assert.equal(Object.keys(preservation.unchangedRecords).length, 95);
  for (const r of records) {
    assert.equal(r.statement.format, "html");
    assert.equal(r.solution.format, "html");
    const previous = preservation.unchangedRecords[r.id as keyof typeof preservation.unchangedRecords];
    if (previous) {
      const correction = physicsReview.records.find(item => item.id === r.id && item.changed);
      if (correction) {
        assert.equal(correction.before, previous, r.id + " reviewed baseline");
        assert.equal(sha(JSON.stringify(r)), correction.after, r.id + " reviewed correction");
      } else assert.equal(sha(JSON.stringify(r)), previous, r.id);
    }
    const metadata = Object.fromEntries(Object.entries(r).filter(([k]) => !["statement", "solution"].includes(k)));
    assert.equal(sha(JSON.stringify(metadata)), preservation.metadata[r.id as keyof typeof preservation.metadata], r.id + " metadata");
  }
  const fields = Object.values(batchNineParts).flat();
  assert.equal(fields.length, 234);
  assert.equal(fields.filter(p => p.kind !== "self-review").length, 102);
  for (const id of Object.keys(batchNineParts)) {
    const definition = olympiadDefinitions.find(d => d.problemId === id)!;
    assert.equal(new Set(definition.parts.map(p => p.sourcePart)).size, definition.parts.length);
    assert.equal(definition.parts.at(-1)?.id, "working");
    assert.ok(definition.parts.some(p => p.kind !== "self-review"));
    assert.doesNotMatch(JSON.stringify(publicArchiveMetadata(definition)), /"(?:canonical|target|alternatives|wrong|policy)"\s*:/);
  }
});

test("all retained original PDFs, supplemental documents and 69 crops match their provenance", () => {
  assert.equal(sources.length, 34);
  assert.equal(figures.length, 69);
  for (const item of sources) assert.equal(sha(readFileSync("public" + item.originalPdf)), item.originalSha256);
  for (const item of supplements) assert.equal(sha(readFileSync("public" + item.path)), item.sha256);
  for (const image of figures) {
    assert.equal(sha(readFileSync("public" + image.source)), image.sourceSha256);
    assert.equal(sha(readFileSync("public" + image.path)), image.sha256);
    const [l, t, r, b] = image.crop;
    assert.ok(l >= 0 && t >= 0 && r <= image.renderSize[0] && b <= image.renderSize[1] && r > l && b > t);
  }
});

test("source constants resolve the sensitive earthquake, fibre and ISS calculations independently", () => {
  const time = 2 * [6, 9, 15].reduce((sum, d, i) => {
    const v = [6.65, 6.97, 6.99][i];
    return sum + d / (v * Math.sqrt(1 - (0.143 * v) ** 2));
  }, 0);
  assert.ok(Math.abs(time - 184.062613542) < 1e-8);
  const bent = Math.asin(Math.sqrt(1.45 ** 2 - 1.44 ** 2 * (10025 / 9975) ** 2)) * 180 / Math.PI;
  assert.ok(Math.abs(bent - 5.15078) < 1e-4);
  const R = 6.38e6, h = 4e5, M = 4.5e5, S = 2500, g = 9.81;
  const h0 = 8.31 * 425 / (.029 * g), gm = g * R * R;
  const rho = 1.29 * Math.exp(-h * (1 - h / R) / h0);
  const neutral = 2 * rho * S * Math.sqrt(gm * (R + h)) / M * 86400;
  const ion = (.016 * 1e12 / 6.022e23) * S * Math.sqrt(gm * (R + h)) / M * 86400;
  const magnetic = 1.6e-19 * 5e-5 * 1e12 * S ** 1.5 * Math.cos(51.6 * Math.PI / 180) * (R + h) / M * 86400;
  assert.ok(Math.abs(neutral - 4.93307) < .00001);
  assert.ok(Math.abs(ion - .663576) < .000001);
  assert.ok(Math.abs(magnetic - .808585) < .000001);
  const text = load("public/corpus/english-problems/apho-2023-t1.json").solution.text;
  assert.ok(text.includes("2865.9") && text.includes("4.93") && text.includes("0.66"));
});

test("each final problem accepts an independently rearranged or evaluated result and rejects a factor error", () => {
  const t = String.raw;
  const cases: [string, string, string][] = [
    ["apho-2024-t1", "a.3", t`h+(v_0^4-g^2*x^2)/(2*g*v_0^2)`],
    ["apho-2024-t2", "a.2", "0.109"],
    ["ipho-2016-t1", "a.2", t`M*g*b*(T/(2*pi))^2`],
    ["apho-2024-t3", "a.2", "54.6"],
    ["ipho-2017-t2", "a.1", t`(c_w*m_w*T_w+c_m*m_m*T_m)/(c_w*m_w+c_m*m_m)`],
    ["apho-2017-t1", "a.1", t`kappa*r^(-1)`],
    ["apho-2022-t2", "b.7", "0.5"],
    ["apho-2017-t3", "a.2", t`L^2*(sin(theta)^2/J_y+cos(theta)^2/J_x)/2`],
    ["apho-2016-t1", "a.1", t`-M*g*l*(8*sqrt(3)*cos(alpha)/3+2*sin(alpha))`],
    ["apho-2023-t2", "b.4", t`O*sqrt((I_d+alpha*m*R_0^2)/I_d)`],
    ["apho-2023-t3", "a.1", "0.000101"],
    ["apho-2023-t1", "a.2", "12414"],
    ["apho-2015-t2", "a.ii", t`B*e^2/(m*2*pi)`],
    ["ipho-2022-t2", "a.1", "26.2"],
    ["ipho-2025-t1", "a.1", t`e/sqrt(4*pi*epsilon_0*m_e*r)`],
    ["ipho-2025-t2", "a.1", t`g*m+g*rho*S*h`],
    ["ipho-2025-t3", "a.1", t`(a*P_0+2*sigma)/a`],
  ];
  for (const [id, field, answer] of cases) {
    const p = batchNineParts[id].find(p => p.id === field)!;
    assert.equal(checkArchivePart(p, answer, id).status, "correct", id);
    assert.notEqual(checkArchivePart(p, `2*(${answer})`, id).status, "correct", id + " factor error");
  }
});
