import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import test from "node:test";
import { archiveDefinitions } from "./archive-grading/catalog";
import { source01 } from "./arena/source-01";
import { source02 } from "./arena/source-02";
import { source03 } from "./arena/source-03";
import { source04 } from "./arena/source-04";
import { source05 } from "./arena/source-05";
import { source06 } from "./arena/source-06";

// Phase 3 cleaned the wording of the Arena problems. This test proves it changed nothing that is graded. It compares
// the current answer keys, symbols, conditions and ids with a fixture taken before the cleanup. The free text of a
// part (label, help line, domain, self-review reason) is left out because that is what the cleanup changed.
// The fixture also holds, per problem, a digest of every maths span and every number in the statement, solution and
// text of the parts, so a changed number, unit or tolerance in prose fails too.
// Regenerate only on purpose: UPDATE_GRADED_FIELDS=1.
const fixture = new URL("../tests/fixtures/arena-graded-fields.json", import.meta.url);
const seeds = [...source01, ...source02, ...source03, ...source04, ...source05, ...source06];
const digest = (items: string[]) => createHash("sha256").update(JSON.stringify(items)).digest("hex");

export function gradedFields() {
  const out: Record<string, unknown> = {};
  for (const seed of seeds) {
    const definition = archiveDefinitions.find((d) => d.problemId === seed.id);
    assert.ok(definition, `${seed.id} has no grading definition`);
    const texts = [seed.statement, seed.solution, ...definition.parts.flatMap((p) => [p.label, p.help, p.domain, "reason" in p ? p.reason : ""])];
    out[seed.id] = {
      id: seed.id,
      topic: seed.topic,
      tags: seed.tags,
      statementFile: seed.statementFile,
      solutionFile: seed.solutionFile ?? null,
      keyVersion: definition.keyVersion,
      parts: definition.parts.map(({ label: _label, help: _help, domain: _domain, ...rest }) => {
        const { reason: _reason, ...graded } = rest as typeof rest & { reason?: string };
        return graded;
      }),
      maths: digest(seed.statement.concat("\n", seed.solution).match(/\$\$[\s\S]*?\$\$/g) ?? []),
      numbers: digest(texts.join("\n").replace(/\$\$[\s\S]*?\$\$/g, " ").match(/\d+(?:\.\d+)?/g) ?? []),
    };
  }
  return out;
}

test("every answer, symbol, condition and id field is identical to the fixture taken before the cleanup", () => {
  const actual = gradedFields();
  if (process.env.UPDATE_GRADED_FIELDS) { writeFileSync(fixture, JSON.stringify(actual, null, 1) + "\n"); return; }
  const expected = JSON.parse(readFileSync(fixture, "utf8")) as Record<string, { parts: { id: string }[] }>;
  const json = JSON.parse(JSON.stringify(actual)) as typeof expected;
  assert.deepEqual(Object.keys(json), Object.keys(expected), "the problem ids or their order changed");
  for (const id of Object.keys(expected)) {
    const before = expected[id] as Record<string, unknown> & { parts: { id: string }[] };
    const after = json[id] as unknown as Record<string, unknown> & { parts: { id: string }[] };
    assert.deepEqual(after.parts.map((p) => p.id), before.parts.map((p) => p.id), `${id}: a part id changed`);
    for (const [index, part] of before.parts.entries()) assert.deepEqual(after.parts[index], part, `${id} ${part.id}: a graded field changed`);
    assert.deepEqual(after, before, `${id}: a graded field, id, maths or number changed`);
  }
  assert.equal(Object.keys(expected).length, 18);
});
