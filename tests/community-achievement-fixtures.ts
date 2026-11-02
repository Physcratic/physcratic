import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Pool } from "pg";
import { createProblemAuthoringApi } from "../lib/problem-authoring-api";
import { createAuthoredAttemptApi } from "../lib/authored-attempt-api";
import { createAuthoredSolutionApi } from "../lib/authored-solution-api";
import type { AuthoredDocument, PrivatePart } from "../lib/problem-authoring";

export const achievementMigrations = ["0001_problem_authoring", "0002_authored_write_limit", "0003_author_media", "0004_authored_attempts", "0005_authored_solution_access", "0006_authored_discovery", "0007_community_profile"];
export async function installAchievementFixtures(pool: Pool) {
  await pool.query('CREATE TABLE "user"(id text PRIMARY KEY)');
  for (const name of [...achievementMigrations, "0009_community_achievements"])
    await pool.query(`BEGIN; ${await readFile(`migrations/${name}.up.sql`, "utf8")} COMMIT;`);
}
export const achievementRequest = (who?: string, body?: unknown, method = body === undefined ? "GET" : "POST", path = "/api") => new Request(`https://physcratic.test${path}`, {
  method, headers: { origin: "https://physcratic.test", "content-type": "application/json", ...(who ? { "x-test-user": who } : {}) },
  body: method === "GET" ? undefined : JSON.stringify(body),
});
export async function achievementParsed(response: Response, status = 200) {
  assert.equal(response.status, status, await response.clone().text()); return response.json();
}
export function achievementFixtures(pool: Pool) {
  const deps = { pool, user: async (request: Request) => {
    const id = request.headers.get("x-test-user"); return id ? { id, emailVerified: id !== "unverified" } : null;
  }, origin: (request: Request) => request.headers.get("origin") === "https://physcratic.test" };
  const author = createProblemAuthoringApi(deps), attempts = createAuthoredAttemptApi(deps);
  const solutions = createAuthoredSolutionApi({ ...deps, storage: { get: async () => null } });
  const text = (value: string) => ({ id: randomUUID(), kind: "text" as const, spans: [{ kind: "text" as const, text: value }] });
  async function user(id: string = randomUUID(), profile = true) {
    await pool.query('INSERT INTO "user" VALUES($1)', [id]);
    if (profile) await pool.query("INSERT INTO community_profile(user_id,handle,public_visibility) VALUES($1,$2,true)", [id, `u_${id.replaceAll("-", "").slice(0, 18)}`]);
    return id;
  }
  async function problem(owner: string, modes: ("numeric" | "expression" | "manual")[] = ["numeric"], publish = true) {
    // Threshold fixtures intentionally reset the unrelated authoring quota.
    await pool.query("DELETE FROM authored_write_limit WHERE user_id=$1", [owner]);
    const parts = modes.map((answerMode, i) => ({ id: randomUUID(), label: String(i + 1), answerMode, blocks: [text("Question")] }));
    const content: AuthoredDocument = { title: "Achievement fixture", topicTags: [], methodTags: [], estimatedDifficulty: null,
      context: [text("Statement")], sections: [{ id: randomUUID(), title: "Parts", blocks: [], parts }], attachments: [],
      provenance: { kind: "original", source: "", rightsDeclaration: "I own this work." } };
    const privateParts: PrivatePart[] = parts.map(part => ({ partId: part.id, key: part.answerMode === "numeric"
      ? { kind: "numeric", value: 2, units: "1", absTol: 0.00001, relTol: 0.000002 }
      : part.answerMode === "expression" ? { kind: "expression", expected: "x+1", variables: [{ name: "x", domain: "real", assumptions: [] }], angleUnit: "radians", exclusions: [] }
        : { kind: "manual" }, hints: [], solution: [text("A private explanation")] }));
    const draft = await achievementParsed(await author("create", achievementRequest(owner, { content, privateParts })), 201);
    const revision = publish ? (await achievementParsed(await author("publish", achievementRequest(owner, { version: draft.version }), draft.problemId))).revision : null;
    return { owner, id: draft.problemId as string, parts, revision, content, privateParts, version: draft.version + (publish ? 1 : 0) };
  }
  async function submit(f: Awaited<ReturnType<typeof problem>>, who: string, index = 0, answer: unknown = { kind: "numeric", value: 2, units: "1" }, key = randomUUID()) {
    return attempts("submit", achievementRequest(who, { revisionId: f.revision.id, partId: f.parts[index].id, answer, idempotencyKey: key }), f.id);
  }
  return { deps, user, problem, submit, author, solutions };
}
