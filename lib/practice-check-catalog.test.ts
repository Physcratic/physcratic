import assert from "node:assert/strict";
import test from "node:test";
import { practiceCheckCatalog } from "./practice-check-catalog";
import { retiredPracticeIds } from "./legacy-practice";
import arena from "./arena/index.json";

test("current saved-practice catalogue retains Arena and excludes retired reader identities", () => {
  const catalogue = practiceCheckCatalog();
  assert.deepEqual(catalogue.map(entry => entry.metadata.problemId).sort(), arena.problems.map(problem => problem.id).sort());
  assert.ok(catalogue.every(entry => entry.kind === "arena"));
  for (const id of retiredPracticeIds) assert.equal(catalogue.some(entry => entry.metadata.problemId === id), false, id);
});
