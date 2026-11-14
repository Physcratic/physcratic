import assert from "node:assert/strict";
import test from "node:test";
import { ownerRatings, ownerRatingSource } from "./owner-ratings";
import { readFileSync } from "node:fs";
import { getArchiveStats, getEloBand, getEstimatedProblemElo, matchesEstimatedDifficulty } from "./problem-archive";
import arena from "./arena/index.json";
import { catalogProblems } from "./corpus-catalog";
import { corpusProblems } from "./corpus-pilot";
import { problems, topics, viewTitles } from "./physics";
import { maxRating, ratingBand, ratingBands } from "./rating-bands"
import difficultyReview from "../docs/engineering/problem-difficulty-review.json"

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
  assert.equal(new Set(entries.map((problem) => problem.id)).size, 130)
  const estimates = entries.map((problem) => {
    const elo = getEstimatedProblemElo(problem.id);
    assert.ok(Number.isInteger(elo) && elo >= 800 && elo <= maxRating, problem.id);
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

test("difficulty review covers exactly the imported and original identities", () => {
  const importedIds = new Set(catalogProblems.filter((p) => p.year < 2026).map((problem) => problem.id))
  const originalIds = new Set(arena.problems.map((problem) => problem.id))
  assert.equal(importedIds.size, 109)
  assert.equal(originalIds.size, 18)
  assert.ok([...originalIds].every((id) => !importedIds.has(id)))
  // Nine problems were imported on 14 November 2026, after the review. They have an owner-set rating and no ledger entry.
  const addedAfterReview = [...importedIds].filter((id) => !difficultyReview.problems.some((problem) => problem.id === id))
  assert.equal(addedAfterReview.length, 9)
  for (const id of addedAfterReview) assert.ok(id in ownerRatings, id)
  const expectedIds = [...importedIds, ...originalIds].filter((id) => !addedAfterReview.includes(id)).sort()
  assert.deepEqual(difficultyReview.problems.map((problem) => problem.id).sort(), expectedIds)
  for (const problem of difficultyReview.problems) {
    assert.equal(getEstimatedProblemElo(problem.id), ownerRatings[problem.id] ?? problem.proposed, problem.id)
    assert.ok(problem.assessment.length > 0, problem.id)
    for (const value of [problem.old, problem.proposed]) {
      assert.ok(Number.isInteger(value) && value >= 800 && value <= 3000, problem.id)
      assert.equal(value % 50, 0, problem.id)
    }
  }
})

test("editorial estimates match exactly one current band and retain legacy filter ranges", () => {
  for (const problem of [...arena.problems, ...catalogProblems, ...corpusProblems]) {
    const estimate = getEstimatedProblemElo(problem.id)
    const expectedBand = ratingBand(estimate)
    for (const band of ratingBands) {
      assert.equal(matchesEstimatedDifficulty(problem.id, band.id), band.id === expectedBand.id, problem.id)
    }
    for (const [filter, min, max] of [
      ["under-1200", 0, 1200],
      ["1200-1599", 1200, 1600],
      ["1600-plus", 1600, Infinity],
    ] as const) {
      assert.equal(matchesEstimatedDifficulty(problem.id, filter), estimate >= min && estimate < max, problem.id)
    }
  }
})

test("source-reviewed anchors and relative difficulty reflect independent construction", () => {
  for (const [id, expected] of [
    ["apho-2019-t3", 2950],
    ["apho-2023-t2", 2950],
    ["apho-2021-t2", 2900],
    ["apho-2021-t3", 2900],
    ["apho-2024-t3", 2300],
    ["apho-2025-t1", 2300],
    ["ipho-2025-t1", 2200],
  ] as const) {
    // The owner's own rating replaces the calibrated value, so only the other anchors are checked here.
    if (id in ownerRatings) continue
    assert.equal(getEstimatedProblemElo(id), expected, id)
  }
  for (const [harder, easier] of [
    ["apho-2019-t3", "apho-2017-t1"],
    ["apho-2021-t2", "apho-2019-t2"],
    ["eupho-2023-t3", "apho-2025-t1"],
    ["eupho-2022-t3", "ipho-2025-t1"],
    ["arena-a-grin-and-a-wiggle", "arena-the-bending-beam-riddle"],
    ["arena-the-bending-beam-riddle", "arena-an-atom-with-stage-fright"],
    ["ipho-2025-t1", "apho-2022-t1"],
    ["arena-the-dodecahedron-conspiracy", "arena-mind-the-gap"],
  ]) {
    if (harder in ownerRatings || easier in ownerRatings) continue
    assert.ok(getEstimatedProblemElo(harder) > getEstimatedProblemElo(easier), `${harder} > ${easier}`)
  }
})

test("owner-set ratings are exactly the owner's file, with their source, and change no other problem", () => {
  const file = JSON.parse(readFileSync("assets-src/archive-imports/owner-ratings-2026-11-14.json", "utf8")) as { ratings: Record<string, number> }
  assert.equal(ownerRatingSource, "owner-set, 14 November 2026")
  assert.equal(Object.keys(file.ratings).length, 60)
  assert.deepEqual(ownerRatings, file.ratings)
  for (const [id, rating] of Object.entries(file.ratings)) assert.equal(getEstimatedProblemElo(id), rating, id)
  const reviewed = new Map(difficultyReview.problems.map((problem) => [problem.id, problem.proposed]))
  for (const problem of [...arena.problems, ...catalogProblems].filter((entry) => !(entry.id in ownerRatings))) {
    const expected = reviewed.get(problem.id)
    if (expected !== undefined) assert.equal(getEstimatedProblemElo(problem.id), expected, problem.id)
  }
})
