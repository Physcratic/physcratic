import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { medallists } from "./coaching/medallists";
import { coachProfileDescription, coachProfileHref, findCoach } from "./coaching/coach-profile";

test("each coach has a unique profile and an existing portrait or explicit placeholder", () => {
  assert.equal(new Set(medallists.map(coach => coachProfileHref(coach.slug))).size, medallists.length);
  for (const coach of medallists) {
    assert.equal(findCoach(coach.slug), coach);
    assert.ok(coachProfileDescription(coach).includes(coach.country));
    if (coach.photo !== false) assert.ok(existsSync(`public/coaching/medallists/${coach.slug}.${coach.photo ?? "webp"}`), coach.slug);
  }
});
test("unknown or malformed profile identities do not resolve", () => {
  for (const slug of ["unknown", "../rishit-garg", "RISHIT-GARG", ""]) assert.equal(findCoach(slug), undefined);
});
