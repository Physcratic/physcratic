// Phase 0 baseline: why "\theta_o\sin(kz)/k + r_o\cos(kz)" fails on
// arena-a-grin-and-a-wiggle part (a). Run:
//   pnpm exec tsx --conditions=react-server --test tests/phase0-answer-input.mts
import assert from "node:assert/strict";
import test from "node:test";
import { getArchiveDefinition } from "../lib/archive-grading/catalog";
import { checkArchivePart } from "../lib/archive-grading";

const part = getArchiveDefinition("arena-a-grin-and-a-wiggle")!.parts.find((p) => p.id === "a.trajectory")!;
const typed = String.raw`\theta_o\sin(kz)/k + r_o\cos(kz)`;
const zero = String.raw`\theta_0\sin(kz)/k + r_0\cos(kz)`;

test("declared symbols use the digit zero", () => {
  assert.deepEqual(part.symbols.map((s) => s.latex), ["r_0", "k", "z", "\\theta_0"]);
});
test("letter o is rejected as invalid, not incorrect", () => {
  const result = checkArchivePart(part, typed);
  console.log("letter o  ->", result.status, "|", result.message);
  assert.equal(result.status, "invalid");
});
test("the same answer with the digit zero is inconclusive, not correct", () => {
  const result = checkArchivePart(part, zero);
  console.log("digit 0   ->", result.status);
  assert.equal(result.status, "inconclusive");
});
test("only the key's own shape is accepted, because sin and cos are outside the algebra prover", () => {
  const same = String.raw`r_0\cos(kz)+\frac{\theta_0}{k}\sin(kz)`;
  const reordered = String.raw`\frac{\theta_0}{k}\sin(kz)+r_0\cos(kz)`;
  const slash = String.raw`\theta_0\sin(kz)/k+r_0\cos(kz)`;
  const out = { key: checkArchivePart(part, same).status, reordered: checkArchivePart(part, reordered).status, slash: checkArchivePart(part, slash).status };
  console.log("shapes    ->", JSON.stringify(out));
  assert.equal(out.key, "correct");
  assert.equal(out.reordered, "correct");
  assert.equal(out.slash, "inconclusive");
});
