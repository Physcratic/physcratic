import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import katex from "katex";
import { importedProblemSchema, type ImportedNode } from "./imported-corpus-schema";
import { nativeOlympiadIds } from "./olympiad/catalog";
import { olympiadDefinitions } from "./olympiad/keys";
import { archiveDefinitions, archiveVersion, publicArchiveMetadata } from "./archive-grading/catalog";
import { gradeArchiveAnswers, checkArchivePart, ArchiveGradeRequestError } from "./archive-grading";
import { practiceCheckCatalog } from "./practice-check-catalog";
import ledger from "../docs/engineering/native-archive-batch-1-sources.json";

for (const definition of olympiadDefinitions) {
  test(definition.problemId + " has bounded typed fields and accepts the verified reference forms", () => {
    const metadata = publicArchiveMetadata(definition);
    assert.equal(metadata.problemId, definition.problemId);
    assert.equal(metadata.parts.length, definition.parts.length);
    for (const part of definition.parts) {
      if (part.kind === "self-review") {
        assert.equal(checkArchivePart(part, "anything", definition.problemId).status, "self-review");
      } else {
        const input = part.kind === "numeric" ? String(part.target) : part.canonical;
        assert.equal(checkArchivePart(part, input, definition.problemId).status, "correct", part.id + ": " + input);
        assert.notEqual(checkArchivePart(part, part.wrong[0], definition.problemId).status, "correct", part.id + " must reject a changed result");
      }
      assert.equal(Object.hasOwn(metadata.parts.find(p => p.id === part.id)!, "canonical"), false);
    }
    assert.throws(() => gradeArchiveAnswers({ problemId: definition.problemId, version: "0".repeat(64), answers: [] }), e => e instanceof ArchiveGradeRequestError && e.status === 409);
    assert.throws(() => gradeArchiveAnswers({ problemId: definition.problemId, version: archiveVersion(definition), answers: [{ partId: "not-a-part", latex: "1" }] }), e => e instanceof ArchiveGradeRequestError && e.status === 400);
    const response = gradeArchiveAnswers({ problemId: definition.problemId, version: archiveVersion(definition), answers: [] });
    assert.equal(response.results.length, metadata.parts.length);
  });
}
test("independently rearranged source results agree and common physical errors do not", () => {
  const cases = [
    ["eupho-2018-t1", "answer", "\\sqrt{10}\\ell/2", "\\sqrt{3}\\ell"],
    ["eupho-2018-t3", "a", "\\lambda/(1.5\\sqrt[3]{n})", "\\lambda*n^{1/3}"],
    ["ipho-2012-t2", "a.i", "\\sqrt[3]{0.75\\sigma*d/(\\rho*g)}", "\\sqrt{3\\sigma*d/(4\\rho*g)}"],
    ["ipho-2012-t2", "a.ii", "\\varphi/(1/(4\\pi\\epsilon_0*r))", "2\\pi\\epsilon_0*\\varphi*r"],
    ["ipho-2012-t2", "b.iii", "\\sqrt{0.5*H*\\sigma*d/(\\epsilon_0*r_0)}", "\\sqrt{H*\\sigma*d/(\\epsilon_0*r_0)}"],
    ["apho-2012-t1", "i.1", "g/(k/m)", "m*k/g"],
    ["apho-2012-t1", "i.2", "m*g*t/k-m^2*g/k^2*(1-\\exp(-k*t/m))", "m*g*t/k"],
    ["apho-2012-t1", "i.11", "(\\mu_0*p/a^2)^2/R_0", "\\mu_0*p^2/(a^4*R_0)"],
  ];
  for (const [id, partId, equal, wrong] of cases) {
    const part = olympiadDefinitions.find(d => d.problemId === id)!.parts.find(p => p.id === partId)!;
    assert.equal(checkArchivePart(part, equal, id).status, "correct", id + " " + partId);
    assert.notEqual(checkArchivePart(part, wrong, id).status, "correct", id + " " + partId);
  }
  // Pressure balance with negligible vapour/column pressure, independently evaluated from the statement data.
  const currentKA = 0.2 / 6000 * Math.sqrt(2 * 101000 / (9.04e-6 * 12.57e-7)) / 1000;
  assert.equal(checkArchivePart(olympiadDefinitions.find(d => d.problemId === "eupho-2018-t2")!.parts[0], String(currentKA), "eupho-2018-t2").status, "correct");
});
test("the existing account-persistence catalogue is unchanged and excludes stateless olympiad checks", () => {
  assert.equal(archiveDefinitions.length, 30);
  assert.equal(practiceCheckCatalog().length, 30);
  assert.ok(practiceCheckCatalog().every(p => !(nativeOlympiadIds as readonly string[]).includes(p.metadata.problemId)));
});
const index = JSON.parse(readFileSync("lib/corpus/import-index.json", "utf8"));
for (const id of nativeOlympiadIds) test(id + " is a complete native document with locally sourced figures and valid LaTeX", () => {
  const record = importedProblemSchema.parse(JSON.parse(readFileSync("public" + index.problems.find((p: { id: string }) => p.id === id).path, "utf8")));
  for (const kind of ["statement", "solution"] as const) {
    const doc = record[kind];
    assert.equal(doc.format, "html");
    if (doc.format !== "html") throw Error("native required");
    assert.equal(doc.shared, false);
    const source = ledger.find(l => l.id === id && l.kind === kind)!;
    assert.equal(createHash("sha256").update(readFileSync("public" + doc.referencePdf)).digest("hex"), source.originalSha256);
    let equations = 0;
    const walk = (nodes: ImportedNode[]) => nodes.forEach(n => {
      if (n.type === "text") {
        for (const m of n.text.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)) {
          katex.renderToString(m[1] ?? m[2], { throwOnError: true, displayMode: m[2] !== undefined, strict: "ignore" });
          equations++;
        }
      } else if (n.tag === "img") {
        assert.ok(n.alt && n.alt.length > 20);
        assert.ok(doc.figures.includes(n.src!));
        assert.ok(readFileSync("public" + n.src!).length > 1000);
      } else walk(n.children ?? []);
    });
    walk(doc.nodes);
    assert.ok(equations > 0);
  }
});
test("shared EuPhO source papers are split by actual problem, with source errors disclosed", () => {
  const get = (id: string) => JSON.parse(readFileSync("public" + index.problems.find((p: { id: string }) => p.id === id).path, "utf8"));
  assert.doesNotMatch(get("eupho-2018-t1").statement.text, /Solenoid|Staircase/);
  assert.doesNotMatch(get("eupho-2018-t2").statement.text, /Three balls|Staircase/);
  assert.match(get("eupho-2018-t3").solution.text, /inconsistent with the statement/);
  assert.match(get("eupho-2018-t1").solution.text, /unordered pair/);
  assert.equal(get("apho-2012-t1").statement.nodes.filter((n: ImportedNode) => n.type === "element" && n.tag === "h3").length, 11);
  assert.equal(get("ipho-2012-t2").statement.nodes.filter((n: ImportedNode) => n.type === "element" && n.tag === "h3").length, 6);
});
