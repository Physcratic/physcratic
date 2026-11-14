import assert from "node:assert/strict";
import test from "node:test";
import { problems } from "./physics";
import { practiceProblemDescription } from "./problem-meta";
import { catalogProblems } from "./corpus-catalog";
import arena from "./arena/index.json";
import { findCopyProblems } from "./copy-rules";
import { problemDescription, problemPageMetadata } from "./seo/problem-descriptions";
import { problemGraph, problemSummary } from "./seo/json-ld";

test("all static public problems have distinct, concise descriptions and metadata identities", () => {
  const all = [...problems, ...catalogProblems, ...arena.problems];
  assert.ok(all.length > 0)
  const descriptions = all.map(problemDescription);
  assert.equal(new Set(descriptions).size, all.length);
  for (const problem of all) {
    const description = problemDescription(problem);
    assert.ok(description.length >= 70 && description.length <= 160, `${problem.id}: ${description.length}`);
    assert.deepEqual(findCopyProblems(description), [], problem.id);
    assert.doesNotMatch(description, /original English problem and solution PDFs/);
    const metadata = problemPageMetadata(problem);
    assert.equal(metadata.description, description);
    assert.deepEqual(metadata.alternates, { canonical: `/dashboard/problems/${problem.id}` });
    assert.equal(metadata.openGraph?.description, description);
  }
  assert.equal(new Set(all.map((p) => problemPageMetadata(p).title)).size, all.length)
});

test("the existing Open Graph/structured-data summary path uses editorial text without changing statements", () => {
  for (const problem of problems) {
    const original = structuredClone(problem);
    const description = problemDescription(problem);
    assert.equal(description, practiceProblemDescription(problem.id) ?? problem.prompt);
    assert.equal(problemSummary(problem), description);
    assert.equal(problemGraph(problem)[1].description, description);
    assert.deepEqual(problem, original);
  }
  assert.equal(problemSummary({ prompt: "x".repeat(900) }).length, 300);
});

test("accurate Arena summaries stay intact and long fallback text is bounded and cleaned", () => {
  for (const problem of arena.problems) assert.equal(problemDescription(problem), problem.summary);
  const summary = problemDescription({ prompt: "Some **motion** with $x$ and forces. ".repeat(15) });
  assert.ok(summary.length <= 160);
  assert.ok(summary.endsWith("…"));
  assert.doesNotMatch(summary, /\$|\*\*/);
  const description = problemDescription({ id: "toString", prompt: "A custom public problem." });
  assert.equal(description, "A custom public problem.");
});
