import assert from "node:assert/strict";
import test from "node:test";
import { contestHandler, contestJson } from "./contest-http";
import { ContestError } from "./contest-server";
import { contestDraftSchema } from "./contest-contracts";

test("contest HTTP replies never cache private answers and preserve explicit failure codes", async () => {
  for (const status of [401, 403, 404, 409, 429]) {
    const response = await contestHandler(async () => {
      throw new ContestError("Rejected", status);
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    if (status === 429) assert.equal(response.headers.get("retry-after"), "60");
  }
  const invalid = await contestHandler(async () =>
    contestDraftSchema.parse({ rated: true }),
  );
  assert.equal(invalid.status, 400);
  assert.ok(!(await invalid.text()).includes("stack"));
});
test("contest bodies require JSON and a bounded payload", async () => {
  assert.throws(
    () =>
      contestJson(
        new Request("https://test.invalid", { method: "POST", body: "{}" }),
      ),
    (error: unknown) => error instanceof ContestError && error.status === 415,
  );
  const large = new Request("https://test.invalid", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "x".repeat(75001),
  });
  await assert.rejects(contestJson(large), RangeError);
});
