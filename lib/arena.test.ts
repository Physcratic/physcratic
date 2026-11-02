import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import katex from "katex";
import { arenaProblemSchema, filterArena, type ArenaCatalogEntry } from "./arena-schema";
import catalog from "./arena/index.json";

const entries = catalog.problems as ArenaCatalogEntry[];
const problems = entries.map((entry) => arenaProblemSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "public", entry.path), "utf8"))));

test("all 18 uploaded problem/solution pairs have native content and unique source identities", () => {
  assert.equal(catalog.count, 18);
  assert.equal(problems.length, 18);
  assert.equal(new Set(problems.map((problem) => problem.id)).size, 18);
  assert.equal(new Set(problems.flatMap((problem) => [problem.statementFile, problem.solutionFile])).size, 36);
  for (const problem of problems) {
    assert.ok(problem.statement.includes("$$"), problem.id);
    assert.ok(problem.solution.includes("$$"), problem.id);
    assert.doesNotMatch(problem.statement + problem.solution, /<iframe|<embed|\.pdf[)#]|data:application\/pdf|\.webp/i);
    const entry = entries.find((item) => item.id === problem.id)!;
    assert.equal(entry.title, problem.title);
    assert.equal(entry.topic, problem.topic);
  }
});

test("every expression renders as valid KaTeX and all delimiters are paired", () => {
  let expressions = 0;
  for (const problem of problems) for (const kind of ["statement", "solution"] as const) {
    const text = problem[kind];
    const matches = [...text.matchAll(/\$\$([\s\S]*?)\$\$/g)];
    assert.equal((text.match(/\$/g) ?? []).length, matches.length * 4, `${problem.id} ${kind}: unmatched delimiter`);
    for (const match of matches) {
      assert.doesNotThrow(() => katex.renderToString(match[1], { displayMode: true, throwOnError: true, trust: false, strict: "error" }), `${problem.id} ${kind}: ${match[1]}`);
      expressions++;
    }
  }
  assert.ok(expressions > 1000);
});

test("only local, existing diagram crops are referenced, never full-page viewers", () => {
  const referenced = new Set<string>();
  for (const problem of problems) for (const kind of ["statement", "solution"] as const) {
    for (const match of problem[kind].matchAll(/!\[([^\]]+)\]\(([^)]+)\)/g)) {
      assert.ok(match[1].length > 20);
      assert.match(match[2], /^\/corpus\/arena\/figures\/[a-z-]+\.png$/);
      assert.ok(existsSync(join(process.cwd(), "public", match[2])), match[2]);
      referenced.add(match[2]);
    }
  }
  assert.equal(referenced.size, 33);
  assert.equal(readdirSync(join(process.cwd(), "public/corpus/arena/figures")).length, 33);
});

test("long documents retain every source subpart and important qualifications", () => {
  const get = (id: string) => problems.find((problem) => problem.id === `arena-${id}`)!;
  const cosmic = get("the-cosmic-kitchen");
  for (const part of "abcdefghijklm") {
    assert.ok(cosmic.statement.includes(`## (${part})`), `cosmic statement ${part}`);
    assert.ok(cosmic.solution.includes(`## (${part})`), `cosmic solution ${part}`);
  }
  for (const part of "abcdefg") assert.ok(get("an-atom-with-stage-fright").statement.includes(`## (${part})`));
  assert.match(get("the-infinite-v").solution, /no finite, cutoff-independent oscillation frequency/);
  assert.match(get("the-invisible-brake").solution, /Constant temperature alone is not sufficient/);
  assert.match(get("a-grin-and-a-wiggle").solution, /The calculation below completes part \(e\)/);
  assert.match(get("the-phantom-charge").solution, /infimum of speeds/);
  assert.match(get("the-capacitors-missing-energy").solution, /Including the entire closed system/);
});

test("Arena search, tags and estimated difficulty filters compose independently of competitions", () => {
  assert.equal(filterArena(entries, { query: "dodecahedron" }).length, 1);
  assert.equal(filterArena(entries, { query: "quantum tunnelling" })[0]?.id, "arena-the-quantum-escape-room");
  assert.equal(filterArena(entries, { topic: "Optics" }).length, 3);
  assert.deepEqual(filterArena(entries, { difficulty: "1200-1599" }).map((problem) => problem.id), [
    "arena-mind-the-gap",
    "arena-the-dodecahedron-conspiracy",
  ]);
  assert.equal(filterArena(entries, { difficulty: "1600-plus" }).length, 16);
  assert.equal(filterArena(entries, { topic: "Optics", difficulty: "1200-1599" })[0]?.id, "arena-mind-the-gap");
  assert.equal(filterArena(entries, { query: "quantum", difficulty: "1200-1599" }).length, 0);
  assert.equal(filterArena(entries, { difficulty: "under-1200" }).length, 0);
  assert.equal(filterArena(entries, { difficulty: "unrated" }).length, 0);
  assert.equal(filterArena(entries, { difficulty: "expert" }).length, 0);
  assert.equal(filterArena(entries, { query: "does-not-exist" }).length, 0);
});
