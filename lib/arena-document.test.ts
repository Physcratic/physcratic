import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import arena from "./arena/index.json";
import { parseArenaDocument } from "./arena-document";
import { arenaProvenance } from "./arena-schema";

test("Arena subproblems become separate sections with indented semantic subpart lists", () => {
  const sections = parseArenaDocument(
    "Introduction.\n\n## (a)\n\nContext.\n\n(i) First question.\n\n$$E=mc^2$$\n\n(ii) Second question.\n\n## (b)\n\nAnother question.",
  );
  assert.deepEqual(sections, [
    { blocks: [{ type: "paragraph", text: "Introduction." }] },
    {
      heading: "(a)",
      blocks: [
        { type: "paragraph", text: "Context." },
        {
          type: "list",
          items: [
            ["(i) First question.", "$$E=mc^2$$"],
            ["(ii) Second question."],
          ],
        },
      ],
    },
    {
      heading: "(b)",
      blocks: [{ type: "paragraph", text: "Another question." }],
    },
  ]);
});

test("sectioning every Arena statement and solution preserves all text, equations and figures in order", () => {
  for (const entry of arena.problems) {
    const problem = JSON.parse(readFileSync(`public${entry.path}`, "utf8"));
    for (const kind of ["statement", "solution"] as const) {
      const content: string = problem[kind];
      const restored = parseArenaDocument(content).flatMap((section) => [
        ...(section.heading ? [`## ${section.heading}`] : []),
        ...section.blocks.flatMap((block) =>
          block.type === "paragraph" ? [block.text] : block.items.flat(),
        ),
      ]);
      assert.deepEqual(
        restored,
        content
          .split(/\n\s*\n/)
          .map((text) => text.trim())
          .filter(Boolean),
        `${entry.id} ${kind}`,
      );
    }
  }
});

test("source provenance remains in the internal manifest after removing reader disclosure", () => {
  assert.deepEqual(arena.provenance, arenaProvenance);
  assert.ok(
    arena.problems.every(
      (problem) =>
        problem.statementFile && problem.solutionFile && problem.importedOn,
    ),
  );
});
