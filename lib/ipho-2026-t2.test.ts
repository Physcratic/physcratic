import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import katex from "katex"
import { importedProblemSchema, type ImportedNode } from "./imported-corpus-schema"
import { catalogProblems } from "./corpus-catalog"
import { assessSolutionSource } from "./corpus-readiness"
import { getEstimatedProblemElo } from "./problem-archive"
import { archiveStatementView, findProblemPage } from "./seo/problem-pages"
import { olympiadHost } from "./olympiad-hosts"
import sourceMap from "../docs/engineering/ipho-2026-t2-source-map.json"

const entry = catalogProblems.find((p) => p.id === "ipho-2026-t2")!
const source = importedProblemSchema.parse(JSON.parse(readFileSync(`public${entry.importPath}`, "utf8")))
const expressions = (text: string) => [...text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g)]
const nodeText = (node: ImportedNode): string => node.type === "text" ? node.text : (node.children ?? []).map(nodeText).join("")

export const t2Questions = [["A1", 1.5], ["B1", 2], ["B2", 1.5], ["B3", 0.5], ["C1", 0.5], ["C2", 2], ["C3", 1], ["C4", 1]] as const

test("T2 stays one complete native identity, self-review only with eight official allocations", () => {
  assert.equal(entry.title, "Cooking with sunlight?")
  assert.equal(entry.primaryTopic, "Optics")
  assert.equal(entry.hasPilotGuide, false)
  assert.equal(entry.rating.status, "unrated")
  assert.equal(entry.reviewStatus, "independent-review-pending")
  assert.equal(assessSolutionSource(source).canGrade, false)
  assert.equal(archiveStatementView(findProblemPage(entry.id)!)?.native?.id, entry.id)
  assert.deepEqual([...source.statement.text.matchAll(/T2-([ABC][1-4]) \[([\d.]+) pts/g)].map((m) => [m[1], Number(m[2])]), t2Questions)
  assert.equal(t2Questions.reduce((sum, [, points]) => sum + points, 0), 10)
  for (const [code] of t2Questions) assert.match(source.solution.text, new RegExp(`T2-${code} `))
  assert.equal(olympiadHost("IPhO", 2026)?.country, "Colombia")
  assert.equal(getEstimatedProblemElo(entry.id), 2050)
  assert.ok(getEstimatedProblemElo(entry.id) > getEstimatedProblemElo("ipho-2026-t1"))
  assert.equal(getEstimatedProblemElo(entry.id), getEstimatedProblemElo("ipho-2024-t1"))
  assert.ok(getEstimatedProblemElo(entry.id) < getEstimatedProblemElo("eupho-2025-t1"))
})

test("every T2 maths expression and figure maps to an inspected original PDF page", () => {
  for (const kind of ["statement", "solution"] as const) {
    const doc = source[kind]
    if (doc.format !== "html") throw new Error("Expected native document")
    const map = sourceMap.documents[kind]
    const expectedHash = kind === "statement" ? "d105a67ea95650c035c3c1c2f7649b27fc594843e8037485927af1711225ce55" : "2256104b843dcaa7031ab3d14a9f32eea6f6be6714a3f284ee028c752b73493f"
    assert.equal(createHash("sha256").update(readFileSync(`public${doc.referencePdf}`)).digest("hex"), expectedHash)
    assert.equal(map.sha256, expectedHash)
    assert.equal(map.pdfPages, kind === "statement" ? 4 : 5)
    assert.equal(map.nodes, doc.nodes.length)
    assert.equal(map.mathExpressions, expressions(doc.text).length)
    assert.deepEqual(map.pages.map((page) => page.pdfPage), Array.from({ length: map.pdfPages }, (_, i) => i + 1))
    assert.deepEqual(map.pages.map((page) => page.printedPage), kind === "statement" ? [7, 8, 9, 10] : [5, 6, 7, 8, 9])
    let nodes = 0, maths = 0, displays = 0
    for (const page of map.pages) {
      assert.equal(page.nodeStart, nodes + 1)
      assert.equal(page.mathStart, maths + 1)
      assert.equal(page.displayStart, displays + 1)
      const text = doc.nodes.slice(page.nodeStart - 1, page.nodeEnd).map(nodeText).join("\n\n")
      const matches = expressions(text)
      nodes += page.nodeEnd - page.nodeStart + 1
      maths += matches.length
      displays += matches.filter((m) => m[1]).length
      assert.equal(page.mathEnd, maths)
      assert.equal(page.displayEnd, displays)
      for (const m of matches) assert.doesNotThrow(() => katex.renderToString(m[1] ?? m[2], { throwOnError: true, trust: false, strict: "error", displayMode: Boolean(m[1]) }), `${kind} PDF page ${page.pdfPage}: ${m[0]}`)
    }
    assert.equal(nodes, doc.nodes.length)
    assert.equal(maths, map.mathExpressions)
    assert.equal(displays, map.displayedExpressions)
    assert.equal(doc.figures.length, kind === "statement" ? 7 : 6)
    for (const figure of doc.figures) {
      assert.ok(readFileSync(`public${figure}`).length > 1000)
      assert.ok(doc.nodes.some((node) => node.type === "element" && node.tag === "figure" && node.children?.some((child) => child.type === "element" && child.tag === "img" && child.src === figure && (child.alt?.length ?? 0) > 30)))
    }
  }
})

test("official alternatives, results and flagged source errors remain visible without correction", () => {
  assert.match(source.solution.text, /Alternative answer in terms of/)
  assert.match(source.solution.text, /Alternative solution parametrized/)
  assert.ok(source.solution.text.includes("a=12\\,\\mathrm{cm}"))
  assert.ok(source.solution.text.includes("R\\cos\\frac{\\pi}{2N+1}"))
  assert.ok(source.solution.text.includes("p=2"))
  assert.ok(source.solution.text.includes("q=3"))
  assert.ok(source.statement.text.includes("\\cos(K_4\\theta_i)"))
  assert.ok(source.solution.text.includes("1-\\tan^2(2\\Delta\\theta)"))
  assert.ok(source.solution.text.includes("x_n=R\\sin\\frac{2N-1}{4N+2}"))
})
