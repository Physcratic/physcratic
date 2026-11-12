import assert from "node:assert/strict";
import { test } from "node:test";
import { libraryFilterHref, parseLibraryFilters } from "./problem-library-route";

test("library URL restores every public filter and guided exercise", () => {
  const state = parseLibraryFilters(new URLSearchParams("collection=catalog&q=clock&topic=mechanics&competition=IPhO+2025&difficulty=advanced&exercise=ipho-2025-t2"));
  assert.deepEqual(state, { collection: "catalog", search: "clock", topic: "Mechanics", tagInput: "mechanics", competition: "IPhO 2025", difficulty: "advanced", exercise: "ipho-2025-t2" });
  assert.equal(parseLibraryFilters(new URLSearchParams("tag=waves&topic=mechanics")).topic, "Waves");
  assert.equal(parseLibraryFilters(new URLSearchParams("collection=authored&difficulty=unrated")).collection, "authored");
  assert.equal(parseLibraryFilters(new URLSearchParams("collection=unknown&difficulty=unknown")).difficulty, "all");
  assert.equal(parseLibraryFilters(new URLSearchParams("collection=unknown")).collection, "arena");
});

test("filter updates retain either entry route, unrelated parameters and hash", () => {
  for (const path of ["/problems", "/dashboard?view=problems"]) {
    const url = new URL(path, "https://physcratic.com");
    url.searchParams.set("topic", "Mechanics");
    url.hash = "results";
    const next = new URL(libraryFilterHref(url.href, { tag: "Waves", collection: "catalog", difficulty: "advanced", q: "clock" }), url);
    assert.equal(next.pathname, url.pathname);
    assert.equal(next.searchParams.get("view"), url.searchParams.get("view"));
    assert.equal(next.searchParams.get("topic"), null);
    assert.equal(next.searchParams.get("tag"), "Waves");
    assert.equal(next.hash, "#results");
    const reset = new URL(libraryFilterHref(next.href, { q: "", tag: "all", difficulty: "all", competition: "", exercise: "" }), url);
    assert.equal(reset.searchParams.get("collection"), "catalog");
    assert.equal(reset.searchParams.has("tag"), false);
    assert.equal(reset.searchParams.has("q"), false);
  }
});

test("URL inputs are bounded and text drafts retain spaces", () => {
  const state = parseLibraryFilters(new URLSearchParams({ q: "x".repeat(500), tag: "Modern ", competition: "x".repeat(500), exercise: "x".repeat(500) }));
  assert.equal(state.search.length, 200);
  assert.equal(state.tagInput, "Modern ");
  assert.equal(state.competition.length, 100);
  assert.equal(state.exercise.length, 100);
});

// "all" is a control value only for tag/rating, and remains an ordinary search term.
test("does not erase literal search text that equals a filter sentinel", () => {
  const url = new URL(libraryFilterHref("https://physcratic.com/problems", { q: "all", competition: "all", tag: "all", difficulty: "all" }), "https://physcratic.com");
  assert.equal(url.searchParams.get("q"), "all");
  assert.equal(url.searchParams.get("competition"), "all");
  assert.equal(url.searchParams.has("tag"), false);
  assert.equal(url.searchParams.has("difficulty"), false);
});
