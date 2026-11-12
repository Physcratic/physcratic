import assert from "node:assert/strict"
import test from "node:test"
import { bandForEstimate, bandFilterIds, describeEstimate, matchesBand, maxRating, parseRating, ratingBand, ratingBands } from "./rating-bands"
import { readFileSync } from "node:fs"
import { initialIndividualRating } from "./individual-elo"

test("the four visible bands match the inclusive boundaries and display ranges", () => {
  assert.deepEqual(ratingBands.map((band) => [band.id, band.name, band.min, band.max, band.range]), [
    ["beginner-olympiad", "Beginner", 0, 801, "0 to 800"],
    ["intermediate-olympiad", "Intermediate", 801, 1801, "801 to 1,800"],
    ["advanced", "Advanced", 1801, 2601, "1,801 to 2,600"],
    ["mastery", "Mastery", 2601, Infinity, "2,601+"],
  ])
  assert.equal(new Set(ratingBands.map((band) => band.id)).size, 4)
  for (const band of ratingBands) {
    assert.ok(band.example.length >= 10 && band.example.length < 100, band.id)
    assert.ok(!/[—–;]/.test(band.example + band.name + band.range), "plain copy")
    assert.equal(ratingBand(band.middle).id, band.id)
  }
})

test("ratings at every requested boundary use the new bands", () => {
  for (const [ratings, expected] of [
    [[0, 799, 800], "beginner-olympiad"],
    [[801, 1599, 1600, 1800], "intermediate-olympiad"],
    [[1801, 2599, 2600], "advanced"],
    [[2601, 3200, 3201, 4000], "mastery"],
  ] as const) {
    for (const rating of ratings) assert.equal(ratingBand(rating).id, expected, String(rating))
  }
  assert.equal(ratingBand(-5).id, "beginner-olympiad")
})

test("every valid integer rating belongs to exactly one visible band and filter", () => {
  assert.equal(maxRating, 4000)
  for (let rating = 0; rating <= maxRating; rating++) {
    const containing = ratingBands.filter((band) => rating >= band.min && rating < band.max)
    assert.equal(containing.length, 1, String(rating))
    assert.equal(ratingBand(rating), containing[0])
    assert.deepEqual(ratingBands.filter((band) => matchesBand(rating, band.id)), containing)
  }
})

test("Studio presets and the Intermediate starting player rating stay unchanged", () => {
  assert.deepEqual(ratingBands.map((band) => band.middle), [500, 1200, 2100, 2800])
  assert.equal(initialIndividualRating, 1200)
  assert.equal(ratingBand(initialIndividualRating).id, "intermediate-olympiad")
})

test("the archive spreads over the top three bands", () => {
  const source = readFileSync("lib/problem-archive.ts", "utf8")
  const block = source.slice(source.indexOf("estimatedProblemElos"), source.indexOf("};", source.indexOf("estimatedProblemElos")))
  const estimates = [...block.matchAll(/:\s*(\d{3,4})/g)].map((match) => Number(match[1]))
  assert.ok(estimates.length > 100, "found the archive estimates")
  const counts = new Map<string, number>()
  for (const elo of estimates) counts.set(ratingBand(elo).id, (counts.get(ratingBand(elo).id) ?? 0) + 1)
  for (const id of ["intermediate-olympiad", "advanced", "mastery"]) assert.ok((counts.get(id) ?? 0) > 0, id)
  assert.ok((counts.get("advanced") ?? 0) > 20)
})

test("exact ratings still accept the complete 0 to 4000 scale", () => {
  for (const value of [0, 800, 801, 1800, 1801, 2600, 2601, 3200, 3201, 4000]) {
    assert.equal(parseRating(String(value)), value)
  }
  assert.equal(parseRating(" 1,850 "), 1850)
  assert.equal(parseRating("~1850"), 1850)
  for (const bad of ["", "abc", "4001", "-5", "18.5", "1e3", "12345"]) assert.equal(parseRating(bad), null, bad)
})

test("estimate descriptions show current names without changing numeric or legacy values", () => {
  for (const [value, name] of [
    [100, "Beginner"], [800, "Beginner"], [801, "Intermediate"], [1200, "Intermediate"],
    [1600, "Intermediate"], [1800, "Intermediate"], [1801, "Advanced"],
    [2600, "Advanced"], [2601, "Mastery"], [3201, "Mastery"], [4000, "Mastery"],
  ] as const) {
    assert.equal(describeEstimate(String(value)), `~${value.toLocaleString("en-US")} · ${name} (estimate)`)
  }
  assert.equal(describeEstimate("Hard"), "Hard")
  assert.equal(describeEstimate(null), "")
  assert.equal(bandForEstimate("1850")?.id, "advanced")
  assert.equal(bandForEstimate("Hard"), null)
})

test("retired filter ids remain accepted with their historical ranges but stay hidden", () => {
  const legacy = [
    ["fundamentals", 0, 200],
    ["under-1200", 0, 1200],
    ["1200-1599", 1200, 1600],
    ["1600-plus", 1600, Infinity],
  ] as const
  assert.equal(new Set(bandFilterIds).size, 8)
  for (const [id, min, max] of legacy) {
    assert.ok(bandFilterIds.includes(id))
    assert.ok(!ratingBands.some((band) => String(band.id) === id))
    for (let rating = 0; rating <= maxRating; rating++) {
      assert.equal(matchesBand(rating, id), rating >= min && rating < max, `${id}: ${rating}`)
    }
  }
  assert.ok(matchesBand(800, "beginner-olympiad"))
  assert.ok(matchesBand(1800, "intermediate-olympiad"))
  assert.ok(matchesBand(2600, "advanced"))
  assert.ok(matchesBand(4000, "mastery"))
  assert.ok(matchesBand(1000, "all") && matchesBand(2750, "all"))
  assert.equal(matchesBand(1500, "no-such-band"), false)
})
