import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { archiveDefinitions, archiveVersion, getArchiveDefinition, publicArchiveMetadata } from "./archive-grading/catalog";
import { archiveMetadataSchema } from "./archive-grading-contracts";
import { checkArchivePart, gradeArchiveAnswers, ArchiveGradeRequestError } from "./archive-grading";
import { expression, numeric } from "./archive-grading/definitions";
import { problems } from "./physics";

const coverage: Record<string, string[]> = {
  "mind-the-gap": ["a.radius", "b.radius"],
  "the-bubble-treaty": ["a.i.pressure", "a.ii.radius", "a.iii.interface", "a.iv.distance", "b.i.radius", "b.ii.distance"],
  "the-cosmic-kitchen": ["a.energy", "b.density", "c.ratio", "d.temperature", "d.ratio", "e.temperature", "f.ratio", "g.equation", "g.temperature", "h.zeta", "h.xi", "i.i.exponent", "i.ii.exponent", "j.exponent", "k.ratio", "l.temperature", "m.fraction", "m.reasoning"],
  "the-five-fold-collision": ["a.mass", "a.speed", "b.heavy", "b.light", "c.angle", "d.lower", "d.upper", "e.frequency"],
  "the-phantom-charge": ["a.charge", "b.above", "b.below", "c.magnitude", "c.above-position", "c.below-position", "d.repulsive", "d.attractive"],
  "the-string-that-answered-back": ["a.left", "a.right", "a.sketches", "b.left", "b.right", "b.sketches"],
  "the-clock-in-the-racing-mirror": ["a.arrival", "b.height", "c.distance"],
  "the-dodecahedron-conspiracy": ["a.flux", "b.field", "c.field"],
  "the-gas-with-elbows": ["a.i.concentration", "a.ii.exponent", "a.ii.function", "a.ii.energy", "a.iii.energy", "a.iv.entropy", "a.iv.pressure", "a.v.b", "a.v.c", "a.v.proof", "a.vi.partition", "a.vi.energy", "a.vi.proof", "b.i.factor", "b.ii.energy", "b.iii.attraction", "b.iv.energy", "b.v.pressure", "b.v.derivation", "b.vi.energy"],
  "the-quantum-escape-room": ["a.wave-number", "b.parallel", "c.decay", "d.normal", "d.parallel", "e.probability", "f.rate"],
  "the-three-way-wave-split": ["a.wave-two", "a.wave-three", "b.density-two", "b.density-three"],
  "titans-double-take": ["a.index", "b.angle", "b.diagram"],
  "a-grin-and-a-wiggle": ["a.trajectory", "b.axial", "b.transverse", "b.description", "c.radius", "d.focal", "d.back", "e.radius"],
  "an-atom-with-stage-fright": ["a.dipole", "b.power", "c.energy", "d.lifetime", "d.function", "e.population", "e.sketch", "f.explanation", "g.power", "g.sketch"],
  "the-invisible-brake": ["one.a.flux", "one.b.momentum", "one.c.exponent", "one.c.coefficient", "two.a.velocity", "two.b.flow", "two.c.heat"],
  "the-bending-beam-riddle": ["a.i.shear", "a.ii.curvature", "a.iii.shear", "a.iii.moment", "b.i.stress", "b.ii.moment", "b.iii.drop", "c.i.order", "c.i.a", "c.i.b", "c.ii.phase", "c.ii.group"],
  "the-capacitors-missing-energy": ["a.i.energy", "a.ii.electric", "a.ii.magnetic", "a.iii.field", "a.iii.plate", "a.iii.observation", ...["xx", "xy", "xz", "yx", "yy", "yz", "zx", "zy", "zz"].map((component) => `b.i.${component}`), "b.ii.interval", "b.iii.work", "b.iv.density", "b.v.density", "b.vi.stress", "b.vii.mass", "b.viii.energy"],
  "the-infinite-v": ["a.radial", "a.tangential", "b.radial", "b.tangential", "c.stability", "c.frequency"],
};
test("explicit disposition for every requested Arena result and all 12 Quick practice problems", () => {
  assert.equal(archiveDefinitions.length, 30);
  assert.equal(new Set(archiveDefinitions.map((item) => item.problemId)).size, 30);
  assert.equal(Object.keys(coverage).length, 18);
  for (const [id, parts] of Object.entries(coverage)) {
    const definition = getArchiveDefinition(`arena-${id}`)!;
    assert.deepEqual(definition.parts.map((part) => part.id), parts, id);
    for (const part of definition.parts) {
      assert.ok(part.domain && part.sourceReference && part.help && part.label, `${id}/${part.id}`);
      if (part.kind === "self-review") assert.ok(part.reason);
    }
  }
  for (const problem of problems) {
    const [key] = getArchiveDefinition(problem.id)!.parts;
    assert.equal(key.kind, "numeric");
    if (key.kind === "numeric") { assert.equal(key.target, problem.answer); assert.equal(key.unit, problem.unit); assert.equal(key.relTol, 0.01); assert.equal(key.absTol, 1e-9); }
  }
});
for (const definition of archiveDefinitions) {
  test(`${definition.problemId}: every canonical/curated form passes, wrong forms never pass`, () => {
    for (const part of definition.parts) {
      if (part.kind === "self-review") { assert.equal(checkArchivePart(part, "anything").status, "self-review"); continue; }
      for (const answer of [part.canonical, ...part.alternatives]) {
        const result = checkArchivePart(part, answer);
        assert.equal(result.status, "correct", `${part.id}: ${answer}: ${JSON.stringify(result)}`);
      }
      for (const answer of part.wrong) assert.ok(["incorrect", "inconclusive"].includes(checkArchivePart(part, answer).status), `${part.id}: wrong ${answer}`);
      assert.equal(checkArchivePart(part, "").status, "unanswered");
    }
  });
}
test("public generator output uses an explicit allowlist and contains no structured keys", () => {
  assert.equal(readdirSync(join(process.cwd(), "public/corpus/grading")).length, 30);
  for (const definition of archiveDefinitions) {
    const metadata = publicArchiveMetadata(definition);
    const published = JSON.parse(readFileSync(join(process.cwd(), `public/corpus/grading/${definition.problemId}.json`), "utf8"));
    assert.deepEqual(archiveMetadataSchema.parse(published), metadata);
    assert.deepEqual(Object.keys(metadata).sort(), ["parts", "problemId", "version"]);
    for (const part of metadata.parts) assert.deepEqual(Object.keys(part).sort(), ["help", "id", "kind", "label", "sourcePart", "symbolConditions", "symbols", "unit"]);
    assert.doesNotMatch(JSON.stringify(metadata), /"(?:target|canonical|alternatives|wrong|absTol|relTol|policy|exclusions)"/);
    assert.notEqual(archiveVersion({ ...definition, keyVersion: definition.keyVersion + 1 }), metadata.version);
    assert.notEqual(archiveVersion({ ...definition, content: `${definition.content} changed` }), metadata.version);
    assert.notEqual(archiveVersion({ ...definition, parts: definition.parts.slice(1) }), metadata.version);
  }
});
test("LaTeX arithmetic, sign, exact zero, numerical tolerance and fixed-unit policy", () => {
  const incline = getArchiveDefinition("incline")!.parts[0];
  for (const answer of ["4.9", String.raw`\frac{49}{10}`, "49/10", String.raw`4.9\times10^0`, "4.9e0"]) assert.equal(checkArchivePart(incline, answer).status, "correct", answer);
  // Phase 1: the default number tolerance is 1% relative (it was 0.5%), so the edge moves from 4.9245 to 4.949.
  assert.equal(checkArchivePart(incline, "4.9489").status, "correct");
  assert.equal(checkArchivePart(incline, "4.9491").status, "incorrect");
  for (const answer of ["3e8", String.raw`3\times10^8`, "3*10^8", String.raw`3\cdot10^{8}`, "300000000"]) assert.equal(checkArchivePart(numeric("c", "Speed", 3e8, "m/s"), answer).status, "correct", answer);
  const zero = numeric("zero", "Zero", 0, "1", { absTol: 0, relTol: 0 });
  assert.equal(checkArchivePart(zero, "-0").status, "correct");
  // Phase 1: sqrt(2)^2 - 2 is zero, so it is now correct (it was "could not prove"). An exact part is compared to 1e-9 relative
  // with a 1e-12 floor, because numbers are binary64: sqrt(2) minus its 17-digit decimal is 0 to that precision.
  assert.equal(checkArchivePart(zero, String.raw`\sqrt{2}^2-2`).status, "correct");
  assert.equal(checkArchivePart(zero, String.raw`\sqrt{2}-1.4142135623730951`).status, "correct");
  // More than 17 significant digits cannot be held exactly, so such a number is refused (it was "incorrect").
  assert.equal(checkArchivePart(numeric("one", "One", 1, "1", { absTol: 0, relTol: 0 }), "1.00000000000000001").status, "invalid");
  assert.equal(checkArchivePart(zero, "0.0001").status, "incorrect");
  assert.equal(checkArchivePart(zero, "100000000000000000000+1-100000000000000000000").status, "invalid");
  assert.equal(checkArchivePart(zero, "1e-100*1e-100*1e-100*1e-100").status, "invalid");
  // The 0.005 floor is now an explicit override. The default is 1% relative with a 1e-9 floor.
  const floor = numeric("floor", "Floor", 0, "1", { absTol: 0.005, relTol: 0.005 });
  assert.equal(checkArchivePart(numeric("default", "Default", 0, "1"), "0.005").status, "incorrect");
  assert.equal(checkArchivePart(floor, "0.005").status, "correct");
  assert.equal(checkArchivePart(floor, "0.005001").status, "incorrect");
  assert.equal(checkArchivePart(incline, String.raw`490\mathrm{cm}/\mathrm{s}^2`).status, "invalid");
  assert.equal(checkArchivePart(incline, "490").status, "incorrect");
});
test("declared Greek/subscript aliases, implicit products, and exact polynomial proofs", () => {
  const part = expression("result", "Result", String.raw`\mu x^2`, String.raw`\mu x`, "μ > 0, x real", { positive: [String.raw`\mu`], aliases: { [String.raw`\mu`]: ["u"] } });
  for (const value of [String.raw`\mu x x`, "u*x*x"]) assert.equal(checkArchivePart(part, value).status, "correct", value);
  assert.equal(checkArchivePart(part, "x").status, "incorrect");
  assert.equal(checkArchivePart(part, "z").status, "invalid");
  assert.equal(checkArchivePart(expression("f", "f", "x(1-x)", "x", "Real x"), "x-x^2").status, "correct");
});
test("domain-preserving parsing and conservative inconclusive fallback", () => {
  const key = expression("f", "f", "x+1", "x", "All real x");
  // Phase 1: equal everywhere except the removable hole at x = 1, which random test values do not land on.
  assert.equal(checkArchivePart(key, "(x^2-1)/(x-1)").status, "correct");
  const trig = expression("f", "f", String.raw`\sin^2(x)+\cos^2(x)`, "x", "Real x, radians");
  // Phase 1: sin^2 + cos^2 really is 1, so this is correct (it was "could not prove").
  assert.equal(checkArchivePart(trig, "1").status, "correct");
  assert.equal(checkArchivePart(expression("f", "f", "x", "x", "Real x"), String.raw`\sqrt{x^2}`).status, "incorrect");
});
test("malformed, malicious, nonfinite and over-budget inputs are never accepted", () => {
  const key = getArchiveDefinition("incline")!.parts[0];
  for (const value of ["NaN", "Infinity", String.raw`\infty`, "1/0", "0/0", String.raw`\sqrt{-1}`, "0^0", String.raw`\frac{1}{`, "4.9=4.9", "4.9;4.9", String.raw`\text{if} 1 \text{then} 4.9`, String.raw`\operatorname{while}(1)`, String.raw`\newcommand{\x}{4.9}\x`, String.raw`\href{javascript:alert(1)}{4.9}`, String.raw`\input{secret}`, String.raw`\begin{cases}4.9\end{cases}`, "a".repeat(1025), "(".repeat(17)+"4.9"+")".repeat(17), "-".repeat(100)+"4.9", "10^{1000}", "1e999", "1e-999", String.raw`\sqrt[999]{1}`]) assert.equal(checkArchivePart(key, value).status, "invalid", value);
  const special = getArchiveDefinition("arena-the-bubble-treaty")!.parts.find((part) => part.kind === "special")!;
  assert.equal(checkArchivePart(special, "1e999").status, "invalid");
  assert.notEqual(checkArchivePart(special, "-\\infty").status, "correct");
});
test("versioning, blank parts, mixed outcomes, and refusal of client policies", () => {
  const definition = getArchiveDefinition("arena-the-bubble-treaty")!;
  const input = { problemId: definition.problemId, version: archiveVersion(definition), answers: [{ partId: "b.i.radius", latex: "12" }, { partId: "b.ii.distance", latex: "" }] };
  const results = gradeArchiveAnswers(input).results;
  assert.equal(results.find((part) => part.partId === "b.i.radius")!.status, "correct");
  assert.equal(results.find((part) => part.partId === "b.ii.distance")!.status, "unanswered");
  for (const invalid of [{ ...input, version: "0".repeat(64) }, { ...input, answers: [...input.answers, input.answers[0]] }, { ...input, answers: [{ partId: "unknown", latex: "12" }] }, { ...input, expected: 12 }, { ...input, working: "private" }, { ...input, problemId: "live-contest" }]) assert.throws(() => gradeArchiveAnswers(invalid), ArchiveGradeRequestError);
});
test("public part metadata carries each symbol's declared conditions and nothing else from the key", () => {
  const grin = publicArchiveMetadata(getArchiveDefinition("arena-a-grin-and-a-wiggle")!);
  const trajectory = grin.parts.find((part) => part.id === "a.trajectory")!;
  assert.deepEqual(trajectory.symbolConditions, [{ symbol: "k", assumptions: ["positive"] }]);
  const equation = publicArchiveMetadata(getArchiveDefinition("arena-the-cosmic-kitchen")!).parts.find((part) => part.id === "g.equation")!;
  assert.deepEqual(equation.symbolConditions, [{ symbol: "u", assumptions: ["positive"], min: 50, max: 150 }]);
  for (const definition of archiveDefinitions) {
    for (const part of publicArchiveMetadata(definition).parts) {
      for (const entry of part.symbolConditions) {
        assert.deepEqual(Object.keys(entry).filter((key) => !["symbol", "assumptions", "min", "max"].includes(key)), []);
        assert.ok(part.symbols.includes(entry.symbol), `${definition.problemId}/${part.id}`);
      }
    }
    // A symbol with no declared condition is not listed.
    const source = definition.parts.find((part) => part.kind !== "self-review" && part.symbols.some((symbol) => symbol.assumptions.length === 0 && symbol.min === undefined));
    if (source) {
      const listed = publicArchiveMetadata(definition).parts.find((part) => part.id === source.id)!.symbolConditions.map((entry) => entry.symbol);
      for (const symbol of source.symbols.filter((item) => item.assumptions.length === 0 && item.min === undefined && item.max === undefined)) assert.ok(!listed.includes(symbol.latex));
    }
  }
});
