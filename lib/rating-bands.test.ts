import assert from "node:assert/strict";
import test from "node:test";
import { bandForEstimate, bandFilterIds, describeEstimate, matchesBand, parseRating, ratingBand, ratingBands } from "./rating-bands";
import { readFileSync } from "node:fs";

test("the five bands are in order, cover 0 upward with no gap or overlap, and match the owner's table", () => {
  assert.deepEqual(
    ratingBands.map((band) => [band.name, band.min, band.max]),
    [["Fundamentals", 0, 1200], ["Beginner olympiad", 1200, 1600], ["Intermediate olympiad", 1600, 2000], ["Advanced (IPhO level)", 2000, 2500], ["Mastery", 2500, Infinity]],
  );
  for (let i = 1; i < ratingBands.length; i++) assert.equal(ratingBands[i].min, ratingBands[i - 1].max);
  assert.equal(new Set(ratingBands.map((band) => band.id)).size, 5);
  assert.deepEqual(ratingBands.map((band) => band.range), ["Below 1,200", "1,200 to 1,599", "1,600 to 1,999", "2,000 to 2,499", "2,500 and up"]);
  for (const band of ratingBands) {
    assert.ok(band.example.length > 10 && band.example.length < 60, band.id);
    assert.ok(!/[—–;]/.test(band.example + band.name + band.range), "no dashes or semicolons");
    assert.equal(ratingBand(band.middle).id, band.id, `the middle of ${band.id} is in ${band.id}`);
  }
});

test("a rating falls in the band at its edges", () => {
  const id = (n: number) => ratingBand(n).id;
  assert.equal(id(-5), "fundamentals");
  assert.equal(id(0), "fundamentals");
  assert.equal(id(1199), "fundamentals");
  assert.equal(id(1200), "beginner-olympiad");
  assert.equal(id(1599), "beginner-olympiad");
  assert.equal(id(1600), "intermediate-olympiad");
  assert.equal(id(1999), "intermediate-olympiad");
  assert.equal(id(2000), "advanced");
  assert.equal(id(2499), "advanced");
  assert.equal(id(2500), "mastery");
  assert.equal(id(4000), "mastery");
});

test("the scale fits the site: new users start in Beginner olympiad and the archive spreads over the top four bands", () => {
  assert.equal(ratingBand(1200).id, "beginner-olympiad");
  // The archive's editorial estimates, read from the source so this test needs no extra export.
  const source = readFileSync("lib/problem-archive.ts", "utf8");
  const block = source.slice(source.indexOf("estimatedProblemElos"), source.indexOf("};", source.indexOf("estimatedProblemElos")));
  const estimates = [...block.matchAll(/:\s*(\d{3,4})/g)].map((match) => Number(match[1]));
  assert.ok(estimates.length > 100, "found the archive estimates");
  const counts = new Map<string, number>();
  for (const elo of estimates) counts.set(ratingBand(elo).id, (counts.get(ratingBand(elo).id) ?? 0) + 1);
  for (const id of ["beginner-olympiad", "intermediate-olympiad", "advanced", "mastery"]) assert.ok((counts.get(id) ?? 0) > 0, id);
  assert.ok((counts.get("advanced") ?? 0) > 20, "the IPhO level band holds a real share of the archive");
});

test("an author's exact rating is read from what they type", () => {
  assert.equal(parseRating("1850"), 1850);
  assert.equal(parseRating(" 1,850 "), 1850);
  assert.equal(parseRating("~1850"), 1850);
  assert.equal(parseRating("0"), 0);
  assert.equal(parseRating("4000"), 4000);
  for (const bad of ["", "abc", "4001", "-5", "18.5", "1e3", "12345"]) assert.equal(parseRating(bad), null, bad);
});

test("a stored estimate reads as an estimate, and an old free-text label is shown as written", () => {
  assert.equal(describeEstimate("1850"), "~1,850 · Intermediate olympiad (estimate)");
  assert.equal(describeEstimate("2600"), "~2,600 · Mastery (estimate)");
  assert.equal(describeEstimate("Hard"), "Hard");
  assert.equal(describeEstimate(null), "");
  assert.equal(bandForEstimate("1850")?.id, "intermediate-olympiad");
  assert.equal(bandForEstimate("Hard"), null);
});

test("filters take the five band ids and the three older ones", () => {
  assert.ok(bandFilterIds.includes("mastery") && bandFilterIds.includes("1600-plus"));
  assert.ok(matchesBand(1000, "all") && matchesBand(2750, "all"));
  assert.ok(matchesBand(2250, "advanced") && !matchesBand(2250, "mastery") && !matchesBand(2250, "intermediate-olympiad"));
  assert.ok(matchesBand(900, "under-1200") && !matchesBand(1200, "under-1200"));
  assert.ok(matchesBand(1599, "1200-1599") && !matchesBand(1600, "1200-1599"));
  assert.ok(matchesBand(1600, "1600-plus") && matchesBand(2800, "1600-plus"));
  assert.equal(matchesBand(1500, "no-such-band"), false);
  // Every rating is in exactly one of the five bands.
  for (let rating = 0; rating <= 4000; rating += 50) assert.equal(ratingBands.filter((band) => matchesBand(rating, band.id)).length, 1, String(rating));
});
