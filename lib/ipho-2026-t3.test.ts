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
import sourceMap from "../docs/engineering/ipho-2026-t3-source-map.json"

const entry = catalogProblems.find((p) => p.id === "ipho-2026-t3")!
const source = importedProblemSchema.parse(JSON.parse(readFileSync(`public${entry.importPath}`, "utf8")))
const expressions = (text: string) => [...text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g)]
const nodeText = (node: ImportedNode): string => node.type === "text" ? node.text : (node.children ?? []).map(nodeText).join("")
const questions = [["A1", 0.2], ["A2", 0.6], ["A3", 0.2], ["B1", 1.5], ["B2", 1.5], ["C1", 0.2], ["C2", 1.5], ["C3", 0.8], ["C4", 2], ["C5", 1.5]]

test("T3 is one complete native self-review identity with ten official scoring allocations", () => {
  assert.equal(entry.title, "Chasing the absolute zero")
  assert.equal(entry.primaryTopic, "Thermodynamics")
  assert.equal(entry.hasPilotGuide, false)
  assert.equal(entry.rating.status, "unrated")
  assert.equal(entry.reviewStatus, "independent-review-pending")
  assert.equal(assessSolutionSource(source).canGrade, false)
  assert.equal(archiveStatementView(findProblemPage(entry.id)!)?.native?.id, entry.id)
  const scored = (text: string) => [...text.matchAll(/T[13]-([ABC][1-5]) \[([\d.]+) pts/g)].map((m) => [m[1], Number(m[2])])
  assert.deepEqual(scored(source.statement.text), questions)
  assert.deepEqual(scored(source.solution.text), questions)
  assert.ok(Math.abs(questions.reduce((sum, [, points]) => sum + Number(points), 0) - 10) < 1e-12)
  assert.equal(olympiadHost("IPhO", 2026)?.country, "Colombia")
  assert.equal(getEstimatedProblemElo(entry.id), 2100)
  assert.ok(getEstimatedProblemElo(entry.id) > getEstimatedProblemElo("arena-the-three-way-wave-split"))
})

test("T3 source map covers every node and strictly parsed maths expression on all six PDF pages", () => {
  for (const kind of ["statement", "solution"] as const) {
    const doc = source[kind]
    if (doc.format !== "html") throw new Error("Expected native document")
    const map = sourceMap.documents[kind]
    const expectedHash = kind === "statement" ? "1fc6e246a0f1a369719f5bd39bfc12f7b665353be84a91485c8643370330b224" : "3ef1952f8a7466beb809764b2b0dcdd8191f71fd42ad4f71a96c0b53ab5bcb01"
    assert.equal(createHash("sha256").update(readFileSync(`public${doc.referencePdf}`)).digest("hex"), expectedHash)
    assert.equal(map.sha256, expectedHash)
    assert.equal(map.pdfPages, kind === "statement" ? 4 : 2)
    assert.equal(map.nodes, doc.nodes.length)
    assert.equal(map.mathExpressions, expressions(doc.text).length)
    assert.deepEqual(map.pages.map((page) => page.pdfPage), Array.from({ length: map.pdfPages }, (_, i) => i + 1))
    assert.deepEqual(map.pages.map((page) => page.printedPage), kind === "statement" ? [11, 12, 13, 14] : [10, 11])
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
    assert.equal(doc.figures.length, kind === "statement" ? 2 : 1)
    for (const figure of doc.figures) {
      assert.ok(readFileSync(`public${figure}`).length > 1000)
      assert.ok(doc.nodes.some((node) => node.type === "element" && node.tag === "figure" && node.children?.some((child) => child.type === "element" && child.tag === "img" && child.src === figure && (child.alt?.length ?? 0) > 30)))
    }
    for (const referencePdf of ["https://example.com/tracker.pdf", "/corpus/../secret.pdf", "/corpus/invalid.png"]) {
      assert.equal(importedProblemSchema.safeParse({ ...source, [kind]: { ...doc, referencePdf } }).success, false)
    }
  }
})

test("comparison table, vectors, numerical data and official-source inconsistencies are preserved", () => {
  const doc = source.statement
  if (doc.format !== "html") throw new Error("Expected native document")
  const table = doc.nodes.find((node) => node.type === "element" && node.tag === "table")
  assert.ok(table && table.type === "element")
  const head = table.children?.find((node) => node.type === "element" && node.tag === "thead")
  const body = table.children?.find((node) => node.type === "element" && node.tag === "tbody")
  assert.equal(head?.type === "element" ? head.children?.length : 0, 1)
  assert.equal(body?.type === "element" ? body.children?.length : 0, 5)
  for (const text of ["IDEAL GAS", "PARAMAGNETIC TORUS", "PV=nRT", "TMV=nKH", "C_M=n\\lambda/T^2", "\\vec{B}=\\mu_0\\vec{H}+\\mu_0\\vec{M}", "potassium chromate", "411624", "311306", "204618", "240446", "2730", "0.19", "1.87\\times10^{-6}"]) assert.ok(doc.text.includes(text), text)
  for (const text of ["Chashing abolute zero", "T1-A1 [0.2 pts]", "\\mu_0VH\\,dM+C\\,dT", "0.99008", "9.92\\times10^{-3}", "\\ln\\frac{T_0}{T}", "\\mathrm{COP}=\\frac{Q_c}{W}"]) assert.ok(source.solution.text.includes(text), text)
  assert.ok(!source.solution.text.includes("T3-A1 ["), "The original solution mislabels A1, this must not be silently corrected")
})
