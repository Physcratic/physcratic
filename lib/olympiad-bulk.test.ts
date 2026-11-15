import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import React, { createElement } from "react";
import { ImportedSourceContent } from "../components/physics/imported-source-content";
import { importedProblemSchema, type ImportedNode } from "./imported-corpus-schema";
import { bulkParts } from "./olympiad/keys-bulk";
import tasks from "./olympiad/bulk-tasks.json";
import ids from "./olympiad/bulk-native-ids.json";
import inventory from "../docs/engineering/native-archive-inventory.json";
import { publicArchiveMetadata } from "./archive-grading/catalog";
import { olympiadDefinitions } from "./olympiad/keys";

test("the entire archive has native documents and honest response controls", () => {
  assert.equal(inventory.total, 112);
  assert.equal(inventory.native, 112);
  assert.ok(inventory.problems.every(p => p.answerFields && p.statementFormat === "html" && p.solutionFormat === "html"));
  assert.equal(ids.length, 100);
  assert.equal(Object.values(tasks).reduce((count, parts) => count + parts.length, 0), 978);
  for (const id of ids) {
    const definition = olympiadDefinitions.find(d => d.problemId === id)!;
    const metadata = publicArchiveMetadata(definition);
    assert.equal(metadata.parts.length, tasks[id as keyof typeof tasks].length, id);
    assert.ok(bulkParts[id].every(p => p.kind === "self-review" && (p.responseFormat === "math" || p.responseFormat === "text")), id);
    assert.ok(metadata.parts.every(p => p.kind === "self-review"), id);
    assert.ok(new Set(metadata.parts.map(p => p.id)).size === metadata.parts.length, id);
    assert.doesNotMatch(JSON.stringify(metadata), /"(?:canonical|target|alternatives|absTol|relTol)"/);
  }
  assert.deepEqual(tasks["ipho-2025-t1"].map(p => p.sourcePart), ["A.1", "A.2", "A.3", "A.4", "A.5", "B.1", "B.2", "B.3", "C.1", "C.2", "C.3", "C.4", "C.5", "D.1", "D.2", "D.3", "D.4"]);
});

test("native tables and lettered subparts retain bounded structural attributes", () => {
  (globalThis as { React?: unknown }).React = React;
  const nodes: ImportedNode[] = [
    { type: "element", tag: "ol", start: 3, listType: "a", children: [{ type: "element", tag: "li", children: [{ type: "text", text: "Find the force." }] }] },
    { type: "element", tag: "table", children: [{ type: "element", tag: "tbody", children: [{ type: "element", tag: "tr", children: [{ type: "element", tag: "td", colSpan: 2, rowSpan: 3, children: [{ type: "text", text: "Measured values" }] }] }] }] },
  ];
  const html = renderToStaticMarkup(createElement(ImportedSourceContent, { nodes, language: "en" }));
  assert.match(html, /start="3" type="a"/);
  assert.match(html, /list-style-type:lower-alpha/);
  assert.match(html, /colSpan="2" rowSpan="3"/i);
  const document = { format: "html", nodes, text: "Source text ".repeat(10), figures: [], shared: false };
  const base = { id: "ipho-2025-t1", importedOn: "2026-11-15", language: "en", sources: [{ kind: "statement", url: "https://example.test/problem" }, { kind: "solution", url: "https://example.test/solution" }], statement: document, solution: document };
  assert.equal(importedProblemSchema.safeParse(base).success, true);
  assert.equal(importedProblemSchema.safeParse({ ...base, statement: { ...document, nodes: [{ type: "element", tag: "td", colSpan: 10001 }] } }).success, false);
});
