import assert from "node:assert/strict";
import test from "node:test";
import { parseProblemCollection, problemCollectionHref } from "./problem-collection-route";

test("Arena is the default for absent, legacy practice and unknown collections", () => {
  for (const value of [null, "", "practice", "unknown", "ARENA", "arena"])
    assert.equal(parseProblemCollection(value), "arena");
});

test("explicit archive, guided and authored links retain their collection", () => {
  for (const value of ["catalog", "pilot", "authored"] as const)
    assert.equal(parseProblemCollection(value), value);
});

test("collection changes survive URL round trips and retain other query parameters and hash", () => {
  const original = "https://physcratic.test/dashboard?view=problems&collection=practice&topic=Mechanics&q=force+balance&search=1#results";
  for (const collection of ["arena", "catalog", "pilot", "authored"] as const) {
    const url = new URL(problemCollectionHref(original, collection), original);
    assert.equal(parseProblemCollection(url.searchParams.get("collection")), collection);
    assert.equal(url.pathname, "/dashboard");
    assert.equal(url.searchParams.get("view"), "problems");
    assert.equal(url.searchParams.get("topic"), "Mechanics");
    assert.equal(url.searchParams.get("q"), "force balance");
    assert.equal(url.searchParams.get("search"), "1");
    assert.equal(url.hash, "#results");
    assert.equal(url.searchParams.getAll("collection").length, 1);
  }
});
