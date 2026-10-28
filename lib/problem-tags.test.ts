import assert from "node:assert/strict";
import test from "node:test";
import { problems } from "./physics";
import { corpusProblems, filterCorpus } from "./corpus-pilot";
import { getProblemTags, getTagOptions } from "./problem-tags";

test("practice problems expose subject and concept as reusable tags", () => {
  for (const problem of problems) {
    assert.deepEqual(getProblemTags(problem), [problem.topic, problem.concept]);
  }
});

test("tag options contain all six subjects and deduplicated concepts", () => {
  const options = getTagOptions([...corpusProblems, ...problems]);
  assert.deepEqual(options.slice(0, 6), [
    "Mechanics",
    "Electromagnetism",
    "Waves",
    "Thermodynamics",
    "Optics",
    "Modern physics",
  ]);
  assert.ok(options.includes("Newton’s laws"));
  assert.ok(options.includes("Bohr model"));
  assert.equal(new Set(options).size, options.length);
});

test("imported filters support concept tags and modern physics without breaking legacy topics", () => {
  assert.equal(filterCorpus({ topic: "Bohr model" }).length, 1);
  assert.deepEqual(
    filterCorpus({ topic: "Modern physics" }),
    filterCorpus({ topic: "Modern" }),
  );
  assert.ok(filterCorpus({ query: "Modern physics" }).length > 0);
  for (const problem of filterCorpus({ topic: "Mechanics" })) {
    assert.ok(getProblemTags(problem).includes("Mechanics"));
  }
});
