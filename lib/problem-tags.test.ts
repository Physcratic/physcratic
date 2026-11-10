import assert from "node:assert/strict";
import test from "node:test";
import { problems } from "./physics";
import { corpusProblems, filterCorpus } from "./corpus-pilot";
import {
  filterProblemsByTag,
  getProblemTags,
  getTagOptions,
} from "./problem-tags";
import { catalogProblems, filterCatalog } from "./corpus-catalog";
import arena from "./arena/index.json";

test("archive counts use the selected subject or concept, including secondary topic tags", () => {
  const fixture = [
    { topic: "Mechanics", tags: ["Electromagnetism"] },
    { topics: ["Modern", "Electromagnetism"] },
    { topic: "Optics", tags: ["Interference"] },
  ];
  assert.deepEqual(
    filterProblemsByTag(fixture, "Electromagnetism"),
    fixture.slice(0, 2),
  );
  assert.deepEqual(filterProblemsByTag(fixture, "Modern physics"), [
    fixture[1],
  ]);
  assert.deepEqual(filterProblemsByTag(fixture, "Interference"), [fixture[2]]);
  assert.deepEqual(filterProblemsByTag(fixture, "all"), fixture);
  assert.deepEqual(filterProblemsByTag(fixture), fixture);
  assert.deepEqual(filterProblemsByTag(fixture, "Nonexistent"), []);
});

test("collection counts match the same tagged problems their readers display", () => {
  const tag = "Electromagnetism";
  assert.deepEqual(
    filterProblemsByTag(catalogProblems, tag),
    filterCatalog({ topic: tag }),
  );
  assert.deepEqual(
    filterProblemsByTag(corpusProblems, tag),
    filterCorpus({ topic: tag }),
  );
  for (const collection of [
    catalogProblems,
    arena.problems,
    corpusProblems,
    problems,
  ]) {
    const scoped = filterProblemsByTag<Parameters<typeof getProblemTags>[0]>(
      collection,
      tag,
    );
    assert.ok(scoped.length < collection.length);
    assert.ok(scoped.every((problem) => getProblemTags(problem).includes(tag)));
  }
});

test("practice problems expose subject and concept as reusable tags", () => {
  for (const problem of problems) {
    assert.deepEqual(getProblemTags(problem), [problem.topic, problem.concept]);
  }
});

test("catalog statement language is available as a tag and filter", () => {
  assert.ok(getTagOptions(catalogProblems).includes("English"));
  assert.equal(filterCatalog({ topic: "English" }).length, 103)
  assert.equal(filterCatalog({ topic: "Russian" }).length, 0);
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
