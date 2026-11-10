import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import katex from "katex"
import { importedProblemSchema } from "./imported-corpus-schema"
import { catalogProblems } from "./corpus-catalog"
import { assessSolutionSource } from "./corpus-readiness"
import { getEstimatedProblemElo } from "./problem-archive"
import { archiveStatementView, findProblemPage } from "./seo/problem-pages"
import { olympiadHost } from "./olympiad-hosts"

const entry = catalogProblems.find((p) => p.id === "ipho-2026-t1")!
const source = importedProblemSchema.parse(JSON.parse(readFileSync(`public${entry.importPath}`, "utf8")))

test("2026 T1 is one complete native imported identity with all five scored questions", () => {
  assert.equal(entry.title, "Three problems")
  assert.equal(archiveStatementView(findProblemPage(entry.id)!)?.native?.id, entry.id)
  assert.equal(entry.hasPilotGuide, false)
  assert.equal(entry.rating.status, "unrated")
  assert.equal(getEstimatedProblemElo(entry.id), 1950)
  assert.ok(getEstimatedProblemElo(entry.id) > getEstimatedProblemElo("arena-the-three-way-wave-split"))
  assert.ok(getEstimatedProblemElo(entry.id) < getEstimatedProblemElo("ipho-2005-t1"))
  assert.equal(olympiadHost("IPhO", 2026)?.country, "Colombia")
  assert.deepEqual([...source.statement.text.matchAll(/T1-([ABC][12]) \[([\d.]+) pts/g)].map((m) => [m[1], Number(m[2])]), [["A1", 3], ["B1", 1], ["B2", 2.5], ["C1", 2.5], ["C2", 1]])
  assert.equal(source.statement.format, "html")
  assert.equal(source.solution.format, "html")
  assert.equal(assessSolutionSource(source).canGrade, false)
  assert.match(source.solution.text, /SOLUTION 3:/)
  assert.match(source.solution.text, /Special case:/)
  assert.match(source.solution.text, /2.03/)
})

test("native maths parses strictly and original PDF bytes remain intact", () => {
  for (const [kind, hash] of [["statement", "0fc29bcca76d88b36c6cc6630cddb9bd22fceb96da857a527b675b72cb97f833"], ["solution", "9e6855ade0068a9451f3476d6781fece4a222d3b5a412f894f5bf28778f7ef6f"]] as const) {
    const doc = source[kind]
    assert.equal(doc.format, "html")
    if (doc.format !== "html") throw new Error("Expected native content")
    assert.equal(createHash("sha256").update(readFileSync(`public${doc.referencePdf}`)).digest("hex"), hash)
    assert.equal(doc.figures.length, kind === "statement" ? 3 : 1)
    for (const figure of doc.figures) assert.ok(readFileSync(`public${figure}`).length > 1000)
    const expressions = [...doc.text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g)]
    assert.ok(expressions.length > 20)
    for (const m of expressions) assert.doesNotThrow(() => katex.renderToString(m[1] ?? m[2], { throwOnError: true, trust: false, strict: "error", displayMode: Boolean(m[1]) }), m[0])
    for (const referencePdf of ["https://example.com/tracker.pdf", "/corpus/../secret.pdf", "/corpus/invalid.png"]) {
      assert.equal(importedProblemSchema.safeParse({ ...source, [kind]: { ...doc, referencePdf } }).success, false)
    }
  }
})
