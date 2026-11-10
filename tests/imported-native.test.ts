import assert from "node:assert/strict"
import test from "node:test"
import * as React from "react"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync } from "node:fs"
import { ImportedSourceContent } from "../components/physics/imported-source-content"
import { importedProblemSchema } from "../lib/imported-corpus-schema"

// tsx uses classic JSX for these existing components, Next uses the automatic runtime.
Object.assign(globalThis, { React })

const source = importedProblemSchema.parse(JSON.parse(readFileSync("public/corpus/english-problems/ipho-2026-t1.json", "utf8")))
for (const kind of ["statement", "solution"] as const) {
  test(`native ${kind} renders every question with accessible maths and local figures`, () => {
    const doc = source[kind]
    if (doc.format !== "html") throw new Error("Expected native document")
    const html = renderToStaticMarkup(createElement(ImportedSourceContent, { nodes: doc.nodes, language: "en" }))
    assert.doesNotMatch(html, /katex-error|<script|<iframe/)
    assert.match(html, /<math/)
    assert.match(html, /tabindex="0" role="group" aria-label="Equation"/)
    for (const code of ["A1", "B1", "B2", "C1", "C2"]) assert.ok(html.includes(`T1-${code}`), code)
    for (const src of doc.figures) assert.ok(html.includes(`src="${src}"`), src)
    if (kind === "solution") {
      assert.match(html, /SOLUTION 3:/)
      assert.match(html, /Special case:/)
    }
  })
}
