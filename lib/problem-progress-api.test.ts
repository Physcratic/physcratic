import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createProblemProgressApi } from "./problem-progress-api";
import { createAuthoredAttemptApi } from "./authored-attempt-api";
import type { Pool } from "pg";
const request = () => new Request("https://physcratic.test/api/problem-progress", { headers: { "X-Practice-Account": "A" } });
const entry = { kind: "practice", problemId: "incline", version: "a".repeat(64), title: "Inclined Plane", href: "/dashboard/problems/incline", status: "in-progress", correctParts: 0, requiredParts: 1, incorrectParts: 1, lastCheckedAt: "2026-11-11T00:00:00.000Z" };
const practice = { progress: [entry], savedChecks: 2, solvedProblems: 0, inProgressProblems: 1, notGradedProblems: 0 };
const id = randomUUID();
const community = { progress: [{ ...entry, kind: "authored", problemId: id, version: randomUUID(), href: `/dashboard/authored/${id}`, status: "solved", correctParts: 1, incorrectParts: 0 }], savedChecks: 3 };
test("dashboard combines saved community and practice results using canonical typed links", async () => {
  const response = await createProblemProgressApi(async () => Response.json(practice), async () => Response.json(community))(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.savedChecks, 5); assert.equal(body.solvedProblems, 1); assert.equal(body.inProgressProblems, 1);
  assert.deepEqual(body.sources, { practice: true, authored: true });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
test("disabled practice persistence still permits saved community history with explicit partial availability", async () => {
  const response = await createProblemProgressApi(async () => Response.json({error:"disabled"}, {status:503}), async () => Response.json(community))(request());
  const body = await response.json(); assert.equal(body.solvedProblems, 1);
  assert.deepEqual(body.sources, { practice: false, authored: true });
});
test("source failures never claim empty complete progress or expose results across accounts", async () => {
  for (const status of [401, 403, 409, 503]) {
    const api = createProblemProgressApi(async () => Response.json({error:"unavailable"}, {status}), async () => status === 503 ? Response.json({bad:true}) : Response.json(community));
    const response = await api(request()); assert.equal(response.status, status);
    assert.equal((await response.json()).progress, undefined);
  }
});
test("community progress rejects guests, unverified accounts and stale account headers before SQL", async () => {
  const pool = { query: async () => { throw Error("Must not query"); } } as unknown as Pool;
  for (const [user,status] of [[null,401],[{id:"A",emailVerified:false},403],[{id:"B",emailVerified:true},409]] as const) {
    const response = await createAuthoredAttemptApi({ pool, user: async () => user, origin: () => true })("progress", request());
    assert.equal(response.status,status);
  }
});
