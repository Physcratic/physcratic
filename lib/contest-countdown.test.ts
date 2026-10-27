import test from "node:test";
import assert from "node:assert/strict";
import { formatContestCountdown } from "./contest-countdown";

const start = "2026-11-07T16:00:00Z";
const timestamp = Date.parse(start);

for (const [remaining, label] of [
  [7 * 86_400_000, "In 7 days"],
  [3 * 86_400_000, "In 3 days"],
  [86_400_000, "In 1 day"],
  [13 * 3_600_000, "In 13 hours"],
  [3_600_000, "In 1 hour"],
  [2 * 60_000, "In 2 minutes"],
  [60_000, "In 1 minute"],
  [59_999, "Under 1 minute"],
  [1, "Under 1 minute"],
  [0, "Live now"],
  [-89 * 60_000, "Live now"],
  [-90 * 60_000, "Ended"],
] as const) {
  test(`countdown displays ${label} at ${remaining}ms remaining`, () => {
    assert.equal(formatContestCountdown(start, timestamp - remaining, 90), label);
  });
}

test("an invalid date does not display a broken countdown", () => {
  assert.equal(formatContestCountdown("invalid", timestamp, 90), "Schedule to be announced");
});
