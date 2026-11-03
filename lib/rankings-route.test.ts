import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { db } from "./db";
import { GET } from "../app/api/rankings/route";

test("invalid leaderboard requests never query the database and are not cached", async () => {
  const transaction = mock.method(db, "transaction", () => {
    throw new Error("Database must not be queried");
  });
  try {
    for (const query of [
      "page=0",
      "page=1.5",
      "page=1000001",
      `search=${"x".repeat(81)}`,
    ]) {
      const response = await GET(
        new Request(`https://test.invalid/api/rankings?${query}`),
      );
      assert.equal(response.status, 400);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      assert.equal(typeof (await response.json()).error, "string");
    }
    assert.equal(transaction.mock.callCount(), 0);
  } finally {
    transaction.mock.restore();
  }
});

test("leaderboard outages return a retryable error without database or account details", async () => {
  const transaction = mock.method(db, "transaction", () => {
    throw new Error("PRIVATE_DATABASE_HOST PRIVATE_USER_ID");
  });
  try {
    const response = await GET(
      new Request("https://test.invalid/api/rankings"),
    );
    assert.equal(response.status, 503);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(transaction.mock.callCount(), 1);
    const text = await response.text();
    assert.match(text, /Please retry/);
    assert.doesNotMatch(text, /PRIVATE_|stack|userId/);
  } finally {
    transaction.mock.restore();
  }
});
