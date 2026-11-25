import assert from "node:assert/strict";
import { test } from "node:test";
import { DASHBOARD_CACHE_TTL, readDashboardCache, writeDashboardCache } from "./dashboard-cache";
import type { DashboardData } from "./dashboard-data";
const data: DashboardData = { user: { name: "Test Student" }, savedAttempts: 2, practiceAttempts: 1, solvedProblems: 1, archiveReviewed: 0, ratings: [{ rating: 1200, change: 30, createdAt: "2026-11-21T00:00:00Z", contestName: "Test Round" }], contests: [] };
function storage() {
  const entries = new Map<string, string>();
  return { entries, getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } };
}
test("a new page can read previously fetched dashboard display data", () => {
  const tab = storage();
  writeDashboardCache("student-a", data, tab, 1000);
  assert.deepEqual(readDashboardCache("student-a", tab, 2000), data);
  assert.equal(readDashboardCache("student-b", tab, 2000), undefined);
  assert.equal(readDashboardCache("guest", tab, 2000), undefined);
});
test("expired and future-dated snapshots are removed", () => {
  const tab = storage();
  writeDashboardCache("a", data, tab, 1000);
  assert.equal(readDashboardCache("a", tab, 1000 + DASHBOARD_CACHE_TTL), undefined);
  assert.equal(tab.entries.size, 0);
  writeDashboardCache("a", data, tab, 1000);
  assert.equal(readDashboardCache("a", tab, 999), undefined);
});
test("tampered account labels, malformed payloads and oversized data are rejected", () => {
  const tab = storage();
  writeDashboardCache("a", data, tab, 1000);
  const key = [...tab.entries.keys()][0];
  tab.setItem(key, JSON.stringify({ account: "b", savedAt: 1000, data }));
  assert.equal(readDashboardCache("a", tab, 1001), undefined);
  tab.setItem(key, JSON.stringify({ account: "a", savedAt: 1000, data: { ...data, ratings: [{ rating: "bad" }] } }));
  assert.equal(readDashboardCache("a", tab, 1001), undefined);
  tab.setItem(key, "x".repeat(256001));
  assert.equal(readDashboardCache("a", tab, 1001), undefined);
});
test("unrecognized fields such as tokens never enter the cached snapshot", () => {
  const tab = storage();
  writeDashboardCache("a", { ...data, token: "never-cache-this" } as DashboardData, tab, 1000);
  assert.ok(![...tab.entries.values()][0].includes("never-cache-this"));
});
test("storage restrictions do not break dashboard loading", () => {
  const tab = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); }, removeItem() { throw Error("blocked"); } };
  assert.equal(readDashboardCache("a", tab), undefined);
  assert.doesNotThrow(() => writeDashboardCache("a", data, tab));
});
