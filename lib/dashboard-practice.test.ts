import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { dashboardAccountMatches, dashboardPracticeCounts } from "./dashboard-practice";
test("dashboard account guard rejects stale cookies before accessing private data", () => {
  const request = (actor?: string) => new Request("https://physcratic.test/api/dashboard", { headers: actor ? { "X-Practice-Account": actor } : {} });
  assert.equal(dashboardAccountMatches(request("A"), "A"), true);
  assert.equal(dashboardAccountMatches(request("A"), "B"), false);
  assert.equal(dashboardAccountMatches(request("A"), null), false);
  assert.equal(dashboardAccountMatches(request("guest"), "A"), false);
  assert.equal(dashboardAccountMatches(request("guest"), null), true);
  assert.equal(dashboardAccountMatches(request(), "A"), true, "legacy callers remain session-authorized");
});
test("guest dashboard makes no ledger query and missing schema never claims zero completed problems", async () => {
  let queries = 0;
  const pool = { query: async () => { queries++; throw Error("missing schema"); } } as unknown as Pool;
  assert.deepEqual(await dashboardPracticeCounts(pool, null), { practiceAttempts: 0, solvedProblems: 0, inProgressProblems: 0, practiceProgressAvailable: false });
  assert.equal(queries, 0);
  assert.deepEqual(await dashboardPracticeCounts(pool, "A"), { practiceAttempts: null, solvedProblems: null, inProgressProblems: null, practiceProgressAvailable: false });
  assert.equal(queries, 1);
});

test("dashboard counts share the persistent read allowance and distinguish an empty ledger", async () => {
  let calls = 0; let limited = false;
  const pool = { query: async (query: { text: string; values: unknown[] }) => {
    calls++; assert.equal(query.values[0], "A");
    if (query.text.startsWith("INSERT INTO practice_check_rate")) return { rows: [{ requests: limited ? 61 : 1, submissions: 0 }] };
    return { rows: [{ problem_id: null, all_checks: "0" }] };
  } } as unknown as Pool;
  assert.deepEqual(await dashboardPracticeCounts(pool, "A"), { practiceAttempts: 0, solvedProblems: 0, inProgressProblems: 0, practiceProgressAvailable: true });
  assert.equal(calls, 2); limited = true;
  assert.equal((await dashboardPracticeCounts(pool, "A")).practiceProgressAvailable, false); assert.equal(calls, 3);
});
