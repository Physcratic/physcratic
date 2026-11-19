import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { solutionPermissionInputSchema } from "./authored-solution-contracts";
import { dateInputToExpiry, expiryDateProblem, expiryToDateInput, todayUtc } from "./solution-expiry";

const body = (expiresAt: string | null) => ({ revisionId: randomUUID(), version: 1, enabled: true, mediaIds: [], expiresAt });

test("a stored expiry round trips through the date input in the same stored format", () => {
  // The format the permission API returns, from toISOString().
  const stored = "2026-12-31T23:59:59.000Z";
  assert.equal(expiryToDateInput(stored), "2026-12-31");
  assert.equal(dateInputToExpiry("2026-12-31", stored), stored);
  // A time that was typed by hand earlier is kept when the day is not changed.
  const earlier = "2026-12-31T10:15:00Z";
  assert.equal(dateInputToExpiry(expiryToDateInput(earlier), earlier), earlier);
  // A new day ends at the last second of that day in UTC, in the shape the API reads and returns.
  assert.equal(dateInputToExpiry("2027-01-15", stored), "2027-01-15T23:59:59.000Z");
  assert.equal(dateInputToExpiry("2027-01-15", null), "2027-01-15T23:59:59.000Z");
  assert.equal(new Date("2027-01-15T23:59:59.000Z").toISOString(), "2027-01-15T23:59:59.000Z");
  // Empty means no expiry, as the free text field did.
  assert.equal(dateInputToExpiry("", stored), null);
  assert.equal(expiryToDateInput(null), "");
  assert.equal(expiryToDateInput(""), "");
  assert.equal(expiryToDateInput("tomorrow"), "");
});

test("every value the date input can store is accepted by the permission contract, and none is a different shape", () => {
  for (const day of ["2026-11-20", "2026-12-31", "2028-02-29", "2030-01-01"]) {
    const value = dateInputToExpiry(day)!;
    assert.match(value, /^\d{4}-\d{2}-\d{2}T23:59:59\.000Z$/);
    assert.equal(solutionPermissionInputSchema.safeParse(body(value)).data?.expiresAt, value);
  }
  assert.equal(solutionPermissionInputSchema.safeParse(body(null)).data?.expiresAt, null);
});

test("the validation message is plain and only appears for a day that cannot be used", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  assert.equal(todayUtc(now), "2026-11-19");
  assert.equal(expiryDateProblem("", now), null);
  assert.equal(expiryDateProblem("2026-11-19", now), null);
  assert.equal(expiryDateProblem("2027-03-01", now), null);
  assert.equal(expiryDateProblem("2026-11-18", now), "Choose today or a later date. Dates are in UTC.");
  assert.equal(expiryDateProblem("2026-02-30", now), "Enter a real date.");
  assert.equal(expiryDateProblem("not a date", now), "Enter a real date.");
});
