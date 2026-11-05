import assert from "node:assert/strict";
import test from "node:test";
import { archiveDefinitions, archiveVersion, getArchiveDefinition } from "./archive-grading/catalog";
import { checkArchivePart, gradeArchiveAnswers } from "./archive-grading";
import { numberVariants, variantsOf } from "../tests/answer-rewrites";

const S = String.raw;
const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// Every part of every problem on the site, including the Arena keys that use sin, cos, ln and exp.
for (const definition of archiveDefinitions) {
  test(`${definition.problemId}: the key and rewritten forms of it are correct, changed forms are incorrect`, () => {
    for (const part of definition.parts) {
      if (part.kind === "self-review") continue;
      const id = `${definition.problemId}/${part.id}`;
      if (part.kind === "numeric") {
        for (const text of numberVariants(part.target)) assert.equal(checkArchivePart(part, text, definition.problemId).status, "correct", `${id}: ${text}`);
        const m = Math.max(1, Math.abs(part.target));
        for (const text of [String(part.target + 2 * m), String(part.target - 2 * m), String(part.target * 1.2 + 0.5 * m)]) assert.equal(checkArchivePart(part, text, definition.problemId).status, "incorrect", `${id}: ${text}`);
        continue;
      }
      if (part.kind === "special") continue;
      for (const reference of [part.canonical, ...part.alternatives]) {
        assert.equal(checkArchivePart(part, reference, definition.problemId).status, "correct", `${id}: as written ${reference}`);
        const variants = variantsOf(reference, part.symbols.map((s) => s.latex), part.symbols.map((s) => s.latex), hash(id));
        assert.ok(variants, `${id}: the reference can be read`);
        for (const text of variants.equal) assert.equal(checkArchivePart(part, text, definition.problemId).status, "correct", `${id}: rewrite ${text} of ${reference}`);
        if (reference === part.canonical) for (const text of variants.wrong) assert.equal(checkArchivePart(part, text, definition.problemId).status, "incorrect", `${id}: changed ${text}`);
      }
    }
  });
}

test("the Arena keys that use sin, cos, ln or exp are covered", () => {
  const withFunctions = archiveDefinitions.flatMap((d) => d.parts).filter((p) => p.kind === "expression" && /\\(sin|cos|tan|cot|sinh|cosh|tanh|ln|log|exp)\b|e\^/.test(p.canonical));
  assert.ok(withFunctions.length >= 26, `${withFunctions.length}`);
});

test("arena-a-grin-and-a-wiggle part (a): the solution's form and other forms are correct", () => {
  const part = getArchiveDefinition("arena-a-grin-and-a-wiggle")!.parts.find((p) => p.id === "a.trajectory")!;
  const id = "arena-a-grin-and-a-wiggle";
  for (const text of [
    S`r_0\cos(kz)+\frac{\theta_0}{k}\sin(kz)`,
    S`\frac{\theta_0}{k}\sin(kz)+r_0\cos(kz)`,
    S`\theta_0\sin(kz)/k + \cos(zk)r_0`,
    S`\theta_0\sin(kz)/k+r_0\cos(kz)`,
    S`\cos(zk)r_0+\theta_0\sin(zk)k^{-1}`,
    S`r_0\cos kz+\theta_0\sin kz/k`,
    "r_0*cos(k*z)+theta_0*sin(k*z)/k",
    "θ₀ sin(kz)/k + r₀ cos(kz)",
    S`\left(\sin\left(kz\right)\theta_0\right)\cdot\frac{1}{k}+r_0\cdot\cos\left(k\cdot z\right)`,
  ]) assert.equal(checkArchivePart(part, text, id).status, "correct", text);
});

test("arena-a-grin-and-a-wiggle part (a): wrong answers are incorrect", () => {
  const part = getArchiveDefinition("arena-a-grin-and-a-wiggle")!.parts.find((p) => p.id === "a.trajectory")!;
  const id = "arena-a-grin-and-a-wiggle";
  for (const [name, text] of [
    ["sign error", S`r_0\cos(kz)-\frac{\theta_0}{k}\sin(kz)`],
    ["missing 1/k", S`r_0\cos(kz)+\theta_0\sin(kz)`],
    ["sin and cos swapped", S`r_0\sin(kz)+\frac{\theta_0}{k}\cos(kz)`],
    ["r_0 and theta_0 swapped", S`\theta_0\cos(kz)+\frac{r_0}{k}\sin(kz)`],
    ["only one term", S`r_0\cos(kz)`],
    ["k dropped from the angle", S`r_0\cos(z)+\frac{\theta_0}{k}\sin(z)`],
  ] as const) assert.equal(checkArchivePart(part, text, id).status, "incorrect", name);
});

test("arena-a-grin-and-a-wiggle part (a): the letter o is refused and the symbol is named", () => {
  const part = getArchiveDefinition("arena-a-grin-and-a-wiggle")!.parts.find((p) => p.id === "a.trajectory")!;
  const result = checkArchivePart(part, S`\theta_o\sin(kz)/k + r_o\cos(kz)`, "arena-a-grin-and-a-wiggle");
  assert.equal(result.status, "invalid");
  assert.equal(result.message, "θ_o isn't used here. Did you mean θ₀?");
  assert.equal(checkArchivePart(part, S`\theta_0\sin(kz)/k + r_o\cos(kz)`, "x").message, "r_o isn't used here. Did you mean r₀?");
  assert.equal(checkArchivePart(part, S`q\cos(kz)`, "x").status, "invalid");
});

test("the signed-domain rule holds through the site checker", () => {
  const part = getArchiveDefinition("arena-the-bending-beam-riddle")!.parts.find((p) => p.id === "b.i.stress")!;
  assert.equal(checkArchivePart(part, "Yy/R", "x").status, "correct");
  assert.equal(checkArchivePart(part, "Y|y|/R", "x").status, "incorrect");
  assert.equal(checkArchivePart(part, "|Y|y/R", "x").status, "correct");
});

test("numbers: 3e8, 3×10^8 and the default 1% tolerance", () => {
  const speed = getArchiveDefinition("incline")!.parts[0];
  assert.equal(speed.kind, "numeric");
  for (const text of ["4.9", "4.9e0", S`4.9\times10^0`, "4.9×10^0", S`\frac{49}{10}`, "4.94", "4.86"]) assert.equal(checkArchivePart(speed, text, "incline").status, "correct", text);
  for (const text of ["4.96", "4.85", "490", "-4.9", "0"]) assert.equal(checkArchivePart(speed, text, "incline").status, "incorrect", text);
  assert.equal(checkArchivePart(speed, S`4.9\text{ m/s}^2`, "incline").status, "invalid");
});

test("the answer to a part with no valid test values is undecided in plain words", () => {
  const part = { ...getArchiveDefinition("arena-the-phantom-charge")!.parts.find((p) => p.kind === "expression")!, canonical: "sqrt(-1-c^2)", alternatives: [] };
  const result = checkArchivePart(part, "c", "x");
  assert.equal(result.status, "inconclusive");
  assert.match(result.message, /^Could not be decided\./);
  assert.doesNotMatch(result.message, /proven|subset|checker/);
});

test("the grading version names the new engine and changes with it", () => {
  const definition = getArchiveDefinition("incline")!;
  const version = archiveVersion(definition);
  assert.match(version, /^[a-f0-9]{64}$/);
  const input = { problemId: "incline", version, answers: [{ partId: "answer", latex: "4.9" }] };
  assert.equal(gradeArchiveAnswers(input).results[0].status, "correct");
  // A page holding the version from before this change is refused and told to refresh.
  const old = "d417e8ce42f18339bdb15eddd5e46892c267aeec1f8d7d83cb1e1e950d13f00f";
  assert.throws(() => gradeArchiveAnswers({ ...input, version: old }), /has changed/);
});

test("messages follow the copy rules", () => {
  const part = getArchiveDefinition("arena-a-grin-and-a-wiggle")!.parts.find((p) => p.id === "a.trajectory")!;
  const messages = ["", "1", S`r_0\cos(kz)+\frac{\theta_0}{k}\sin(kz)`, S`\theta_o`, "((", S`q`].map((text) => checkArchivePart(part, text, "x").message);
  for (const message of messages) {
    assert.doesNotMatch(message, /[;—–]/, message);
    assert.doesNotMatch(message, /\b(elegant|worth|journey|unlock|craft|seamless|effortless|delve|elevate|proven|subset)\b/i, message);
  }
});
