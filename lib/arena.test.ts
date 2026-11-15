import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import katex from "katex";
import { arenaProblemSchema, filterArena, type ArenaCatalogEntry } from "./arena-schema";
import catalog from "./arena/index.json";
import { getEstimatedProblemElo } from "./problem-archive";
import { source01 } from "./arena/source-01";
import { source02 } from "./arena/source-02";
import { source03 } from "./arena/source-03";
import { source04 } from "./arena/source-04";
import { source05 } from "./arena/source-05";
import { source06 } from "./arena/source-06";
import { source07 } from "./arena/source-07";
import { source08 } from "./arena/source-08";


const entries = catalog.problems as ArenaCatalogEntry[];
const seedCount = [source01, source02, source03, source04, source05, source06, source07, source08].reduce((sum, source) => sum + source.length, 0);
/** How many Arena problems have a rating from min up to, but not including, max. */
const rated = (min: number, max: number) => entries.filter((entry) => getEstimatedProblemElo(entry.id) >= min && getEstimatedProblemElo(entry.id) < max).length;
const problems = entries.map((entry) => arenaProblemSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "public", entry.path), "utf8"))));

test("every problem/solution pair in the catalogue has native content and unique source identities", () => {
  // Counts come from the catalogue and the source files, so a new problem needs no edit here.
  assert.equal(catalog.count, entries.length);
  assert.equal(catalog.count, seedCount);
  assert.equal(problems.length, catalog.count);
  assert.equal(new Set(problems.map((problem) => problem.id)).size, catalog.count);
  // The first 18 problems came from PDFs. The 15 original Physcratic problems have none.
  assert.equal(new Set(problems.filter((problem) => !problem.original).flatMap((problem) => [problem.statementFile, problem.solutionFile])).size, 2 * problems.filter((problem) => !problem.original).length);
  assert.ok(problems.some((problem) => problem.original) && problems.some((problem) => !problem.original));
  for (const problem of problems.filter((item) => item.original)) {
    assert.equal(problem.statementFile, undefined, problem.id);
    assert.equal(problem.solutionFile, undefined, problem.id);
    assert.doesNotMatch(JSON.stringify(problem) + JSON.stringify(entries.find((item) => item.id === problem.id)), /\.pdf/i, problem.id);
  }
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
      assert.match(match[2], /^\/corpus\/arena\/figures\/[a-z-]+\.(?:png|svg)$/);
      assert.ok(existsSync(join(process.cwd(), "public", match[2])), match[2]);
      referenced.add(match[2]);
    }
  }
  // Every figure file is used and every figure used exists.
  assert.deepEqual([...referenced].sort(), readdirSync(join(process.cwd(), "public/corpus/arena/figures")).map((file) => `/corpus/arena/figures/${file}`).sort());
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
  assert.equal(filterArena(entries, { topic: "Optics" }).length, entries.filter((entry) => entry.topic === "Optics").length);
  assert.ok(filterArena(entries, { topic: "Optics" }).length >= 4);
  assert.deepEqual(filterArena(entries, { difficulty: "1200-1599" }).map((problem) => problem.id), [
    "arena-mind-the-gap",
    "arena-the-bubble-treaty",
    "arena-the-three-way-wave-split",
  ]);
  assert.equal(filterArena(entries, { difficulty: "1600-plus" }).length, rated(1600, Infinity))
  assert.equal(filterArena(entries, { query: "dodecahedron", difficulty: "intermediate-olympiad" })[0]?.id, "arena-the-dodecahedron-conspiracy")
  assert.equal(filterArena(entries, { query: "dodecahedron", difficulty: "advanced" }).length, 0)
  assert.equal(filterArena(entries, { topic: "Optics", difficulty: "1200-1599" })[0]?.id, "arena-mind-the-gap");
  assert.equal(filterArena(entries, { query: "quantum", difficulty: "1200-1599" }).length, 0);
  // The beginner set of 14 November 2026: 15 problems from 500 to 1,000, eight of them in the Beginner band.
  assert.equal(filterArena(entries, { difficulty: "under-1200" }).length, rated(0, 1200));
  assert.equal(filterArena(entries, { difficulty: "beginner-olympiad" }).length, rated(0, 801));
  assert.ok(rated(0, 801) >= 8 && rated(0, 1200) >= 15);
  assert.equal(filterArena(entries, { difficulty: "unrated" }).length, 0);
  assert.equal(filterArena(entries, { difficulty: "expert" }).length, 0);
  assert.equal(filterArena(entries, { query: "does-not-exist" }).length, 0);
});
