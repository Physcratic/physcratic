import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToString } from "katex";
import {
  corpusDocument,
  corpusPilot,
  corpusProblems,
  filterCorpus,
} from "./corpus-pilot";
import { corpusProblemSchema } from "./corpus-schema";

const partCounts: Record<string, number> = {
  "ipho-2011-t1": 4,
  "ipho-2015-t1": 14,
  "ipho-2025-t1": 17,
  "ipho-2025-t2": 11,
  "ipho-2025-t3": 12,
};

test("pilot has five complete theory sources, 58 scored tasks, and unique stable IDs", () => {
  assert.equal(corpusProblems.length, 5);
  assert.equal(new Set(corpusProblems.map((problem) => problem.id)).size, 5);
  assert.deepEqual(
    [...new Set(corpusProblems.map((problem) => problem.year))],
    [2011, 2015, 2025],
  );
  assert.equal(
    corpusProblems.reduce((sum, problem) => sum + problem.parts.length, 0),
    58,
  );
  for (const problem of corpusProblems) {
    assert.equal(problem.parts.length, partCounts[problem.id]);
    assert.ok(corpusProblemSchema.safeParse(problem).success);
    for (const block of problem.context) {
      if (block.type === "math")
        assert.doesNotThrow(() =>
          renderToString(block.value.slice(2, -2), {
            throwOnError: true,
            trust: false,
          }),
        );
    }
    for (const part of problem.parts) {
      if (part.model)
        assert.doesNotThrow(() =>
          renderToString(part.model!.slice(2, -2), {
            throwOnError: true,
            trust: false,
          }),
        );
    }
  }
});

test("every source PDF and original-page image exists and matches its SHA-256 manifest", () => {
  const paths = new Set<string>();
  for (const problem of corpusProblems) {
    for (const kind of ["questions", "solutions"] as const) {
      const source = corpusDocument(problem, kind);
      paths.add(source.pdf.split("#")[0]);
      assert.equal(
        readFileSync(`public${source.pdf.split("#")[0]}`)
          .subarray(0, 5)
          .toString(),
        "%PDF-",
      );
      for (let page = 1; page <= source.pages; page++) {
        const image = corpusDocument(problem, kind, page).image;
        paths.add(image);
        assert.equal(
          readFileSync(`public${image}`).subarray(8, 12).toString(),
          "WEBP",
        );
      }
    }
  }
  assert.equal(paths.size, 93);
  assert.equal(corpusPilot.integrity.assets.length, paths.size);
  for (const asset of corpusPilot.integrity.assets) {
    assert.ok(
      paths.delete(asset.path),
      `Missing or duplicate asset: ${asset.path}`,
    );
    const file = readFileSync(`public${asset.path}`);
    assert.equal(file.length, asset.bytes);
    assert.equal(
      createHash("sha256").update(file).digest("hex"),
      asset.sha256,
      asset.path,
    );
  }
  assert.equal(paths.size, 0);
});

test("new native records preserve original assumptions, constants, and nested requests", () => {
  const threeBody = corpusProblems.find((problem) => problem.year === 2011)!;
  assert.match(
    threeBody.parts.find((part) => part.id === "1.3")!.prompt,
    /M = m/,
  );
  assert.equal(
    threeBody.parts.find((part) => part.id === "1.2")!.items?.length,
    3,
  );
  assert.equal(
    threeBody.parts.find((part) => part.id === "1.3")!.solutionPage,
    4,
  );
  const solar = corpusProblems.find((problem) => problem.year === 2015)!;
  const constants = solar.context.map((block) => block.value).join(" ");
  for (const value of ["2.00", "7.00", "3.85", "1.50", "11.65", "1.44", "5.54"])
    assert.ok(constants.includes(value));
  assert.match(constants, /one sixth/);
  assert.match(solar.parts.find((part) => part.id === "A7")!.prompt, /±0.25/);
});

test("schema rejects duplicate tasks, invalid page mappings, and incomplete mark totals", () => {
  const source = corpusProblems[0];
  assert.equal(
    corpusProblemSchema.safeParse({
      ...source,
      parts: [...source.parts, source.parts[0]],
    }).success,
    false,
  );
  assert.equal(
    corpusProblemSchema.safeParse({
      ...source,
      parts: source.parts.map((part, index) =>
        index ? part : { ...part, page: 100 },
      ),
    }).success,
    false,
  );
  assert.equal(
    corpusProblemSchema.safeParse({ ...source, parts: source.parts.slice(1) })
      .success,
    false,
  );
  assert.equal(
    corpusProblemSchema.safeParse({
      ...source,
      sourceUrl: "javascript:alert(1)",
    }).success,
    false,
  );
});

test("corpus search composes source, year, concepts, subpart text and estimated difficulty", () => {
  assert.equal(filterCorpus({ query: "  2015  " }).length, 1);
  assert.equal(filterCorpus({ query: "Cherenkov" })[0]?.year, 2015);
  assert.equal(filterCorpus({ topic: "Optics" }).length, 1);
  assert.equal(filterCorpus({ difficulty: "unrated" }).length, 0);
  assert.equal(filterCorpus({ difficulty: "1600-plus" }).length, 5);
  assert.equal(filterCorpus({ query: "2015", difficulty: "1600-plus" }).length, 1);
  assert.equal(filterCorpus({ difficulty: "1200-1599" }).length, 0);
  assert.equal(filterCorpus({ query: "not a real concept" }).length, 0);
  assert.equal(filterCorpus({ topic: "Electromagnetism" }).length, 0);
});

test("portable export distinguishes complete source pages from native restatements and unverified rights", () => {
  const exported = JSON.parse(JSON.stringify(corpusPilot));
  assert.equal(exported.schemaVersion, "1.0.0");
  assert.equal(exported.reuse.license, null);
  assert.equal(exported.reuse.status, "permission-review-required");
  assert.equal(exported.grading.rated, false);
  assert.equal(exported.grading.elo, null);
  assert.equal(exported.importedAt, null);
  for (const problem of exported.problems) {
    assert.equal(problem.statement.pages.length, problem.pages);
    assert.equal(problem.solution.pages.length, problem.solutionPages);
    assert.equal(problem.rating.elo, null);
    assert.ok(problem.sourceUrl.startsWith("https://"));
    assert.equal(problem.statement.mode, "original-pages-with-editorial-index");
  }
  assert.equal(corpusDocument(corpusProblems[0], "questions", -5).page, 1);
  assert.equal(corpusDocument(corpusProblems[0], "solutions", 100).page, 7);
  assert.equal(corpusDocument(corpusProblems[0], "questions", NaN).page, 1);
});
