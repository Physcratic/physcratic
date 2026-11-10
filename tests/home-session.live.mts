// The old per-session home rendering is replaced by permanent redirects.
// Confirm that both entry routes redirect for visitors, members and concurrent requests.
// Run after a production build: pnpm exec tsx tests/home-session.live.mts
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = Number(process.env.HOME_SESSION_PORT ?? 3101);
const origin = `http://127.0.0.1:${port}`;
const server = spawn("pnpm", ["exec", "next", "start", "-p", String(port), "-H", "127.0.0.1"], {
  env: { ...process.env, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk; });
server.stderr.on("data", (chunk) => { serverLog += chunk; });

async function entry(path: string, cookie?: string) {
  return fetch(origin + path, {
    headers: { "user-agent": "home-entry-test", ...(cookie ? { cookie } : {}) },
    redirect: "manual",
  });
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await entry("/")).status === 308) { ready = true; break; }
    } catch { /* Server not ready yet */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, `server did not start with redirects:\n${serverLog.slice(-2000)}`);

  const requests = await Promise.all(Array.from({ length: 24 }, (_, i) =>
    entry(i % 2 === 0 ? "/" : "/problem", i % 3 === 0 ? "better-auth.session_token=synthetic-test" : undefined),
  ));
  for (const response of requests) {
    assert.equal(response.status, 308);
    assert.equal(new URL(response.headers.get("location") ?? "", origin).pathname, "/dashboard");
    const body = await response.text();
    assert.ok(!body.includes("synthetic-test"), "redirect must not expose session data");
  }
  const dashboard = await fetch(origin + "/dashboard", { redirect: "manual" });
  assert.equal(dashboard.status, 200, "the destination must not redirect back to the homepage");
  console.log(`home-session.live: ${requests.length + 1} checks passed`);
} finally {
  server.kill("SIGTERM");
}
