import assert from "node:assert/strict";
import test from "node:test";
import { markSolved, pickProblem, readSolved } from "../components/physics/solved-problems";

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value), data };
};

test("solved problems are remembered and read back", () => {
  const storage = memory();
  assert.equal(readSolved(storage).size, 0);
  markSolved("arena-a", storage);
  markSolved("arena-b", storage);
  markSolved("arena-a", storage);
  assert.deepEqual([...readSolved(storage)].sort(), ["arena-a", "arena-b"]);
});

test("storage that is missing, blocked, full or damaged never throws", () => {
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(readSolved(blocked).size, 0);
  assert.doesNotThrow(() => markSolved("arena-a", blocked));
  const full = { getItem: () => null, setItem: () => { throw new DOMException("full", "QuotaExceededError"); } };
  assert.doesNotThrow(() => markSolved("arena-a", full));
  for (const raw of ["{", "null", "42", "\"x\"", "{\"a\":1}", "[1,2,{}]"]) assert.equal(readSolved({ getItem: () => raw }).size, 0, raw);
  assert.deepEqual([...readSolved({ getItem: () => JSON.stringify(["ok", 1, null, "also"]) })], ["ok", "also"]);
  // No window at all, as on the server.
  assert.equal(readSolved().size, 0);
  assert.doesNotThrow(() => markSolved("arena-a"));
});

test("the list stays small", () => {
  const storage = memory();
  for (let i = 0; i < 600; i++) markSolved(`arena-${i}`, storage);
  assert.ok(readSolved(storage).size <= 500);
  assert.ok(readSolved(storage).has("arena-599"));
});

test("a problem to check out is a random one that is not solved yet", () => {
  const ids = ["a", "b", "c", "d"];
  const solved = new Set(["a", "b"]);
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) seen.add(pickProblem(ids, solved, undefined, () => i / 50)!);
  assert.deepEqual([...seen].sort(), ["c", "d"]);
  // Another problem is never the one shown.
  for (let i = 0; i < 20; i++) assert.notEqual(pickProblem(ids, solved, "c", () => i / 20), "c");
  assert.equal(pickProblem(ids, solved, "c", () => 0.7), "d");
});

test("when every problem is solved, any other problem is offered", () => {
  const ids = ["a", "b", "c"];
  const solved = new Set(ids);
  for (let i = 0; i < 20; i++) {
    const picked = pickProblem(ids, solved, "a", () => i / 20);
    assert.ok(picked === "b" || picked === "c");
  }
  assert.ok(ids.includes(pickProblem(ids, solved)!));
});

test("with one problem and nothing else, that problem; with none, nothing", () => {
  assert.equal(pickProblem(["only"], new Set(), "only"), "only");
  assert.equal(pickProblem(["only"], new Set(["only"])), "only");
  assert.equal(pickProblem([], new Set()), undefined);
});

test("the random number is used safely at both ends", () => {
  assert.ok(["a", "b"].includes(pickProblem(["a", "b"], new Set(), undefined, () => 0)!));
  assert.ok(["a", "b"].includes(pickProblem(["a", "b"], new Set(), undefined, () => 0.9999999)!));
  assert.ok(["a", "b"].includes(pickProblem(["a", "b"], new Set(), undefined, () => 1)!));
});
