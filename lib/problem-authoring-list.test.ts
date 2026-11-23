import assert from "node:assert/strict";
import test from "node:test";
import { encodeDraftCursor, parseDraftCursor } from "./problem-authoring-list";

const id = "0b6f5d3e-8c1a-4f0e-9d52-7a1c2b3d4e5f";

test("a draft list cursor keeps the microseconds and the id, and reads back the same", () => {
  const cursor = { updatedAt: "2026-02-01T10:20:30.123456Z", problemId: id };
  assert.equal(encodeDraftCursor(cursor), `2026-02-01T10:20:30.123456Z~${id}`);
  assert.deepEqual(parseDraftCursor(encodeDraftCursor(cursor)), cursor);
  assert.deepEqual(parseDraftCursor(`2026-02-01T10:20:30.000000Z~${id.toUpperCase()}`), { updatedAt: "2026-02-01T10:20:30.000000Z", problemId: id });
});

test("a value this list did not produce is not a cursor", () => {
  for (const bad of ["", "abc", id, `2026-02-01T10:20:30Z~${id}`, `2026-02-01T10:20:30.123Z~${id}`, `2026-02-01T10:20:30.123456Z~not-an-id`, `2026-02-01T10:20:30.123456Z~${id} `, `x2026-02-01T10:20:30.123456Z~${id}`])
    assert.equal(parseDraftCursor(bad), null, JSON.stringify(bad));
});
