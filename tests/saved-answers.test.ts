import assert from "node:assert/strict";
import test from "node:test";
import { clearSavedAnswer, clearSavedAnswers, readSavedAnswers, saveAnswer, savedAnswerKey } from "../components/physics/saved-answers";

const memory = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    get length() { return data.size; },
    key: (index: number) => [...data.keys()][index] ?? null,
  };
};
/** Storage that throws on every call, like a blocked or full one. */
const broken = () => {
  const fail = () => { throw new DOMException("blocked", "SecurityError"); };
  return { getItem: fail, setItem: fail, removeItem: fail, key: fail, get length(): number { return fail(); } };
};

test("an answer comes back for the same problem and part", () => {
  const storage = memory();
  saveAnswer("incline", "a", "4.9", storage);
  assert.deepEqual(readSavedAnswers("incline", ["a", "b"], storage), { a: "4.9" });
});

test("answers are kept apart by problem and by part", () => {
  const storage = memory();
  saveAnswer("incline", "a", "1", storage);
  saveAnswer("incline", "b", "2", storage);
  saveAnswer("pendulum", "a", "3", storage);
  assert.deepEqual(readSavedAnswers("incline", ["a", "b"], storage), { a: "1", b: "2" });
  assert.deepEqual(readSavedAnswers("pendulum", ["a", "b"], storage), { a: "3" });
});

test("ids with colons cannot collide", () => {
  assert.notEqual(savedAnswerKey("a:b", "c"), savedAnswerKey("a", "b:c"));
});

test("saving an empty answer removes the entry", () => {
  const storage = memory();
  saveAnswer("incline", "a", "4.9", storage);
  saveAnswer("incline", "a", "  ", storage);
  assert.equal(storage.data.size, 0);
});

test("a part is cleared on its own, the others stay", () => {
  const storage = memory();
  saveAnswer("incline", "a", "1", storage);
  saveAnswer("incline", "b", "2", storage);
  clearSavedAnswer("incline", "a", storage);
  assert.deepEqual(readSavedAnswers("incline", ["a", "b"], storage), { b: "2" });
});

test("clearing a problem leaves other problems alone", () => {
  const storage = memory();
  saveAnswer("incline", "a", "1", storage);
  saveAnswer("incline", "b", "2", storage);
  saveAnswer("pendulum", "a", "3", storage);
  storage.setItem("something-else", "kept");
  clearSavedAnswers("incline", storage);
  assert.deepEqual(readSavedAnswers("incline", ["a", "b"], storage), {});
  assert.deepEqual(readSavedAnswers("pendulum", ["a"], storage), { a: "3" });
  assert.equal(storage.getItem("something-else"), "kept");
});

test("an incline problem does not clear an incline-2 problem", () => {
  const storage = memory();
  saveAnswer("incline", "a", "1", storage);
  saveAnswer("incline-2", "a", "2", storage);
  clearSavedAnswers("incline", storage);
  assert.deepEqual(readSavedAnswers("incline-2", ["a"], storage), { a: "2" });
});

test("a stored value over the limit is ignored, and a long answer is cut when saved", () => {
  const storage = memory();
  storage.setItem(savedAnswerKey("incline", "a"), "9".repeat(5000));
  assert.deepEqual(readSavedAnswers("incline", ["a"], storage), {});
  saveAnswer("incline", "b", "7".repeat(5000), storage);
  assert.equal(storage.getItem(savedAnswerKey("incline", "b"))!.length, 2000);
});

test("blocked storage never throws", () => {
  const storage = broken();
  assert.deepEqual(readSavedAnswers("incline", ["a"], storage), {});
  assert.doesNotThrow(() => saveAnswer("incline", "a", "1", storage));
  assert.doesNotThrow(() => clearSavedAnswer("incline", "a", storage));
  assert.doesNotThrow(() => clearSavedAnswers("incline", storage));
});

test("with no browser storage at all, nothing throws", () => {
  assert.deepEqual(readSavedAnswers("incline", ["a"]), {});
  assert.doesNotThrow(() => saveAnswer("incline", "a", "1"));
  assert.doesNotThrow(() => clearSavedAnswers("incline"));
});
