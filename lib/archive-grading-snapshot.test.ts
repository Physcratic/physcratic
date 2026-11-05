import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { archiveDefinitions } from "./archive-grading/catalog";
import { checkArchivePart } from "./archive-grading";
import { numberVariants, variantsOf } from "../tests/answer-rewrites";

// Every check result for every problem, part, reference form, rewritten form and changed form (status and message),
// hashed per problem. The fixture was taken before the public part metadata gained symbol conditions, so this test
// proves that change did not alter a single result. Regenerate only on purpose: UPDATE_SNAPSHOT=1.
const fixture = new URL("../tests/fixtures/archive-check-snapshot.json", import.meta.url);
const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

function digests() {
  const out: Record<string, { cases: number; digest: string }> = {};
  for (const definition of archiveDefinitions) {
    const lines: string[] = [];
    for (const part of definition.parts) {
      if (part.kind === "self-review") continue;
      const inputs: string[] = [];
      if (part.kind === "numeric") inputs.push(String(part.target), ...numberVariants(part.target), String(part.target * 1.1 + 1), "", "x", "1/", "9e9999");
      else if (part.kind === "special") inputs.push("\\infty", "1", "x");
      else for (const reference of [part.canonical, ...part.alternatives]) {
        inputs.push(reference);
        const variants = variantsOf(reference, part.symbols.map((s) => s.latex), part.symbols.map((s) => s.latex), hash(`${definition.problemId}/${part.id}`));
        inputs.push(...(variants?.equal ?? []), ...(variants?.wrong ?? []), "", "a/bc", "q", String.raw`\theta_o`);
      }
      for (const input of inputs) {
        const result = checkArchivePart(part, input, definition.problemId);
        lines.push(`${part.id}\u0000${input}\u0000${result.status}\u0000${result.message}`);
      }
    }
    out[definition.problemId] = { cases: lines.length, digest: createHash("sha256").update(lines.join("\n")).digest("hex") };
  }
  return out;
}

test("every check result for every problem is identical to the snapshot", () => {
  const actual = digests();
  if (process.env.UPDATE_SNAPSHOT) { writeFileSync(fixture, JSON.stringify(actual, null, 1) + "\n"); return; }
  const expected = JSON.parse(readFileSync(fixture, "utf8"));
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
  for (const [problemId, entry] of Object.entries(actual)) assert.deepEqual(entry, expected[problemId], `${problemId}: a check result changed`);
  assert.ok(Object.values(actual).reduce((sum, e) => sum + e.cases, 0) > 1500);
});
