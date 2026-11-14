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
          kind: "roman",
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

test("lettered subparts stay one level even when letters are also Roman numerals", () => {
  const [section] = parseArenaDocument("(a) First.\n\n(b) Second.\n\n(c) Third.\n\n(d) Fourth.\n\n$$E=mc^2$$");
  assert.deepEqual(section.blocks, [{ type: "list", kind: "letter", items: [["(a) First."], ["(b) Second."], ["(c) Third."], ["(d) Fourth.", "$$E=mc^2$$"]] }]);
});

test("alphabetical question sequences do not suddenly indent at letter i", () => {
  const [section] = parseArenaDocument(Array.from("abcdefghi", (letter) => `(${letter}) Question.`).join("\n\n"));
  assert.equal(section.blocks.length, 1);
  assert.equal(section.blocks[0].type === "list" && section.blocks[0].kind, "letter");
});

test("numbered subparts and genuine Roman numerals have distinct list kinds", () => {
  const [section] = parseArenaDocument("(1) First.\n\n(2) Second.\n\n(i) Detail.\n\n(ii) Another detail.\n\n(c) Letter, not a Roman numeral.");
  assert.deepEqual(section.blocks.map((block) => block.type === "list" ? block.kind : block.type), ["number", "roman", "letter"]);
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
      // The 15 original Physcratic problems have no source PDF, so no file names either.
      (problem) =>
        problem.importedOn &&
        ("original" in problem && problem.original
          ? !("statementFile" in problem) && !("solutionFile" in problem)
          : "statementFile" in problem && problem.statementFile && problem.solutionFile),
    ),
  );
});
