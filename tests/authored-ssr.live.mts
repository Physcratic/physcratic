// A published authored problem has its statement in the server HTML, stays noindex, and leaks nothing private. An
// unpublished problem has no statement in the HTML. Uses a disposable PostgreSQL and the production API factory.
//
//   VERCEL_ENV=production pnpm build        (once)
//   DATABASE_URL=postgresql://postgres@127.0.0.1:<port>/<name with test in it> pnpm exec tsx --conditions=react-server tests/authored-ssr.live.mts
//
// Refuses to run against anything that is not a local database with "test" in its name. Not run by CI.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { createProblemAuthoringApi } from "../lib/problem-authoring-api.ts";
import type { AuthoredDocument } from "../lib/problem-authoring.ts";

const databaseUrl = process.env.DATABASE_URL ?? "";
const parsed = new URL(databaseUrl || "http://invalid");
assert.ok(["127.0.0.1", "localhost"].includes(parsed.hostname) && /test/.test(parsed.pathname), "DATABASE_URL must be a disposable local test database.");
const port = Number(process.env.AUTHORED_SSR_PORT ?? 3102);
const origin = `http://127.0.0.1:${port}`;
const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });

await pool.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
await pool.query(`CREATE TABLE "user"(id text PRIMARY KEY)`);
for (const migration of ["0001_problem_authoring", "0002_authored_write_limit", "0003_author_media"]) {
  await pool.query("BEGIN;\n" + (await readFile(`migrations/${migration}.up.sql`, "utf8")) + "\nCOMMIT;");
}
const owner = randomUUID();
await pool.query('INSERT INTO "user"(id) VALUES($1)', [owner]);
const api = createProblemAuthoringApi({ pool, user: async () => ({ id: owner, emailVerified: true }), origin: () => true });
const request = (method: string, body?: unknown) =>
  new Request("https://physcratic.test/api/authored-problems/drafts", { method, headers: { origin: "https://physcratic.test", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

const part = randomUUID();
const content: AuthoredDocument = {
  title: "Original physics task",
  topicTags: ["Mechanics"],
  methodTags: [],
  estimatedDifficulty: "1200",
  context: [{ id: randomUUID(), kind: "text", spans: [{ kind: "text", text: "A cart of mass 3 kg rolls down a ramp without friction." }] }],
  sections: [{ id: randomUUID(), title: "Motion on the ramp", blocks: [], parts: [{ id: part, label: "a", answerMode: "numeric", blocks: [{ id: randomUUID(), kind: "text", spans: [{ kind: "text", text: "Find the speed at the bottom." }] }] }] }],
  provenance: { kind: "original", source: "", rightsDeclaration: "I own this original content." },
  attachments: [],
};
const privateParts = [{ partId: part, key: { kind: "numeric", value: 9876.54321, units: "m/s", absTol: 0.01, relTol: 0 }, hints: [], solution: [{ id: randomUUID(), kind: "text", spans: [{ kind: "text", text: "PRIVATE_SOLUTION_SENTINEL" }] }] }];
const created = await (await api("create", request("POST", { content, privateParts }))).json();
const problemId: string = created.problemId;
assert.ok(problemId, `created: ${JSON.stringify(created).slice(0, 200)}`);
const published = await api("publish", request("POST", { version: created.version ?? 1 }), problemId);
assert.equal(published.status, 200, await published.clone().text());
const publishedBody = await published.json();

const server = spawn("pnpm", ["exec", "next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  env: { ...process.env, DATABASE_URL: databaseUrl, BETTER_AUTH_SECRET: randomBytes(32).toString("hex"), BETTER_AUTH_URL: origin, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (chunk) => (serverLog += chunk));
server.stderr.on("data", (chunk) => (serverLog += chunk));
let checks = 0;
const ok = (value: unknown, message: string) => { assert.ok(value, message); checks++; };
const visible = (html: string) => html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const page = async (id: string) => { const response = await fetch(`${origin}/dashboard/authored/${id}`, { headers: { "user-agent": "authored-ssr-test" } }); return { status: response.status, body: await response.text() }; };

try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(`${origin}/`)).status === 200) break; } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (attempt === 59) throw new Error(`server did not start:\n${serverLog.slice(-2000)}`);
  }
  const live = await page(problemId);
  ok(live.status === 200, `status ${live.status}`);
  const text = visible(live.body);
  ok(text.includes("A cart of mass 3 kg rolls down a ramp without friction."), `the statement is in the HTML. Page text: ${text.slice(0, 400)}`);
  ok(text.includes("Find the speed at the bottom."), "the part question is in the HTML");
  ok(text.includes("Motion on the ramp"), "the section title is in the HTML");
  ok(/<meta name="robots" content="noindex, nofollow"/.test(live.body), "the page stays noindex");
  for (const secret of ["PRIVATE_SOLUTION_SENTINEL", "9876.54321", "privateParts", "ownerId", owner]) ok(!live.body.includes(secret), `nothing private in the HTML: ${secret}`);

  const unpublished = await api("unpublish", request("POST", { version: publishedBody.version ?? publishedBody.draft?.version ?? created.version ?? 1 }), problemId);
  ok(unpublished.status === 200, `unpublish ${unpublished.status} ${await unpublished.clone().text()} (publish returned ${JSON.stringify(publishedBody).slice(0, 200)})`);
  const gone = await page(problemId);
  ok(!visible(gone.body).includes("A cart of mass 3 kg rolls down a ramp without friction."), "an unpublished problem has no statement in the HTML");

  const unknown = await page(randomUUID());
  ok(!visible(unknown.body).includes("A cart of mass 3 kg"), "an unknown id shows no statement");
  const notUuid = await page("not-a-uuid");
  ok(notUuid.status === 404, `a bad id is a 404 (${notUuid.status})`);
  console.log(`authored-ssr.live: ${checks} checks passed on ${origin}`);
} finally {
  server.kill("SIGTERM");
  await pool.end().catch(() => undefined);
}
