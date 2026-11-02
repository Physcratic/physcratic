import assert from "node:assert/strict";
import { test } from "node:test";
import { stepTarget, wrapLoop } from "./coaching/gallery";
import { isShortPhrase, splitHighlight } from "./coaching/highlight";

test("the loop wraps back into the first copy", () => {
  assert.equal(wrapLoop(100, 1000), 100);
  assert.equal(wrapLoop(1000, 1000), 0);
  assert.equal(wrapLoop(1012.5, 1000), 12.5);
  assert.equal(wrapLoop(5000, 0), 5000);
});

test("arrows move one card from the nearest card", () => {
  assert.deepEqual(stepTarget(0, 300, 1, 6000, 9000), { target: 300 });
  assert.deepEqual(stepTarget(130, 300, 1, 6000, 9000), { target: 300 });
  assert.deepEqual(stepTarget(170, 300, 1, 6000, 9000), { target: 600 });
  assert.deepEqual(stepTarget(900, 300, -1, 6000, 9000), { target: 600 });
});

test("previous at the start jumps into the second copy first", () => {
  assert.deepEqual(stepTarget(0, 300, -1, 6000, 9000), { jumpFrom: 6000, target: 5700 });
  assert.deepEqual(stepTarget(6000, 300, 1, 6000, 9000), { jumpFrom: 0, target: 300 });
});

test("without a second copy the ends wrap round", () => {
  assert.deepEqual(stepTarget(2000, 300, 1, 0, 2000), { target: 0 });
  assert.deepEqual(stepTarget(0, 300, -1, 0, 2000), { target: 2000 });
  assert.deepEqual(stepTarget(1900, 300, 1, 0, 2000), { target: 2000 });
});

test("highlights split around the first match only", () => {
  assert.deepEqual(splitHighlight("a b c b", "b"), { before: "a ", match: "b", after: " c b" });
  assert.equal(splitHighlight("abc", "x"), null);
  assert.equal(splitHighlight("abc"), null);
  assert.ok(isShortPhrase("IPhO, APhO and EuPhO medallists"));
  assert.ok(!isShortPhrase("This is a whole sentence."));
  assert.ok(isShortPhrase("from your first olympiad to IPhO"));
  assert.ok(!isShortPhrase("one two three four five six seven"));
});
