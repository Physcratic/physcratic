import assert from "node:assert/strict";
import test from "node:test";
import { assignPartColors, colorsByPartId, bareLabel, partToken, partTokenNames } from "./part-colors";

test("colours follow position and ignore label text", () => {
  assert.deepEqual(assignPartColors(["a", "b", "c"]), [0, 1, 2]);
  assert.deepEqual(assignPartColors(["x", "q", "m"]), [0, 1, 2]);
});

test("sub-parts share their parent's colour", () => {
  assert.deepEqual(assignPartColors(["A.1", "A.2", "B.1", "B.2", "B.3", "C.1"]), [0, 0, 1, 1, 1, 2]);
  assert.deepEqual(assignPartColors(["A.1", "a.2"]), [0, 0]);
});

test("the colours repeat after four parents and empty labels count as their own part", () => {
  assert.deepEqual(assignPartColors(["a", "b", "c", "d", "e", "f", "g"]), [0, 1, 2, 3, 0, 1, 2]);
  assert.deepEqual(assignPartColors(["", "", "A.1"]), [0, 1, 2]);
  assert.deepEqual(assignPartColors(["a", "b", "c", "d", "e"]).map((index) => partToken(index).name), ["teal", "violet", "amber", "blue", "teal"]);
});

test("colours by part id restart in each section and count unlabelled parts by position", () => {
  const map = colorsByPartId([
    { parts: [{ id: "p1", label: "a" }, { id: "p2", label: "b" }] },
    { parts: [{ id: "p3", label: "" }, { id: "p4", label: " " }, { id: "p5", label: "c" }] },
  ]);
  assert.deepEqual([...map.entries()], [["p1", 0], ["p2", 1], ["p3", 0], ["p4", 1], ["p5", 2]]);
});

test("the same part gets the same colour every time", () => {
  const sections = [{ parts: [{ id: "x", label: "A.1" }, { id: "y", label: "A.2" }, { id: "z", label: "B.1" }] }];
  assert.deepEqual([...colorsByPartId(sections).values()], [...colorsByPartId(sections).values()]);
  assert.deepEqual([...colorsByPartId(sections).values()], [0, 0, 1]);
});

test("one pair of brackets around a whole label is dropped and nothing else changes", () => {
  assert.equal(bareLabel("(a)"), "a");
  assert.equal(bareLabel(" [b] "), "b");
  assert.equal(bareLabel("( c )"), "c");
  assert.equal(bareLabel("a"), "a");
  assert.equal(bareLabel("A.1"), "A.1");
  assert.equal(bareLabel("(i) and (ii)"), "(i) and (ii)");
  assert.equal(bareLabel("()"), "()");
  assert.equal(bareLabel(""), "");
});

test("part tokens follow the parts: a teal, b violet, c amber, d blue, then they repeat", () => {
  assert.deepEqual(partTokenNames, ["teal", "violet", "amber", "blue"]);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 8].map((index) => partToken(index).name), ["teal", "violet", "amber", "blue", "teal", "violet", "teal"]);
  assert.equal(partToken(-1).name, "blue", "a negative index still lands on a colour");
  const first = partToken(0);
  assert.equal(first.tint, "bg-part-teal-tint");
  assert.equal(first.ink, "text-part-teal-ink");
  assert.equal(first.fill, "bg-part-teal text-part-teal-foreground");
  assert.equal(first.stripe, "border-part-teal");
});
