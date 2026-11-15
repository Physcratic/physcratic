import assert from "node:assert/strict";
import test from "node:test";
import { browseArchive } from "./archive-browse";
import { allProblemPages } from "./seo/problem-pages";

const pages = allProblemPages();
const archive = pages.filter(page => page.kind === "archive");

test("every offered edition selects exactly its archive records, newest years first", () => {
  const initial = browseArchive(pages);
  assert.deepEqual(initial.problems, archive);
  const editions = [];
  for (const group of initial.groups) {
    const own = archive.filter(page => page.competition === group.competition);
    assert.deepEqual(browseArchive(pages, group.competition).problems, own);
    assert.deepEqual(group.choices.slice(1).map(choice => Number(choice.value.split("-")[1])), [...new Set(own.map(page => page.year))].sort((a, b) => b! - a!));
    for (const choice of group.choices.slice(1)) {
      const selection = browseArchive(pages, choice.value);
      assert.equal(selection.value, choice.value);
      assert.equal(selection.label, choice.label);
      assert.ok(selection.problems.length > 0);
      assert.deepEqual(selection.problems, own.filter(page => `${page.competition}-${page.year}` === choice.value));
      editions.push(...selection.problems.map(page => page.id));
    }
  }
  assert.equal(new Set(editions).size, archive.length);
  assert.equal(editions.length, archive.length);
});

test("invalid, unavailable and repeated editions recover to the complete archive", () => {
  for (const edition of [undefined, "", "IPhO-1900", "IPhO-2025-extra", "<script>", ["IPhO-2025"], ["IPhO", "APhO"]]) {
    const result = browseArchive(pages, edition);
    assert.equal(result.value, "");
    assert.deepEqual(result.problems, archive);
  }
});
