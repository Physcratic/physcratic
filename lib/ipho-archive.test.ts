import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToString } from "katex";
import {
  iphoExperimentCount,
  iphoPapers,
  iphoPdf,
  iphoSubproblems,
  iphoTheoryCount,
} from "./ipho-archive";
import { iphoTasks } from "./ipho-checks";

const expectedParts = {
  t1: { A: 5, B: 3, C: 5, D: 4 },
  t2: { A: 3, B: 3, C: 5 },
  t3: { A: 6, B: 3, C: 3 },
  e1: { A: 6, B: 6 },
  e2: { A: 4, B: 8 },
};

test("all 64 official numbered subproblems are present, ordered, and unique", () => {
  assert.equal(iphoSubproblems.length, 64);
  assert.equal(iphoTheoryCount, 40);
  assert.equal(iphoExperimentCount, 24);
  assert.equal(new Set(iphoSubproblems.map((task) => task.id)).size, 64);
  for (const paper of iphoPapers) {
    const expected = Object.entries(expectedParts[paper.id]).flatMap(
      ([letter, count]) =>
        Array.from({ length: count }, (_, index) => `${letter}.${index + 1}`),
    );
    const actual = iphoSubproblems.filter((task) => task.paperId === paper.id);
    assert.deepEqual(
      actual.map((task) => task.part),
      expected,
      paper.code,
    );
    assert.equal(
      Math.round(actual.reduce((sum, task) => sum + task.points, 0) * 10),
      100,
      `${paper.code} must total 10 points`,
    );
    for (const task of actual) {
      assert.ok(task.title && task.prompt.length > 60);
      assert.ok(task.page >= 1 && task.page <= paper.pages);
      assert.ok(
        task.solutionPage >= 1 && task.solutionPage <= paper.solutionPages,
      );
      assert.ok(
        paper.sections.some((section) => task.part.startsWith(section.letter)),
      );
      const model = task.model;
      if (model)
        assert.doesNotThrow(() =>
          renderToString(model.slice(2, -2), { throwOnError: true }),
        );
    }
  }
});

test("every paper has real question, solution, and answer-sheet PDFs and readable page assets", () => {
  for (const paper of iphoPapers) {
    for (const kind of ["questions", "solutions", "answer-sheet"] as const) {
      const path = iphoPdf(paper.id, kind).split("#")[0];
      const pdf = readFileSync(`public${path}`);
      assert.equal(pdf.subarray(0, 5).toString(), "%PDF-", path);
      assert.ok(pdf.length > 10000, path);
    }
    for (const [kind, count] of [
      ["", paper.pages],
      ["solution-", paper.solutionPages],
    ] as const) {
      for (let page = 1; page <= count; page++) {
        const image = readFileSync(
          `public/ipho/2025-${paper.id}-${kind}page-${page}.webp`,
        );
        assert.equal(image.subarray(8, 12).toString(), "WEBP");
        assert.ok(image.length > 1000);
      }
    }
  }
});

test("all three existing symbolic adaptations map to their exact original subpart", () => {
  const adapted = iphoSubproblems.filter((task) => task.symbolicTaskId);
  assert.equal(adapted.length, 3);
  assert.deepEqual(
    adapted.map((task) => `${task.paperId}:${task.part}`),
    ["t1:A.1", "t2:A.1", "t3:A.2"],
  );
  assert.deepEqual(
    adapted.map((task) => task.symbolicTaskId),
    iphoTasks.map((task) => task.id),
  );
});

test("source links target the correct paper and requested page", () => {
  assert.equal(
    iphoPdf("e2", "solutions", 12),
    "/ipho/2025-e2-solutions.pdf#page=12",
  );
  assert.equal(
    iphoPdf("t1", "answer-sheet"),
    "/ipho/2025-t1-answer-sheet.pdf#page=1",
  );
});
