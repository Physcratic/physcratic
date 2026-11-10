import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { catalogProblems } from "./corpus-catalog";
import {
  importedProblemSchema,
  type ImportedNode,
} from "./imported-corpus-schema";
import manifest from "./corpus/import-manifest.json";

const readLocal = (path: string) => readFileSync(`public${path}`);
const content = catalogProblems.map((problem) =>
  importedProblemSchema.parse(
    JSON.parse(readLocal(problem.importPath).toString()),
  ),
);

test("every one of the 102 catalog problems has complete local statement and solution content", () => {
  assert.equal(content.length, 102)
  assert.equal(manifest.count, 102)
  assert.equal(new Set(content.map((problem) => problem.id)).size, 102)
  for (const problem of content) {
    assert.equal(
      problem.id,
      catalogProblems.find((record) => record.id === problem.id)?.id,
    );
    for (const document of [problem.statement, problem.solution]) {
      assert.ok(document.text.length >= 80, problem.id);
      if (document.format === "pdf") {
        assert.equal(
          readLocal(document.pdf).subarray(0, 5).toString(),
          "%PDF-",
        );
        if (document.pages.length) assert.equal(document.pages.length, document.sourcePages.length);
        assert.ok(document.initialPage <= document.sourcePages.length);
        if (document.appendix) {
          assert.equal(
            readLocal(document.appendix.pdf).subarray(0, 5).toString(),
            "%PDF-",
          );
          for (const image of document.appendix.pages)
            assert.ok(readLocal(image.src).length > 0);
        }
        assert.ok(
          document.pages.every(
            (page) => readLocal(page.src).subarray(8, 12).toString() === "WEBP",
          ),
        );
      } else {
        assert.ok(document.nodes.length);
        const walk = (nodes: ImportedNode[]) =>
          nodes.forEach((node) => {
            if (node.type === "element") {
              if (node.tag === "img") {
                assert.ok(document.figures.includes(node.src!));
                assert.ok(readLocal(node.src!).length > 0);
                assert.ok(node.alt);
              }
              if (node.children) walk(node.children);
            }
          });
        walk(document.nodes);
      }
    }
  }
});

test("the downloadable corpus contains all statements and solutions, not only links", () => {
  const collection = JSON.parse(
    readLocal("/corpus/collection.json").toString(),
  );
  assert.equal(collection.count, 102)
  assert.equal(collection.problems.length, 102)
  for (const source of collection.problems) {
    const parsed = importedProblemSchema.parse(source);
    assert.ok(parsed.statement.text.length >= 80);
    assert.ok(parsed.solution.text.length >= 80);
  }
});

test("every copied file has the recorded byte size and SHA-256 content hash", () => {
  assert.ok(manifest.assets.length >= 700);
  assert.ok(
    manifest.assets.reduce((sum, asset) => sum + asset.bytes, 0) > 50_000_000,
  );
  for (const asset of manifest.assets) {
    const data = readLocal(asset.path);
    assert.equal(data.length, asset.bytes, asset.path);
    assert.equal(
      createHash("sha256").update(data).digest("hex"),
      asset.sha256,
      asset.path,
    );
  }
});

test("2019 official solutions are split by the actual solution code, not the repeated Q1 running header", () => {
  for (const [id, pages] of [
    ["ipho-2019-t1", 4],
    ["ipho-2019-t2", 5],
    ["ipho-2019-t3", 3],
  ] as const) {
    const solution = content.find((problem) => problem.id === id)!.solution;
    assert.equal(solution.format, "pdf");
    if (solution.format === "pdf") assert.equal(solution.sourcePages.length, pages);
  }
});

test("all 75 IPhO and APhO imports use original English problem and solution PDFs", () => {
  const originals = content.filter((record) => /^(ipho|apho)-/.test(record.id) && !record.id.startsWith("ipho-2026-"))
  assert.equal(originals.length, 75);
  for (const problem of originals) {
    assert.equal(problem.language, "en", problem.id);
    assert.equal(problem.statement.format, "pdf", problem.id);
    assert.equal(problem.solution.format, "pdf", problem.id);
    for (const source of problem.sources) {
      assert.match(source.url, /^https:\/\/olimpicos\.net\/files\/(ipho|apho)\//);
      assert.doesNotMatch(source.url, /_tex\.pdf$/);
      assert.ok(source.note?.includes("Original English"));
    }
  }
});

test("imported source schemas reject executable markup and remote image references", () => {
  const source = importedProblemSchema.parse(JSON.parse(readLocal("/corpus/problems/apho-2014-t2.json").toString()));
  for (const node of [
    { type: "element", tag: "script", children: [] },
    {
      type: "element",
      tag: "img",
      src: "https://pho.rs/tracker",
      alt: "external",
    },
    {
      type: "element",
      tag: "img",
      src: "/corpus/../../secret",
      alt: "traversal",
    },
  ]) {
    assert.equal(
      importedProblemSchema.safeParse({
        ...source,
        statement: { ...source.statement, nodes: [node] },
      }).success,
      false,
    );
  }
});
