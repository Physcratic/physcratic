import assert from "node:assert/strict";
import test from "node:test";
import { bareLabel } from "./part-colors";

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
