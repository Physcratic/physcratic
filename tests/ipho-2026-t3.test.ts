import assert from "node:assert/strict"
import test from "node:test"
import * as React from "react"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync } from "node:fs"
import { ImportedSourceContent } from "../components/physics/imported-source-content"
import { importedProblemSchema } from "../lib/imported-corpus-schema"

// Match the existing native tests under tsx's classic JSX runtime.
Object.assign(globalThis, { React })
const source = importedProblemSchema.parse(JSON.parse(readFileSync("public/corpus/english-problems/ipho-2026-t3.json", "utf8")))
for (const kind of ["statement", "solution"] as const) {
  test(`T3 ${kind} renders the complete official questions, maths and source figures`, () => {
    const doc = source[kind]
    if (doc.format !== "html") throw new Error("Expected native document")
    const html = renderToStaticMarkup(createElement(ImportedSourceContent, { nodes: doc.nodes, language: "en" }))
    assert.doesNotMatch(html, /katex-error|<script|<iframe/)
    assert.match(html, /<math/)
    assert.match(html, /tabindex="0" role="group" aria-label="Equation"/)
    for (const code of ["A1", "A2", "A3", "B1", "B2", "C1", "C2", "C3", "C4", "C5"]) {
      const prefix = kind === "solution" && code === "A1" ? "T1" : "T3"
      assert.ok(html.includes(`${prefix}-${code}`), code)
    }
    for (const src of doc.figures) assert.ok(html.includes(`src="${src}"`), src)
    if (kind === "statement") {
      assert.match(html, /<table><thead><tr><th>IDEAL GAS<\/th><th>PARAMAGNETIC TORUS<\/th><\/tr><\/thead><tbody>/)
      assert.match(html, /Heat capacity at constant/)
      assert.match(html, /potassium chromate/)
    } else {
      assert.match(html, /Chashing abolute zero/)
      assert.match(html, /0\.99008/)
    }
  })
}
