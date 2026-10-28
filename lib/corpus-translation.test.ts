import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import index from "./corpus/translation-index.json";
import { importedProblemSchema, type ImportedNode } from "./imported-corpus-schema";
import { containsRussian, sourceText, translationSchema } from "./corpus-translation";
import { assessSolutionSource } from "./corpus-readiness";

const hash = (data: string) => createHash("sha256").update(data).digest("hex");
const read = (path: string) => readFileSync(`public${path}`, "utf8");
const shape = (nodes: ImportedNode[]): unknown[] => nodes.map((node): unknown => node.type === "text" ? "text" : { tag: node.tag, src: node.src, alt: node.alt, children: shape(node.children ?? []) });

test("every published translation is tied to the exact source and preserves every structural node and diagram", () => {
  assert.equal(index.translated, index.records.length);
  assert.equal(index.audit.length, index.russianSourceCount);
  for (const record of index.records) {
    const raw = read(record.path);
    assert.equal(hash(raw), record.sha256);
    const translation = translationSchema.parse(JSON.parse(raw));
    const originalRaw = read(`/corpus/problems/${record.id}.json`);
    assert.equal(translation.sourceSha256, hash(originalRaw));
    const original = importedProblemSchema.parse(JSON.parse(originalRaw));
    for (const kind of ["statement", "solution"] as const) {
      const source = original[kind];
      const translated = translation.content[kind];
      assert.equal(source.format, "html");
      assert.equal(translated.format, "html");
      if (source.format === "html" && translated.format === "html") {
        assert.deepEqual(shape(translated.nodes), shape(source.nodes));
        assert.deepEqual(translated.figures, source.figures);
        assert.equal(translated.text, sourceText(translated.nodes));
        if (translation.method === "editorial") assert.equal(containsRussian(translated.text), false);
      }
    }
    assert.deepEqual(translation.content.sources, original.sources);
    assert.equal(translation.reviewStatus, "independent-physics-review-pending");
  }
});

test("the English pilot includes every subpart, SI units and unchanged numerical data", () => {
  const translated = translationSchema.parse(JSON.parse(read("/corpus/translations/apho-2014-t2.json")));
  const text = translated.content.statement.text;
  for (const subpart of ["a", "b", "c.1", "c.2", "d.1", "d.2", "d.3", "d.4", "d.5"]) assert.ok(text.includes(subpart));
  for (const value of ["10~", "50~", "0.5~", "5~", "25~", "1.5~", "6.6", "10^{-34}", "1.6", "10^{-19}", "9.1", "10^{-31}", "10^8"]) assert.ok(text.includes(value), value);
  assert.equal(assessSolutionSource(translated.content).status, "missing-derivation");
});

test("the readiness audit covers every Russian source and never treats a source as an approved grader", () => {
  const originals = readdirSync("public/corpus/problems").map((name) => importedProblemSchema.parse(JSON.parse(read(`/corpus/problems/${name}`))));
  const russian = originals.filter((problem) => problem.language === "ru");
  assert.equal(russian.length, 45);
  for (const source of originals) assert.equal(assessSolutionSource(source).canGrade, false);
  for (const source of russian) assert.equal(index.audit.find((record) => record.id === source.id)?.solutionStatus, assessSolutionSource(source).status);
  assert.equal(index.audit.filter((record) => record.solutionStatus === "missing-derivation").length, 18);
  assert.equal(assessSolutionSource(russian.find((record) => record.id === "apho-2014-t2")!).status, "missing-derivation");
  assert.equal(assessSolutionSource(russian.find((record) => record.id === "apho-2025-t2")!).status, "review-required");
});
