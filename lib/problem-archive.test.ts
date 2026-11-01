import assert from "node:assert/strict";
import test from "node:test";
import { getArchiveStats, getEloBand, getEstimatedProblemElo, matchesEstimatedDifficulty } from "./problem-archive";
import arena from "./arena/index.json";
import { catalogProblems } from "./corpus-catalog";
import { corpusProblems } from "./corpus-pilot";
import { problems, topics, viewTitles } from "./physics";

const now = Date.parse("2026-10-28T12:00:00Z");

test("archive statistics count the full collection without inventing missing dates", () => {
  assert.deepEqual(getArchiveStats(problems, now), {
    total: problems.length,
    addedLast24Hours: null,
  });
});

test("rolling 24-hour count excludes old dates, the cutoff, and future additions", () => {
  const dates = [
    "2026-10-27T11:59:59Z",
    "2026-10-27T12:00:00Z",
    "2026-10-27T12:00:01Z",
    "2026-10-28T12:00:00Z",
    "2026-10-28T12:00:01Z",
  ];
  assert.deepEqual(getArchiveStats(dates.map((addedAt) => ({ addedAt })), now), {
    total: 5,
    addedLast24Hours: 2,
  });
});

test("a missing or invalid addition date makes the daily count unavailable", () => {
  assert.equal(getArchiveStats([{ addedAt: "invalid" }], now).addedLast24Hours, null);
  assert.equal(getArchiveStats([{ addedAt: "2026-10-28T11:00:00Z" }, {}], now).addedLast24Hours, null);
  assert.deepEqual(getArchiveStats([], now), { total: 0, addedLast24Hours: 0 });
});

test("ELO bands match the filter boundaries", () => {
  for (const elo of [0, 900, 1199]) assert.equal(getEloBand(elo).variant, "elo-foundation");
  for (const elo of [1200, 1300, 1599]) assert.equal(getEloBand(elo).variant, "elo-intermediate");
  for (const elo of [1600, 1700, 3000]) assert.equal(getEloBand(elo).variant, "elo-advanced");
});

test("every Arena, archive and guided problem has an explicit editorial difficulty estimate", () => {
  const entries = [...arena.problems, ...catalogProblems, ...corpusProblems];
  assert.equal(new Set(entries.map((problem) => problem.id)).size, 118);
  const estimates = entries.map((problem) => {
    const elo = getEstimatedProblemElo(problem.id);
    assert.ok(Number.isInteger(elo) && elo >= 800 && elo <= 3000, problem.id);
    assert.equal(elo % 50, 0, problem.id);
    assert.ok(matchesEstimatedDifficulty(problem.id, getEloBand(elo).id));
    assert.ok(matchesEstimatedDifficulty(problem.id, "all"));
    assert.equal(matchesEstimatedDifficulty(problem.id, "unrated"), false);
    return elo;
  });
  assert.ok(new Set(estimates).size > 15);
  assert.equal(getEstimatedProblemElo("arena-mind-the-gap"), 1350);
  assert.equal(getEstimatedProblemElo("arena-the-cosmic-kitchen"), 2600);
  assert.throws(() => getEstimatedProblemElo("unknown-problem"), /Missing editorial difficulty estimate/);
  for (const problem of corpusProblems) {
    const archiveProblem = catalogProblems.find((entry) => entry.id === problem.id)!;
    assert.equal(getEstimatedProblemElo(problem.id), getEstimatedProblemElo(archiveProblem.id));
  }
});

test("topic navigation and records share the updated taxonomy", () => {
  assert.equal(viewTitles.problems, "Problems");
  for (const name of ["Electromagnetism", "Optics", "Modern"]) {
    assert.ok(topics.some((topic) => topic.name === name));
  }
  for (const problem of problems) {
    assert.ok(topics.some((topic) => topic.name === problem.topic));
  }
  assert.equal(problems.filter((problem) => problem.topic === "Electromagnetism").length, 3);
});
