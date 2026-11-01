import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { handleArchiveGrade } from "./archive-grading-request";
import { getArchiveDefinition, archiveVersion } from "./archive-grading/catalog";

const origins = ["https://physcratic.example"];
const definition = getArchiveDefinition("incline")!;
const body = { problemId: "incline", version: archiveVersion(definition), answers: [{ partId: "answer", latex: String.raw`\frac{49}{10}` }] };
function request(payload: unknown = body, headers: Record<string, string> = {}) {
  return new Request("https://physcratic.example/api/archive-grade", { method: "POST", headers: { Origin: origins[0], "Content-Type": "application/json", ...headers }, body: typeof payload === "string" ? payload : JSON.stringify(payload) });
}
test("anonymous and cookie-bearing requests have identical stateless outcomes", async () => {
  for (const headers of [{}, { Cookie: "better-auth.session_token=unused" }] as Record<string, string>[]) {
    const response = await handleArchiveGrade(request(body, headers), origins);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("Set-Cookie"), null);
    const result = await response.json();
    assert.equal(result.results[0].status, "correct");
    assert.equal(result.version, body.version);
  }
});
test("origin, content type, stale versions, malformed JSON and bounded bodies", async () => {
  assert.equal((await handleArchiveGrade(request(body, { Origin: "https://evil.example" }), origins)).status, 403);
  assert.equal((await handleArchiveGrade(request(body, { Origin: "null" }), origins)).status, 403);
  assert.equal((await handleArchiveGrade(request(body, { "Sec-Fetch-Site": "cross-site" }), origins)).status, 403);
  assert.equal((await handleArchiveGrade(request(body, { "Content-Type": "text/plain" }), origins)).status, 415);
  assert.equal((await handleArchiveGrade(request({ ...body, version: "0".repeat(64) }), origins)).status, 409);
  assert.equal((await handleArchiveGrade(request("{"), origins)).status, 400);
  assert.equal((await handleArchiveGrade(request(" ".repeat(65537)), origins)).status, 413);
  assert.equal((await handleArchiveGrade(request(body, { "Content-Length": "65537" }), origins)).status, 413);
  assert.equal((await handleArchiveGrade(request({ ...body, problemId: "contest" }), origins)).status, 404);
  assert.equal((await handleArchiveGrade(request({ ...body, expected: 4.9 }), origins)).status, 400);
  assert.equal((await handleArchiveGrade(request({ ...body, answers: Array(65).fill(body.answers[0]) }), origins)).status, 400);
});
test("grading dependency graph has no auth, database, storage, progress or submission writes", () => {
  const checked = new Set<string>();
  function inspect(path: string) {
    if (checked.has(path)) return;
    checked.add(path);
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from ["'](?:@\/lib\/|\.\/|\.\.\/)*(?:db|auth|blob|progress-store|submission-store)(?:[\/"'])|console\.(?:log|info)|recordResult|writeFile/);
    for (const match of source.matchAll(/(?:import|export)[\s\S]*?from\s*["'](\.[^"']+)["']/g)) {
      const target = new URL(`${match[1]}.ts`, new URL(path, import.meta.url));
      if (target.pathname.includes("/lib/")) inspect(target.href);
    }
  }
  inspect("./archive-grading-request.ts");
  const reader = readFileSync(new URL("../components/physics/problem-reader.tsx", import.meta.url), "utf8");
  const panel = readFileSync(new URL("../components/physics/archive-answer-panel.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(reader + panel, /useProblemHistory|recordResult|\/api\/progress|\/api\/submissions|localStorage|sessionStorage/);
  assert.match(panel, /JSON\.stringify\(\{ problemId, version: data\.version, answers:/);
  assert.doesNotMatch(panel, /JSON\.stringify\([^\n]*working/);
});
