import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { healthPayload } from "./health";

const NOW = new Date("2026-11-01T12:34:56.789Z");

describe("healthPayload", () => {
  it("uses the first 7 characters of the commit SHA as the version", () => {
    const sha = "0123456789abcdef0123456789abcdef01234567";
    assert.deepEqual(healthPayload({ VERCEL_GIT_COMMIT_SHA: sha }, NOW), {
      ok: true,
      version: "0123456",
      time: "2026-11-01T12:34:56.789Z",
    });
  });

  it('falls back to "local" when the SHA is missing or blank', () => {
    assert.equal(healthPayload({}, NOW).version, "local");
    assert.equal(healthPayload({ VERCEL_GIT_COMMIT_SHA: undefined }, NOW).version, "local");
    assert.equal(healthPayload({ VERCEL_GIT_COMMIT_SHA: "" }, NOW).version, "local");
    assert.equal(healthPayload({ VERCEL_GIT_COMMIT_SHA: "   " }, NOW).version, "local");
  });

  it("keeps a SHA shorter than 7 characters as is", () => {
    assert.equal(healthPayload({ VERCEL_GIT_COMMIT_SHA: "abc12" }, NOW).version, "abc12");
  });

  it("returns an ISO timestamp for the given time", () => {
    const { time } = healthPayload({}, NOW);
    assert.equal(time, NOW.toISOString());
    assert.match(time, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("exposes only ok, version and time, and nothing from the rest of the environment", () => {
    const payload = healthPayload(
      {
        VERCEL_GIT_COMMIT_SHA: "fedcba9876543210",
        // Extra keys must never leak into the output.
        VERCEL_ENV: "production",
        DATABASE_URL: "postgres://secret",
      },
      NOW,
    );
    assert.deepEqual(Object.keys(payload).sort(), ["ok", "time", "version"]);
    assert.doesNotMatch(JSON.stringify(payload), /production|postgres|secret/);
  });
});
