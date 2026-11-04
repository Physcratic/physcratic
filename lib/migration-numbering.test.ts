import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";

test("each migration number belongs to one migration across up and down files", () => {
  const owners = new Map<string, string>();
  for (const file of readdirSync("migrations")) {
    const match = /^(\d{4})_(.+)\.(?:up|down)\.sql$/.exec(file);
    if (!match) continue;
    const [, number, name] = match;
    const existing = owners.get(number);
    assert.ok(
      existing === undefined || existing === name,
      `Migration ${number} is shared by ${existing} and ${name}`,
    );
    owners.set(number, name);
  }
  assert.equal(owners.get("0012"), "community_problem_stats");
  assert.equal(owners.get("0013"), "community_comments");
  assert.equal(owners.get("0014"), "contest_participation");
});
