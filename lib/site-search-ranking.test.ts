import assert from "node:assert/strict";
import test from "node:test";
import { searchSite, type SearchEntry } from "./site-search-ranking";

const entries: SearchEntry[] = [
  { title: "Guide to optics", description: "Preparation", href: "/learn/optics", kind: "Guide" },
  { title: "Optics", description: "Physics topic", href: "/problems/topics/optics", kind: "Topic", keywords: "lenses" },
  { title: "Olympiad Archive", description: "IPhO 2025 questions", href: "/problems/archive", kind: "Page" },
];
test("exact titles outrank partial titles, with case and punctuation normalised", () => {
  assert.equal(searchSite(entries, "OPTICS!")[0].title, "Optics");
});
test("all terms must match across metadata and aliases", () => {
  assert.equal(searchSite(entries, "ipho 2025")[0].kind, "Page");
  assert.equal(searchSite(entries, "lenses")[0].kind, "Topic");
  assert.deepEqual(searchSite(entries, "optics 2025"), []);
});
test("empty query offers pages only, and search-only metadata is not returned", () => {
  assert.equal(searchSite(entries, "").length, 1);
  assert.equal("keywords" in searchSite(entries, "lenses")[0], false);
  assert.ok(searchSite(Array.from({ length: 100 }, () => entries[2]), "ipho").length <= 30);
});
