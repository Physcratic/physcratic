import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StructTreeItem from "react-pdf/dist/StructTreeItem.js";
import { normalizeStructTreeNode } from "react-pdf/dist/shared/structTreeUtils.js";
import type { StructTreeNodeWithExtraAttributes as Node } from "react-pdf/dist/shared/types.js";
import type { StructTreeContent } from "pdfjs-dist/types/src/display/api.js";

type Tree = Node | StructTreeContent;
const content = (id: string): StructTreeContent => ({ type: "content", id });
const node = (role: string, ...children: Tree[]): Node => ({ role, children });
const inline = (id: string): Node => node("Span", content(id));
const render = (tree: Tree) => renderToStaticMarkup(React.createElement(StructTreeItem, { node: tree }));
const owners = (html: string) => [...html.matchAll(/aria-owns="([^"]+)"/g)].map(m => m[1]);
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test("actual patched renderer retains cells, inline owners and reading order without mutation", () => {
  const row = freeze(node("TR", node("TH", content("heading")), node("TD", content("body")), inline("tail-1"), inline("tail-2")));
  const before = JSON.stringify(row);
  const normalized = normalizeStructTreeNode(row);
  assert.equal(normalized.children.length, 2);
  assert.deepEqual(normalized.children[1], node("TD", content("body"), inline("tail-1"), inline("tail-2")));
  const html = render(row);
  assert.deepEqual(owners(html), ["heading", "body", "tail-1", "tail-2"]);
  assert.equal((html.match(/role="cell"/g) ?? []).length, 1);
  assert.equal((html.match(/role="columnheader"/g) ?? []).length, 1);
  assert.ok(html.endsWith('<span aria-owns="tail-1"></span><span aria-owns="tail-2"></span></span></span>'));
  assert.equal(JSON.stringify(row), before);
  assert.doesNotMatch(html, /aria-hidden|display:|role="none"/);
});

test("redundant bare list wrappers collapse without losing list items or inner metadata", () => {
  const inner = { ...node("L", node("LI", content("a")), node("LI", content("b"))), lang: "en", alt: "Questions" };
  const outer = freeze(node("L", node("L", inner)));
  assert.equal(normalizeStructTreeNode(outer), inner);
  const html = render(outer);
  assert.equal((html.match(/role="list"/g) ?? []).length, 1);
  assert.equal((html.match(/role="listitem"/g) ?? []).length, 2);
  assert.match(html, /aria-label="Questions" lang="en"/);
  assert.deepEqual(owners(html), ["a", "b"]);
});

test("valid tables, nested item lists, headings and content leaves stay untouched", () => {
  for (const tree of [node("TR", node("TD", content("a")), node("TD", content("b"))), node("L", node("LI", node("L", node("LI", content("nested"))))), { ...node("H2", content("h")), lang: "hr", alt: "Heading" }, content("leaf")]) {
    assert.equal(normalizeStructTreeNode(tree), tree);
  }
  assert.match(render({ ...node("H2", content("h")), lang: "hr", alt: "Heading" }), /role="heading" aria-level="2" aria-label="Heading" lang="hr" aria-owns="h"/);
});

test("ambiguous row tags and meaningful outer list metadata are not guessed away", () => {
  const cell = node("TD", content("cell"));
  for (const tree of [node("TR", inline("orphan")), node("TR", inline("leading"), cell), node("TR", inline("leading"), cell, inline("tail")), node("TR", cell, inline("middle"), cell, inline("tail")), node("TR", cell, node("P", content("block"))), node("TR", cell, { ...inline("labelled"), alt: "Important" }), node("TR", cell, node("Span", node("Figure", content("image")))), node("TR", cell, node("Span", { type: "object", id: "object" })), { ...node("L", node("L", node("LI", content("a")))), lang: "en" }, { ...node("L", node("L", node("LI", content("a")))), alt: "Outer group" }]) {
    assert.equal(normalizeStructTreeNode(tree), tree);
  }
});

test("actual 2010 PDF tag tree retains every content owner, order and original cell count", async () => {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(readFileSync(new URL("../public/corpus/documents/english-ipho-2010-t1-statement/document.pdf", import.meta.url))) });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const tree = await page.getStructTree();
    assert.ok(tree);
    const ids: string[] = [];
    function collect(n: Tree) {
      if ("id" in n) ids.push(n.id);
      else n.children.forEach(collect);
    }
    collect(tree);
    const before = JSON.stringify(tree);
    const html = render(freeze(tree));
    assert.deepEqual(owners(html), ids);
    assert.equal((html.match(/role="cell"/g) ?? []).length, 3);
    assert.equal((html.match(/role="row"/g) ?? []).length, 2);
    assert.equal((html.match(/role="list"/g) ?? []).length, 2);
    assert.equal((html.match(/role="listitem"/g) ?? []).length, 4);
    assert.equal(JSON.stringify(tree), before);
  } finally { await task.destroy(); }
});


test("row repair preserves cell metadata and genuine nested-list hierarchy", () => {
  const cell = { ...node("TD", content("caption")), alt: "Caption", lang: "en", colSpan: 2, headers: ["figure"] };
  const row = node("TR", cell, inline("end"));
  const repaired = normalizeStructTreeNode(row);
  assert.deepEqual(repaired.children[0], { ...cell, children: [...cell.children, inline("end")] });
  assert.match(render(row), /role="cell" aria-label="Caption" lang="en"/);
  const list = node("L", node("LI", content("parent"), node("L", node("LI", content("child")))));
  assert.equal(normalizeStructTreeNode(list), list);
  assert.equal((render(list).match(/role="list"/g) ?? []).length, 2);
  assert.deepEqual(owners(render(list)), ["parent", "child"]);
});
